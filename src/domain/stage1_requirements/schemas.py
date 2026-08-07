import json
from dataclasses import asdict
from typing import Any, Dict, List
import uuid

from src.core.enums import (
    PortConstraintHardness,
    RevisionStatus,
    StageStatus,
    VesselType,
    WaterType,
)
from src.domain.stage1_requirements.models import (
    ApprovalRecord,
    AuditEvent,
    ChangeEntry,
    ProjectBaseline,
    ProjectData,
    ProjectHistory,
    ProjectRevision,
)


def project_data_to_dict(project_data: ProjectData) -> Dict[str, Any]:
    """Mengonversi objek ProjectData menjadi dictionary serializable."""
    data = asdict(project_data)
    # Convert enums to string values
    data["vessel_type"] = project_data.vessel_type.value if isinstance(project_data.vessel_type, VesselType) else project_data.vessel_type
    data["water_type"] = project_data.water_type.value if isinstance(project_data.water_type, WaterType) else project_data.water_type
    data["draft_constraint_type"] = project_data.draft_constraint_type.value if isinstance(project_data.draft_constraint_type, PortConstraintHardness) else project_data.draft_constraint_type
    data["status"] = project_data.status.value if isinstance(project_data.status, StageStatus) else project_data.status
    return data


def project_data_to_json(project_data: ProjectData, indent: int = 2) -> str:
    """Mengonversi objek ProjectData menjadi string JSON."""
    return json.dumps(project_data_to_dict(project_data), indent=indent)


def project_data_from_dict(data: Dict[str, Any]) -> ProjectData:
    """Membuat objek ProjectData dari dictionary data."""
    data_copy = dict(data)
    
    # Backward compatibility for operating_area
    if "operating_area" not in data_copy:
        data_copy["operating_area"] = None
        
    if "vessel_type" in data_copy and isinstance(data_copy["vessel_type"], str):
        data_copy["vessel_type"] = VesselType(data_copy["vessel_type"])
        
    if "water_type" in data_copy and isinstance(data_copy["water_type"], str):
        data_copy["water_type"] = WaterType(data_copy["water_type"])
        
    if "draft_constraint_type" in data_copy and isinstance(data_copy["draft_constraint_type"], str):
        data_copy["draft_constraint_type"] = PortConstraintHardness(data_copy["draft_constraint_type"])
        
    if "status" in data_copy and isinstance(data_copy["status"], str):
        data_copy["status"] = StageStatus(data_copy["status"])
        
    return ProjectData(**data_copy)


def project_data_from_json(json_str: str) -> ProjectData:
    """Membuat objek ProjectData dari string JSON."""
    data = json.loads(json_str)
    return project_data_from_dict(data)


# --- Revision & History Serialization Helpers ---

def project_history_to_dict(history: ProjectHistory) -> Dict[str, Any]:
    """Mengonversi objek ProjectHistory menjadi dictionary serializable."""
    revisions_list = []
    for r in history.revisions:
        revisions_list.append({
            "revision_id": r.revision_id,
            "project_id": r.project_id,
            "revision_number": r.revision_number,
            "parent_revision_id": r.parent_revision_id,
            "status": r.status.value if isinstance(r.status, RevisionStatus) else r.status,
            "data_snapshot": project_data_to_dict(r.data_snapshot),
            "created_by": r.created_by,
            "created_at": r.created_at,
            "revision_note": r.revision_note,
            "reason_for_change": r.reason_for_change,
            "updated_by": r.updated_by,
            "updated_at": r.updated_at,
            "submitted_by": r.submitted_by,
            "submitted_at": r.submitted_at,
            "reviewed_by": r.reviewed_by,
            "reviewed_at": r.reviewed_at,
            "approval_note": r.approval_note,
        })

    baselines_list = [asdict(b) for b in history.baselines]
    
    # Audit trail changes contain Any, so we need safe serialization
    audit_list = []
    for a in history.audit_trail:
        audit_list.append({
            "event_id": a.event_id,
            "project_id": a.project_id,
            "revision_id": a.revision_id,
            "action": a.action,
            "actor": a.actor,
            "timestamp": a.timestamp,
            "old_value": a.old_value,
            "new_value": a.new_value,
            "reason": a.reason,
            "metadata": a.metadata,
        })

    approval_list = [asdict(ap) for ap in history.approval_records]

    return {
        "project_id": history.project_id,
        "revisions": revisions_list,
        "baselines": baselines_list,
        "audit_trail": audit_list,
        "approval_records": approval_list,
    }


