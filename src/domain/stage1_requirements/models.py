from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from src.core.enums import (
    PortConstraintHardness,
    RevisionStatus,
    StageStatus,
    ValidationSeverity,
    VesselType,
    WaterType,
)



@dataclass
class ValidationIssue:
    """Isu spesifik hasil dari validation engine."""
    code: str
    field_path: str
    severity: ValidationSeverity
    message: str
    suggestion: str
    actual_value: Any
    rule_name: str
    rule_source: str


@dataclass
class ValidationResult:
    """Keluaran komprehensif dari validation engine."""
    is_valid: bool
    is_complete: bool
    can_approve_baseline: bool
    issues: List[ValidationIssue] = field(default_factory=list)
    error_count: int = 0
    warning_count: int = 0
    timestamp: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


@dataclass
class ProjectData:
    """
    Domain Model utama untuk Project Data (Tahap 1 — Kebutuhan Kapal).
    Menyimpan data identitas, profil operasional, kebutuhan kapasitas,
    kondisi perairan, batas dimensi, dan pilihan regulasi.
    """
    # Identitas Proyek & Revisi
    project_id: str
    project_name: str
    owner: str
    organization: Optional[str] = None
    revision_number: int = 0
    updated_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    status: StageStatus = StageStatus.ACTIVE

    # Tipe Kapal & Fungsi
    vessel_type: VesselType = VesselType.GENERAL_CARGO
    vessel_function: Optional[str] = None
    cargo_type: Optional[str] = None

    # Trayek & Jarak Pelayaran
    route_name: Optional[str] = None
    operating_area: Optional[str] = None
    origin_port: Optional[str] = None
    destination_port: Optional[str] = None
    route_distance_nm: Optional[float] = None


    # Target Kinerja Utama
    target_dwt_ton: Optional[float] = None
    service_speed_knots: Optional[float] = None
    max_speed_knots: Optional[float] = None
    endurance_days: Optional[float] = None

    # Kapasitas Muatan & Akomodasi
    payload_capacity_ton: Optional[float] = None
    crew_count: Optional[int] = None
    passenger_count: Optional[int] = None

    # Kondisi Perairan & Lingkungan
    water_type: WaterType = WaterType.SEAWATER
    water_density_t_m3: float = 1.025
    design_temperature_c: Optional[float] = None

    # Batas Pelabuhan & Dimensi
    max_draft_m: Optional[float] = None
    max_loa_m: Optional[float] = None
    max_breadth_m: Optional[float] = None
    max_air_draft_m: Optional[float] = None
    draft_constraint_type: PortConstraintHardness = PortConstraintHardness.HARD_LIMIT

    # Klasifikasi & Regulasi
    selected_classification: List[str] = field(default_factory=list)
    selected_regulations: List[str] = field(default_factory=list)

    # Status Kelengkapan Data
    is_complete: bool = False


@dataclass
class ProjectRevision:
    """Merekam snapshot data proyek pada titik waktu tertentu."""
    revision_id: str
    project_id: str
    revision_number: int
    parent_revision_id: Optional[str]
    status: RevisionStatus
    data_snapshot: ProjectData
    created_by: str
    created_at: str
    revision_note: Optional[str] = None
    reason_for_change: Optional[str] = None
    updated_by: Optional[str] = None
    updated_at: Optional[str] = None
    submitted_by: Optional[str] = None
    submitted_at: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None
    approval_note: Optional[str] = None


@dataclass
class ProjectBaseline:
    """Mengikat revisi yang disetujui secara immutable."""
    baseline_id: str
    project_id: str
    baseline_version: str
    approved_revision_id: str
    active: bool
    locked_at: str


@dataclass
class ChangeEntry:
    """Merekam detail perbedaan antara dua revisi."""
    field_path: str
    old_value: Any
    new_value: Any
    changed_by: str
    changed_at: str
    reason: Optional[str] = None


@dataclass
class AuditEvent:
    """Log trail aktivitas sistem."""
    event_id: str
    project_id: str
    revision_id: Optional[str]
    action: str
    actor: str
    timestamp: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    reason: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class ApprovalRecord:
    """Merekam keputusan persetujuan/penolakan."""
    approval_id: str
    revision_id: str
    reviewer: str
    decided_at: str
    decision: str
    approval_note: Optional[str] = None


@dataclass
class ProjectHistory:
    """Membungkus seluruh riwayat revisi, baseline, audit, dan approval proyek."""
    project_id: str
    revisions: List[ProjectRevision] = field(default_factory=list)
    baselines: List[ProjectBaseline] = field(default_factory=list)
    audit_trail: List[AuditEvent] = field(default_factory=list)
    approval_records: List[ApprovalRecord] = field(default_factory=list)


