import unittest
from src.core.enums import RevisionStatus, VesselType, WaterType
from src.domain.stage1_requirements.models import ProjectHistory
from app import (
    init_empty_project,
    update_ui_inputs_from_revision,
    handle_create_project,
    handle_update_revision,
    handle_create_revision_branch,
    handle_submit_for_review,
    handle_review_revision,
    handle_compare_revisions,
    handle_show_audit_trail,
)


class TestGradioUIHandlers(unittest.TestCase):
    """Unit test untuk handler event di Gradio UI (Sprint 1.4)."""

    def test_init_empty_project(self):
        """Uji inisialisasi awal proyek kosong."""
        history = init_empty_project()
        self.assertIsInstance(history, ProjectHistory)
        self.assertEqual(history.project_id, "PRJ-DEFAULT")
        self.assertEqual(len(history.revisions), 1)

    def test_ui_inputs_binding(self):
        """Uji pemetaan data revisi ke input UI."""
        history = init_empty_project()
        latest_rev = history.revisions[-1]
        inputs = update_ui_inputs_from_revision(latest_rev)
        
        self.assertEqual(inputs[0], "PRJ-DEFAULT")
        self.assertEqual(inputs[1], "Kapal Prototipe Baru")
        self.assertEqual(inputs[4], VesselType.GENERAL_CARGO.value)

    def test_create_project_handler(self):
        """Uji handler pembuatan proyek baru."""
        history, msg, dropdown, ui_values, report = handle_create_project(
            project_id="PRJ-UI-001",
            project_name="Kapal UI Test",
            owner="PT UI Test",
            organization="ITS",
            creator="tester"
        )
        self.assertIsNotNone(history)
        self.assertEqual(history.project_id, "PRJ-UI-001")
        self.assertIn("berhasil dibuat", msg)
        self.assertEqual(ui_values[0], "PRJ-UI-001")

    def test_update_revision_handler(self):
        """Uji handler perbaruan data revisi aktif."""
        history = init_empty_project()
        dropdown_val = "Rev. 0 (DRAFT)"
        
        history, msg, report, gr_drop = handle_update_revision(
            history, dropdown_val,
            "PRJ-DEFAULT", "KM Nusantara 01 (Updated)", "PT Pelayaran Utama", "ITS",
            VesselType.GENERAL_CARGO.value, "Kargo umum", 5500.0, 13.0, 15.0, 12.0,
            WaterType.SEAWATER.value, 1.025, "Rute Jawa", "Java Sea", "Surabaya", "Makassar", 450.0,
            20, 0, 7.0, 110.0, 20.0, "editor-actor", "Optimasi spesifikasi"
        )
        
        self.assertIn("berhasil diperbarui", msg)
        self.assertEqual(history.revisions[0].data_snapshot.project_name, "KM Nusantara 01 (Updated)")
        self.assertEqual(history.revisions[0].data_snapshot.target_dwt_ton, 5500.0)

    def test_submit_and_review_workflow_handlers(self):
        """Uji alur submit dan review melalui UI handler."""
        history = init_empty_project()
        rev_id_str = "Rev. 0 (DRAFT)"
        
        # 1. Update revision data so it is complete and valid
        history, msg, report, gr_drop = handle_update_revision(
            history, rev_id_str,
            "PRJ-DEFAULT", "Kapal Baru", "PT Owner", "ITS",
            VesselType.GENERAL_CARGO.value, "Kargo", 5000.0, 12.0, 14.0, 10.0,
            WaterType.SEAWATER.value, 1.025, "Jawa-Sulawesi", "Java Sea", "Jakarta", "Makassar", 500.0,
            18, 0, 6.0, 100.0, 18.0, "tester", "Lengkapi data"
        )
        
        # 2. Submit for review
        # The dropdown status is now READY_FOR_REVIEW
        gr_drop_val = gr_drop.value
        history, msg, gr_drop, report = handle_submit_for_review(history, gr_drop_val, submitter="tester")
        self.assertEqual(history.revisions[0].status, RevisionStatus.WAITING_FOR_REVIEW)

        # 3. Approve review
        gr_drop_val = gr_drop.value
        history, msg, gr_drop, report = handle_review_revision(
            history, gr_drop_val, reviewer="lead@ship.com", decision_choice="APPROVE (Setuju)", note="Approved!"
        )
        self.assertEqual(history.revisions[0].status, RevisionStatus.APPROVED)
        self.assertEqual(len(history.baselines), 1)

    def test_compare_revisions_handler(self):
        """Uji comparison handler."""
        history = init_empty_project()
        html = handle_compare_revisions(history, "Rev. 0", "Rev. 0")
        self.assertIn("Tidak ada perbedaan", html)

    def test_show_audit_trail_handler(self):
        """Uji audit trail viewer handler."""
        history = init_empty_project()
        html = handle_show_audit_trail(history)
        self.assertIn("Audit Trail Proyek", html)
        self.assertIn("INITIAL_REVISION_CREATED", html)


if __name__ == "__main__":
    unittest.main()
