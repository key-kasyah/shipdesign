import math
from typing import Dict, List, Tuple
from src.domain.stage2_preliminary.models import ComparableShip

def scale_dimensions(comp: ComparableShip, target_dwt: float) -> Dict[str, float]:
    """
    Melakukan scaling DWT pangkat 1/3 terhadap dimensi kapal pembanding.
    Mengembalikan dict dengan LBP, LOA, Breadth, Draft, dan Depth.
    """
    if comp.dwt_ton <= 0:
        raise ValueError("DWT kapal pembanding harus lebih besar dari 0.")
    if target_dwt <= 0:
        raise ValueError("Target DWT harus lebih besar dari 0.")
        
    scale_factor = (target_dwt / comp.dwt_ton) ** (1.0 / 3.0)
    
    return {
        "lbp_m": round(comp.lbp_m * scale_factor, 3),
        "loa_m": round(comp.loa_m * scale_factor, 3),
        "breadth_m": round(comp.breadth_m * scale_factor, 3),
        "draft_m": round(comp.draft_m * scale_factor, 3),
        "depth_m": round(comp.depth_m * scale_factor, 3),
    }

def calculate_froude_number(lwl_m: float, speed_knots: float) -> float:
    """Menghitung Froude Number (Fn)."""
    if lwl_m <= 0:
        return 0.0
    speed_m_s = speed_knots * 0.514444
    return speed_m_s / math.sqrt(9.81 * lwl_m)

def calculate_cb_ship_basic_design(speed_knots: float, lbp_m: float) -> float:
    """
    Menghitung Block Coefficient (Cb) berdasarkan rumus Ship Basic Design (hal. 10):
    Cb = 1.115 - ((0.276 * V_knot) / (Lbp^0.5))
    """
    if lbp_m <= 0 or speed_knots <= 0:
        return 0.75
    cb_val = 1.115 - ((0.276 * speed_knots) / math.sqrt(lbp_m))
    return round(max(0.50, min(0.85, cb_val)), 2)


def calculate_displacement(vol_m3: float, density: float) -> float:
    """Menghitung displacement dalam ton (Volume * Density)."""
    return vol_m3 * density

def calculate_kb(draft_m: float, cb: float, cw: float) -> float:
    """
    Menghitung tinggi KB (pusat gaya apung vertikal) menggunakan rumus Posdunine:
    KB = T * (Cw / (Cb + Cw))
    """
    if draft_m <= 0 or (cb + cw) == 0:
        return 0.0
    return draft_m * (cw / (cb + cw))

def calculate_bm(breadth_m: float, draft_m: float, cb: float, cw: float) -> float:
    """
    Menghitung metacentric radius BM transverse menggunakan rumus pendekatan:
    BM = B^2 * (1 + 2 * Cw) / (12 * Cb * T)
    """
    if draft_m <= 0 or cb <= 0:
        return 0.0
    return (breadth_m ** 2) * (1.0 + 2.0 * cw) / (12.0 * cb * draft_m)

def simpson_integrate(ordinates: List[float], spacing: float) -> float:
    """
    Mengintegrasikan ordinat menggunakan Aturan Simpson 1/3 untuk 21 station (jumlah gading genap).
    spacing: jarak antar station.
    """
    n = len(ordinates)
    if n != 21:
        raise ValueError("Jumlah ordinat harus tepat 21 untuk station 0 s.d 20.")
        
    total = ordinates[0] + ordinates[20]
    
    # 4 * odd stations, 2 * even stations
    for i in range(1, 20):
        if i % 2 == 1:
            total += 4.0 * ordinates[i]
        else:
            total += 2.0 * ordinates[i]
            
    return (spacing / 3.0) * total

def calculate_ehp_nsp(displacement_ton: float, speed_knots: float, cb: float) -> float:
    """
    Estimasi EHP (Effective Horsepower) dalam kW dengan metode NSP regresi empiris:
    Admiralty Coefficient C_ad = 320 - 90 * Cb
    EHP = (Displacement^(2/3) * V^3) / C_ad
    Dan dikonversi ke kW (1 HP = 0.7457 kW).
    """
    if displacement_ton <= 0 or speed_knots <= 0:
        return 0.0
    c_ad = 320.0 - 90.0 * cb
    if c_ad <= 0:
        c_ad = 200.0  # fallback
    
    ehp_hp = (displacement_ton ** (2.0 / 3.0)) * (speed_knots ** 3) / c_ad
    return ehp_hp * 0.7457

def generate_default_csa(lbp_m: float, displacement_m3: float, cb: float) -> List[float]:
    """
    Membangkitkan kurva CSA (21 station) standar yang proporsional dengan Cb.
    Menggunakan profil parabola terintegrasi simpson yang diskalakan ke target displacement.
    """
    if lbp_m <= 0 or displacement_m3 <= 0:
        return [0.0] * 21
        
    # Amplitudo area midship maksimum (Am = L * B * T * Cm / L = B * T * Cm)
    # Di sini kita gunakan perkiraan area rata-rata dan menyeimbangkan total volume.
    midship_area = (displacement_m3 / lbp_m) / cb
    
    # Buat kurva parabola dasar
    base_ordinates = []
    for i in range(21):
        x = (i - 10) / 10.0  # -1.0 s.d 1.0
        # Formula lengkung CSA dasar: 1 - x^n
        n = 2.0 + cb * 4.0  # eksponen kepenuhan CSA
        ord_val = max(0.0, 1.0 - abs(x) ** n)
        base_ordinates.append(ord_val)
        
    # Integrasikan base ordinates untuk menghitung volume dasar
    spacing = lbp_m / 20.0
    base_vol = simpson_integrate(base_ordinates, spacing)
    
    # Skala ordinat agar tepat menghasilkan displacement_m3
    scale = displacement_m3 / base_vol if base_vol > 0 else 0.0
    return [round(val * scale, 3) for val in base_ordinates]

def generate_default_dwl(lbp_m: float, breadth_m: float, cw: float) -> List[float]:
    """Membangkitkan kurva DWL setengah lebar (half-breadth) 21 station."""
    if lbp_m <= 0 or breadth_m <= 0:
        return [0.0] * 21
    half_b = breadth_m / 2.0
    ordinates = []
    for i in range(21):
        x = (i - 10) / 10.0  # -1.0 s.d 1.0
        n = 1.5 + cw * 3.0  # eksponen airplane
        val = max(0.0, half_b * (1.0 - abs(x) ** n))
        ordinates.append(round(val, 3))
    return ordinates

def generate_default_gading10(breadth_m: float, depth_m: float, cm: float) -> List[float]:
    """
    Membangkitkan penampang Gading 10 (midship section) setengah lebar
    untuk 21 titik pembagian vertikal dari baseline ke tinggi depth H.
    """
    if breadth_m <= 0 or depth_m <= 0:
        return [0.0] * 21
    half_b = breadth_m / 2.0
    ordinates = []
    for i in range(21):
        y = i / 20.0  # 0.0 s.d 1.0 (ketinggian relatif z/H)
        # Profil lambung midship bilga berbentuk lengkungan bertahap
        # Menggunakan faktor Cm untuk mengatur kelengkungan dasar (bilga)
        if y < 0.15:  # Bagian bawah / bilga
            factor = (y / 0.15) ** (1.0 + (1.0 - cm) * 5.0)
            val = half_b * factor
        else:
            val = half_b
        ordinates.append(round(val, 3))
    return ordinates
