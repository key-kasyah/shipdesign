import unittest
from src.core.enums import VesselType, WaterType
from src.domain.stage1_requirements.models import ProjectData, ValidationResult
from src.services.ai_service import AIAssistantService, AISafetyException
from src.services.stage1_service import Stage1RequirementService
from tests.stage1.fixtures import get_valid_project_data


class TestAIAssistantService(unittest.TestCase):
    """Unit test untuk AI Requirements Assistant Tahap 1 (Sprint 1.6)."""

    def setUp(self):
        self.project = get_valid_project_data()
        self.val_res = Stage1RequirementService.validate_project_rich(self.project)
        self.context = AIAssistantService.build_context(self.project, self.val_res)

    def test_parameter_explainer(self):
        """Uji penjelasan arti parameter kargo/DWT."""
        ans = AIAssistantService.answer_question("Jelaskan mengenai target_dwt_ton", self.context, "PARAMETER_EXPLAINER")
        self.assertIn("Deadweight Tonnage", ans)
        self.assertIn("ton", ans)

    def test_validation_explainer(self):
        """Uji penjelasan warning validasi."""
        # Make it invalid
        self.project.service_speed_knots = -5.0
        val_res = Stage1RequirementService.validate_project_rich(self.project)
        context = AIAssistantService.build_context(self.project, val_res)

        ans = AIAssistantService.answer_question("Jelaskan masalah validasi", context, "VALIDATION_EXPLAINER")
        self.assertIn("Analisis Masalah Validasi", ans)
        self.assertIn("NUM_SPEED_NON_POSITIVE", ans)

    def test_safety_check_loa_calculation(self):
        """Uji penolakan permintaan hitung LOA/dimensi kapal (Tahap 2)."""
        with self.assertRaises(AISafetyException):
            AIAssistantService.answer_question("Berapakah LOA kapal yang cocok untuk DWT 5000?", self.context, "PARAMETER_EXPLAINER")

    def test_safety_check_cb_coefficient(self):
        """Uji penolakan permintaan hitung koefisien block Cb."""
        with self.assertRaises(AISafetyException):
            AIAssistantService.answer_question("Tolong hitungkan nilai Cb kapal ini", self.context, "PARAMETER_EXPLAINER")

    def test_safety_check_displacement(self):
        """Uji penolakan kalkulasi displacement."""
        with self.assertRaises(AISafetyException):
            AIAssistantService.answer_question("Berapa estimasi displacement lambungnya?", self.context, "PARAMETER_EXPLAINER")

    def test_safety_check_engine_power(self):
        """Uji penolakan kalkulasi daya mesin utama (HP/kW)."""
        with self.assertRaises(AISafetyException):
            AIAssistantService.answer_question("Berapa kW daya mesin untuk kecepatan 12 knots?", self.context, "PARAMETER_EXPLAINER")

    def test_unsupported_question(self):
        """Uji penanganan pertanyaan di luar parameter kargo."""
        ans = AIAssistantService.answer_question("Berapa harga cat lambung?", self.context, "PARAMETER_EXPLAINER")
        self.assertIn("belum memiliki penjelasan detail", ans)

    def test_deterministic_context_builder(self):
        """Uji penyusunan context builder terstruktur."""
        self.assertEqual(self.context["active_stage"], "STAGE_1")
        self.assertIn("forbidden_actions", self.context)
        self.assertIn("allowed_actions", self.context)


if __name__ == "__main__":
    unittest.main()
