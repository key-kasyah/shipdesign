import json
import os
import uuid
from dataclasses import asdict, fields, replace
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from src.core.enums import RevisionStatus, StageStatus
from src.domain.stage1_requirements.models import (
    ApprovalRecord,
    AuditEvent,
    ChangeEntry,
    ProjectBaseline,
    ProjectData,
    ProjectHistory,
    ProjectRevision,
    ValidationResult,
)
from src.domain.stage1_requirements.schemas import (
    project_data_from_json,
    project_data_to_json,
    project_history_from_dict,
    project_history_from_json,
    project_history_to_json,
)
from src.domain.stage1_requirements.validators import (
    validate_project_data,
    validate_project_with_engine,
)


class Stage1RequirementService:
    """
    Service Layer untuk mengelola operasi Tahap 1 (Kebutuhan Kapal).
    Mendukung pembuatan proyek, perbaruan data, validasi, revisi,
    serta ekspor/impor data.
    """

    @staticmethod
    def create_project(
        project_id: str,
        project_name: str,
        owner: str,
        organization: Optional[str] = None,
        **kwargs: Any
    ) -> ProjectData:
        """Membuat instance ProjectData baru."""
        project = ProjectData(
            project_id=project_id,
            project_name=project_name,
            owner=owner,
            organization=organization,
            **kwargs
        )
        res = validate_project_with_engine(project)
        project.is_complete = res.is_complete and res.is_valid
        return project

    @staticmethod
    def update_project_data(project: ProjectData, updates: Dict[str, Any]) -> ProjectData:
        """
        Memperbarui atribut pada ProjectData dan menaikkan nomor revisi.
        """
        for field_name, value in updates.items():
            if hasattr(project, field_name):
                setattr(project, field_name, value)

        # Increment revision and update timestamp
        project.revision_number += 1
        project.updated_at = datetime.now(timezone.utc).isoformat()

        # Re-validate project data
        res = validate_project_with_engine(project)
        project.is_complete = res.is_complete and res.is_valid
        return project

    @staticmethod
    def validate_project(project: ProjectData) -> Dict[str, Any]:
        """Menjalankan engine validasi komprehensif dengan output format lama."""
        return validate_project_data(project)

    @staticmethod
    def validate_project_rich(project: ProjectData) -> ValidationResult:
        """Menjalankan engine validasi komprehensif dengan output ValidationResult."""
        return validate_project_with_engine(project)

    @staticmethod
    def export_to_json(project: ProjectData) -> str:
        """Mengekspor ProjectData ke string JSON."""
        return project_data_to_json(project)

    @staticmethod
    def import_from_json(json_str: str) -> ProjectData:
        """Mengimpor ProjectData dari string JSON dan memvalidasinya."""
        project = project_data_from_json(json_str)
        res = validate_project_with_engine(project)
        project.is_complete = res.is_complete and res.is_valid
        return project

    # --- Revision Management Services (Sprint 1.3) ---

    @staticmethod
    def create_initial_history(project: ProjectData, creator: str) -> ProjectHistory:
        """Inisialisasi ProjectHistory dari ProjectData pertama."""
        history = ProjectHistory(project_id=project.project_id)
        
        # Determine status of the initial revision
        res = validate_project_with_engine(project)
        if not res.is_valid:
            status = RevisionStatus.VALIDATION_FAILED
        elif res.is_complete:
            status = RevisionStatus.READY_FOR_REVIEW
        else:
            status = RevisionStatus.DRAFT

        rev_id = str(uuid.uuid4())
        initial_revision = ProjectRevision(
            revision_id=rev_id,
            project_id=project.project_id,
            revision_number=0,
            parent_revision_id=None,
            status=status,
            data_snapshot=project,
            created_by=creator,
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        history.revisions.append(initial_revision)

        # Log event
        history.audit_trail.append(AuditEvent(
            event_id=str(uuid.uuid4()),
            project_id=project.project_id,
            revision_id=rev_id,
            action="INITIAL_REVISION_CREATED",
            actor=creator,
            timestamp=initial_revision.created_at,
            reason="Inisialisasi riwayat proyek pertama kali.",
        ))

        return history

    @staticmethod
    def create_new_revision(
        history: ProjectHistory,
        parent_rev_id: str,
        creator: str,
        reason: Optional[str] = None,
        note: Optional[str] = None
    ) -> ProjectRevision:
        """Membuat working revision baru dari parent revision."""
        # Find parent
        parent = next((r for r in history.revisions if r.revision_id == parent_rev_id), None)
        if not parent:
            raise ValueError(f"Parent revision ID {parent_rev_id} tidak ditemukan.")

        # Deep copy snapshot
        parent_snapshot = parent.data_snapshot
        snapshot_copy = project_data_from_json(project_data_to_json(parent_snapshot))
        
        # New revision number and reset mutable metadata
        snapshot_copy.revision_number = parent.revision_number + 1
        snapshot_copy.updated_at = datetime.now(timezone.utc).isoformat()
        snapshot_copy.is_complete = False

        rev_id = str(uuid.uuid4())
        new_rev = ProjectRevision(
            revision_id=rev_id,
            project_id=history.project_id,
            revision_number=snapshot_copy.revision_number,
            parent_revision_id=parent_rev_id,
            status=RevisionStatus.DRAFT,
            data_snapshot=snapshot_copy,
            created_by=creator,
            created_at=snapshot_copy.updated_at,
            reason_for_change=reason,
            revision_note=note,
        )
        
        history.revisions.append(new_rev)

        # Log event
        history.audit_trail.append(AuditEvent(
            event_id=str(uuid.uuid4()),
            project_id=history.project_id,
            revision_id=rev_id,
            action="REVISION_CREATED",
            actor=creator,
            timestamp=new_rev.created_at,
            reason=reason,
        ))

        return new_rev

    @staticmethod
    def update_revision_data(
        history: ProjectHistory,
        rev_id: str,
        updates: Dict[str, Any],
        actor: str,
        reason: Optional[str] = None
    ) -> ProjectRevision:
        """Memperbarui data snapshot dalam suatu revision."""
        revision = next((r for r in history.revisions if r.revision_id == rev_id), None)
        if not revision:
            raise ValueError(f"Revision ID {rev_id} tidak ditemukan.")

        # Immutability Check: APPROVED, SUPERSEDED, and ARCHIVED are locked!
        if revision.status in [RevisionStatus.APPROVED, RevisionStatus.SUPERSEDED, RevisionStatus.ARCHIVED]:
            raise ValueError(f"Revisi {revision.revision_number} dengan status '{revision.status.value}' bersifat immutable dan tidak boleh diubah langsung.")

        snapshot = revision.data_snapshot
        old_snapshot_dict = asdict(snapshot)

        # Apply updates
        changes: List[ChangeEntry] = []
        now_str = datetime.now(timezone.utc).isoformat()

        for field_name, value in updates.items():
            if hasattr(snapshot, field_name):
                old_val = getattr(snapshot, field_name)
                if old_val != value:
                    setattr(snapshot, field_name, value)
                    changes.append(ChangeEntry(
                        field_path=field_name,
                        old_value=old_val,
                        new_value=value,
                        changed_by=actor,
                        changed_at=now_str,
                        reason=reason
                    ))

        # Re-validate
        res = validate_project_with_engine(snapshot)
        snapshot.is_complete = res.is_complete and res.is_valid
        
        # Auto-update status based on validation result
        if not res.is_valid:
            revision.status = RevisionStatus.VALIDATION_FAILED
        elif res.is_complete:
            revision.status = RevisionStatus.READY_FOR_REVIEW
        else:
            revision.status = RevisionStatus.DRAFT

        # Update timestamps
        revision.updated_by = actor
        revision.updated_at = now_str
        snapshot.updated_at = now_str

        # Record Audit Log for modifications
        for c in changes:
            history.audit_trail.append(AuditEvent(
                event_id=str(uuid.uuid4()),
                project_id=history.project_id,
                revision_id=rev_id,
                action="FIELD_UPDATED",
                actor=actor,
                timestamp=now_str,
                old_value=str(c.old_value),
                new_value=str(c.new_value),
                reason=f"Update field {c.field_path}: {reason or ''}",
                metadata={"field": c.field_path}
            ))

        return revision

    @staticmethod
    def submit_revision_for_review(history: ProjectHistory, rev_id: str, submitter: str) -> ProjectRevision:
        """Mengajukan revisi untuk review approval."""
        revision = next((r for r in history.revisions if r.revision_id == rev_id), None)
        if not revision:
            raise ValueError(f"Revision ID {rev_id} tidak ditemukan.")

        if revision.status != RevisionStatus.READY_FOR_REVIEW:
            raise ValueError(f"Hanya revisi dengan status 'READY_FOR_REVIEW' yang dapat diajukan. Status saat ini: '{revision.status.value}'.")

        now_str = datetime.now(timezone.utc).isoformat()
        revision.status = RevisionStatus.WAITING_FOR_REVIEW
        revision.submitted_by = submitter
        revision.submitted_at = now_str

        # Audit event
        history.audit_trail.append(AuditEvent(
            event_id=str(uuid.uuid4()),
            project_id=history.project_id,
            revision_id=rev_id,
            action="REVISION_SUBMITTED",
            actor=submitter,
            timestamp=now_str,
            reason="Mengajukan revisi untuk proses approval.",
        ))

        return revision

    @staticmethod
    def review_revision(
        history: ProjectHistory,
        rev_id: str,
        reviewer: str,
        decision: str,
        note: Optional[str] = None
    ) -> ProjectRevision:
        """Melakukan review (menyetujui atau menolak) revisi."""
        revision = next((r for r in history.revisions if r.revision_id == rev_id), None)
        if not revision:
            raise ValueError(f"Revision ID {rev_id} tidak ditemukan.")

        if revision.status != RevisionStatus.WAITING_FOR_REVIEW:
            raise ValueError(f"Hanya revisi dengan status 'WAITING_FOR_REVIEW' yang dapat di-review. Status saat ini: '{revision.status.value}'.")

        now_str = datetime.now(timezone.utc).isoformat()
        
        # Save approval record
        approval = ApprovalRecord(
            approval_id=str(uuid.uuid4()),
            revision_id=rev_id,
            reviewer=reviewer,
            decided_at=now_str,
            decision=decision,
            approval_note=note
        )
        history.approval_records.append(approval)

        if decision == "APPROVED":
            # Set to APPROVED
            revision.status = RevisionStatus.APPROVED
            revision.reviewed_by = reviewer
            revision.reviewed_at = now_str
            revision.approval_note = note

            # Deactivate and mark older APPROVED baselines/revisions to SUPERSEDED
            for r in history.revisions:
                if r.revision_id != rev_id and r.status == RevisionStatus.APPROVED:
                    r.status = RevisionStatus.SUPERSEDED
            
            for b in history.baselines:
                if b.active:
                    b.active = False

            # Create new active baseline
            baseline_version = f"v1.{revision.revision_number}"
            new_baseline = ProjectBaseline(
                baseline_id=str(uuid.uuid4()),
                project_id=history.project_id,
                baseline_version=baseline_version,
                approved_revision_id=rev_id,
                active=True,
                locked_at=now_str
            )
            history.baselines.append(new_baseline)

            # Audit trail
            history.audit_trail.append(AuditEvent(
                event_id=str(uuid.uuid4()),
                project_id=history.project_id,
                revision_id=rev_id,
                action="BASELINE_APPROVED",
                actor=reviewer,
                timestamp=now_str,
                reason=f"Menyetujui baseline {baseline_version}: {note or ''}",
                metadata={"baseline_version": baseline_version}
            ))

        else:
            # REJECTED / REVISION_REQUIRED
            revision.status = RevisionStatus.REVISION_REQUIRED
            revision.reviewed_by = reviewer
            revision.reviewed_at = now_str
            revision.approval_note = note

            # Audit trail
            history.audit_trail.append(AuditEvent(
                event_id=str(uuid.uuid4()),
                project_id=history.project_id,
                revision_id=rev_id,
                action="REVISION_REJECTED",
                actor=reviewer,
                timestamp=now_str,
                reason=f"Menolak revisi: {note or ''}",
            ))

        return revision

    @staticmethod
    def compare_revisions(history: ProjectHistory, old_rev_id: str, new_rev_id: str) -> List[ChangeEntry]:
        """Membandingkan data snapshot antara dua revisi."""
        old_rev = next((r for r in history.revisions if r.revision_id == old_rev_id), None)
        new_rev = next((r for r in history.revisions if r.revision_id == new_rev_id), None)

        if not old_rev or not new_rev:
            raise ValueError("Kedua ID revisi harus valid.")

        old_snap = old_rev.data_snapshot
        new_snap = new_rev.data_snapshot
        
        entries = []
        now_str = datetime.now(timezone.utc).isoformat()

        # Compare field by field
        for field in fields(ProjectData):
            if field.name in ["revision_number", "updated_at", "is_complete", "status"]:
                continue
            old_val = getattr(old_snap, field.name)
            new_val = getattr(new_snap, field.name)
            if old_val != new_val:
                entries.append(ChangeEntry(
                    field_path=field.name,
                    old_value=old_val,
                    new_value=new_val,
                    changed_by=new_rev.created_by,
                    changed_at=new_rev.created_at,
                    reason=new_rev.reason_for_change
                ))

        return entries

    @staticmethod
    def export_baseline(history: ProjectHistory, baseline_version: str) -> str:
        """Mengekspor baseline aktif terstruktur beserta approval records dan validation result."""
        baseline = next((b for b in history.baselines if b.baseline_version == baseline_version), None)
        if not baseline:
            raise ValueError(f"Baseline version {baseline_version} tidak ditemukan.")

        rev = next((r for r in history.revisions if r.revision_id == baseline.approved_revision_id), None)
        if not rev:
            raise ValueError("Revisi approved untuk baseline tidak ditemukan.")

        # Find approval record
        approval = next((ap for ap in history.approval_records if ap.revision_id == rev.revision_id), None)
        
        # validation results
        val_res = validate_project_with_engine(rev.data_snapshot)
        
        # Build structure
        out = {
            "baseline_metadata": {
                "baseline_id": baseline.baseline_id,
                "project_id": baseline.project_id,
                "baseline_version": baseline.baseline_version,
                "active": baseline.active,
                "locked_at": baseline.locked_at,
            },
            "approval_metadata": {
                "reviewer": approval.reviewer if approval else "system",
                "decided_at": approval.decided_at if approval else baseline.locked_at,
                "approval_note": approval.approval_note if approval else "",
            },
            "validation_report": {
                "is_valid": val_res.is_valid,
                "is_complete": val_res.is_complete,
                "timestamp": val_res.timestamp,
                "issues": [
                    {
                        "code": i.code,
                        "field_path": i.field_path,
                        "severity": i.severity.value,
                        "message": i.message,
                        "suggestion": i.suggestion
                    } for i in val_res.issues
                ]
            },
            "design_requirements": project_data_from_json(project_data_to_json(rev.data_snapshot)).__dict__
        }
        
        # Remove internal non-serializable elements from design_requirements dict
        if "selected_classification" in out["design_requirements"]:
            out["design_requirements"]["selected_classification"] = list(out["design_requirements"]["selected_classification"])
        if "selected_regulations" in out["design_requirements"]:
            out["design_requirements"]["selected_regulations"] = list(out["design_requirements"]["selected_regulations"])
            
        return json.dumps(out, indent=2)

    # --- Persistence & Index Management Services (Sprint 1.5) ---

    @staticmethod
    def save_project_history(history: ProjectHistory, file_path: str) -> None:
        """Menyimpan ProjectHistory ke file JSON secara aman dan atomic."""
        # Ensure parent directory exists
        dir_name = os.path.dirname(file_path)
        if dir_name and not os.path.exists(dir_name):
            os.makedirs(dir_name, exist_ok=True)

        # Create simple backup if existing file exists
        if os.path.exists(file_path):
            bak_path = file_path + ".bak"
            try:
                if os.path.exists(bak_path):
                    os.remove(bak_path)
                os.rename(file_path, bak_path)
            except Exception:
                pass  # Ignore backup errors, proceed to write

        # Atomic write: write to temp file, then rename
        tmp_path = file_path + ".tmp"
        
        # Build serializable dictionary with schema version
        serialized_data = {
            "schema_version": "1.0",
            "project_id": history.project_id,
            "data": project_history_to_json(history)  # Stored as nested JSON string or we can merge dicts
        }
        # Actually, let's merge them into a single clean JSON dictionary
        history_dict = project_history_from_json(project_history_to_json(history)) # clean check
        from src.domain.stage1_requirements.schemas import project_history_to_dict
        full_dict = project_history_to_dict(history)
        full_dict["schema_version"] = "1.0"

        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(full_dict, f, indent=2)

        # Rename temp file to target file
        if os.path.exists(file_path):
            os.remove(file_path)
        os.rename(tmp_path, file_path)

        # Update Project Index automatically
        if history.revisions:
            latest = history.revisions[-1]
            Stage1RequirementService.update_project_index(
                project_id=history.project_id,
                name=latest.data_snapshot.project_name,
                latest_rev=latest.revision_number,
                file_path=file_path
            )

    @staticmethod
    def load_project_history(file_path: str) -> ProjectHistory:
        """Memuat ProjectHistory dari file JSON dan menvalidasi ulang status."""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Berkas '{file_path}' tidak ditemukan.")

        with open(file_path, "r", encoding="utf-8") as f:
            try:
                data = json.load(f)
            except json.JSONDecodeError as e:
                raise ValueError(f"Format JSON rusak: {e}")

        # Check structure and schema version
        schema_version = data.get("schema_version", "0.2")

        # Load history using the schema decoder
        history = project_history_from_dict(data)

        # Recalculate validation status for all revisions
        for r in history.revisions:
            res = validate_project_with_engine(r.data_snapshot)
            r.data_snapshot.is_complete = res.is_complete and res.is_valid
            
            # Recalculate revision status based on validation status (without breaking approved status)
            if r.status not in [RevisionStatus.APPROVED, RevisionStatus.SUPERSEDED, RevisionStatus.ARCHIVED]:
                if not res.is_valid:
                    r.status = RevisionStatus.VALIDATION_FAILED
                elif res.is_complete:
                    r.status = RevisionStatus.READY_FOR_REVIEW
                else:
                    r.status = RevisionStatus.DRAFT

        return history

    @staticmethod
    def get_import_preview(json_str: str) -> Dict[str, Any]:
        """Menghasilkan preview data sebelum di-import untuk verifikasi pengguna."""
        try:
            data = json.loads(json_str)
        except json.JSONDecodeError:
            raise ValueError("File bukan format JSON yang valid.")

        # Check if legacy or new format
        if "project_id" in data and "project_name" in data and "revisions" not in data:
            # Legacy format
            project_id = data.get("project_id", "")
            project_name = data.get("project_name", "")
            owner = data.get("owner", "")
            rev_num = data.get("revision_number", 0)
            return {
                "schema_version": "0.2 (Legacy)",
                "project_id": project_id,
                "project_name": project_name,
                "owner": owner,
                "total_revisions": 1,
                "latest_revision_number": rev_num,
                "is_legacy": True
            }
        else:
            # New ProjectHistory format
            project_id = data.get("project_id", "")
            revisions = data.get("revisions", [])
            latest_name = ""
            latest_owner = ""
            latest_rev_num = 0
            if revisions:
                latest_snap = revisions[-1].get("data_snapshot", {})
                latest_name = latest_snap.get("project_name", "")
                latest_owner = latest_snap.get("owner", "")
                latest_rev_num = revisions[-1].get("revision_number", 0)

            return {
                "schema_version": data.get("schema_version", "1.0"),
                "project_id": project_id,
                "project_name": latest_name,
                "owner": latest_owner,
                "total_revisions": len(revisions),
                "latest_revision_number": latest_rev_num,
                "is_legacy": False
            }

    @staticmethod
    def update_project_index(project_id: str, name: str, latest_rev: int, file_path: str, index_path: str = "data/project_index.json") -> None:
        """Memperbarui metadata indeks proyek lokal."""
        dir_name = os.path.dirname(index_path)
        if dir_name and not os.path.exists(dir_name):
            os.makedirs(dir_name, exist_ok=True)

        index_data = {}
        if os.path.exists(index_path):
            try:
                with open(index_path, "r", encoding="utf-8") as f:
                    index_data = json.load(f)
            except Exception:
                pass

        index_data[project_id] = {
            "project_id": project_id,
            "project_name": name,
            "latest_revision": latest_rev,
            "file_path": file_path,
            "last_updated": datetime.now(timezone.utc).isoformat()
        }

        # Atomic write for index
        tmp_index = index_path + ".tmp"
        with open(tmp_index, "w", encoding="utf-8") as f:
            json.dump(index_data, f, indent=2)
        if os.path.exists(index_path):
            os.remove(index_path)
        os.rename(tmp_index, index_path)

    @staticmethod
    def generate_handoff_payload(history: ProjectHistory, baseline_version: str) -> Dict[str, Any]:
        """Menghasilkan handoff payload terstruktur untuk Tahap 2 (handoff.stage2_requirements)."""
        baseline_json = Stage1RequirementService.export_baseline(history, baseline_version)
        data = json.loads(baseline_json)
        
        return {
            "namespace": "handoff.stage2_requirements",
            "schema_version": "1.0",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "approved_baseline": data
        }


