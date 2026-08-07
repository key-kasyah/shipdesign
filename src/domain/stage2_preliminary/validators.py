from typing import List
from src.core.enums import ValidationSeverity
from src.domain.stage1_requirements.models import ValidationIssue, ValidationResult
from src.domain.stage2_preliminary.models import DesignScenario

def validate_preliminary_design(scen: DesignScenario) -> ValidationResult:
    """
    Validation engine khusus Tahap 2 — Pra-Rancangan Kapal.
    Memeriksa kelayakan teknis, rasio dimensi, freeboard, kesetimbangan berat,
    dan kriteria stabilitas awal (GM).
    """
    issuesList: List[ValidationIssue] = []
    
    # 1. Cek kelengkapan utama
    mandatory_fields = [
        ("lbp_m", "LBP"),
        ("breadth_m", "Breadth"),
        ("draft_m", "Draft"),
        ("depth_m", "Depth"),
        ("cb", "Block Coefficient"),
        ("displacement_ton", "Displacement")
    ]
    
    missing_fields = []
    for attr, name in mandatory_fields:
        val = getattr(scen, attr, 0)
        if val <= 0:
            missing_fields.append(name)
            issuesList.append(ValidationIssue(
                code="PRE_MISSING_FIELD",
                field_path=attr,
                severity=ValidationSeverity.ERROR,
                message=f"Parameter wajib '{name}' belum diisi atau bernilai nol.",
                suggestion=f"Masukkan nilai positif untuk parameter '{name}'.",
                actual_value=val,
                rule_name="Mandatory Field Presence",
                rule_source="PRD Tahap 2 Section 10"
            ))
            
    is_complete = len(missing_fields) == 0
    
    # Cek Rasio Utama jika ukuran utama diisi
    if scen.lbp_m > 0 and scen.breadth_m > 0:
        l_b = scen.lbp_m / scen.breadth_m
        # L/B ratio check
        if l_b < 5.0 or l_b > 8.5:
            issuesList.append(ValidationIssue(
                code="PRE_RATIO_LB_OUT_OF_RANGE",
                field_path="lbp_m",
                severity=ValidationSeverity.WARNING,
                message=f"Rasio LBP/Breadth ({l_b:.3f}) berada di luar rentang wajar (5.0 - 8.5).",
                suggestion="Pertimbangkan menyesuaikan LBP atau Breadth untuk hambatan lambung yang lebih optimal.",
                actual_value=l_b,
                rule_name="L/B Ratio Check",
                rule_source="Standard Naval Architecture Empirical Ranges"
            ))
            
    if scen.breadth_m > 0 and scen.draft_m > 0:
        b_t = scen.breadth_m / scen.draft_m
        # B/T ratio check
        if b_t < 1.8 or b_t > 3.2:
            issuesList.append(ValidationIssue(
                code="PRE_RATIO_BT_OUT_OF_RANGE",
                field_path="breadth_m",
                severity=ValidationSeverity.WARNING,
                message=f"Rasio Breadth/Draft ({b_t:.3f}) berada di luar rentang wajar (1.8 - 3.2).",
                suggestion="Sesuaikan draft atau lebar kapal untuk menjaga keseimbangan stabilitas dan hambatan.",
                actual_value=b_t,
                rule_name="B/T Ratio Check",
                rule_source="Standard Naval Architecture Empirical Ranges"
            ))

    if scen.lbp_m > 0 and scen.depth_m > 0:
        l_h = scen.lbp_m / scen.depth_m
        # L/H ratio check
        if l_h < 9.0 or l_h > 15.0:
            issuesList.append(ValidationIssue(
                code="PRE_RATIO_LH_OUT_OF_RANGE",
                field_path="depth_m",
                severity=ValidationSeverity.WARNING,
                message=f"Rasio LBP/Depth ({l_h:.3f}) berada di luar rentang kekuatan memanjang (9.0 - 15.0).",
                suggestion="Perhatikan kekuatan konstruksi balok geladak memanjang jika rasio L/H terlalu tinggi.",
                actual_value=l_h,
                rule_name="L/H Ratio Check",
                rule_source="Classification Rules for Longitudinal Strength"
            ))

    # Cek draf dan tinggi freeboard
    if scen.depth_m > 0 and scen.draft_m > 0:
        if scen.draft_m >= scen.depth_m:
            issuesList.append(ValidationIssue(
                code="PRE_DRAFT_EXCEEDS_DEPTH",
                field_path="draft_m",
                severity=ValidationSeverity.BLOCKING_ERROR,
                message=f"Draft kapal ({scen.draft_m} m) tidak boleh melebihi atau sama dengan Depth ({scen.depth_m} m).",
                suggestion="Kurangi nilai draft atau tingkatkan nilai depth (tinggi lambung).",
                actual_value=scen.draft_m,
                rule_name="Draft Boundary Limitation",
                rule_source="Load Line Convention 1966"
            ))
        else:
            freeboard = scen.depth_m - scen.draft_m
            min_freeboard = 0.1 * scen.depth_m
            if freeboard < min_freeboard:
                issuesList.append(ValidationIssue(
                    code="PRE_FREEBOARD_LOW",
                    field_path="depth_m",
                    severity=ValidationSeverity.WARNING,
                    message=f"Tinggi lambung bebas / freeboard ({freeboard:.3f} m) sangat rendah (kurang dari 10% Depth).",
                    suggestion="Tingkatkan nilai depth (tinggi lambung) untuk menjamin kelayakan keselamatan dari gelombang air laut.",
                    actual_value=freeboard,
                    rule_name="Minimum Freeboard Check",
                    rule_source="Load Line Regulation guidance"
                ))

    # Cek weight balance (keselarasan total berat LWT+DWT vs displacement)
    if scen.displacement_ton > 0:
        total_weight = sum(item.weight_ton for item in scen.weight_items)
        if total_weight > 0:
            mismatch = abs(total_weight - scen.displacement_ton) / scen.displacement_ton * 100.0
            if mismatch > 5.0:
                issuesList.append(ValidationIssue(
                    code="PRE_WEIGHT_DISPLACEMENT_HIGH_MISMATCH",
                    field_path="weight_mismatch_percent",
                    severity=ValidationSeverity.ERROR,
                    message=f"Ketidakseimbangan berat vs gaya apung terlalu tinggi ({mismatch:.2f}%). Toleransi maks 1.5%.",
                    suggestion="Sesuaikan komponen Lightweight (LWT) atau deadweight (DWT) agar mendekati displacement kapal.",
                    actual_value=mismatch,
                    rule_name="Weight-Displacement Equilibrium",
                    rule_source="Naval Architecture Basic Equilibrium"
                ))
            elif mismatch > 1.5:
                issuesList.append(ValidationIssue(
                    code="PRE_WEIGHT_DISPLACEMENT_MISMATCH",
                    field_path="weight_mismatch_percent",
                    severity=ValidationSeverity.WARNING,
                    message=f"Selisih berat vs displacement ({mismatch:.2f}%) melebihi target toleransi 1.5%.",
                    suggestion="Lakukan iterasi penyelarasan berat ringan (LWT) atau komponen mati (DWT) dengan displacement.",
                    actual_value=mismatch,
                    rule_name="Weight-Displacement Equilibrium",
                    rule_source="Naval Architecture Basic Equilibrium"
                ))

    # Cek stabilitas awal GM
    if scen.is_complete and scen.gm_m != 0.0:
        if scen.gm_m < 0.0:
            issuesList.append(ValidationIssue(
                code="PRE_STABILITY_GM_NEGATIVE",
                field_path="gm_m",
                severity=ValidationSeverity.BLOCKING_ERROR,
                message=f"Tinggi metasentra awal (GM = {scen.gm_m:.3f} m) bernilai negatif. Kapal rawan terbalik!",
                suggestion="Turunkan titik berat KG (turunkan VCG kargo/berat) atau naikkan Breadth kapal untuk menaikkan BM.",
                actual_value=scen.gm_m,
                rule_name="Initial Transverse Stability",
                rule_source="IMO Intact Stability Code Criteria"
            ))
        elif scen.gm_m < 0.15:
            issuesList.append(ValidationIssue(
                code="PRE_STABILITY_GM_LOW",
                field_path="gm_m",
                severity=ValidationSeverity.ERROR,
                message=f"Tinggi metasentra GM ({scen.gm_m:.3f} m) di bawah batas standar IMO minimum 0.15 m.",
                suggestion="Naikkan Breadth kapal atau kurangi VCG muatan kargo agar KG lebih rendah.",
                actual_value=scen.gm_m,
                rule_name="Initial Transverse Stability",
                rule_source="IMO Intact Stability Code Criteria"
            ))

    # Cek apakah ada issue bertingkat ERROR atau BLOCKING_ERROR
    has_blocking = any(issue.severity in [ValidationSeverity.ERROR, ValidationSeverity.BLOCKING_ERROR] for issue in issuesList)
    is_valid = not has_blocking
    
    error_count = sum(1 for issue in issuesList if issue.severity in [ValidationSeverity.ERROR, ValidationSeverity.BLOCKING_ERROR])
    warning_count = sum(1 for issue in issuesList if issue.severity == ValidationSeverity.WARNING)

    return ValidationResult(
        is_valid=is_valid,
        is_complete=is_complete,
        can_approve_baseline=is_complete and is_valid,
        issues=issuesList,
        error_count=error_count,
        warning_count=warning_count
    )
