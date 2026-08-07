import json
import unittest
from datetime import datetime, timezone
from src.core.enums import RevisionStatus, VesselType, WaterType
from src.domain.stage1_requirements.models import ProjectData, ProjectHistory
from src.domain.stage1_requirements.schemas import (
    project_history_from_json,
    project_history_to_json,
)
from src.services.stage1_service import Stage1RequirementService
from tests.stage1.fixtures import get_valid_project_data


class TestProjectRevisionManagement(unittest.TestCase):
    """Unit test manajemen revisi, baseline, dan approval workflow."""

    def test_create_initial_history(self):
        """Uji inisialisasi history proyek baru."""
        project = get_valid_project_data()
        history = Stage1RequirementService.create_initial_history(project, creator="designer@ship.com")

        self.assertEqual(history.project_id, project.project_id)
        self.assertEqual(len(history.revisions), 1)
        self.assertEqual(history.revisions[0].revision_number, 0)
        self.assertEqual(history.revisions[0].created_by, "designer@ship.com")
        self.assertEqual(history.revisions[0].status, RevisionStatus.READY_FOR_REVIEW)
        self.assertEqual(len(history.audit_trail), 1)
        self.assertEqual(history.audit_trail[0].action, "INITIAL_REVISION_CREATED")

    def test_immutable_approved_baseline(self):
        """Uji penolakan modifikasi langsung pada revisi APPROVED/SUPERSEDED."""
        project = get_valid_project_data()
        history = Stage1RequirementService.create_initial_history(project, creator="designer@ship.com")
        
        # Transition to WAITING_FOR_REVIEW
        rev_id = history.revisions[0].revision_id
        Stage1RequirementService.submit_revision_for_review(history, rev_id, submitter="designer@ship.com")
        
        # Approve and create baseline
        Stage1RequirementService.review_revision(
            history, rev_id, reviewer="lead@ship.com", decision="APPROVED", note="Baseline valid"
        )
        
        self.assertEqual(history.revisions[0].status, RevisionStatus.APPROVED)
        self.assertEqual(len(history.baselines), 1)
        self.assertTrue(history.baselines[0].active)

        # Attempting modification on APPROVED revision snapshot should raise ValueError
        with self.assertRaises(ValueError):
            Stage1RequirementService.update_revision_data(
                history, rev_id, {"target_dwt_ton": 5000.0}, actor="designer@ship.com"
            )

    def test_revision_state_transition_flow(self):
        """Uji alur lengkap approval workflow."""
        project = get_valid_project_data()
        # Initial is ready for review
        history = Stage1RequirementService.create_initial_history(project, creator="designer@ship.com")
        rev_id = history.revisions[0].revision_id

        # 1. Submit for review
        Stage1RequirementService.submit_revision_for_review(history, rev_id, submitter="designer@ship.com")
        self.assertEqual(history.revisions[0].status, RevisionStatus.WAITING_FOR_REVIEW)

        # 2. Reject/Revision Required
        Stage1RequirementService.review_revision(
            history, rev_id, reviewer="lead@ship.com", decision="REJECTED", note="Butuh perbaikan DWT"
        )
        self.assertEqual(history.revisions[0].status, RevisionStatus.REVISION_REQUIRED)

        # 3. Create new revision from parent to make changes
        new_rev = Stage1RequirementService.create_new_revision(
            history, parent_rev_id=rev_id, creator="designer@ship.com", reason="Perbaikan data DWT"
        )
        new_rev_id = new_rev.revision_id
        self.assertEqual(new_rev.revision_number, 1)
        self.assertEqual(new_rev.status, RevisionStatus.DRAFT)

        # 4. Make it valid and complete -> READY_FOR_REVIEW
        # Initially DRAFT because it is not complete (DWT copy needs validation check)
        # Let's populate missing required values or check update
        Stage1RequirementService.update_revision_data(
            history, new_rev_id, {"target_dwt_ton": 3500.0}, actor="designer@ship.com", reason="Fix DWT"
        )
        # Since snapshot copy had all required fields, updating makes it READY_FOR_REVIEW
        self.assertEqual(history.revisions[1].status, RevisionStatus.READY_FOR_REVIEW)

        # 5. Submit and approve
        Stage1RequirementService.submit_revision_for_review(history, new_rev_id, submitter="designer@ship.com")
        Stage1RequirementService.review_revision(
            history, new_rev_id, reviewer="lead@ship.com", decision="APPROVED", note="Revisi disetujui"
        )
        
        self.assertEqual(history.revisions[1].status, RevisionStatus.APPROVED)
        self.assertEqual(history.revisions[0].status, RevisionStatus.REVISION_REQUIRED)  # Old rejected is left
        self.assertEqual(len(history.baselines), 1)
        self.assertTrue(history.baselines[0].active)
        self.assertEqual(history.baselines[0].approved_revision_id, new_rev_id)

    def test_compare_revisions(self):
        """Uji perbandingan field antar revisi."""
        project = get_valid_project_data()
        history = Stage1RequirementService.create_initial_history(project, creator="designer@ship.com")
        rev0_id = history.revisions[0].revision_id

        # Submit & approve to baseline
        Stage1RequirementService.submit_revision_for_review(history, rev0_id, submitter="designer@ship.com")
        Stage1RequirementService.review_revision(history, rev0_id, reviewer="lead@ship.com", decision="APPROVED")

        # Create new revision
        new_rev = Stage1RequirementService.create_new_revision(
            history, parent_rev_id=rev0_id, creator="designer@ship.com", reason="Ubah DWT dan Speed"
        )
        new_rev_id = new_rev.revision_id
        
        # Update values
        Stage1RequirementService.update_revision_data(
            history, new_rev_id, {"target_dwt_ton": 9500.0, "service_speed_knots": 14.5},
            actor="designer@ship.com", reason="Kebutuhan rute baru"
        )

        # Compare
        changes = Stage1RequirementService.compare_revisions(history, rev0_id, new_rev_id)
        
        self.assertEqual(len(changes), 2)
        field_names = [c.field_path for c in changes]
        self.assertIn("target_dwt_ton", field_names)
        self.assertIn("service_speed_knots", field_names)
        
        dwt_change = next(c for c in changes if c.field_path == "target_dwt_ton")
        self.assertEqual(dwt_change.old_value, project.target_dwt_ton)
        self.assertEqual(dwt_change.new_value, 9500.0)
        self.assertEqual(dwt_change.reason, "Ubah DWT dan Speed")

    def test_audit_event_logging(self):
        """Uji pencatatan audit trail."""
        project = get_valid_project_data()
        history = Stage1RequirementService.create_initial_history(project, creator="designer@ship.com")
        rev_id = history.revisions[0].revision_id

        # Update field
        Stage1RequirementService.update_revision_data(
            history, rev_id, {"service_speed_knots": 15.0}, actor="designer@ship.com", reason="Optimasi schedule"
        )

        actions = [a.action for a in history.audit_trail]
        self.assertIn("INITIAL_REVISION_CREATED", actions)
        self.assertIn("FIELD_UPDATED", actions)

        speed_update = next(a for a in history.audit_trail if a.action == "FIELD_UPDATED")
        self.assertEqual(speed_update.actor, "designer@ship.com")
        self.assertEqual(speed_update.new_value, "15.0")
        self.assertIn("Optimasi schedule", speed_update.reason)

    def test_json_round_trip_history(self):
        """Uji serialisasi dan deserialisasi round-trip ProjectHistory."""
        project = get_valid_project_data()
        history = Stage1RequirementService.create_initial_history(project, creator="designer@ship.com")
        rev_id = history.revisions[0].revision_id

        # Submit & approve
        Stage1RequirementService.submit_revision_for_review(history, rev_id, submitter="designer@ship.com")
        Stage1RequirementService.review_revision(history, rev_id, reviewer="lead@ship.com", decision="APPROVED")

        # Serialize
        json_str = project_history_to_json(history)
        
        # Deserialize
        imported_history = project_history_from_json(json_str)

        self.assertEqual(imported_history.project_id, history.project_id)
        self.assertEqual(len(imported_history.revisions), 1)
        self.assertEqual(imported_history.revisions[0].status, RevisionStatus.APPROVED)
        self.assertEqual(imported_history.baselines[0].baseline_version, "v1.0")

    def test_backward_compatibility_history_load(self):
        """Uji pemuatan JSON Sprint 1.1/1.2 lama otomatis di-upgrade ke ProjectHistory."""
        legacy_json = """
        {
          "project_id": "PRJ-LEGACY-001",
          "project_name": "Legacy Vessel",
          "owner": "Legacy Owner",
          "vessel_type": "CONTAINER_SHIP",
          "target_dwt_ton": 5000.0,
          "service_speed_knots": 14.0,
          "water_density_t_m3": 1.025,
          "water_type": "SEAWATER",
          "route_name": "Jakarta-Batam",
          "is_complete": true
        }
        """
        history = project_history_from_json(legacy_json)
        self.assertEqual(history.project_id, "PRJ-LEGACY-001")
        self.assertEqual(len(history.revisions), 1)
        self.assertEqual(history.revisions[0].status, RevisionStatus.APPROVED)
        self.assertEqual(history.revisions[0].revision_number, 0)
        self.assertEqual(len(history.baselines), 1)
        self.assertTrue(history.baselines[0].active)

    def test_export_baseline(self):
        """Uji fungsi ekspor baseline terstruktur."""
        project = get_valid_project_data()
        history = Stage1RequirementService.create_initial_history(project, creator="designer@ship.com")
        rev_id = history.revisions[0].revision_id

        Stage1RequirementService.submit_revision_for_review(history, rev_id, submitter="designer@ship.com")
        Stage1RequirementService.review_revision(
            history, rev_id, reviewer="lead@ship.com", decision="APPROVED", note="Clear to build"
        )

        exported_json = Stage1RequirementService.export_baseline(history, "v1.0")
        data = json.loads(exported_json)

        self.assertEqual(data["baseline_metadata"]["baseline_version"], "v1.0")
        self.assertEqual(data["approval_metadata"]["reviewer"], "lead@ship.com")
        self.assertTrue(data["validation_report"]["is_valid"])
        self.assertEqual(data["design_requirements"]["project_id"], project.project_id)


if __name__ == "__main__":
    unittest.main()
