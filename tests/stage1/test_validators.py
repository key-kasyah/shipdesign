import json
import unittest
from datetime import datetime, timezone
from src.core.enums import ValidationSeverity, VesselType, WaterType
from src.domain.stage1_requirements.models import ProjectData, ValidationIssue
from src.domain.stage1_requirements.validators import (
    validate_mandatory_fields,
    validate_project_data,
    validate_project_with_engine,
    validate_speed_consistency,
    validate_value_ranges,
)
from tests.stage1.fixtures import get_minimal_project_data, get_valid_project_data


class TestProjectDataValidators(unittest.TestCase):
    """Unit test validator data model ProjectData."""

    def test_valid_project_validation(self):
        """Uji valid project tanpa error."""
        project = get_valid_project_data()
        res = validate_project_with_engine(project)

        self.assertTrue(res.is_valid)
        self.assertTrue(res.is_complete)
        self.assertTrue(res.can_approve_baseline)
        self.assertEqual(res.error_count, 0)

    def test_warning_does_not_make_result_invalid(self):
        """Uji bahwa warning tidak membuat result invalid."""
        project = get_valid_project_data()
        project.origin_port = "Surabaya"
        project.destination_port = "Surabaya"  # Identical ports -> Warning

        res = validate_project_with_engine(project)
        self.assertTrue(res.is_valid)  # is_valid remains True
        self.assertEqual(res.warning_count, 1)

    def test_error_makes_result_invalid(self):
        """Uji bahwa error membuat result invalid."""
        project = get_valid_project_data()
        project.max_speed_knots = 5.0
        project.service_speed_knots = 12.0  # max speed < service speed -> Error

        res = validate_project_with_engine(project)
        self.assertFalse(res.is_valid)
        self.assertFalse(res.can_approve_baseline)
        self.assertEqual(res.error_count, 1)

    def test_blocking_error_prevents_baseline_approval(self):
        """Uji bahwa blocking error mencegah baseline approval."""
        project = get_valid_project_data()
        project.project_name = ""  # Missing project name -> Blocking Error

        res = validate_project_with_engine(project)
        self.assertFalse(res.is_complete)
        self.assertFalse(res.can_approve_baseline)

    def test_required_fields(self):
        """Uji field wajib kosong menghasilkan error."""
        project = get_valid_project_data()
        project.project_id = ""
        project.target_dwt_ton = None

        res = validate_project_with_engine(project)
        issues = [i.code for i in res.issues]
        self.assertIn("REQ_PROJECT_ID_MISSING", issues)
        self.assertIn("REQ_DWT_MISSING", issues)

    def test_route_completeness_alternatives(self):
        """Uji kelengkapan alternatif rute."""
        # 1. Valid with route_name
        p1 = get_valid_project_data()
        p1.route_name = "Surabaya-Makassar"
        p1.operating_area = None
        p1.origin_port = None
        p1.destination_port = None
        res1 = validate_project_with_engine(p1)
        self.assertTrue(res1.is_complete)

        # 2. Valid with operating_area
        p2 = get_valid_project_data()
        p2.route_name = None
        p2.operating_area = "Java Sea"
        p2.origin_port = None
        p2.destination_port = None
        res2 = validate_project_with_engine(p2)
        self.assertTrue(res2.is_complete)

        # 3. Valid with origin and destination port
        p3 = get_valid_project_data()
        p3.route_name = None
        p3.operating_area = None
        p3.origin_port = "Jakarta"
        p3.destination_port = "Lampung"
        res3 = validate_project_with_engine(p3)
        self.assertTrue(res3.is_complete)

        # 4. Invalid if none are filled
        p4 = get_valid_project_data()
        p4.route_name = None
        p4.operating_area = None
        p4.origin_port = None
        p4.destination_port = None
        res4 = validate_project_with_engine(p4)
        self.assertFalse(res4.is_complete)
        self.assertTrue(any(i.code == "REQ_ROUTE_MISSING" for i in res4.issues))

    def test_numeric_negative_values(self):
        """Uji penolakan nilai negatif pada payload & crew."""
        project = get_valid_project_data()
        project.payload_capacity_ton = -100.0
        project.crew_count = -5

        res = validate_project_with_engine(project)
        issues = [i.code for i in res.issues]
        self.assertIn("NUM_PAYLOAD_NEGATIVE", issues)
        self.assertIn("NUM_CREW_NEGATIVE", issues)

    def test_optional_max_speed(self):
        """Uji max speed opsional."""
        project = get_valid_project_data()
        project.max_speed_knots = None  # Optional max speed is fine
        res = validate_project_with_engine(project)
        self.assertTrue(res.is_valid)

    def test_max_speed_below_service_speed(self):
        """Uji max speed di bawah service speed."""
        project = get_valid_project_data()
        project.service_speed_knots = 15.0
        project.max_speed_knots = 10.0

        res = validate_project_with_engine(project)
        self.assertTrue(any(i.code == "CROSS_MAX_SPEED_BELOW_SERVICE" for i in res.issues))

    def test_payload_dwt_relations(self):
        """Uji payload sama dengan DWT (diperbolehkan) & melebihi DWT (error)."""
        project = get_valid_project_data()
        
        # 1. Payload sama dengan DWT
        project.payload_capacity_ton = 3500.0
        project.target_dwt_ton = 3500.0
        res1 = validate_project_with_engine(project)
        self.assertFalse(any(i.code == "CROSS_PAYLOAD_EXCEEDS_DWT" for i in res1.issues))

        # 2. Payload melebihi DWT
        project.payload_capacity_ton = 4000.0
        res2 = validate_project_with_engine(project)
        self.assertTrue(any(i.code == "CROSS_PAYLOAD_EXCEEDS_DWT" for i in res2.issues))

    def test_normalization_origin_destination(self):
        """Uji normalisasi origin/destination ports (mengabaikan case dan spasi)."""
        project = get_valid_project_data()
        project.origin_port = "  Tanjung Perak  "
        project.destination_port = "tanjungperak"

        res = validate_project_with_engine(project)
        self.assertTrue(any(i.code == "WARN_ROUTE_PORTS_EQUAL" for i in res.issues))

    def test_density_warnings(self):
        """Uji warning densitas air laut/tawar tidak umum."""
        project = get_valid_project_data()
        
        # Sea water density abnormal
        project.water_type = WaterType.SEAWATER
        project.water_density_t_m3 = 1.05

        res = validate_project_with_engine(project)
        self.assertTrue(any(i.code == "WARN_DENSITY_UNUSUAL_FOR_WATER_TYPE" for i in res.issues))

    def test_endurance_warning(self):
        """Uji warning endurance di bawah waktu transit dasar."""
        project = get_valid_project_data()
        project.route_distance_nm = 1000.0
        project.service_speed_knots = 10.0  # transit time = 100 hours = 4.16 days
        project.endurance_days = 2.0  # < 4.16 days -> Warning

        res = validate_project_with_engine(project)
        self.assertTrue(any(i.code == "WARN_ENDURANCE_BELOW_TRANSIT_TIME" for i in res.issues))

    def test_deterministic_issue_ordering(self):
        """Uji bahwa issues diurutkan secara deterministik berdasarkan code dan field_path."""
        project = get_valid_project_data()
        project.project_name = ""
        project.project_id = ""

        res = validate_project_with_engine(project)
        codes = [i.code for i in res.issues]
        # REQ_PROJECT_ID_MISSING should come before REQ_PROJECT_NAME_MISSING
        self.assertEqual(codes[0], "REQ_PROJECT_ID_MISSING")
        self.assertEqual(codes[1], "REQ_PROJECT_NAME_MISSING")

    def test_utc_timestamp(self):
        """Uji timestamp menggunakan format UTC ISO8601."""
        project = get_valid_project_data()
        res = validate_project_with_engine(project)
        self.assertTrue(res.timestamp.endswith("Z") or "+00:00" in res.timestamp)
        # Parse check
        parsed = datetime.fromisoformat(res.timestamp.replace("Z", "+00:00"))
        self.assertEqual(parsed.tzinfo, timezone.utc)

    def test_validation_result_serialization(self):
        """Uji serialisasi ValidationResult ke dict."""
        project = get_valid_project_data()
        res = validate_project_with_engine(project)
        
        # Convert issues manually to dictionary
        issues_list = []
        for i in res.issues:
            issues_list.append({
                "code": i.code,
                "field_path": i.field_path,
                "severity": i.severity.value,
                "message": i.message,
                "suggestion": i.suggestion,
                "actual_value": i.actual_value,
                "rule_name": i.rule_name,
                "rule_source": i.rule_source
            })
        
        serialized = {
            "is_valid": res.is_valid,
            "is_complete": res.is_complete,
            "can_approve_baseline": res.can_approve_baseline,
            "error_count": res.error_count,
            "warning_count": res.warning_count,
            "timestamp": res.timestamp,
            "issues": issues_list
        }
        self.assertTrue(serialized["is_valid"])
        self.assertEqual(serialized["error_count"], 0)

    def test_backward_compatibility_json(self):
        """Uji kompatibilitas JSON lama Sprint 1.1."""
        old_json = """
        {
          "project_id": "PRJ-OLD-001",
          "project_name": "Old Vessel",
          "owner": "Old Owner",
          "vessel_type": "GENERAL_CARGO",
          "target_dwt_ton": 3000.0,
          "service_speed_knots": 12.0,
          "endurance_days": 10.0,
          "water_density_t_m3": 1.025,
          "water_type": "SEAWATER",
          "route_name": "Sby-Mks"
        }
        """
        from src.domain.stage1_requirements.schemas import project_data_from_json
        project = project_data_from_json(old_json)
        self.assertEqual(project.project_id, "PRJ-OLD-001")
        self.assertIsNone(project.operating_area)  # Default added
        
        res = validate_project_with_engine(project)
        self.assertTrue(res.is_complete)
        self.assertTrue(res.is_valid)

    def test_validator_does_not_mutate_model(self):
        """Uji bahwa validator tidak melakukan mutasi status model secara langsung."""
        project = get_valid_project_data()
        project.is_complete = False
        
        # Engine validate should not mutate the project object properties directly
        res = validate_project_with_engine(project)
        self.assertFalse(project.is_complete)  # Remains False until service explicitly sets it
        self.assertTrue(res.is_complete)


if __name__ == "__main__":
    unittest.main()
