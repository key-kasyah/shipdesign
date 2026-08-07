import os
import unittest
from src.domain.stage1_requirements.schemas import (
    project_data_from_dict,
    project_data_from_json,
    project_data_to_dict,
    project_data_to_json,
)
from tests.stage1.fixtures import get_valid_project_data


class TestProjectDataSerialization(unittest.TestCase):
    """Unit test serialisasi & deserialisasi JSON / Dictionary."""

    def test_to_dict_and_back(self):
        original = get_valid_project_data()
        as_dict = project_data_to_dict(original)

        self.assertIsInstance(as_dict["vessel_type"], str)
        self.assertEqual(as_dict["vessel_type"], "GENERAL_CARGO")

        reconstructed = project_data_from_dict(as_dict)
        self.assertEqual(reconstructed.project_id, original.project_id)
        self.assertEqual(reconstructed.vessel_type, original.vessel_type)
        self.assertEqual(reconstructed.target_dwt_ton, original.target_dwt_ton)

    def test_to_json_and_back(self):
        original = get_valid_project_data()
        json_str = project_data_to_json(original)
        self.assertIn("KM Test Vessel", json_str)

        reconstructed = project_data_from_json(json_str)
        self.assertEqual(reconstructed.project_name, "KM Test Vessel")
        self.assertEqual(reconstructed.service_speed_knots, 11.5)

    def test_load_from_fixture_file(self):
        fixture_path = os.path.join("data", "fixtures", "sample_project_data.json")
        with open(fixture_path, "r", encoding="utf-8") as f:
            json_content = f.read()

        project = project_data_from_json(json_content)
        self.assertEqual(project.project_id, "PRJ-2026-001")
        self.assertEqual(project.project_name, "KM Nusantara Express 01")
        self.assertEqual(project.target_dwt_ton, 5000.0)
        self.assertTrue(project.is_complete)


if __name__ == "__main__":
    unittest.main()
