from dataclasses import dataclass, field
from typing import Optional
from src.core.enums import StageStatus


@dataclass
class ProjectHeader:
    """Header metadata proyek terpadu."""
    project_id: str
    name: str
    owner: str
    organization: Optional[str] = None
    stage1_status: StageStatus = StageStatus.ACTIVE
    stage2_status: StageStatus = StageStatus.LOCKED
    stage3_status: StageStatus = StageStatus.LOCKED
    stage4_status: StageStatus = StageStatus.LOCKED
    stage5_status: StageStatus = StageStatus.LOCKED
    stage6_status: StageStatus = StageStatus.LOCKED
    stage7_status: StageStatus = StageStatus.LOCKED
