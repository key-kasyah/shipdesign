import unittest
from src.core.enums import VesselType
from src.services.stage1_service import Stage1RequirementService
from tests.stage1.fixtures import get_valid_project_data


class TestStage1RequirementService(unittest.TestCase):
    """Unit test untuk Stage1RequirementService."""

    def test_create_project(self):
        project = Stage1RequirementService.create_project(
            project_id="PRJ-SVC-001",
            project_name="Kapal Service Test",
            owner="PT Service Test",
            vessel_type=VesselType.TANKER,
            target_dwt_ton=8000.0,
            service_speed_knots=13.0,
            endurance_days=12.0,
            route_name="Trayek Dinas"
        )
        self.assertEqual(project.project_id, "PRJ-SVC-001")
        self.assertEqual(project.vessel_type, VesselType.TANKER)
        self.assertTrue(project.is_complete)

    def test_update_project_data(self):
        project = get_valid_project_data()
        initial_rev = project.revision_number

        updated = Stage1RequirementService.update_project_data(
            project, {"target_dwt_ton": 4000.0, "route_distance_nm": 500.0}
        )
        self.assertEqual(updated.target_dwt_ton, 4000.0)
        self.assertEqual(updated.route_distance_nm, 500.0)
        self.assertEqual(updated.revision_number, initial_rev + 1)

    def test_export_and_import_json(self):
        project = get_valid_project_data()
        json_str = Stage1RequirementService.export_to_json(project)
        imported = Stage1RequirementService.import_from_json(json_str)

        self.assertEqual(imported.project_id, project.project_id)
        self.assertEqual(imported.owner, project.owner)
        self.assertTrue(imported.is_complete)


if __name__ == "__main__":
    unittest.main()
