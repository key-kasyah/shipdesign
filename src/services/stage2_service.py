import json
import os
import uuid
from dataclasses import asdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from src.core.enums import RevisionStatus, ValidationSeverity
from src.domain.stage2_preliminary.models import (
    ComparableShip,
    WeightItem,
    CapacityItem,
    GeometryData,
    DesignScenario,
    ScenarioRevision,
    PreliminaryBaseline,
    PreliminaryAuditLog,
    Stage2History,
)
from src.domain.stage2_preliminary.schemas import (
    stage2_history_to_dict,
    stage2_history_from_dict,
    design_scenario_to_dict,
)
from src.domain.stage2_preliminary.calculators import (
    scale_dimensions,
    calculate_froude_number,
    calculate_displacement,
    calculate_kb,
    calculate_bm,
    calculate_ehp_nsp,
    generate_default_csa,
    generate_default_dwl,
    generate_default_gading10,
)
from src.domain.stage2_preliminary.validators import validate_preliminary_design

class Stage2PreliminaryDesignService:
    """
    Service Layer untuk mengelola Pra-Rancangan Kapal (Tahap 2).
    Mengatur skenario desain, kalkulator otomatis, validasi, dan baseline.
    """

    @staticmethod
    def load_stage2_history(file_path: str, project_id: str) -> Stage2History:
        """Memuat riwayat pengerjaan Tahap 2 dari berkas JSON."""
        if not os.path.exists(file_path):
            return Stage2History(project_id=project_id)
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                return stage2_history_from_dict(data)
        except Exception:
            return Stage2History(project_id=project_id)

    @staticmethod
    def save_stage2_history(hist: Stage2History, file_path: str) -> None:
        """Menyimpan riwayat pengerjaan Tahap 2 ke berkas JSON secara atomik."""
        dir_name = os.path.dirname(file_path)
        if dir_name and not os.path.exists(dir_name):
            os.makedirs(dir_name, exist_ok=True)

        data = stage2_history_to_dict(hist)
        temp_path = file_path + ".tmp"
        with open(temp_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

        if os.path.exists(file_path):
            os.remove(file_path)
        os.rename(temp_path, file_path)

    @classmethod
    def create_scenario(
        cls,
        project_id: str,
        name: str,
        target_dwt: float,
        speed_knots: float,
        comp: Optional[ComparableShip] = None
    ) -> DesignScenario:
        """
        Membuat skenario Pra-Rancangan baru.
        Jika ada kapal pembanding (comp), otomatis menghitung scaling awal.
        """
        scen_id = f"SCEN-{uuid.uuid4().hex[:6].upper()}"
        scen = DesignScenario(
            scenario_id=scen_id,
            scenario_name=name,
            project_id=project_id,
            primary_comparable_ship=comp
        )

        # 1. Terapkan scaling jika ada kapal pembanding
        if comp:
            scaled = scale_dimensions(comp, target_dwt)
            scen.lbp_m = scaled["lbp_m"]
            scen.loa_m = scaled["loa_m"]
            scen.breadth_m = scaled["breadth_m"]
            scen.draft_m = scaled["draft_m"]
            scen.depth_m = scaled["depth_m"]
            scen.cb = comp.cb
        else:
            # Nilai inisialisasi default kasar
            scen.lbp_m = 90.0
            scen.loa_m = 98.0
            scen.breadth_m = 16.0
            scen.draft_m = 5.5
            scen.depth_m = 8.0
            scen.cb = 0.70

        # Parameter turunan koefisien default
        scen.cm = 0.98
        scen.cw = 0.78
        scen.cp = round(scen.cb / scen.cm, 3) if scen.cm > 0 else 0.71
        scen.lwl_m = round(scen.lbp_m * 1.02, 3)
        scen.froude_number = round(calculate_froude_number(scen.lwl_m, speed_knots), 3)

        # Perhitungan Displacement
        scen.displacement_m3 = round(scen.lbp_m * scen.breadth_m * scen.draft_m * scen.cb, 2)
        scen.displacement_ton = round(calculate_displacement(scen.displacement_m3, scen.water_density_t_m3), 2)

        # 2. Kelompok Berat (Weight items) inisialisasi default
        # LWT Hull = 62% dari berat kosong
        # LWT Machinery = 18%
        # LWT Outfit = 15%
        # Margin = 5%
        lwt_estimasi = scen.displacement_ton - target_dwt
        if lwt_estimasi <= 0:
            lwt_estimasi = target_dwt * 0.4  # fallback

        scen.weight_items = [
            WeightItem(group_name="Hull Structure", weight_ton=round(lwt_estimasi * 0.62, 2), lcg_m=round(scen.lbp_m * 0.48, 2), vcg_m=round(scen.depth_m * 0.55, 2)),
            WeightItem(group_name="Machinery Plant", weight_ton=round(lwt_estimasi * 0.18, 2), lcg_m=round(scen.lbp_m * 0.15, 2), vcg_m=round(scen.depth_m * 0.35, 2)),
            WeightItem(group_name="Outfit & Accommodation", weight_ton=round(lwt_estimasi * 0.15, 2), lcg_m=round(scen.lbp_m * 0.45, 2), vcg_m=round(scen.depth_m * 0.75, 2)),
            WeightItem(group_name="LWT Margin", weight_ton=round(lwt_estimasi * 0.05, 2), lcg_m=round(scen.lbp_m * 0.45, 2), vcg_m=round(scen.depth_m * 0.60, 2)),
            WeightItem(group_name="Cargo Payload", weight_ton=target_dwt * 0.9, lcg_m=round(scen.lbp_m * 0.50, 2), vcg_m=round(scen.depth_m * 0.45, 2)),
            WeightItem(group_name="Consumables & Fuel", weight_ton=target_dwt * 0.1, lcg_m=round(scen.lbp_m * 0.35, 2), vcg_m=round(scen.depth_m * 0.20, 2)),
        ]

        # 3. Kelompok kapasitas inisialisasi default
        scen.capacity_items = [
            CapacityItem(compartment_name="Cargo Holds", required_volume_m3=scen.displacement_m3 * 0.7, available_volume_m3=scen.displacement_m3 * 0.72),
            CapacityItem(compartment_name="Fuel Oil Tanks", required_volume_m3=250.0, available_volume_m3=260.0),
            CapacityItem(compartment_name="Fresh Water Tanks", required_volume_m3=80.0, available_volume_m3=85.0),
        ]

        # 4. Hitung KB, BM, KM, GM, EHP
        scen.kb_m = round(calculate_kb(scen.draft_m, scen.cb, scen.cw), 3)
        scen.bm_m = round(calculate_bm(scen.breadth_m, scen.draft_m, scen.cb, scen.cw), 3)
        scen.km_m = round(scen.kb_m + scen.bm_m, 3)
        
        # Hitung berat center vertikal KG (rata-rata terbobot VCG)
        total_w = sum(w.weight_ton for w in scen.weight_items)
        if total_w > 0:
            moment_v = sum(w.weight_ton * w.vcg_m for w in scen.weight_items)
            moment_l = sum(w.weight_ton * w.lcg_m for w in scen.weight_items)
            scen.kg_m = round(moment_v / total_w, 3)
            scen.lcg_m = round(moment_l / total_w, 3)
        else:
            scen.kg_m = round(scen.depth_m * 0.55, 3)
            scen.lcg_m = round(scen.lbp_m * 0.48, 3)

        scen.gm_m = round(scen.km_m - scen.kg_m, 3)
        scen.lcb_m = round(scen.lbp_m * 0.49, 3) # default center buoyancy

        # EHP NSP
        scen.ehp_kw = round(calculate_ehp_nsp(scen.displacement_ton, speed_knots, scen.cb), 2)
        scen.bhp_kw = round(scen.ehp_kw / scen.propulsive_efficiency * (1.0 + scen.sea_margin_percent / 100.0), 2)

        # 5. Geometri curves
        scen.geometry = GeometryData(
            csa_ordinates=generate_default_csa(scen.lbp_m, scen.displacement_m3, scen.cb),
            dwl_ordinates=generate_default_dwl(scen.lbp_m, scen.breadth_m, scen.cw),
            gading10_ordinates=generate_default_gading10(scen.breadth_m, scen.depth_m, scen.cm)
        )

        scen.is_complete = True
        return scen

    @classmethod
    def update_scenario_data(
        cls,
        scen: DesignScenario,
        updates: Dict[str, Any],
        speed_knots: float
    ) -> None:
        """Memperbarui variabel skenario desain & menghitung ulang dependensi terdampak."""
        for k, v in updates.items():
            if hasattr(scen, k):
                # Set attribute
                setattr(scen, k, v)

        # Recalculate CP
        if scen.cm > 0:
            scen.cp = round(scen.cb / scen.cm, 3)
            
        scen.lwl_m = round(scen.lbp_m * 1.02, 3)
        scen.froude_number = round(calculate_froude_number(scen.lwl_m, speed_knots), 3)
        
        # Recalculate displacement
        scen.displacement_m3 = round(scen.lbp_m * scen.breadth_m * scen.draft_m * scen.cb, 2)
        scen.displacement_ton = round(calculate_displacement(scen.displacement_m3, scen.water_density_t_m3), 2)

        # KB, BM, KM
        scen.kb_m = round(calculate_kb(scen.draft_m, scen.cb, scen.cw), 3)
        scen.bm_m = round(calculate_bm(scen.breadth_m, scen.draft_m, scen.cb, scen.cw), 3)
        scen.km_m = round(scen.kb_m + scen.bm_m, 3)

        # Weight centroid & mismatch
        total_w = sum(w.weight_ton for w in scen.weight_items)
        if total_w > 0:
            moment_v = sum(w.weight_ton * w.vcg_m for w in scen.weight_items)
            moment_l = sum(w.weight_ton * w.lcg_m for w in scen.weight_items)
            scen.kg_m = round(moment_v / total_w, 3)
            scen.lcg_m = round(moment_l / total_w, 3)
            if scen.displacement_ton > 0:
                scen.weight_mismatch_percent = round(
                    abs(total_w - scen.displacement_ton) / scen.displacement_ton * 100.0, 2
                )
        
        scen.gm_m = round(scen.km_m - scen.kg_m, 3)

        # EHP
        scen.ehp_kw = round(calculate_ehp_nsp(scen.displacement_ton, speed_knots, scen.cb), 2)
        scen.bhp_kw = round(scen.ehp_kw / scen.propulsive_efficiency * (1.0 + scen.sea_margin_percent / 100.0), 2)

        # Curves update
        scen.geometry = GeometryData(
            csa_ordinates=generate_default_csa(scen.lbp_m, scen.displacement_m3, scen.cb),
            dwl_ordinates=generate_default_dwl(scen.lbp_m, scen.breadth_m, scen.cw),
            gading10_ordinates=generate_default_gading10(scen.breadth_m, scen.depth_m, scen.cm)
        )
        scen.updated_at = datetime.now(timezone.utc).isoformat()

    @staticmethod
    def create_initial_history_revision(
        scen: DesignScenario,
        creator: str,
        reason: str = "Inisialisasi skenario"
    ) -> ScenarioRevision:
        """Membuat record ScenarioRevision pertama (Rev. 0)."""
        rev_id = f"SREV-{uuid.uuid4().hex[:6].upper()}"
        return ScenarioRevision(
            revision_id=rev_id,
            scenario_id=scen.scenario_id,
            revision_number=0,
            status=RevisionStatus.DRAFT,
            data_snapshot=scen,
            created_by=creator,
            created_at=datetime.now(timezone.utc).isoformat(),
            reason_for_change=reason
        )

    @classmethod
    def create_new_revision_branch(
        cls,
        hist: Stage2History,
        parent_rev: ScenarioRevision,
        creator: str,
        reason: str
    ) -> ScenarioRevision:
        """Mencabangkan revisi skenario baru dari revisi pimpinan/approved sebelumnya."""
        scen_copy = DesignScenario(
            scenario_id=parent_rev.scenario_id,
            scenario_name=parent_rev.data_snapshot.scenario_name,
            project_id=parent_rev.data_snapshot.project_id,
            parent_scenario_id=parent_rev.revision_id,
            primary_comparable_ship=parent_rev.data_snapshot.primary_comparable_ship,
            lbp_m=parent_rev.data_snapshot.lbp_m,
            loa_m=parent_rev.data_snapshot.loa_m,
            breadth_m=parent_rev.data_snapshot.breadth_m,
            depth_m=parent_rev.data_snapshot.depth_m,
            draft_m=parent_rev.data_snapshot.draft_m,
            lwl_m=parent_rev.data_snapshot.lwl_m,
            froude_number=parent_rev.data_snapshot.froude_number,
            cb=parent_rev.data_snapshot.cb,
            cm=parent_rev.data_snapshot.cm,
            cw=parent_rev.data_snapshot.cw,
            cp=parent_rev.data_snapshot.cp,
            displacement_m3=parent_rev.data_snapshot.displacement_m3,
            displacement_ton=parent_rev.data_snapshot.displacement_ton,
            water_density_t_m3=parent_rev.data_snapshot.water_density_t_m3,
            weight_items=[WeightItem(**asdict(w)) for w in parent_rev.data_snapshot.weight_items],
            weight_mismatch_percent=parent_rev.data_snapshot.weight_mismatch_percent,
            kg_m=parent_rev.data_snapshot.kg_m,
            lcg_m=parent_rev.data_snapshot.lcg_m,
            capacity_items=[CapacityItem(**asdict(c)) for c in parent_rev.data_snapshot.capacity_items],
            endurance_days=parent_rev.data_snapshot.endurance_days,
            ehp_kw=parent_rev.data_snapshot.ehp_kw,
            bhp_kw=parent_rev.data_snapshot.bhp_kw,
            propulsive_efficiency=parent_rev.data_snapshot.propulsive_efficiency,
            sea_margin_percent=parent_rev.data_snapshot.sea_margin_percent,
            geometry=GeometryData(
                csa_ordinates=list(parent_rev.data_snapshot.geometry.csa_ordinates),
                dwl_ordinates=list(parent_rev.data_snapshot.geometry.dwl_ordinates),
                gading10_ordinates=list(parent_rev.data_snapshot.geometry.gading10_ordinates)
            ),
            kb_m=parent_rev.data_snapshot.kb_m,
            bm_m=parent_rev.data_snapshot.bm_m,
            km_m=parent_rev.data_snapshot.km_m,
            gm_m=parent_rev.data_snapshot.gm_m,
            lcb_m=parent_rev.data_snapshot.lcb_m,
            trim_angle_deg=parent_rev.data_snapshot.trim_angle_deg,
            is_complete=parent_rev.data_snapshot.is_complete,
            updated_at=datetime.now(timezone.utc).isoformat()
        )
        
        # Lock status of parent revision
        parent_rev.status = RevisionStatus.SUPERSEDED
        
        new_rev_id = f"SREV-{uuid.uuid4().hex[:6].upper()}"
        new_rev = ScenarioRevision(
            revision_id=new_rev_id,
            scenario_id=scen_copy.scenario_id,
            revision_number=len([r for r in hist.revisions if r.scenario_id == scen_copy.scenario_id]),
            status=RevisionStatus.DRAFT,
            data_snapshot=scen_copy,
            created_by=creator,
            created_at=datetime.now(timezone.utc).isoformat(),
            reason_for_change=reason
        )
        hist.revisions.append(new_rev)
        return new_rev

    @staticmethod
    def submit_scenario_revision(
        hist: Stage2History,
        rev_id: str,
        actor: str
    ) -> None:
        """Mengajukan skenario revisi draf untuk diperiksa pimpinan."""
        rev = next((r for r in hist.revisions if r.revision_id == rev_id), None)
        if not rev:
            raise ValueError(f"Scenario revision {rev_id} tidak ditemukan.")
            
        res = validate_preliminary_design(rev.data_snapshot)
        if not res.is_complete:
            raise ValueError("Data skenario pra-rancangan belum lengkap untuk diajukan.")
            
        rev.status = RevisionStatus.WAITING_FOR_REVIEW
        rev.submitted_by = actor
        rev.submitted_at = datetime.now(timezone.utc).isoformat()
        
        hist.audit_trail.append(PreliminaryAuditLog(
            event_id=f"AUD-{uuid.uuid4().hex[:6].upper()}",
            project_id=hist.project_id,
            scenario_id=rev.scenario_id,
            revision_id=rev_id,
            action="SUBMIT_FOR_REVIEW",
            actor=actor,
            timestamp=datetime.now(timezone.utc).isoformat(),
            reason="Mengajukan draf pra-rancangan ke review gate"
        ))

    @staticmethod
    def approve_scenario_revision(
        hist: Stage2History,
        rev_id: str,
        reviewer: str,
        note: str,
        version: str = "v0.1"
    ) -> None:
        """Pemberian persetujuan pimpinan (APPROVED) dan membekukan Design Baseline Tahap 2."""
        rev = next((r for r in hist.revisions if r.revision_id == rev_id), None)
        if not rev:
            raise ValueError(f"Scenario revision {rev_id} tidak ditemukan.")
            
        res = validate_preliminary_design(rev.data_snapshot)
        if not res.is_valid:
            raise ValueError("Skenario memiliki BLOCKING ERROR/ERROR validasi sehingga tidak bisa di-approve.")
            
        rev.status = RevisionStatus.APPROVED
        rev.reviewed_by = reviewer
        rev.reviewed_at = datetime.now(timezone.utc).isoformat()
        rev.approval_note = note
        
        # De-active all other baselines
        for b in hist.baselines:
            b.active = False
            
        # Create new active baseline
        new_base = PreliminaryBaseline(
            baseline_id=f"BASE-{uuid.uuid4().hex[:6].upper()}",
            project_id=hist.project_id,
            baseline_version=version,
            approved_revision_id=rev_id,
            active=True,
            locked_at=datetime.now(timezone.utc).isoformat()
        )
        hist.baselines.append(new_base)
        
        hist.audit_trail.append(PreliminaryAuditLog(
            event_id=f"AUD-{uuid.uuid4().hex[:6].upper()}",
            project_id=hist.project_id,
            scenario_id=rev.scenario_id,
            revision_id=rev_id,
            action="APPROVE_BASELINE",
            actor=reviewer,
            timestamp=datetime.now(timezone.utc).isoformat(),
            reason=f"Persetujuan baseline versi {version}. Catatan: {note}"
        ))

    @staticmethod
    def reject_scenario_revision(
        hist: Stage2History,
        rev_id: str,
        reviewer: str,
        note: str
    ) -> None:
        """Penolakan pimpinan (REJECTED) meminta revisi perbaikan parameter."""
        rev = next((r for r in hist.revisions if r.revision_id == rev_id), None)
        if not rev:
            raise ValueError(f"Scenario revision {rev_id} tidak ditemukan.")
            
        rev.status = RevisionStatus.REVISION_REQUIRED
        rev.reviewed_by = reviewer
        rev.reviewed_at = datetime.now(timezone.utc).isoformat()
        rev.approval_note = note
        
        hist.audit_trail.append(PreliminaryAuditLog(
            event_id=f"AUD-{uuid.uuid4().hex[:6].upper()}",
            project_id=hist.project_id,
            scenario_id=rev.scenario_id,
            revision_id=rev_id,
            action="REJECT_REVISION",
            actor=reviewer,
            timestamp=datetime.now(timezone.utc).isoformat(),
            reason=f"Penolakan review. Catatan: {note}"
        ))
