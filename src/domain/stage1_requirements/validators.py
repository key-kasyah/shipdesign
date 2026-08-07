from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from src.core.enums import (
    PortConstraintHardness,
    StageStatus,
    ValidationSeverity,
    VesselType,
    WaterType,
)
from src.domain.stage1_requirements.models import ProjectData, ValidationIssue, ValidationResult

MANDATORY_FIELDS = [
    ("project_id", "ID Proyek", "REQ_PROJECT_ID_MISSING"),
    ("project_name", "Nama Proyek", "REQ_PROJECT_NAME_MISSING"),
    ("vessel_type", "Tipe Kapal", "REQ_VESSEL_TYPE_MISSING"),
    ("target_dwt_ton", "Target DWT (ton)", "REQ_DWT_MISSING"),
    ("service_speed_knots", "Kecepatan Dinas (knots)", "REQ_SPEED_MISSING"),
    ("water_density_t_m3", "Densitas Air (t/m³)", "REQ_DENSITY_MISSING"),
    ("water_type", "Jenis Perairan", "REQ_WATER_TYPE_MISSING"),
]


class BaseValidationRule:
    """Base class untuk semua aturan validasi."""
    def validate(self, data: ProjectData) -> List[ValidationIssue]:
        raise NotImplementedError


class RequiredFieldsRule(BaseValidationRule):
    """Memeriksa kelengkapan field wajib."""
    def validate(self, data: ProjectData) -> List[ValidationIssue]:
        issues = []
        
        # 1. Check primary mandatory fields
        for field_name, label, code in MANDATORY_FIELDS:
            val = getattr(data, field_name, None)
            if val is None or (isinstance(val, str) and not val.strip()):
                issues.append(ValidationIssue(
                    code=code,
                    field_path=field_name,
                    severity=ValidationSeverity.BLOCKING_ERROR,
                    message=f"{label} ({field_name}) wajib diisi.",
                    suggestion=f"Silakan isi nilai untuk field {label}.",
                    actual_value=val,
                    rule_name="Required Primary Fields",
                    rule_source="PRD-01-REQ"
                ))

        # 2. Check route completeness
        # Route is complete if route_name is filled OR operating_area is filled
        # OR both origin_port and destination_port are filled and non-empty.
        has_route_name = bool(data.route_name and data.route_name.strip())
        has_operating_area = bool(data.operating_area and data.operating_area.strip())
        has_ports = bool(
            data.origin_port and data.origin_port.strip() and 
            data.destination_port and data.destination_port.strip()
        )

        if not (has_route_name or has_operating_area or has_ports):
            issues.append(ValidationIssue(
                code="REQ_ROUTE_MISSING",
                field_path="route_name",
                severity=ValidationSeverity.BLOCKING_ERROR,
                message="Informasi rute/trayek atau area operasi wajib dilengkapi.",
                suggestion="Lengkapi nama rute, area operasi, atau pelabuhan asal dan tujuan.",
                actual_value=None,
                rule_name="Required Route Fields",
                rule_source="PRD-01-REQ"
            ))

        return issues


