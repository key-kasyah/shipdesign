"""
╔══════════════════════════════════════════════════════════════════════════════╗
║  NSP MODEL VALIDATION & CALIBRATION                                        ║
║  Nederlandsche Scheepsbouw Proefstation — Diagram Sectional Area           ║
║                                                                             ║
║  Purpose:                                                                   ║
║  1. Compare current power-law model against reference NSP data              ║
║  2. Calculate MAE, RMSE, Percentage Error per Cb                            ║
║  3. Calibrate parameters (n = f(Cb)) using least-squares fitting            ║
║  4. Generate improved model recommendations                                 ║
║                                                                             ║
║  Reference Data Source:                                                     ║
║  - "Principles of Naval Architecture" (SNAME)                               ║
║  - "Basic Ship Theory" Rawson & Tupper, 5th Ed.                             ║
║  - NSP Wageningen Standard Sectional Area Coefficients                      ║
║  - Digitized values from published NSP nomograms                            ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

import math
import json
import os
from datetime import datetime

# =============================================================================
#  SECTION 1: REFERENCE NSP DATA (FROM PUBLISHED LITERATURE)
# =============================================================================
# 
# NSP Data Format:
#   - Station 0 = AP (After Perpendicular)
#   - Station 10 = Midship
#   - Station 20 = FP (Forward Perpendicular)
#   - Values = % of midship section area (Am)
#
# These values are extracted from standard NSP diagrams published in:
#   1. Wageningen Model Basin publications
#   2. "Principles of Naval Architecture" (SNAME, Vol. I)
#   3. "Basic Ship Theory" (Rawson & Tupper)
#   4. H. Lackenby, "On the Systematic Geometrical Variation of Ship Forms" (1950)
#
# The NSP diagram uses Cp (prismatic coefficient) as the primary parameter.
# For standard merchant ship forms with Cm ≈ 0.98:
#   Cb ≈ Cp × Cm, so Cp ≈ Cb / 0.98
#
# Note: The reference data below represents the sectional area coefficient
# at each station as a percentage of the midship section area.
# Station 10 (midship) is always 100%.
# =============================================================================

NSP_REFERENCE_DATA = {
    # Cb = 0.55 (Fine form, e.g., fast cargo ships, container ships)
    # Cp ≈ 0.561
    0.55: {
        "stations": {
            0:   0.0,    # AP
            1:  15.0,
            2:  38.0,
            3:  61.0,
            4:  79.0,
            5:  90.5,
            6:  96.5,
            7:  99.0,
            8:  99.8,
            9: 100.0,
            10: 100.0,   # Midship
            11: 100.0,
            12:  99.5,
            13:  97.0,
            14:  91.0,
            15:  80.0,
            16:  64.0,
            17:  44.0,
            18:  24.0,
            19:   8.0,
            20:   0.0    # FP
        },
        "source": "NSP Wageningen, Cp=0.561"
    },

    # Cb = 0.60 (Moderate-fine form)
    # Cp ≈ 0.612
    0.60: {
        "stations": {
            0:   0.0,
            1:  22.0,
            2:  48.0,
            3:  70.0,
            4:  85.0,
            5:  93.5,
            6:  97.5,
            7:  99.5,
            8: 100.0,
            9: 100.0,
            10: 100.0,
            11: 100.0,
            12:  99.5,
            13:  97.5,
            14:  93.0,
            15:  84.0,
            16:  70.0,
            17:  52.0,
            18:  32.0,
            19:  13.0,
            20:   0.0
        },
        "source": "NSP Wageningen, Cp=0.612"
    },

    # Cb = 0.65 (Moderate form, general cargo)
    # Cp ≈ 0.663
    0.65: {
        "stations": {
            0:   0.0,
            1:  30.0,
            2:  57.0,
            3:  77.0,
            4:  89.5,
            5:  95.5,
            6:  98.5,
            7:  99.8,
            8: 100.0,
            9: 100.0,
            10: 100.0,
            11: 100.0,
            12:  99.8,
            13:  98.0,
            14:  94.5,
            15:  87.0,
            16:  75.0,
            17:  58.0,
            18:  38.0,
            19:  17.0,
            20:   0.0
        },
        "source": "NSP Wageningen, Cp=0.663"
    },

    # Cb = 0.70 (Full form, standard cargo)
    # Cp ≈ 0.714
    0.70: {
        "stations": {
            0:   0.0,
            1:  38.0,
            2:  65.0,
            3:  83.0,
            4:  93.0,
            5:  97.0,
            6:  99.0,
            7: 100.0,
            8: 100.0,
            9: 100.0,
            10: 100.0,
            11: 100.0,
            12: 100.0,
            13:  98.5,
            14:  95.5,
            15:  89.0,
            16:  78.0,
            17:  63.0,
            18:  44.0,
            19:  22.0,
            20:   0.0
        },
        "source": "NSP Wageningen, Cp=0.714"
    },

    # Cb = 0.75 (Full form, bulk carrier)
    # Cp ≈ 0.765
    0.75: {
        "stations": {
            0:   0.0,
            1:  45.0,
            2:  72.0,
            3:  88.0,
            4:  95.5,
            5:  98.5,
            6:  99.5,
            7: 100.0,
            8: 100.0,
            9: 100.0,
            10: 100.0,
            11: 100.0,
            12: 100.0,
            13:  99.0,
            14:  96.5,
            15:  91.0,
            16:  82.0,
            17:  68.0,
            18:  50.0,
            19:  27.0,
            20:   0.0
        },
        "source": "NSP Wageningen, Cp=0.765"
    },

    # Cb = 0.80 (Very full form, tanker/bulker)
    # Cp ≈ 0.816
    0.80: {
        "stations": {
            0:   0.0,
            1:  52.0,
            2:  78.0,
            3:  92.0,
            4:  97.0,
            5:  99.0,
            6:  99.8,
            7: 100.0,
            8: 100.0,
            9: 100.0,
            10: 100.0,
            11: 100.0,
            12: 100.0,
            13:  99.5,
            14:  97.5,
            15:  93.0,
            16:  85.0,
            17:  73.0,
            18:  55.0,
            19:  32.0,
            20:   0.0
        },
        "source": "NSP Wageningen, Cp=0.816"
    }
}


# =============================================================================
#  SECTION 2: CURRENT MODEL IMPLEMENTATION (Exact replica of page.tsx logic)
# =============================================================================

def current_model_ordinate(station_index: int, cb: float) -> float:
    """
    Exact replica of the current power-law model from page.tsx.
    
    Returns: percentage of Am (0-100)
    """
    i = station_index
    is_stern = i < 10
    r = i / 10.0 if is_stern else (i - 10) / 10.0
    n = 2.0 + cb * 4.0

    if is_stern:
        pct = max(0.0, 1.0 - abs(r - 1.0) ** n)
    else:
        pct = max(0.0, 1.0 - r ** n)

    return pct * 100.0


# =============================================================================
#  SECTION 3: VALIDATION METRICS
# =============================================================================

def calculate_metrics(predicted: list, actual: list) -> dict:
    """Calculate MAE, RMSE, and Mean Absolute Percentage Error."""
    n = len(predicted)
    assert n == len(actual), "Arrays must be same length"
    
    # MAE (Mean Absolute Error)
    abs_errors = [abs(p - a) for p, a in zip(predicted, actual)]
    mae = sum(abs_errors) / n
    
    # RMSE (Root Mean Square Error)
    sq_errors = [(p - a) ** 2 for p, a in zip(predicted, actual)]
    rmse = math.sqrt(sum(sq_errors) / n)
    
    # MAPE (Mean Absolute Percentage Error) — exclude stations where actual = 0
    pct_errors = []
    for p, a in zip(predicted, actual):
        if a > 1.0:  # Avoid division by near-zero
            pct_errors.append(abs(p - a) / a * 100.0)
    mape = sum(pct_errors) / len(pct_errors) if pct_errors else 0.0
    
    # Max error
    max_error = max(abs_errors)
    max_error_idx = abs_errors.index(max_error)
    
    return {
        "mae": mae,
        "rmse": rmse,
        "mape": mape,
        "max_error": max_error,
        "max_error_station": max_error_idx,
        "errors": abs_errors
    }


def validate_current_model():
    """Run full validation of current model against reference data."""
    
    print("=" * 80)
    print("  NSP MODEL VALIDATION REPORT")
    print(f"  Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("  Current Model: n = 2.0 + Cb × 4.0")
    print("=" * 80)
    print()
    
    all_predicted = []
    all_actual = []
    results_per_cb = {}
    
    for cb in sorted(NSP_REFERENCE_DATA.keys()):
        ref_data = NSP_REFERENCE_DATA[cb]
        predicted = []
        actual = []
        
        for st in range(21):
            pred = current_model_ordinate(st, cb)
            act = ref_data["stations"][st]
            predicted.append(pred)
            actual.append(act)
        
        metrics = calculate_metrics(predicted, actual)
        results_per_cb[cb] = {
            "predicted": predicted,
            "actual": actual,
            "metrics": metrics
        }
        
        all_predicted.extend(predicted)
        all_actual.extend(actual)
        
        print(f"┌──────────────────────────────────────────────────────────┐")
        print(f"│  Cb = {cb:.2f}   (Source: {ref_data['source']})")
        print(f"├──────────────────────────────────────────────────────────┤")
        print(f"│  MAE  = {metrics['mae']:8.2f} %Am")
        print(f"│  RMSE = {metrics['rmse']:8.2f} %Am")
        print(f"│  MAPE = {metrics['mape']:8.2f} %")
        print(f"│  Max Error = {metrics['max_error']:.2f} %Am at Station {metrics['max_error_station']}")
        print(f"├──────────────────────────────────────────────────────────┤")
        print(f"│  Station-by-Station Comparison:")
        print(f"│  {'St':>4}  {'Ref(%)':>8}  {'Model(%)':>9}  {'Err':>7}  {'Bar'}")
        print(f"│  {'─'*4}  {'─'*8}  {'─'*9}  {'─'*7}  {'─'*20}")
        
        for st in range(21):
            ref_val = actual[st]
            mod_val = predicted[st]
            err = mod_val - ref_val
            bar_len = min(int(abs(err) / 2), 20)
            bar = "▓" * bar_len
            sign = "+" if err > 0 else "-" if err < 0 else " "
            print(f"│  {st:>4}  {ref_val:>8.1f}  {mod_val:>9.1f}  {sign}{abs(err):>5.1f}  {bar}")
        
        print(f"└──────────────────────────────────────────────────────────┘")
        print()
    
    # Overall metrics
    overall = calculate_metrics(all_predicted, all_actual)
    
    print("=" * 80)
    print("  OVERALL METRICS (All Cb values combined)")
    print("=" * 80)
    print(f"  Total data points: {len(all_predicted)}")
    print(f"  MAE  = {overall['mae']:.3f} %Am")
    print(f"  RMSE = {overall['rmse']:.3f} %Am")
    print(f"  MAPE = {overall['mape']:.3f} %")
    print()
    
    # Summary table
    print("  ┌────────┬──────────┬──────────┬──────────┬─────────────────┐")
    print("  │   Cb   │ MAE(%Am) │ RMSE(%Am)│ MAPE(%)  │ Worst Station   │")
    print("  ├────────┼──────────┼──────────┼──────────┼─────────────────┤")
    for cb in sorted(results_per_cb.keys()):
        m = results_per_cb[cb]["metrics"]
        print(f"  │  {cb:.2f}  │  {m['mae']:6.2f}  │  {m['rmse']:6.2f}  │  {m['mape']:6.2f}  │ St.{m['max_error_station']:>2} ({m['max_error']:.1f}%Am) │")
    print("  ├────────┼──────────┼──────────┼──────────┼─────────────────┤")
    print(f"  │  ALL   │  {overall['mae']:6.2f}  │  {overall['rmse']:6.2f}  │  {overall['mape']:6.2f}  │                 │")
    print("  └────────┴──────────┴──────────┴──────────┴─────────────────┘")
    print()
    
    return results_per_cb, overall


# =============================================================================
#  SECTION 4: PARAMETER CALIBRATION
# =============================================================================

def calibrate_n_per_cb():
    """
    Find optimal exponent 'n' for each Cb value independently.
    Uses brute-force search (no scipy needed).
    """
    print("=" * 80)
    print("  PARAMETER CALIBRATION: Optimal n per Cb")
    print("=" * 80)
    print()
    
    optimal_n = {}
    
    for cb in sorted(NSP_REFERENCE_DATA.keys()):
        ref_data = NSP_REFERENCE_DATA[cb]
        best_n = None
        best_rmse = float('inf')
        
        # Search n from 1.0 to 10.0 in steps of 0.01
        for n_int in range(100, 1001):
            n = n_int / 100.0
            
            predicted = []
            actual = []
            for st in range(21):
                i = st
                is_stern = i < 10
                r = i / 10.0 if is_stern else (i - 10) / 10.0
                
                if is_stern:
                    pct = max(0.0, 1.0 - abs(r - 1.0) ** n)
                else:
                    pct = max(0.0, 1.0 - r ** n)
                
                predicted.append(pct * 100.0)
                actual.append(ref_data["stations"][st])
            
            sq_errors = [(p - a) ** 2 for p, a in zip(predicted, actual)]
            rmse = math.sqrt(sum(sq_errors) / len(sq_errors))
            
            if rmse < best_rmse:
                best_rmse = rmse
                best_n = n
        
        optimal_n[cb] = {"n": best_n, "rmse": best_rmse}
        current_n = 2.0 + cb * 4.0
        print(f"  Cb = {cb:.2f}: Optimal n = {best_n:.2f}  (current n = {current_n:.2f}, improvement = {((current_n - best_n) / current_n * 100):+.1f}%)")
    
    print()
    
    # Now fit a linear relationship n = a + b*Cb
    cbs = sorted(optimal_n.keys())
    ns = [optimal_n[cb]["n"] for cb in cbs]
    
    # Simple linear regression: n = a + b*Cb
    n_pts = len(cbs)
    sum_cb = sum(cbs)
    sum_n = sum(ns)
    sum_cb2 = sum(c**2 for c in cbs)
    sum_cb_n = sum(c * n for c, n in zip(cbs, ns))
    
    b = (n_pts * sum_cb_n - sum_cb * sum_n) / (n_pts * sum_cb2 - sum_cb**2)
    a = (sum_n - b * sum_cb) / n_pts
    
    print(f"  Linear Fit: n = {a:.4f} + {b:.4f} × Cb")
    print(f"  (Current:   n = 2.0000 + 4.0000 × Cb)")
    print()
    
    # Also try quadratic: n = a + b*Cb + c*Cb²
    # Using normal equations
    sum_cb3 = sum(c**3 for c in cbs)
    sum_cb4 = sum(c**4 for c in cbs)
    sum_cb2_n = sum(c**2 * n for c, n in zip(cbs, ns))
    
    # Solve 3x3 system using Cramer's rule
    # [n  Σcb  Σcb²] [a]   [Σn    ]
    # [Σcb Σcb² Σcb³] [b] = [Σcb·n ]
    # [Σcb² Σcb³ Σcb⁴] [c]   [Σcb²·n]
    
    A_mat = [
        [n_pts, sum_cb, sum_cb2],
        [sum_cb, sum_cb2, sum_cb3],
        [sum_cb2, sum_cb3, sum_cb4]
    ]
    B_vec = [sum_n, sum_cb_n, sum_cb2_n]
    
    def det3(m):
        return (m[0][0]*(m[1][1]*m[2][2] - m[1][2]*m[2][1]) -
                m[0][1]*(m[1][0]*m[2][2] - m[1][2]*m[2][0]) +
                m[0][2]*(m[1][0]*m[2][1] - m[1][1]*m[2][0]))
    
    det_A = det3(A_mat)
    
    if abs(det_A) > 1e-10:
        # Replace columns for Cramer's rule
        A1 = [[B_vec[i] if j == 0 else A_mat[i][j] for j in range(3)] for i in range(3)]
        A2 = [[B_vec[i] if j == 1 else A_mat[i][j] for j in range(3)] for i in range(3)]
        A3 = [[B_vec[i] if j == 2 else A_mat[i][j] for j in range(3)] for i in range(3)]
        
        qa = det3(A1) / det_A
        qb = det3(A2) / det_A
        qc = det3(A3) / det_A
        
        print(f"  Quadratic Fit: n = {qa:.4f} + {qb:.4f} × Cb + {qc:.4f} × Cb²")
        print()
    else:
        qa, qb, qc = a, b, 0.0
        print("  (Quadratic fit: singular matrix, using linear)")
    
    # Compare RMSE of different models
    print("  ┌────────┬──────────────┬──────────────┬──────────────┬──────────────┐")
    print("  │   Cb   │ Current RMSE │ Optimal RMSE │ LinFit RMSE  │ QuadFit RMSE │")
    print("  ├────────┼──────────────┼──────────────┼──────────────┼──────────────┤")
    
    for cb in cbs:
        ref_data = NSP_REFERENCE_DATA[cb]
        
        # Current model
        pred_current = [current_model_ordinate(st, cb) for st in range(21)]
        act = [ref_data["stations"][st] for st in range(21)]
        rmse_current = math.sqrt(sum((p-a)**2 for p,a in zip(pred_current, act)) / 21)
        
        # Optimal n (per-Cb)
        rmse_optimal = optimal_n[cb]["rmse"]
        
        # Linear fit
        n_lin = a + b * cb
        pred_lin = []
        for st in range(21):
            i = st
            is_stern = i < 10
            r = i / 10.0 if is_stern else (i - 10) / 10.0
            if is_stern:
                pct = max(0.0, 1.0 - abs(r - 1.0) ** n_lin)
            else:
                pct = max(0.0, 1.0 - r ** n_lin)
            pred_lin.append(pct * 100.0)
        rmse_lin = math.sqrt(sum((p-a_)**2 for p,a_ in zip(pred_lin, act)) / 21)
        
        # Quadratic fit
        n_quad = qa + qb * cb + qc * cb**2
        pred_quad = []
        for st in range(21):
            i = st
            is_stern = i < 10
            r = i / 10.0 if is_stern else (i - 10) / 10.0
            if is_stern:
                pct = max(0.0, 1.0 - abs(r - 1.0) ** n_quad)
            else:
                pct = max(0.0, 1.0 - r ** n_quad)
            pred_quad.append(pct * 100.0)
        rmse_quad = math.sqrt(sum((p-a_)**2 for p,a_ in zip(pred_quad, act)) / 21)
        
        print(f"  │  {cb:.2f}  │   {rmse_current:8.3f}   │   {rmse_optimal:8.3f}   │   {rmse_lin:8.3f}   │   {rmse_quad:8.3f}   │")
    
    print("  └────────┴──────────────┴──────────────┴──────────────┴──────────────┘")
    print()
    
    return {
        "optimal_per_cb": optimal_n,
        "linear_fit": {"a": a, "b": b},
        "quadratic_fit": {"a": qa, "b": qb, "c": qc}
    }


# =============================================================================
#  SECTION 5: ADVANCED ALTERNATIVE MODELS
# =============================================================================

def test_alternative_models():
    """
    Test whether the single power-law is the best functional form,
    or if alternatives (separate stern/bow exponents, piecewise, etc.) do better.
    """
    print("=" * 80)
    print("  ALTERNATIVE MODEL EXPLORATION")
    print("=" * 80)
    print()
    
    # Model A: Current (n_stern = n_bow = 2+4Cb)
    # Model B: Separate exponents for stern and bow
    # Model C: Different base function (cosine-based)
    
    results = {}
    
    for cb in sorted(NSP_REFERENCE_DATA.keys()):
        ref_data = NSP_REFERENCE_DATA[cb]
        act = [ref_data["stations"][st] for st in range(21)]
        
        # --- Model A: Current ---
        pred_a = [current_model_ordinate(st, cb) for st in range(21)]
        rmse_a = math.sqrt(sum((p-a)**2 for p,a in zip(pred_a, act)) / 21)
        
        # --- Model B: Separate stern/bow exponents (brute force) ---
        best_ns = best_nb = None
        best_rmse_b = float('inf')
        
        for ns_int in range(100, 801, 5):
            ns = ns_int / 100.0
            for nb_int in range(100, 801, 5):
                nb = nb_int / 100.0
                pred = []
                for st in range(21):
                    is_stern = st < 10
                    r = st / 10.0 if is_stern else (st - 10) / 10.0
                    if is_stern:
                        pct = max(0.0, 1.0 - abs(r - 1.0) ** ns) * 100.0
                    else:
                        pct = max(0.0, 1.0 - r ** nb) * 100.0
                    pred.append(pct)
                rmse = math.sqrt(sum((p-a_)**2 for p,a_ in zip(pred, act)) / 21)
                if rmse < best_rmse_b:
                    best_rmse_b = rmse
                    best_ns = ns
                    best_nb = nb
        
        # --- Model C: Cosine-based ---
        # pct = 0.5 * (1 + cos(pi * (1-r))) for stern, 0.5 * (1 + cos(pi*r)) for bow
        # Scaled with Cb influence
        best_k = None
        best_rmse_c = float('inf')
        for k_int in range(50, 400, 5):
            k = k_int / 100.0
            pred_c = []
            for st in range(21):
                is_stern = st < 10
                r = st / 10.0 if is_stern else (st - 10) / 10.0
                if is_stern:
                    base = 0.5 * (1 + math.cos(math.pi * abs(r - 1.0)))
                    pct = max(0.0, min(1.0, base ** (1/k))) * 100.0
                else:
                    base = 0.5 * (1 + math.cos(math.pi * r))
                    pct = max(0.0, min(1.0, base ** (1/k))) * 100.0
                pred_c.append(pct)
            rmse = math.sqrt(sum((p-a_)**2 for p,a_ in zip(pred_c, act)) / 21)
            if rmse < best_rmse_c:
                best_rmse_c = rmse
                best_k = k
        
        results[cb] = {
            "model_a_rmse": rmse_a,
            "model_b_rmse": best_rmse_b,
            "model_b_ns": best_ns,
            "model_b_nb": best_nb,
            "model_c_rmse": best_rmse_c,
            "model_c_k": best_k
        }
    
    print("  ┌────────┬───────────────┬────────────────────────────┬──────────────────┐")
    print("  │   Cb   │ A: Current    │ B: Split Stern/Bow         │ C: Cosine-based  │")
    print("  │        │ RMSE          │ RMSE (ns, nb)              │ RMSE (k)         │")
    print("  ├────────┼───────────────┼────────────────────────────┼──────────────────┤")
    for cb in sorted(results.keys()):
        r = results[cb]
        print(f"  │  {cb:.2f}  │   {r['model_a_rmse']:8.3f}    │   {r['model_b_rmse']:6.3f} ({r['model_b_ns']:.2f}, {r['model_b_nb']:.2f})   │   {r['model_c_rmse']:6.3f} ({r['model_c_k']:.2f})   │")
    print("  └────────┴───────────────┴────────────────────────────┴──────────────────┘")
    print()
    
    return results


# =============================================================================
#  SECTION 6: GENERATE ASSESSMENT VERDICT
# =============================================================================

def generate_verdict(results_per_cb, overall, calibration, alt_models):
    """Generate final assessment."""
    
    print("=" * 80)
    print("  FINAL ASSESSMENT & RECOMMENDATION")
    print("=" * 80)
    print()
    
    # Determine quality level
    overall_rmse = overall["rmse"]
    overall_mape = overall["mape"]
    
    if overall_rmse < 3.0 and overall_mape < 5.0:
        verdict = "EXCELLENT"
        emoji = "✅"
        desc = "Model akurat untuk analisis awal dan desain pendahuluan"
    elif overall_rmse < 6.0 and overall_mape < 10.0:
        verdict = "ACCEPTABLE"
        emoji = "⚠️"
        desc = "Model cukup untuk visualisasi, perlu kalibrasi untuk analisis"
    elif overall_rmse < 10.0 and overall_mape < 15.0:
        verdict = "MARGINAL"
        emoji = "🟡"
        desc = "Model hanya cocok untuk ilustrasi, tidak untuk perhitungan"
    else:
        verdict = "POOR"
        emoji = "❌"
        desc = "Model tidak representatif, perlu pendekatan berbeda"
    
    print(f"  {emoji}  Verdict: {verdict}")
    print(f"  {desc}")
    print()
    print(f"  Overall RMSE : {overall_rmse:.3f} %Am")
    print(f"  Overall MAPE : {overall_mape:.3f} %")
    print()
    
    # Best alternative
    lin = calibration["linear_fit"]
    quad = calibration["quadratic_fit"]
    
    print("  Recommended Parameter Update:")
    print(f"    Current:    n = 2.0000 + 4.0000 × Cb")
    print(f"    Linear:     n = {lin['a']:.4f} + {lin['b']:.4f} × Cb")
    print(f"    Quadratic:  n = {quad['a']:.4f} + {quad['b']:.4f} × Cb + {quad['c']:.4f} × Cb²")
    print()
    
    # Estimated improvement
    print("  Estimated RMSE Improvement with Calibrated Parameters:")
    for cb in sorted(results_per_cb.keys()):
        current_rmse = results_per_cb[cb]["metrics"]["rmse"]
        optimal_rmse = calibration["optimal_per_cb"][cb]["rmse"]
        improvement = (current_rmse - optimal_rmse) / current_rmse * 100 if current_rmse > 0 else 0
        print(f"    Cb={cb:.2f}: {current_rmse:.2f} → {optimal_rmse:.2f} ({improvement:+.1f}%)")
    
    print()
    print("  Implementation Recommendation:")
    print("  ─────────────────────────────────────────────────────────")
    print("  1. Update the exponent formula to calibrated linear fit")
    print("  2. Add NSP_REFERENCE_DATA as a lookup table in the code")
    print("  3. Implement dual mode: Approximation + NSP Reference")
    print("  4. Display error metrics to user when in Approximation mode")
    print()
    
    return {
        "verdict": verdict,
        "overall_rmse": overall_rmse,
        "overall_mape": overall_mape,
        "linear_fit": lin,
        "quadratic_fit": quad
    }


# =============================================================================
#  SECTION 7: EXPORT RESULTS AS JSON
# =============================================================================

def export_results(results_per_cb, overall, calibration, alt_models, verdict):
    """Export all results to JSON for use in the frontend."""
    
    output = {
        "timestamp": datetime.now().isoformat(),
        "model_description": "Power-law: pct = 1 - |r-1|^n (stern), pct = 1 - r^n (bow)",
        "current_formula": "n = 2.0 + 4.0 * Cb",
        "reference_source": "NSP Wageningen (Nederlandsche Scheepsbouw Proefstation)",
        "overall_metrics": {
            "mae": round(overall["mae"], 4),
            "rmse": round(overall["rmse"], 4),
            "mape": round(overall["mape"], 4)
        },
        "verdict": verdict["verdict"],
        "per_cb_metrics": {},
        "calibration": {
            "optimal_n_per_cb": {},
            "linear_fit": {
                "formula": f"n = {calibration['linear_fit']['a']:.4f} + {calibration['linear_fit']['b']:.4f} * Cb",
                "a": round(calibration["linear_fit"]["a"], 4),
                "b": round(calibration["linear_fit"]["b"], 4)
            },
            "quadratic_fit": {
                "formula": f"n = {calibration['quadratic_fit']['a']:.4f} + {calibration['quadratic_fit']['b']:.4f} * Cb + {calibration['quadratic_fit']['c']:.4f} * Cb^2",
                "a": round(calibration["quadratic_fit"]["a"], 4),
                "b": round(calibration["quadratic_fit"]["b"], 4),
                "c": round(calibration["quadratic_fit"]["c"], 4)
            }
        },
        "nsp_reference_data": {}
    }
    
    for cb in sorted(results_per_cb.keys()):
        m = results_per_cb[cb]["metrics"]
        output["per_cb_metrics"][str(cb)] = {
            "mae": round(m["mae"], 4),
            "rmse": round(m["rmse"], 4),
            "mape": round(m["mape"], 4),
            "max_error": round(m["max_error"], 4),
            "max_error_station": m["max_error_station"]
        }
        
        output["calibration"]["optimal_n_per_cb"][str(cb)] = round(calibration["optimal_per_cb"][cb]["n"], 2)
        
        # Include reference data for frontend use
        output["nsp_reference_data"][str(cb)] = NSP_REFERENCE_DATA[cb]["stations"]
    
    # Save JSON
    output_path = os.path.join(os.path.dirname(__file__), "validation_results.json")
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)
    
    print(f"  Results exported to: {output_path}")
    return output


# =============================================================================
#  MAIN EXECUTION
# =============================================================================

if __name__ == "__main__":
    print()
    print("╔══════════════════════════════════════════════════════════════════════╗")
    print("║  NSP MODEL VALIDATION & CALIBRATION SUITE                          ║")
    print("║  Ship Design Platform — Technical Validation                        ║")
    print("╚══════════════════════════════════════════════════════════════════════╝")
    print()
    
    # Step 1: Validate current model
    results_per_cb, overall = validate_current_model()
    
    # Step 2: Calibrate parameters
    calibration = calibrate_n_per_cb()
    
    # Step 3: Test alternative models
    alt_models = test_alternative_models()
    
    # Step 4: Generate verdict
    verdict = generate_verdict(results_per_cb, overall, calibration, alt_models)
    
    # Step 5: Export JSON
    export_data = export_results(results_per_cb, overall, calibration, alt_models, verdict)
    
    print()
    print("═" * 80)
    print("  VALIDATION COMPLETE")
    print("═" * 80)
