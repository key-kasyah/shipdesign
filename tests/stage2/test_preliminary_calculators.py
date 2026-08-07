import unittest
import os
import shutil
from src.core.enums import RevisionStatus
from src.domain.stage2_preliminary.models import ComparableShip, WeightItem, CapacityItem, Stage2History
from src.domain.stage2_preliminary.calculators import (
    scale_dimensions,
    calculate_froude_number,
    calculate_kb,
    calculate_bm,
    calculate_ehp_nsp,
    simpson_integrate,
)
from src.domain.stage2_preliminary.validators import validate_preliminary_design
from src.services.stage2_service import Stage2PreliminaryDesignService

class TestStage2Calculators(unittest.TestCase):
    """Pengujian Unit untuk formula perhitungan matematika Tahap 2."""

    def test_scaling(self):
        comp = ComparableShip(
            ship_name="KM Nusantara Cargo",
            vessel_type="GENERAL_CARGO",
            dwt_ton=3000.0,
            loa_m=85.0,
            lbp_m=78.0,
            breadth_m=14.0,
            draft_m=5.0,
            depth_m=7.0,
            service_speed_knots=12.0,
            cb=0.72
        )
        # Scale to 6000 DWT (scale factor = (6000/3000)^(1/3) = 2^(1/3) = 1.2599)
        scaled = scale_dimensions(comp, 6000.0)
        self.assertAlmostEqual(scaled["lbp_m"], 78.0 * 1.2599, delta=0.5)
        self.assertAlmostEqual(scaled["breadth_m"], 14.0 * 1.2599, delta=0.2)

    def test_froude_number(self):
        fn = calculate_froude_number(100.0, 15.0) # L=100m, V=15knots
        # speed in m/s = 15 * 0.5144 = 7.716
        # Fn = 7.716 / sqrt(9.81 * 100) = 7.716 / 31.32 = 0.246
        self.assertAlmostEqual(fn, 0.246, delta=0.01)

    def test_kb_bm(self):
        # T=5.0m, cb=0.70, cw=0.80
        kb = calculate_kb(5.0, 0.70, 0.80)
        # KB = 5.0 * (0.80 / 1.50) = 2.666
        self.assertAlmostEqual(kb, 2.666, delta=0.01)

        # B=14m, T=5m, cb=0.7, cw=0.8
        bm = calculate_bm(14.0, 5.0, 0.70, 0.80)
        # BM = 14^2 * (1 + 1.60) / (12 * 0.70 * 5) = 196 * 2.60 / 42.0 = 509.6 / 42 = 12.133
        self.assertAlmostEqual(bm, 12.133, delta=0.01)

    def test_simpson_integrate(self):
        # Parabolic function ordinates: y = 1 - x^2 from -1 to 1 (21 points)
        # Spacing dx = 0.1, integral is 4/3 = 1.333
        ords = []
        for i in range(21):
            x = (i - 10) / 10.0
            ords.append(1.0 - x**2)
        vol = simpson_integrate(ords, 0.1)
        self.assertAlmostEqual(vol, 1.333, delta=0.01)

    def test_ehp_nsp(self):
        # displacement = 4000 ton, V = 12 knots, cb = 0.7
        ehp = calculate_ehp_nsp(4000.0, 12.0, 0.7)
        # C_ad = 320 - 90*0.7 = 257.0
        # EHP_hp = (4000^(2/3) * 12^3) / 257 = (251.98 * 1728) / 257 = 1694.3 hp
        # ehp_kw = 1694.3 * 0.7457 = 1263.4 kW
        self.assertAlmostEqual(ehp, 1263.4, delta=10.0)


class TestStage2Service(unittest.TestCase):
    """Pengujian integrasi alur kerja Preliminary Design Service."""

    def setUp(self):
        self.temp_dir = "data/test_stage2_runs"
        self.file_path = os.path.join(self.temp_dir, "test_proj_stage2.json")
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)
        os.makedirs(self.temp_dir, exist_ok=True)

    def tearDown(self):
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)

    def test_stage2_service_lifecycle(self):
        comp = ComparableShip(
            ship_name="KM Reference",
            vessel_type="GENERAL_CARGO",
            dwt_ton=4000.0,
            loa_m=95.0,
            lbp_m=88.0,
            breadth_m=15.5,
            draft_m=5.5,
            depth_m=7.8,
            service_speed_knots=12.0,
            cb=0.72
        )
        
        # 1. Create Scenario
        scen = Stage2PreliminaryDesignService.create_scenario(
            project_id="PRJ-999",
            name="Skenario Optimasi 1",
            target_dwt=5000.0,
            speed_knots=13.0,
            comp=comp
        )
        self.assertTrue(scen.is_complete)
        self.assertTrue(scen.lbp_m > 88.0) # scaled up since 5000 > 4000
        
        # 2. Validation Check
        res = validate_preliminary_design(scen)
        # Since weight items have some default imbalance, it might have a warning
        self.assertTrue(res.is_complete)
        
        # 3. History Init
        hist = Stage2History(project_id="PRJ-999")
        rev0 = Stage2PreliminaryDesignService.create_initial_history_revision(scen, "designer@test.com")
        hist.revisions.append(rev0)
        
        # Save & Load
        Stage2PreliminaryDesignService.save_stage2_history(hist, self.file_path)
        loaded = Stage2PreliminaryDesignService.load_stage2_history(self.file_path, "PRJ-999")
        self.assertEqual(len(loaded.revisions), 1)
        self.assertEqual(loaded.revisions[0].scenario_id, scen.scenario_id)

        # 4. Update scenario
        scen_loaded = loaded.revisions[0].data_snapshot
        updates = {
            "breadth_m": 16.5,
            "depth_m": 8.5,
        }
        # Update and auto-calculate kb, bm, km, ehp nsp, curves
        Stage2PreliminaryDesignService.update_scenario_data(scen_loaded, updates, speed_knots=13.0)
        self.assertEqual(scen_loaded.breadth_m, 16.5)
        
        # 5. Submit & Approve Flow
        Stage2PreliminaryDesignService.submit_scenario_revision(loaded, rev0.revision_id, "designer@test.com")
        self.assertEqual(loaded.revisions[0].status, RevisionStatus.WAITING_FOR_REVIEW)
        
        # Make weight balanced to allow approval
        # Adjust weight items to perfectly match displacement
        disp = scen_loaded.displacement_ton
        scen_loaded.weight_items[4].weight_ton = disp - sum(scen_loaded.weight_items[i].weight_ton for i in [0, 1, 2, 3, 5])
        # Re-calc KG & GM
        Stage2PreliminaryDesignService.update_scenario_data(scen_loaded, {}, speed_knots=13.0)
        
        # Approve
        Stage2PreliminaryDesignService.approve_scenario_revision(loaded, rev0.revision_id, "reviewer@test.com", "Desain awal memenuhi stabilitas & kapasitas.")
        self.assertEqual(loaded.revisions[0].status, RevisionStatus.APPROVED)
        self.assertEqual(len(loaded.baselines), 1)
        self.assertTrue(loaded.baselines[0].active)
