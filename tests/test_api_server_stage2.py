import unittest
import os
import shutil
from fastapi.testclient import TestClient
from server import app, get_project_file_path, PROJECTS_DIR
from src.services.stage1_service import Stage1RequirementService
from src.domain.stage1_requirements.models import ProjectData

class TestStage2APIEndpoints(unittest.TestCase):
    """Pengujian Integrasi Endpoint REST API Tahap 2."""

    def setUp(self):
        self.client = TestClient(app)
        self.project_id = "PRJ-T2-TEST"
        self.file_path = get_project_file_path(self.project_id)
        
        # Cleanup any old test records
        stage2_file = os.path.join(PROJECTS_DIR, f"{self.project_id}_stage2.json")
        if os.path.exists(self.file_path):
            os.remove(self.file_path)
        if os.path.exists(stage2_file):
            os.remove(stage2_file)

        # Create a Stage 1 Project to satisfy constraints
        p_data = ProjectData(
            project_id=self.project_id,
            project_name="Kapal Uji Tahap 2",
            owner="Dinas Perhubungan",
            target_dwt_ton=4500.0,
            service_speed_knots=12.5
        )
        hist1 = Stage1RequirementService.create_initial_history(p_data, "tester")
        Stage1RequirementService.save_project_history(hist1, self.file_path)

    def tearDown(self):
        # Cleanup
        stage2_file = os.path.join(PROJECTS_DIR, f"{self.project_id}_stage2.json")
        if os.path.exists(self.file_path):
            os.remove(self.file_path)
        if os.path.exists(stage2_file):
            os.remove(stage2_file)

    def test_stage2_flow(self):
        # 1. Get History (Initial Scenario 0)
        res = self.client.get(f"/api/projects/{self.project_id}/stage2/history")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["project_id"], self.project_id)
        self.assertEqual(len(data["revisions"]), 1)
        
        rev0 = data["revisions"][0]
        self.assertEqual(rev0["revision_number"], 0)
        self.assertEqual(rev0["data_snapshot"]["lbp_m"], 90.0) # default value

        # 2. Update Scenario (Update LBP, Breadth, Draft, etc.)
        revision_id = rev0["revision_id"]
        update_payload = {
            "scenario_name": "Skenario Lebar Optimal",
            "lbp_m": 92.5,
            "loa_m": 100.5,
            "breadth_m": 16.5,
            "depth_m": 8.5,
            "draft_m": 5.8,
            "cb": 0.73,
            "cm": 0.98,
            "cw": 0.81,
            "weight_items": [
                {"group_name": "Hull Structure", "weight_ton": 1200.0, "lcg_m": 45.0, "vcg_m": 5.0},
                {"group_name": "Machinery Plant", "weight_ton": 350.0, "lcg_m": 15.0, "vcg_m": 3.0},
                {"group_name": "Outfit & Accommodation", "weight_ton": 300.0, "lcg_m": 40.0, "vcg_m": 7.0},
                {"group_name": "LWT Margin", "weight_ton": 100.0, "lcg_m": 42.0, "vcg_m": 5.5},
                {"group_name": "Cargo Payload", "weight_ton": 4000.0, "lcg_m": 46.0, "vcg_m": 4.0},
                {"group_name": "Consumables & Fuel", "weight_ton": 500.0, "lcg_m": 35.0, "vcg_m": 2.0},
            ],
            "capacity_items": [
                {"compartment_name": "Cargo Holds", "required_volume_m3": 5500.0, "available_volume_m3": 5600.0},
                {"compartment_name": "Fuel Oil Tanks", "required_volume_m3": 250.0, "available_volume_m3": 270.0},
            ],
            "actor": "designer@test.com",
            "reason": "Mengubah LBP dan Breadth untuk optimasi ruang muat."
        }
        res_put = self.client.put(
            f"/api/projects/{self.project_id}/stage2/scenarios/{revision_id}",
            json=update_payload
        )
        if res_put.status_code != 200:
            print("PUT Scenario failed with error body:", res_put.text)
        self.assertEqual(res_put.status_code, 200)
        data_put = res_put.json()
        rev_updated = data_put["revisions"][0]
        self.assertEqual(rev_updated["data_snapshot"]["lbp_m"], 92.5)
        self.assertEqual(rev_updated["data_snapshot"]["breadth_m"], 16.5)

        # 3. Validate scenario
        res_val = self.client.get(f"/api/projects/{self.project_id}/stage2/scenarios/{revision_id}/validate")
        self.assertEqual(res_val.status_code, 200)
        val_data = res_val.json()
        self.assertTrue(val_data["is_complete"])

        # 4. Submit scenario for review
        res_sub = self.client.post(
            f"/api/projects/{self.project_id}/stage2/scenarios/{revision_id}/submit",
            json={"actor": "designer@test.com"}
        )
        self.assertEqual(res_sub.status_code, 200)
        data_sub = res_sub.json()
        self.assertEqual(data_sub["revisions"][0]["status"], "WAITING_FOR_REVIEW")

        # 5. Approve scenario
        res_app = self.client.post(
            f"/api/projects/{self.project_id}/stage2/scenarios/{revision_id}/review",
            json={
                "reviewer": "reviewer@test.com",
                "decision": "APPROVED",
                "note": "Desain seimbang dan memenuhi seluruh regulasi draft pelabuhan."
            }
        )
        self.assertEqual(res_app.status_code, 200)
        data_app = res_app.json()
        self.assertEqual(data_app["revisions"][0]["status"], "APPROVED")
        self.assertEqual(len(data_app["baselines"]), 1)
        self.assertTrue(data_app["baselines"][0]["active"])