class TypeValidationRule(BaseValidationRule):
    """Memeriksa tipe data, format tanggal, enum, dan akomodasi integer."""
    def validate(self, data: ProjectData) -> List[ValidationIssue]:
        issues = []
        
        # Check Enums
        if not isinstance(data.vessel_type, VesselType):
            issues.append(ValidationIssue(
                code="ERR_INVALID_VESSEL_TYPE",
                field_path="vessel_type",
                severity=ValidationSeverity.BLOCKING_ERROR,
                message=f"Tipe kapal '{data.vessel_type}' tidak dikenali.",
                suggestion=f"Pilih salah satu tipe dari: {[e.value for e in VesselType]}.",
                actual_value=data.vessel_type,
                rule_name="Vessel Type Enum Check",
                rule_source="System Schema"
            ))
            
        if not isinstance(data.water_type, WaterType):
            issues.append(ValidationIssue(
                code="ERR_INVALID_WATER_TYPE",
                field_path="water_type",
                severity=ValidationSeverity.BLOCKING_ERROR,
                message=f"Jenis perairan '{data.water_type}' tidak dikenali.",
                suggestion=f"Pilih salah satu perairan dari: {[e.value for e in WaterType]}.",
                actual_value=data.water_type,
                rule_name="Water Type Enum Check",
                rule_source="System Schema"
            ))

        if not isinstance(data.draft_constraint_type, PortConstraintHardness):
            issues.append(ValidationIssue(
                code="ERR_INVALID_CONSTRAINT_TYPE",
                field_path="draft_constraint_type",
                severity=ValidationSeverity.BLOCKING_ERROR,
                message=f"Tipe batasan pelabuhan '{data.draft_constraint_type}' tidak dikenali.",
                suggestion=f"Pilih salah satu batasan dari: {[e.value for e in PortConstraintHardness]}.",
                actual_value=data.draft_constraint_type,
                rule_name="Port Constraint Hardness Enum Check",
                rule_source="System Schema"
            ))

        # Check crew and passenger are integers
        for name, label, code in [
            ("crew_count", "Jumlah Awak", "NUM_CREW_INVALID_TYPE"),
            ("passenger_count", "Jumlah Penumpang", "NUM_PASSENGER_INVALID_TYPE")
        ]:
            val = getattr(data, name, None)
            if val is not None and not isinstance(val, int):
                issues.append(ValidationIssue(
                    code=code,
                    field_path=name,
                    severity=ValidationSeverity.BLOCKING_ERROR,
                    message=f"{label} ({name}) harus berupa angka bulat (integer).",
                    suggestion="Ubah nilai menjadi integer tanpa desimal.",
                    actual_value=val,
                    rule_name="Integer Type Check",
                    rule_source="System Schema"
                ))

        # Check ISO date format for updated_at
        if data.updated_at:
            try:
                datetime.fromisoformat(data.updated_at.replace("Z", "+00:00"))
            except ValueError:
                issues.append(ValidationIssue(
                    code="ERR_INVALID_DATE_FORMAT",
                    field_path="updated_at",
                    severity=ValidationSeverity.BLOCKING_ERROR,
                    message="Format updated_at tidak valid. Harus menggunakan ISO8601.",
                    suggestion="Gunakan format YYYY-MM-DDTHH:MM:SSZ.",
                    actual_value=data.updated_at,
                    rule_name="ISO Date Format Check",
                    rule_source="System Schema"
                ))

        return issues


class NumericValidationRule(BaseValidationRule):
    """Memeriksa rentang batas nilai numerik positif / non-negatif."""
    def validate(self, data: ProjectData) -> List[ValidationIssue]:
        issues = []

        # Blocking range errors (must be > 0)
        blocking_fields = [
            ("target_dwt_ton", "Target DWT", "NUM_DWT_NON_POSITIVE"),
            ("service_speed_knots", "Kecepatan Dinas", "NUM_SPEED_NON_POSITIVE"),
            ("water_density_t_m3", "Densitas Air", "NUM_DENSITY_NON_POSITIVE")
        ]
        for name, label, code in blocking_fields:
            val = getattr(data, name, None)
            if val is not None and val <= 0:
                issues.append(ValidationIssue(
                    code=code,
                    field_path=name,
                    severity=ValidationSeverity.BLOCKING_ERROR,
                    message=f"{label} ({name}) harus bernilai positif lebih dari 0.",
                    suggestion="Masukkan angka positif.",
                    actual_value=val,
                    rule_name=f"{label} Positivity Check",
                    rule_source="PRD-01-REQ"
                ))

        # Optional endurance must be > 0 if provided
        if data.endurance_days is not None and data.endurance_days <= 0:
            issues.append(ValidationIssue(
                code="NUM_ENDURANCE_NON_POSITIVE",
                field_path="endurance_days",
                severity=ValidationSeverity.BLOCKING_ERROR,
                message="Endurance (endurance_days) harus bernilai positif lebih dari 0 jika diisi.",
                suggestion="Masukkan angka positif untuk hari endurance.",
                actual_value=data.endurance_days,
                rule_name="Endurance Positivity Check",
                rule_source="PRD-01-REQ"
            ))

        # Non-blocking range errors (must be >= 0)
        non_negative_fields = [
            ("payload_capacity_ton", "Target Payload", "NUM_PAYLOAD_NEGATIVE"),
            ("max_speed_knots", "Kecepatan Maksimum", "NUM_SPEED_NEGATIVE"),
            ("route_distance_nm", "Jarak Pelayaran", "NUM_DISTANCE_NEGATIVE"),
            ("crew_count", "Jumlah Awak", "NUM_CREW_NEGATIVE"),
            ("passenger_count", "Jumlah Penumpang", "NUM_PASSENGER_NEGATIVE"),
            ("max_draft_m", "Batas Draft", "NUM_DRAFT_NEGATIVE"),
            ("max_loa_m", "Batas LOA", "NUM_LOA_NEGATIVE"),
            ("max_breadth_m", "Batas Lebar", "NUM_BREADTH_NEGATIVE"),
            ("max_air_draft_m", "Batas Air Draft", "NUM_AIR_DRAFT_NEGATIVE")
        ]
        for name, label, code in non_negative_fields:
            val = getattr(data, name, None)
            if val is not None and val < 0:
                issues.append(ValidationIssue(
                    code=code,
                    field_path=name,
                    severity=ValidationSeverity.ERROR,
                    message=f"{label} ({name}) tidak boleh bernilai negatif.",
                    suggestion="Masukkan angka non-negatif (>= 0).",
                    actual_value=val,
                    rule_name=f"{label} Non-Negativity Check",
                    rule_source="PRD-01-REQ"
                ))

        return issues


