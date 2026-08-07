import json
import os
import unittest
from src.core.enums import RevisionStatus, VesselType, WaterType
from src.domain.stage1_requirements.models import ProjectHistory, ProjectData
from src.services.stage1_service import Stage1RequirementService
from tests.stage1.fixtures import get_valid_project_data


class TestProjectPersistence(unittest.TestCase):
    """Unit test penyimpanan (persistence), import/export, save/load (Sprint 1.5)."""

    def setUp(self):
        self.temp_dir = "tests/stage1/temp_persistence"
        if not os.path.exists(self.temp_dir):
            os.makedirs(self.temp_dir, exist_ok=True)
        self.file_path = os.path.join(self.temp_dir, "project_history_test.json")
        self.index_path = os.path.join(self.temp_dir, "project_index_test.json")

    def tearDown(self):
        # Clean up temporary test files
        for f in [self.file_path, self.file_path + ".bak", self.index_path, self.index_path + ".tmp"]:
            if os.path.exists(f):
                os.remove(f)
        if os.path.exists(self.temp_dir):
            os.rmdir(self.temp_dir)

    def test_save_load_round_trip(self):
        """Uji save & load round trip ProjectHistory secara utuh."""
        project = get_valid_project_data()
        history = Stage1RequirementService.create_initial_history(project, creator="designer@ship.com")
        
        # Save
        Stage1RequirementService.save_project_history(history, self.file_path)
        self.assertTrue(os.path.exists(self.file_path))
        
        # Load
        loaded_history = Stage1RequirementService.load_project_history(self.file_path)
        self.assertEqual(loaded_history.project_id, history.project_id)
        self.assertEqual(len(loaded_history.revisions), 1)
        self.assertEqual(loaded_history.revisions[0].data_snapshot.project_name, project.project_name)

    def test_unicode_and_special_chars(self):
        """Uji dukungan Unicode pada karakter nama proyek / owner."""
        project = get_valid_project_data()
        project.project_name = "KM Nusantara 🚢 (Ω-Alpha)"
        project.owner = "Galangan PT Jaya & Sons Co. Ltd."
        history = Stage1RequirementService.create_initial_history(project, creator="designer@ship.com")

        Stage1RequirementService.save_project_history(history, self.file_path)
        loaded = Stage1RequirementService.load_project_history(self.file_path)
        self.assertEqual(loaded.revisions[0].data_snapshot.project_name, "KM Nusantara 🚢 (Ω-Alpha)")

    def test_corrupted_json_loading(self):
        """Uji penanganan error berkas JSON rusak/corrupted."""
        with open(self.file_path, "w", encoding="utf-8") as f:
            f.write("{invalid_json_format")

        with self.assertRaises(ValueError):
            Stage1RequirementService.load_project_history(self.file_path)

    def test_import_preview_new_format(self):
        """Uji preview import format ProjectHistory baru."""
        project = get_valid_project_data()
        history = Stage1RequirementService.create_initial_history(project, creator="designer@ship.com")
        
        from src.domain.stage1_requirements.schemas import project_history_to_json
        json_str = project_history_to_json(history)
        
        preview = Stage1RequirementService.get_import_preview(json_str)
        self.assertEqual(preview["project_id"], project.project_id)
        self.assertEqual(preview["total_revisions"], 1)
        self.assertFalse(preview["is_legacy"])

    def test_import_preview_legacy_format(self):
        """Uji preview import format legacy Sprint 1.1/1.2."""
        legacy_json = """
        {
          "project_id": "PRJ-OLD-99",
          "project_name": "Kapal Kuno",
          "owner": "Kementerian Perhubungan",
          "vessel_type": "BULK_CARRIER",
          "target_dwt_ton": 3000.0,
          "service_speed_knots": 10.0,
          "water_density_t_m3": 1.025,
          "water_type": "SEAWATER"
        }
        """
        preview = Stage1RequirementService.get_import_preview(legacy_json)
        self.assertEqual(preview["project_id"], "PRJ-OLD-99")
        self.assertEqual(preview["project_name"], "Kapal Kuno")
        self.assertTrue(preview["is_legacy"])

    def test_project_index_updates(self):
        """Uji otomatisasi pencatatan indeks proyek lokal."""
        project = get_valid_project_data()
        history = Stage1RequirementService.create_initial_history(project, creator="designer@ship.com")
        
        # This will trigger update_project_index internally
        Stage1RequirementService.save_project_history(history, self.file_path)
        
        index_file = "data/project_index.json"
        self.assertTrue(os.path.exists(index_file))
        
        with open(index_file, "r", encoding="utf-8") as f:
            index_data = json.load(f)
            
        self.assertIn(project.project_id, index_data)
        self.assertEqual(index_data[project.project_id]["project_name"], project.project_name)


if __name__ == "__main__":
    unittest.main()
