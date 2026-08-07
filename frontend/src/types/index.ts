export enum VesselType {
  GENERAL_CARGO = "GENERAL_CARGO",
  CONTAINER_SHIP = "CONTAINER_SHIP",
  BULK_CARRIER = "BULK_CARRIER",
  TANKER = "TANKER",
  TUG_BOAT = "TUG_BOAT",
  FISHING_VESSEL = "FISHING_VESSEL",
  PASSENGER_SHIP = "PASSENGER_SHIP",
}

export enum WaterType {
  SEAWATER = "SEAWATER",
  FRESHWATER = "FRESHWATER",
  BRACKISH = "BRACKISH",
}

export enum RevisionStatus {
  DRAFT = "DRAFT",
  VALIDATION_FAILED = "VALIDATION_FAILED",
  READY_FOR_REVIEW = "READY_FOR_REVIEW",
  WAITING_FOR_REVIEW = "WAITING_FOR_REVIEW",
  REVISION_REQUIRED = "REVISION_REQUIRED",
  APPROVED = "APPROVED",
  SUPERSEDED = "SUPERSEDED",
  ARCHIVED = "ARCHIVED",
}

export enum DraftConstraintType {
  NOT_CONSTRAINED = "NOT_CONSTRAINED",
  SOFT_CONSTRAINT = "SOFT_CONSTRAINT",
  HARD_CONSTRAINT = "HARD_CONSTRAINT",
}

export interface ProjectData {
  project_id: string;
  project_name: string;
  owner: string;
  organization?: string;
  vessel_type: VesselType;
  vessel_function?: string;
  target_dwt_ton: number;
  service_speed_knots: number;
  max_speed_knots?: number;
  endurance_days?: number;
  water_type: WaterType;
  water_density_t_m3: number;
  route_name?: string;
  operating_area?: string;
  origin_port?: string;
  destination_port?: string;
  route_distance_nm?: number;
  crew_count?: number;
  passenger_count?: number;
  max_draft_m?: number;
  max_loa_m?: number;
  max_breadth_m?: number;
  max_air_draft_m?: number;
  draft_constraint_type: DraftConstraintType;
  is_complete: boolean;
  payload_capacity_ton?: number;
}

export interface ApprovalRecord {
  approval_id: string;
  revision_id: string;
  reviewer: string;
  decision: string;
  approval_note?: string;
  decided_at: string;
}

export interface AuditEvent {
  event_id: string;
  revision_id?: string;
  timestamp: string;
  action: string;
  actor: string;
  old_value?: string;
  new_value?: string;
  reason?: string;
}

export interface BaselineRecord {
  baseline_id: string;
  project_id: string;
  revision_id: string;
  baseline_version: string;
  locked_at: string;
  active: boolean;
}

export interface ProjectRevision {
  revision_id: string;
  revision_number: number;
  parent_revision_id?: string;
  status: RevisionStatus;
  data_snapshot: ProjectData;
  created_at: string;
  created_by: string;
  submitted_at?: string;
  submitted_by?: string;
  reviewed_at?: string;
  reviewed_by?: string;
  change_log: any[];
}

export interface ProjectHistory {
  project_id: string;
  revisions: ProjectRevision[];
  baselines: BaselineRecord[];
  approvals: ApprovalRecord[];
  audit_trail: AuditEvent[];
}

export interface ValidationIssue {
  code: string;
  field_path: string;
  severity: string;
  message: string;
  suggestion: string;
  rule_name?: string;
  rule_source?: string;
  actual_value?: string;
}

export interface ValidationResult {
  is_valid: boolean;
  is_complete: boolean;
  can_approve_baseline: boolean;
  issues: ValidationIssue[];
  error_count: number;
  warning_count: number;
  timestamp: string;
}

export interface ChangeEntry {
  field_path: string;
  old_value: any;
  new_value: any;
  changed_by: string;
  changed_at: string;
  reason?: string;
}

export interface ReadinessResult {
  project_id: string;
  revision_number: number;
  readiness_status: string;
  completeness_score: number;
  missing_requirements: string[];
  validation_summary: {
    is_valid: boolean;
    is_complete: boolean;
    error_count: number;
    warning_count: number;
  };
  risks_and_assumptions: Array<{
    type: string;
    parameter: string;
    description: string;
  }>;
  operational_profile: {
    vessel_type: string;
    service_speed_knots: number;
    operating_area: string;
    route: string;
    route_distance_nm?: number;
  };
  capacity_requirements: {
    target_dwt_ton: number;
    payload_capacity_ton?: number;
    crew_count?: number;
    passenger_count?: number;
  };
  design_constraints: {
    max_draft_m?: number;
    max_loa_m?: number;
    max_breadth_m?: number;
    max_air_draft_m?: number;
    draft_constraint_type: string;
  };
  unresolved_decisions: Array<{
    code: string;
    field_path: string;
    warning_message: string;
    suggestion: string;
  }>;
  handoff_ready: boolean;
}
