from typing import Any, Dict, List
from src.core.enums import RevisionStatus, VesselType, WaterType
from src.domain.stage1_requirements.models import ProjectData, ProjectRevision
from src.domain.stage1_requirements.validators import validate_project_with_engine


class ReadinessService:
    """
    Service Layer untuk Requirement Summary & Readiness Check Tahap 1 (Sprint 1.7).
    Memeriksa skor kelengkapan, resiko, dan kesiapan serah terima (handoff).
    """

    @staticmethod
    def generate_readiness_report(project: ProjectData, revision: ProjectRevision) -> Dict[str, Any]:
        """Menghasilkan laporan kesiapan lengkap untuk Tahap 1."""
        val_res = validate_project_with_engine(project)

        # 1. Calculate completeness score (7 required primary fields + 1 route requirement)
        required_fields = [
            "project_id", "project_name", "vessel_type", 
            "target_dwt_ton", "service_speed_knots", 
            "water_density_t_m3", "water_type"
        ]
        
        filled_count = 0
        missing_list = []
        
        for field in required_fields:
            val = getattr(project, field, None)
            if val is not None and (not isinstance(val, str) or val.strip()):
                filled_count += 1
            else:
                missing_list.append(field)
                
        # Check route completeness
        has_route = bool(
            (project.route_name and project.route_name.strip()) or
            (project.operating_area and project.operating_area.strip()) or
            (project.origin_port and project.origin_port.strip() and project.destination_port and project.destination_port.strip())
        )
        
        if has_route:
            filled_count += 1
        else:
            missing_list.append("route_requirements")

        completeness_score = int((filled_count / 8.0) * 100)

        # 2. Determine readiness status
        # NOT_READY, NEEDS_REVISION, READY_FOR_REVIEW, READY_FOR_BASELINE, BASELINED
        if revision.status == RevisionStatus.APPROVED:
            readiness_status = "BASELINED"
        elif not val_res.is_complete:
            readiness_status = "NOT_READY"
        elif not val_res.is_valid:
            readiness_status = "NEEDS_REVISION"
        elif val_res.can_approve_baseline:
            readiness_status = "READY_FOR_BASELINE"
        else:
            readiness_status = "READY_FOR_REVIEW"

        # 3. Identify risks and assumptions
        risks_and_assumptions = []
        
        # Check density risk
        if project.water_density_t_m3 is not None and project.water_type:
            if project.water_type == WaterType.SEAWATER and not (1.020 <= project.water_density_t_m3 <= 1.030):
                risks_and_assumptions.append({
                    "type": "RISK",
                    "parameter": "water_density_t_m3",
                    "description": f"Densitas air laut ekstrim ({project.water_density_t_m3} t/m³) dapat mempengaruhi perhitungan sarat praktis lambung."
                })
            elif project.water_type == WaterType.FRESHWATER and not (0.998 <= project.water_density_t_m3 <= 1.002):
                risks_and_assumptions.append({
                    "type": "RISK",
                    "parameter": "water_density_t_m3",
                    "description": f"Densitas air tawar tidak biasa ({project.water_density_t_m3} t/m³)."
                })

        # Check endurance risk
        if project.route_distance_nm and project.service_speed_knots and project.service_speed_knots > 0:
            est_transit = project.route_distance_nm / project.service_speed_knots / 24.0
            if project.endurance_days and project.endurance_days < est_transit:
                risks_and_assumptions.append({
                    "type": "RISK",
                    "parameter": "endurance_days",
                    "description": f"Endurance ({project.endurance_days} hari) kurang dari waktu transit teoritis sekali jalan ({est_transit:.2f} hari)."
                })
            else:
                risks_and_assumptions.append({
                    "type": "ASSUMPTION",
                    "parameter": "endurance_days",
                    "description": f"Endurance {project.endurance_days or 10.0} hari diasumsikan cukup dengan margin operasi cuaca normal."
                })

        # Check crew count assumption
        if project.crew_count is not None:
            if project.crew_count == 0:
                risks_and_assumptions.append({
                    "type": "RISK",
                    "parameter": "crew_count",
                    "description": "Kapal beroperasi dengan kru nol. Keamanan navigasi dan regulasi pelayaran harus dipastikan."
                })
            else:
                risks_and_assumptions.append({
                    "type": "ASSUMPTION",
                    "parameter": "crew_count",
                    "description": f"Kebutuhan akomodasi direncanakan untuk {project.crew_count} orang awak kapal."
                })

        # 4. Summarize operational and capacity profiles
        operational_profile = {
            "vessel_type": project.vessel_type.value,
            "service_speed_knots": project.service_speed_knots,
            "operating_area": project.operating_area or "Tidak dispesifikasikan",
            "route": f"{project.origin_port or '-'} -> {project.destination_port or '-'}" if (project.origin_port and project.destination_port) else "Tidak dispesifikasikan",
            "route_distance_nm": project.route_distance_nm
        }

        capacity_requirements = {
            "target_dwt_ton": project.target_dwt_ton,
            "payload_capacity_ton": project.payload_capacity_ton,
            "crew_count": project.crew_count,
            "passenger_count": project.passenger_count
        }

        design_constraints = {
            "max_draft_m": project.max_draft_m,
            "max_loa_m": project.max_loa_m,
            "max_breadth_m": project.max_breadth_m,
            "max_air_draft_m": project.max_air_draft_m,
            "draft_constraint_type": project.draft_constraint_type.value
        }

        # Unresolved decisions (warnings in validation results)
        unresolved_decisions = [
            {
                "code": i.code,
                "field_path": i.field_path,
                "warning_message": i.message,
                "suggestion": i.suggestion
            } for i in val_res.issues if i.severity == "WARNING"
        ]

        return {
            "project_id": project.project_id,
            "revision_number": revision.revision_number,
            "readiness_status": readiness_status,
            "completeness_score": completeness_score,
            "missing_requirements": missing_list,
            "validation_summary": {
                "is_valid": val_res.is_valid,
                "is_complete": val_res.is_complete,
                "error_count": val_res.error_count,
                "warning_count": val_res.warning_count
            },
            "risks_and_assumptions": risks_and_assumptions,
            "operational_profile": operational_profile,
            "capacity_requirements": capacity_requirements,
            "design_constraints": design_constraints,
            "unresolved_decisions": unresolved_decisions,
            "handoff_ready": readiness_status in ["READY_FOR_BASELINE", "BASELINED"]
        }