class CrossFieldRule(BaseValidationRule):
    """Memeriksa konsistensi logis antar-kolom."""
    def validate(self, data: ProjectData) -> List[ValidationIssue]:
        issues = []

        # 1. max_speed_knots >= service_speed_knots (jika diisi)
        if data.service_speed_knots is not None and data.max_speed_knots is not None:
            if data.max_speed_knots < data.service_speed_knots:
                issues.append(ValidationIssue(
                    code="CROSS_MAX_SPEED_BELOW_SERVICE",
                    field_path="max_speed_knots",
                    severity=ValidationSeverity.ERROR,
                    message=f"Kecepatan maksimum ({data.max_speed_knots} knots) tidak boleh lebih kecil dari kecepatan dinas ({data.service_speed_knots} knots).",
                    suggestion="Sesuaikan agar kecepatan maksimum >= kecepatan dinas.",
                    actual_value=data.max_speed_knots,
                    rule_name="Speed Consistency Check",
                    rule_source="PRD-01-REQ"
                ))

        # 2. payload_capacity_ton > target_dwt_ton (Payload equal to DWT is allowed)
        if data.payload_capacity_ton is not None and data.target_dwt_ton is not None:
            if data.payload_capacity_ton > data.target_dwt_ton:
                issues.append(ValidationIssue(
                    code="CROSS_PAYLOAD_EXCEEDS_DWT",
                    field_path="payload_capacity_ton",
                    severity=ValidationSeverity.ERROR,
                    message=f"Target payload ({data.payload_capacity_ton} ton) tidak boleh melebihi target DWT ({data.target_dwt_ton} ton).",
                    suggestion="Sesuaikan payload agar lebih kecil atau sama dengan DWT.",
                    actual_value=data.payload_capacity_ton,
                    rule_name="Payload DWT Consistency",
                    rule_source="PRD-01-REQ"
                ))

        # 3. origin_port != destination_port (ignores case and whitespace, checked only if both are filled)
        if data.origin_port and data.destination_port:
            port_orig = "".join(data.origin_port.split()).lower()
            port_dest = "".join(data.destination_port.split()).lower()
            if port_orig == port_dest:
                issues.append(ValidationIssue(
                    code="WARN_ROUTE_PORTS_EQUAL",
                    field_path="destination_port",
                    severity=ValidationSeverity.WARNING,
                    message="Pelabuhan asal dan tujuan bernilai sama setelah dinormalisasi.",
                    suggestion="Masukkan pelabuhan asal dan tujuan yang berbeda.",
                    actual_value=data.destination_port,
                    rule_name="Port Identity Check",
                    rule_source="Logical Operations"
                ))

        # 4. Density limits based on WaterType
        if data.water_density_t_m3 is not None and data.water_type:
            if data.water_type == WaterType.SEAWATER:
                if not (1.010 <= data.water_density_t_m3 <= 1.035):
                    issues.append(ValidationIssue(
                        code="WARN_DENSITY_UNUSUAL_FOR_WATER_TYPE",
                        field_path="water_density_t_m3",
                        severity=ValidationSeverity.WARNING,
                        message=f"Densitas air laut ({data.water_density_t_m3} t/m³) di luar kebiasaan (1.010 - 1.035 t/m³).",
                        suggestion="Gunakan nilai standar air laut (biasanya 1.025 t/m³).",
                        actual_value=data.water_density_t_m3,
                        rule_name="Seawater Density Range",
                        rule_source="Empirical Guidance"
                    ))
            elif data.water_type == WaterType.FRESHWATER:
                if not (0.995 <= data.water_density_t_m3 <= 1.005):
                    issues.append(ValidationIssue(
                        code="WARN_DENSITY_UNUSUAL_FOR_WATER_TYPE",
                        field_path="water_density_t_m3",
                        severity=ValidationSeverity.WARNING,
                        message=f"Densitas air tawar ({data.water_density_t_m3} t/m³) di luar kebiasaan (0.995 - 1.005 t/m³).",
                        suggestion="Gunakan nilai standar air tawar (biasanya 1.000 t/m³).",
                        actual_value=data.water_density_t_m3,
                        rule_name="Freshwater Density Range",
                        rule_source="Empirical Guidance"
                    ))

        # 5. Endurance check against route distance (Endurance Check basic transit)
        if (
            data.endurance_days is not None
            and data.route_distance_nm is not None
            and data.service_speed_knots is not None
            and data.service_speed_knots > 0
            and data.endurance_days > 0
        ):
            # Voyage time in days
            estimated_transit_days = data.route_distance_nm / data.service_speed_knots / 24.0
            if data.endurance_days < estimated_transit_days:
                issues.append(ValidationIssue(
                    code="WARN_ENDURANCE_BELOW_TRANSIT_TIME",
                    field_path="endurance_days",
                    severity=ValidationSeverity.WARNING,
                    message=f"Endurance ({data.endurance_days} hari) lebih pendek dari estimasi waktu tempuh rute sekali jalan ({estimated_transit_days:.2f} hari).",
                    suggestion="Tingkatkan endurance atau perkecil jarak trayek untuk keamanan pelayaran. Catatan: ini hanya pemeriksaan konsistensi operasional dasar dan belum memperhitungkan cuaca, waktu pelabuhan, margin, atau kondisi operasi lain.",
                    actual_value=data.endurance_days,
                    rule_name="Voyage Endurance Safety Check",
                    rule_source="Operational Limits"
                ))

        return issues


