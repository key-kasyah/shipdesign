import unittest
from src.core.enums import PortConstraintHardness, StageStatus, VesselType, WaterType
from tests.stage1.fixtures import get_minimal_project_data, get_valid_project_data


class TestProjectDataModel(unittest.TestCase):
    """Unit test instansiasi dan atribut ProjectData."""

    def test_instantiate_valid_project_data(self):
        project = get_valid_project_data()
        self.assertEqual(project.project_id, "PRJ-TEST-001")
        self.assertEqual(project.vessel_type, VesselType.GENERAL_CARGO)
        self.assertEqual(project.target_dwt_ton, 3500.0)
        self.assertEqual(project.service_speed_knots, 11.5)
        self.assertEqual(project.water_density_t_m3, 1.025)
        self.assertEqual(project.draft_constraint_type, PortConstraintHardness.HARD_LIMIT)
        self.assertEqual(project.status, StageStatus.ACTIVE)

    def test_default_values_minimal_project_data(self):
        project = get_minimal_project_data()
        self.assertEqual(project.project_id, "PRJ-MIN-001")
        self.assertEqual(project.water_type, WaterType.SEAWATER)
        self.assertEqual(project.water_density_t_m3, 1.025)
        self.assertEqual(project.revision_number, 0)
        self.assertEqual(project.draft_constraint_type, PortConstraintHardness.HARD_LIMIT)
        self.assertIsNone(project.route_distance_nm)
        self.assertIsNone(project.max_speed_knots)


if __name__ == "__main__":
    unittest.main()
