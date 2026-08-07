import unittest
from src.core.enums import RevisionStatus, VesselType, WaterType
from src.domain.stage1_requirements.models import ProjectData, ProjectRevision
from src.services.readiness_service import ReadinessService
from src.services.stage1_service import Stage1RequirementService
from tests.stage1.fixtures import get_valid_project_data


class TestReadinessService(unittest.TestCase):
    """Unit test untuk Requirement Summary & Readiness Check Tahap 1 (Sprint 1.7)."""

    def test_incomplete_project_readiness(self):
        """Uji proyek belum lengkap."""
        project = get_valid_project_data()
        project.project_name = ""  # Missing project name
        project.route_name = None
        project.operating_area = None
        project.origin_port = None
        project.destination_port = None  # Missing route

        history = Stage1RequirementService.create_initial_history(project, creator="designer@ship.com")
        rev = history.revisions[0]

        report = ReadinessService.generate_readiness_report(project, rev)
        
        self.assertEqual(report["readiness_status"], "NOT_READY")
        self.assertLess(report["completeness_score"], 100)
        self.assertIn("project_name", report["missing_requirements"])
        self.assertIn("route_requirements", report["missing_requirements"])
        self.assertFalse(report["handoff_ready"])

    def test_invalid_project_readiness(self):
        """Uji proyek lengkap tetapi invalid."""
        project = get_valid_project_data()
        project.service_speed_knots = 15.0
        project.max_speed_knots = 12.0  # max speed < service speed -> Error

        history = Stage1RequirementService.create_initial_history(project, creator="designer@ship.com")
        rev = history.revisions[0]

        report = ReadinessService.generate_readiness_report(project, rev)
        
        self.assertEqual(report["readiness_status"], "NEEDS_REVISION")
        self.assertEqual(report["completeness_score"], 100)  # All filled
        self.assertFalse(report["handoff_ready"])

    def test_ready_project_readiness(self):
        """Uji proyek lengkap dan valid (siap baseline)."""
        project = get_valid_project_data()
        history = Stage1RequirementService.create_initial_history(project, creator="designer@ship.com")
        rev = history.revisions[0]

        report = ReadinessService.generate_readiness_report(project, rev)
        
        self.assertEqual(report["readiness_status"], "READY_FOR_BASELINE")
        self.assertEqual(report["completeness_score"], 100)
        self.assertTrue(report["handoff_ready"])

    def test_baselined_project_readiness(self):
        """Uji proyek berstatus baselined (approved)."""
        project = get_valid_project_data()
        history = Stage1RequirementService.create_initial_history(project, creator="designer@ship.com")
        rev = history.revisions[0]
        
        # Approve revision
        Stage1RequirementService.submit_revision_for_review(history, rev.revision_id, submitter="designer")
        Stage1RequirementService.review_revision(history, rev.revision_id, reviewer="lead", decision="APPROVED")

        report = ReadinessService.generate_readiness_report(project, rev)
        
        self.assertEqual(report["readiness_status"], "BASELINED")
        self.assertTrue(report["handoff_ready"])

    def test_risks_and_assumptions(self):
        """Uji pembentukan daftar resiko dan asumsi operasional."""
        project = get_valid_project_data()
        project.water_density_t_m3 = 1.050  # Extreme sea density -> Risk
        project.crew_count = 0  # Zero crew -> Risk

        history = Stage1RequirementService.create_initial_history(project, creator="designer@ship.com")
        rev = history.revisions[0]

        report = ReadinessService.generate_readiness_report(project, rev)
        
        risks = [r["parameter"] for r in report["risks_and_assumptions"] if r["type"] == "RISK"]
        self.assertIn("water_density_t_m3", risks)
        self.assertIn("crew_count", risks)


if __name__ == "__main__":
    unittest.main()