class PlausibilityRule(BaseValidationRule):
    """Memeriksa kewajaran nilai empiris berdasarkan konfigurasi."""
    def __init__(self):
        # Configurable rules (Sprint 1.2: delayed unverified DWT rules to prevent hardcoding)
        self.config: Dict[str, Any] = {
            "dwt_checks_enabled": False,
            "crew_zero_check_enabled": True
        }

    def validate(self, data: ProjectData) -> List[ValidationIssue]:
        issues = []
        
        # 1. Crew count 0 check
        if self.config.get("crew_zero_check_enabled") and data.crew_count == 0:
            if data.vessel_type != VesselType.CUSTOM:
                issues.append(ValidationIssue(
                    code="WARN_CREW_ZERO",
                    field_path="crew_count",
                    severity=ValidationSeverity.WARNING,
                    message="Jumlah awak kapal bernilai nol untuk kapal beroperasi komersial.",
                    suggestion="Kapal komersial umumnya membutuhkan kru untuk navigasi.",
                    actual_value=data.crew_count,
                    rule_name="Commercial Crew Check",
                    rule_source="Manpower Regulations"
                ))

        return issues


class ValidationEngine:
    """Engine utama untuk mengelola dan memicu aturan validasi (Pure/Immutable)."""
    def __init__(self):
        self.rules: List[BaseValidationRule] = [
            RequiredFieldsRule(),
            TypeValidationRule(),
            NumericValidationRule(),
            CrossFieldRule(),
            PlausibilityRule()
        ]

    def validate(self, data: ProjectData) -> ValidationResult:
        all_issues: List[ValidationIssue] = []
        for r in self.rules:
            all_issues.extend(r.validate(data))

        # Sort issues deterministically by code and field_path
        all_issues.sort(key=lambda x: (x.code, x.field_path))

        # Count errors & warnings
        error_count = sum(1 for i in all_issues if i.severity in [ValidationSeverity.ERROR, ValidationSeverity.BLOCKING_ERROR])
        warning_count = sum(1 for i in all_issues if i.severity == ValidationSeverity.WARNING)

        is_valid = error_count == 0
        
        # is_complete is True if all required fields are filled (meaning no blocking errors)
        has_blocking = any(i.severity == ValidationSeverity.BLOCKING_ERROR for i in all_issues)
        is_complete = not has_blocking

        can_approve_baseline = is_complete and is_valid

        # Pure: Does NOT modify project_data here.

        return ValidationResult(
            is_valid=is_valid,
            is_complete=is_complete,
            can_approve_baseline=can_approve_baseline,
            issues=all_issues,
            error_count=error_count,
            warning_count=warning_count
        )