def project_history_to_json(history: ProjectHistory, indent: int = 2) -> str:
    """Mengonversi objek ProjectHistory menjadi string JSON."""
    return json.dumps(project_history_to_dict(history), indent=indent)


def project_history_from_dict(data: Dict[str, Any]) -> ProjectHistory:
    """Membuat objek ProjectHistory dari dictionary data."""
    # Check if this is a legacy ProjectData dict (backward compatibility)
    if "project_id" in data and "project_name" in data and "revisions" not in data:
        # Automatically upgrade legacy ProjectData to ProjectHistory
        project_data = project_data_from_dict(data)
        
        # Create a default revision
        default_rev_id = str(uuid.uuid4())
        default_revision = ProjectRevision(
            revision_id=default_rev_id,
            project_id=project_data.project_id,
            revision_number=project_data.revision_number or 0,
            parent_revision_id=None,
            status=RevisionStatus.APPROVED if project_data.is_complete else RevisionStatus.DRAFT,
            data_snapshot=project_data,
            created_by=project_data.owner or "system",
            created_at=project_data.updated_at,
        )
        
        history = ProjectHistory(project_id=project_data.project_id)
        history.revisions.append(default_revision)
        
        # If it was complete, also set a default baseline
        if project_data.is_complete:
            default_baseline = ProjectBaseline(
                baseline_id=str(uuid.uuid4()),
                project_id=project_data.project_id,
                baseline_version="v0.2",
                approved_revision_id=default_rev_id,
                active=True,
                locked_at=project_data.updated_at,
            )
            history.baselines.append(default_baseline)
            
        return history

    project_id = data.get("project_id", "")
    history = ProjectHistory(project_id=project_id)

    for r_data in data.get("revisions", []):
        snapshot_dict = r_data["data_snapshot"]
        snapshot = project_data_from_dict(snapshot_dict)
        
        status_str = r_data.get("status", "DRAFT")
        status = RevisionStatus(status_str) if isinstance(status_str, str) else status_str
        
        revision = ProjectRevision(
            revision_id=r_data["revision_id"],
            project_id=r_data["project_id"],
            revision_number=r_data["revision_number"],
            parent_revision_id=r_data.get("parent_revision_id"),
            status=status,
            data_snapshot=snapshot,
            created_by=r_data["created_by"],
            created_at=r_data["created_at"],
            revision_note=r_data.get("revision_note"),
            reason_for_change=r_data.get("reason_for_change"),
            updated_by=r_data.get("updated_by"),
            updated_at=r_data.get("updated_at"),
            submitted_by=r_data.get("submitted_by"),
            submitted_at=r_data.get("submitted_at"),
            reviewed_by=r_data.get("reviewed_by"),
            reviewed_at=r_data.get("reviewed_at"),
            approval_note=r_data.get("approval_note"),
        )
        history.revisions.append(revision)

    for b_data in data.get("baselines", []):
        baseline = ProjectBaseline(
            baseline_id=b_data["baseline_id"],
            project_id=b_data["project_id"],
            baseline_version=b_data["baseline_version"],
            approved_revision_id=b_data["approved_revision_id"],
            active=b_data["active"],
            locked_at=b_data["locked_at"],
        )
        history.baselines.append(baseline)

    for a_data in data.get("audit_trail", []):
        event = AuditEvent(
            event_id=a_data["event_id"],
            project_id=a_data["project_id"],
            revision_id=a_data.get("revision_id"),
            action=a_data["action"],
            actor=a_data["actor"],
            timestamp=a_data["timestamp"],
            old_value=a_data.get("old_value"),
            new_value=a_data.get("new_value"),
            reason=a_data.get("reason"),
            metadata=a_data.get("metadata"),
        )
        history.audit_trail.append(event)

    for ap_data in data.get("approval_records", []):
        approval = ApprovalRecord(
            approval_id=ap_data["approval_id"],
            revision_id=ap_data["revision_id"],
            reviewer=ap_data["reviewer"],
            decided_at=ap_data["decided_at"],
            decision=ap_data["decision"],
            approval_note=ap_data.get("approval_note"),
        )
        history.approval_records.append(approval)

    return history


def project_history_from_json(json_str: str) -> ProjectHistory:
    """Membuat objek ProjectHistory dari string JSON."""
    data = json.loads(json_str)
    return project_history_from_dict(data)
