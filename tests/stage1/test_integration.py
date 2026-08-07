import json
import unittest
from src.core.enums import RevisionStatus, VesselType, WaterType
from src.domain.stage1_requirements.models import ProjectHistory
from src.services.stage1_service import Stage1RequirementService
from src.services.ai_service import AIAssistantService
from src.services.readiness_service import ReadinessService
from tests.stage1.fixtures import get_valid_project_data


class TestStage1EndToEndIntegration(unittest.TestCase):
    """End-to-End integration test untuk menyatukan seluruh modul Tahap 1 (Sprint 1.8)."""

    def test_end_to_end_project_workflow(self):
        """Uji alur kerja proyek dari pembuatan, validasi, revisi, hingga approval dan handoff payload."""
        
        # 1. Create a project
        project = get_valid_project_data()
        self.assertTrue(project.is_complete)  # check default is complete & valid
        
        # 2. Initialize history (Revision Rev. 0)
        history = Stage1RequirementService.create_initial_history(project, creator="designer")
        self.assertEqual(len(history.revisions), 1)
        self.assertEqual(history.revisions[0].status, RevisionStatus.READY_FOR_REVIEW)
        
        # 3. Create a new revision (Rev. 1) to edit values
        rev_id_0 = history.revisions[0].revision_id
        new_rev = Stage1RequirementService.create_new_revision(
            history, parent_rev_id=rev_id_0, creator="designer", reason="Rute dioptimasi"
        )
        self.assertEqual(new_rev.revision_number, 1)
        self.assertEqual(new_rev.status, RevisionStatus.DRAFT)
        
        # 4. Update revision parameter
        Stage1RequirementService.update_revision_data(
            history, new_rev.revision_id, {"target_dwt_ton": 6000.0, "service_speed_knots": 13.0},
            actor="designer", reason="Permintaan kapasitas bertambah"
        )
        self.assertEqual(history.revisions[1].status, RevisionStatus.READY_FOR_REVIEW)
        
        # 5. Submit for Review
        Stage1RequirementService.submit_revision_for_review(history, new_rev.revision_id, submitter="designer")
        self.assertEqual(history.revisions[1].status, RevisionStatus.WAITING_FOR_REVIEW)
        
        # 6. Review & Approve -> Generates active baseline v1.1
        Stage1RequirementService.review_revision(
            history, new_rev.revision_id, reviewer="lead", decision="APPROVED", note="Approved specifications"
        )
        self.assertEqual(history.revisions[1].status, RevisionStatus.APPROVED)
        self.assertEqual(len(history.baselines), 1)
        self.assertTrue(history.baselines[0].active)
        self.assertEqual(history.baselines[0].baseline_version, "v1.1")
        
        # 7. Generate Readiness Report
        report = ReadinessService.generate_readiness_report(history.revisions[1].data_snapshot, history.revisions[1])
        self.assertEqual(report["readiness_status"], "BASELINED")
        self.assertTrue(report["handoff_ready"])
        self.assertEqual(report["completeness_score"], 100)
        
        # 8. Generate AI Context and check Parameter Explainer
        val_res = Stage1RequirementService.validate_project_rich(history.revisions[1].data_snapshot)
        ai_context = AIAssistantService.build_context(history.revisions[1].data_snapshot, val_res)
        self.assertEqual(ai_context["active_stage"], "STAGE_1")
        
        ai_ans = AIAssistantService.answer_question("Jelaskan parameter target_dwt_ton", ai_context, "PARAMETER_EXPLAINER")
        self.assertIn("Deadweight Tonnage", ai_ans)
        
        # 9. Extract Handoff Payload for Stage 2
        payload = Stage1RequirementService.generate_handoff_payload(history, "v1.1")
        self.assertEqual(payload["namespace"], "handoff.stage2_requirements")
        self.assertEqual(payload["schema_version"], "1.0")
        
        approved_data = payload["approved_baseline"]["design_requirements"]
        self.assertEqual(approved_data["target_dwt_ton"], 6000.0)
        self.assertEqual(approved_data["service_speed_knots"], 13.0)
        self.assertEqual(approved_data["project_id"], project.project_id)
        
        # 10. Immutability checks: modifying APPROVED revision data snapshot must raise ValueError
        with self.assertRaises(ValueError):
            Stage1RequirementService.update_revision_data(
                history, new_rev.revision_id, {"target_dwt_ton": 7000.0}, actor="designer"
            )


if __name__ == "__main__":
    unittest.main()
