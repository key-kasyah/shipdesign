from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from src.core.enums import RevisionStatus, ValidationSeverity

@dataclass
class ComparableShip:
    """Model data kapal pembanding."""
    ship_name: str
    vessel_type: str
    dwt_ton: float
    loa_m: float
    lbp_m: float
    breadth_m: float
    draft_m: float
    depth_m: float
    service_speed_knots: float
    cb: float
    ehp_kw: Optional[float] = None
    bhp_kw: Optional[float] = None
    source_reference: Optional[str] = None

@dataclass
class WeightItem:
    """Model data item berat ringan (LWT) atau berat mati (DWT)."""
    group_name: str  # Hull, Machinery, Outfit, Payload, Fuel, Water, Stores, Crew
    weight_ton: float
    lcg_m: float = 0.0
    vcg_m: float = 0.0
    tcg_m: float = 0.0
    margin_percent: float = 0.0

@dataclass
class CapacityItem:
    """Model tangki/ruang muat untuk capacity check."""
    compartment_name: str  # Cargo Hold, Fuel Oil Tank, Fresh Water Tank, Water Ballast
    required_volume_m3: float
    available_volume_m3: float
    lcg_m: float = 0.0
    vcg_m: float = 0.0

@dataclass
class GeometryData:
    """Ordinat kurva CSA, DWL, dan Gading 10 pada 21 station (0 s.d 20)."""
    csa_ordinates: List[float] = field(default_factory=lambda: [0.0] * 21)
    dwl_ordinates: List[float] = field(default_factory=lambda: [0.0] * 21)
    gading10_ordinates: List[float] = field(default_factory=lambda: [0.0] * 21)

@dataclass
class DesignScenario:
    """
    Model data utama untuk satu skenario Pra-Rancangan Kapal (Tahap 2).
    """
    scenario_id: str
    scenario_name: str
    project_id: str
    parent_scenario_id: Optional[str] = None
    
    # Kapal Pembanding Utama
    primary_comparable_ship: Optional[ComparableShip] = None
    
    # Ukuran Utama & Dimensi
    lbp_m: float = 0.0
    loa_m: float = 0.0
    breadth_m: float = 0.0
    depth_m: float = 0.0
    draft_m: float = 0.0
    lwl_m: float = 0.0
    froude_number: float = 0.0
    
    # Koefisien Bentuk & Displacement
    cb: float = 0.0
    cm: float = 0.0
    cw: float = 0.0
    cp: float = 0.0
    displacement_m3: float = 0.0
    displacement_ton: float = 0.0
    water_density_t_m3: float = 1.025
    
    # Berat & Keseimbangan Berat
    weight_items: List[WeightItem] = field(default_factory=list)
    weight_mismatch_percent: float = 0.0
    kg_m: float = 0.0
    lcg_m: float = 0.0
    
    # Kapasitas & Endurance
    capacity_items: List[CapacityItem] = field(default_factory=list)
    endurance_days: float = 0.0
    
    # Daya NSP & Kinerja Mesin
    ehp_kw: float = 0.0
    bhp_kw: float = 0.0
    propulsive_efficiency: float = 0.55
    sea_margin_percent: float = 15.0
    
    # Geometri CSA/DWL/Gading 10
    geometry: GeometryData = field(default_factory=GeometryData)
    
    # Stabilitas & Trim Awal
    kb_m: float = 0.0
    bm_m: float = 0.0
    km_m: float = 0.0
    gm_m: float = 0.0
    lcb_m: float = 0.0
    trim_angle_deg: float = 0.0
    
    # Metadata Skenario
    is_complete: bool = False
    updated_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )

@dataclass
class ScenarioRevision:
    """Merekam snapshot data skenario pada titik waktu tertentu dalam riwayat."""
    revision_id: str
    scenario_id: str
    revision_number: int
    status: RevisionStatus
    data_snapshot: DesignScenario
    created_by: str
    created_at: str
    reason_for_change: Optional[str] = None
    submitted_by: Optional[str] = None
    submitted_at: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None
    approval_note: Optional[str] = None

@dataclass
class PreliminaryBaseline:
    """Baseline desain awal yang dikunci."""
    baseline_id: str
    project_id: str
    baseline_version: str
    approved_revision_id: str
    active: bool
    locked_at: str

@dataclass
class PreliminaryAuditLog:
    """Pencatatan aktivitas audit Tahap 2."""
    event_id: str
    project_id: str
    scenario_id: str
    revision_id: Optional[str]
    action: str
    actor: str
    timestamp: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    reason: Optional[str] = None

@dataclass
class Stage2History:
    """Wrapper riwayat pengerjaan Tahap 2."""
    project_id: str
    revisions: List[ScenarioRevision] = field(default_factory=list)
    baselines: List[PreliminaryBaseline] = field(default_factory=list)
    audit_trail: List[PreliminaryAuditLog] = field(default_factory=list)
