from enum import Enum


class VesselType(str, Enum):
    """Tipe kapal utama yang didukung platform."""
    CONTAINER_SHIP = "CONTAINER_SHIP"
    BULK_CARRIER = "BULK_CARRIER"
    GENERAL_CARGO = "GENERAL_CARGO"
    TANKER = "TANKER"
    PASSENGER_SHIP = "PASSENGER_SHIP"
    TUG_BOAT = "TUG_BOAT"
    FERRY = "FERRY"
    CUSTOM = "CUSTOM"

    @classmethod
    def _missing_(cls, value):
        if isinstance(value, str):
            clean = value.strip().upper().replace(" ", "_").replace("-", "_")
            for member in cls:
                if member.value == clean or member.name == clean:
                    return member
                if member.value.replace("_", "") == clean.replace("_", ""):
                    return member
        return None

    @property
    def display_name(self) -> str:
        names = {
            "CONTAINER_SHIP": "Container Ship",
            "BULK_CARRIER": "Bulk Carrier",
            "GENERAL_CARGO": "General Cargo",
            "TANKER": "Tanker",
            "PASSENGER_SHIP": "Passenger Ship",
            "TUG_BOAT": "Tug Boat",
            "FERRY": "Ferry",
            "CUSTOM": "Custom",
        }
        return names.get(self.value, self.value.replace("_", " ").title())


class WaterType(str, Enum):
    """Jenis perairan desain."""
    SEAWATER = "SEAWATER"
    FRESHWATER = "FRESHWATER"
    BRACKISH = "BRACKISH"


class PortConstraintHardness(str, Enum):
    """Jenis batasan pelabuhan."""
    HARD_LIMIT = "HARD_LIMIT"
    SOFT_TARGET = "SOFT_TARGET"


class StageStatus(str, Enum):
    """Status tahapan pengembangan sesuai ADR-011."""
    LOCKED = "LOCKED"
    PLANNED = "PLANNED"
    ACTIVE = "ACTIVE"
    WAITING_FOR_REVIEW = "WAITING_FOR_REVIEW"
    REVISION_REQUIRED = "REVISION_REQUIRED"
    APPROVED = "APPROVED"
    DEPRECATED = "DEPRECATED"


class ValidationSeverity(str, Enum):
    """Tingkat keparahan isu validasi sesuai PRD."""
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    BLOCKING_ERROR = "BLOCKING_ERROR"


class RevisionStatus(str, Enum):
    """Status konseptual revisi data proyek untuk Sprint 1.3."""
    DRAFT = "DRAFT"
    VALIDATION_FAILED = "VALIDATION_FAILED"
    READY_FOR_REVIEW = "READY_FOR_REVIEW"
    WAITING_FOR_REVIEW = "WAITING_FOR_REVIEW"
    REVISION_REQUIRED = "REVISION_REQUIRED"
    APPROVED = "APPROVED"
    SUPERSEDED = "SUPERSEDED"
    ARCHIVED = "ARCHIVED"


