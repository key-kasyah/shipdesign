import json
import os
import unittest
from fastapi.testclient import TestClient
from server import app, PROJECTS_DIR, INDEX_PATH


class TestFastAPIServer(unittest.TestCase):
    """Unit test untuk FastAPI backend server (Task 2)."""

    def setUp(self):
        self.client = TestClient(app)
        self.test_project_id = "PRJ-API-TEST-99"
        self.file_path = os.path.join(PROJECTS_DIR, f"{self.test_project_id}.json")

    def tearDown(self):
        # Clean up files created for testing
        if os.path.exists(self.file_path):
            os.remove(self.file_path)
        if os.path.exists(self.file_path + ".bak"):
            os.remove(self.file_path + ".bak")

    def test_list_projects(self):
        """Uji endpoint list projects."""
        res = self.client.get("/api/projects")
        self.assertEqual(res.status_code, 200)
        self.assertIsInstance(res.json(), list)

    def test_create_and_load_project(self):
        """Uji pembuatan dan pemuatan proyek baru."""
        # 1. Create project
        payload = {
            "project_id": self.test_project_id,
            "project_name": "KM Test API Project",
            "owner": "PT API Owner",
            "creator": "api-tester"
        }
        res = self.client.post("/api/projects", json=payload)
        self.assertEqual(res.status_code, 200)
        
        data = res.json()
        self.assertEqual(data["project_id"], self.test_project_id)
        self.assertEqual(len(data["revisions"]), 1)

        # 2. Load project
        res_load = self.client.get(f"/api/projects/{self.test_project_id}")
        self.assertEqual(res_load.status_code, 200)
        self.assertEqual(res_load.json()["project_id"], self.test_project_id)

    def test_update_and_validate_project(self):
        """Uji pembaruan data parameter kargo dan eksekusi validasi."""
        # 1. Create project
        self.client.post("/api/projects", json={
            "project_id": self.test_project_id,
            "project_name": "KM Test API Project",
            "owner": "PT API Owner",
            "creator": "api-tester"
        })

        # 2. Update parameters
        update_payload = {
            "project_id": self.test_project_id,
            "project_name": "KM Test API Project (Updated)",
            "owner": "PT API Owner",
            "vessel_type": "GENERAL_CARGO",
            "target_dwt_ton": 5500.0,
            "service_speed_knots": 12.0,
            "water_type": "SEAWATER",
            "water_density_t_m3": 1.025,
            "route_name": "Jakarta-Bangka",
            "route_distance_nm": 300.0,
            "actor": "api-tester",
            "reason": "Lengkapi spesifikasi awal"
        }
        res_update = self.client.put(f"/api/projects/{self.test_project_id}", json=update_payload)
        self.assertEqual(res_update.status_code, 200)
        self.assertEqual(res_update.json()["revisions"][-1]["data_snapshot"]["target_dwt_ton"], 5500.0)

        # 3. Validate
        res_val = self.client.post(f"/api/projects/{self.test_project_id}/validate")
        if res_val.status_code != 200:
            print("VALIDATION ERROR DETAIL:", res_val.text)
        self.assertEqual(res_val.status_code, 200)
        val_data = res_val.json()
        self.assertIn("is_valid", val_data)
        self.assertIn("issues", val_data)

    def test_ai_assistant_safety_guardrails(self):
        """Uji asisten AI dan kepatuhan guardrail keselamatan via API."""
        # 1. Create project
        self.client.post("/api/projects", json={
            "project_id": self.test_project_id,
            "project_name": "KM Test API Project",
            "owner": "PT API Owner",
            "creator": "api-tester"
        })
        
        # Load project to find active revision ID
        history = self.client.get(f"/api/projects/{self.test_project_id}").json()
        rev_id = history["revisions"][-1]["revision_id"]

        # 2. Ask safe question
        payload_safe = {
            "question": "Jelaskan tentang target_dwt_ton",
            "mode": "PARAMETER_EXPLAINER",
            "revision_id": rev_id
        }
        res_safe = self.client.post(f"/api/projects/{self.test_project_id}/assistant", json=payload_safe)
        self.assertEqual(res_safe.status_code, 200)
        self.assertIn("Deadweight Tonnage", res_safe.json()["answer"])

        # 3. Ask unsafe/forbidden question (LOA calculation)
        payload_unsafe = {
            "question": "Berapakah perkiraan LOA kapal?",
            "mode": "PARAMETER_EXPLAINER",
            "revision_id": rev_id
        }
        res_unsafe = self.client.post(f"/api/projects/{self.test_project_id}/assistant", json=payload_unsafe)
        self.assertEqual(res_unsafe.status_code, 200)
        self.assertTrue(res_unsafe.json().get("safety_blocked"))
        self.assertIn("dilarang melakukan perhitungan pra-rancangan", res_unsafe.json()["answer"])


if __name__ == "__main__":
    unittest.main()