# Backward-compatible API wrappers
def validate_mandatory_fields(project_data: ProjectData) -> List[str]:
    """Mengembalikan daftar string field wajib yang belum diisi (untuk backward-compatibility)."""
    engine = ValidationEngine()
    res = engine.validate(project_data)
    missing = []
    for issue in res.issues:
        if issue.code in ["REQ_PROJECT_ID_MISSING", "REQ_PROJECT_NAME_MISSING", "REQ_VESSEL_TYPE_MISSING", "REQ_DWT_MISSING", "REQ_SPEED_MISSING", "REQ_DENSITY_MISSING", "REQ_WATER_TYPE_MISSING", "REQ_ROUTE_MISSING"]:
            # Find the label
            label = issue.field_path
            for field_name, lbl, _ in MANDATORY_FIELDS:
                if field_name == issue.field_path:
                    label = lbl
                    break
            if issue.code == "REQ_ROUTE_MISSING":
                missing.append("Informasi rute/trayek atau area operasi wajib dilengkapi.")
            else:
                missing.append(f"{label} ({issue.field_path})")
    return missing


def validate_value_ranges(project_data: ProjectData) -> List[str]:
    """Mengembalikan daftar string kesalahan range numerik (untuk backward-compatibility)."""
    engine = ValidationEngine()
    res = engine.validate(project_data)
    errors = []
    for issue in res.issues:
        if issue.severity in [ValidationSeverity.ERROR, ValidationSeverity.BLOCKING_ERROR] and not issue.code.startswith("REQ_"):
            errors.append(issue.message)
    return errors


def validate_speed_consistency(project_data: ProjectData) -> List[str]:
    """Mengembalikan daftar string peringatan konsistensi kecepatan (untuk backward-compatibility)."""
    engine = ValidationEngine()
    res = engine.validate(project_data)
    warnings = []
    for issue in res.issues:
        if issue.code == "CROSS_MAX_SPEED_BELOW_SERVICE":
            warnings.append(
                f"Kecepatan maksimum ({project_data.max_speed_knots} knots) lebih kecil dari kecepatan dinas ({project_data.service_speed_knots} knots)."
            )
    return warnings


def validate_project_data(project_data: ProjectData) -> Dict[str, Any]:
    """
    Validasi komprehensif ProjectData dengan output format lama.
    (untuk backward-compatibility).
    """
    engine = ValidationEngine()
    res = engine.validate(project_data)

    missing_fields = []
    errors = []
    warnings = []

    for i in res.issues:
        if i.severity == ValidationSeverity.BLOCKING_ERROR and i.code.startswith("REQ_"):
            missing_fields.append(f"{i.field_path}")
        elif i.severity in [ValidationSeverity.ERROR, ValidationSeverity.BLOCKING_ERROR]:
            errors.append(i.message)
        elif i.severity == ValidationSeverity.WARNING:
            warnings.append(i.message)

    return {
        "is_valid": res.is_valid,
        "is_complete": res.is_complete,
        "missing_mandatory_fields": missing_fields,
        "errors": errors,
        "warnings": warnings,
    }


def validate_project_with_engine(project_data: ProjectData) -> ValidationResult:
    """Entry point utama untuk validasi menggunakan ValidationEngine terstruktur."""
    engine = ValidationEngine()
    return engine.validate(project_data)
