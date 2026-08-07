import os
from src.core.enums import PortConstraintHardness, StageStatus, VesselType, WaterType
from src.domain.stage1_requirements.models import ProjectData


def get_valid_project_data() -> ProjectData:
    """Mengembalikan data fixture ProjectData yang valid & lengkap."""
    return ProjectData(
        project_id="PRJ-TEST-001",
        project_name="KM Test Vessel",
        owner="PT Pelayaran Uji",
        organization="ITS Naval Architecture",
        revision_number=0,
        status=StageStatus.ACTIVE,
        vessel_type=VesselType.GENERAL_CARGO,
        vessel_function="Pengangkut kargo umum",
        cargo_type="General Cargo",
        route_name="Surabaya - Banjarmasin",
        origin_port="Tanjung Perak",
        destination_port="Trisakti",
        route_distance_nm=320.0,
        target_dwt_ton=3500.0,
        service_speed_knots=11.5,
        max_speed_knots=13.0,
        endurance_days=7.0,
        payload_capacity_ton=3000.0,
        crew_count=15,
        passenger_count=0,
        water_type=WaterType.SEAWATER,
        water_density_t_m3=1.025,
        design_temperature_c=25.0,
        max_draft_m=5.5,
        max_loa_m=90.0,
        max_breadth_m=16.0,
        max_air_draft_m=20.0,
        draft_constraint_type=PortConstraintHardness.HARD_LIMIT,
        selected_classification=["BKI"],
        selected_regulations=["SOLAS 74"],
        is_complete=True,
    )


def get_minimal_project_data() -> ProjectData:
    """Mengembalikan ProjectData hanya dengan field mandatory."""
    return ProjectData(
        project_id="PRJ-MIN-001",
        project_name="Draf Kapal Minimal",
        owner="PT Uji Minimal",
        vessel_type=VesselType.CONTAINER_SHIP,
        target_dwt_ton=1000.0,
        service_speed_knots=10.0,
        endurance_days=5.0,
        water_density_t_m3=1.025,
    )
