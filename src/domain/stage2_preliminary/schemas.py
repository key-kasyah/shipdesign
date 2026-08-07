from typing import Any, Dict
from src.core.enums import RevisionStatus
from src.domain.stage2_preliminary.models import (
    ComparableShip,
    WeightItem,
    CapacityItem,
    GeometryData,
    DesignScenario,
    ScenarioRevision,
    PreliminaryBaseline,
    PreliminaryAuditLog,
    Stage2History,
)

def comparable_ship_to_dict(comp: ComparableShip) -> Dict[str, Any]:
    return {
        "ship_name": comp.ship_name,
        "vessel_type": comp.vessel_type,
        "dwt_ton": comp.dwt_ton,
        "loa_m": comp.loa_m,
        "lbp_m": comp.lbp_m,
        "breadth_m": comp.breadth_m,
        "draft_m": comp.draft_m,
        "depth_m": comp.depth_m,
        "service_speed_knots": comp.service_speed_knots,
        "cb": comp.cb,
        "ehp_kw": comp.ehp_kw,
        "bhp_kw": comp.bhp_kw,
        "source_reference": comp.source_reference,
    }

def comparable_ship_from_dict(d: Dict[str, Any]) -> ComparableShip:
    return ComparableShip(
        ship_name=d["ship_name"],
        vessel_type=d["vessel_type"],
        dwt_ton=float(d["dwt_ton"]),
        loa_m=float(d["loa_m"]),
        lbp_m=float(d["lbp_m"]),
        breadth_m=float(d["breadth_m"]),
        draft_m=float(d["draft_m"]),
        depth_m=float(d["depth_m"]),
        service_speed_knots=float(d["service_speed_knots"]),
        cb=float(d["cb"]),
        ehp_kw=float(d["ehp_kw"]) if d.get("ehp_kw") is not None else None,
        bhp_kw=float(d["bhp_kw"]) if d.get("bhp_kw") is not None else None,
        source_reference=d.get("source_reference"),
    )

def weight_item_to_dict(item: WeightItem) -> Dict[str, Any]:
    return {
        "group_name": item.group_name,
        "weight_ton": item.weight_ton,
        "lcg_m": item.lcg_m,
        "vcg_m": item.vcg_m,
        "tcg_m": item.tcg_m,
        "margin_percent": item.margin_percent,
    }

def weight_item_from_dict(d: Dict[str, Any]) -> WeightItem:
    return WeightItem(
        group_name=d["group_name"],
        weight_ton=float(d["weight_ton"]),
        lcg_m=float(d.get("lcg_m", 0.0)),
        vcg_m=float(d.get("vcg_m", 0.0)),
        tcg_m=float(d.get("tcg_m", 0.0)),
        margin_percent=float(d.get("margin_percent", 0.0)),
    )

def capacity_item_to_dict(item: CapacityItem) -> Dict[str, Any]:
    return {
        "compartment_name": item.compartment_name,
        "required_volume_m3": item.required_volume_m3,
        "available_volume_m3": item.available_volume_m3,
        "lcg_m": item.lcg_m,
        "vcg_m": item.vcg_m,
    }

def capacity_item_from_dict(d: Dict[str, Any]) -> CapacityItem:
    return CapacityItem(
        compartment_name=d["compartment_name"],
        required_volume_m3=float(d["required_volume_m3"]),
        available_volume_m3=float(d["available_volume_m3"]),
        lcg_m=float(d.get("lcg_m", 0.0)),
        vcg_m=float(d.get("vcg_m", 0.0)),
    )

def geometry_data_to_dict(geo: GeometryData) -> Dict[str, Any]:
    return {
        "csa_ordinates": geo.csa_ordinates,
        "dwl_ordinates": geo.dwl_ordinates,
        "gading10_ordinates": geo.gading10_ordinates,
    }

def geometry_data_from_dict(d: Dict[str, Any]) -> GeometryData:
    return GeometryData(
        csa_ordinates=list(d.get("csa_ordinates", [0.0] * 21)),
        dwl_ordinates=list(d.get("dwl_ordinates", [0.0] * 21)),
        gading10_ordinates=list(d.get("gading10_ordinates", [0.0] * 21)),
    )

def design_scenario_to_dict(scen: DesignScenario) -> Dict[str, Any]:
    return {
        "scenario_id": scen.scenario_id,
        "scenario_name": scen.scenario_name,
        "project_id": scen.project_id,
        "parent_scenario_id": scen.parent_scenario_id,
        "primary_comparable_ship": comparable_ship_to_dict(scen.primary_comparable_ship) if scen.primary_comparable_ship else None,
        "lbp_m": scen.lbp_m,
        "loa_m": scen.loa_m,
        "breadth_m": scen.breadth_m,
        "depth_m": scen.depth_m,
        "draft_m": scen.draft_m,
        "lwl_m": scen.lwl_m,
        "froude_number": scen.froude_number,
        "cb": scen.cb,
        "cm": scen.cm,
        "cw": scen.cw,
        "cp": scen.cp,
        "displacement_m3": scen.displacement_m3,
        "displacement_ton": scen.displacement_ton,
        "water_density_t_m3": scen.water_density_t_m3,
        "weight_items": [weight_item_to_dict(w) for w in scen.weight_items],
        "weight_mismatch_percent": scen.weight_mismatch_percent,
        "kg_m": scen.kg_m,
        "lcg_m": scen.lcg_m,
        "capacity_items": [capacity_item_to_dict(c) for c in scen.capacity_items],
        "endurance_days": scen.endurance_days,
        "ehp_kw": scen.ehp_kw,
        "bhp_kw": scen.bhp_kw,
        "propulsive_efficiency": scen.propulsive_efficiency,
        "sea_margin_percent": scen.sea_margin_percent,
        "geometry": geometry_data_to_dict(scen.geometry),
        "kb_m": scen.kb_m,
        "bm_m": scen.bm_m,
        "km_m": scen.km_m,
        "gm_m": scen.gm_m,
        "lcb_m": scen.lcb_m,
        "trim_angle_deg": scen.trim_angle_deg,
        "is_complete": scen.is_complete,
        "updated_at": scen.updated_at,
    }

def design_scenario_from_dict(d: Dict[str, Any]) -> DesignScenario:
    comp_dict = d.get("primary_comparable_ship")
    return DesignScenario(
        scenario_id=d["scenario_id"],
        scenario_name=d["scenario_name"],
        project_id=d["project_id"],
        parent_scenario_id=d.get("parent_scenario_id"),
        primary_comparable_ship=comparable_ship_from_dict(comp_dict) if comp_dict else None,
        lbp_m=float(d.get("lbp_m", 0.0)),
        loa_m=float(d.get("loa_m", 0.0)),
        breadth_m=float(d.get("breadth_m", 0.0)),
        depth_m=float(d.get("depth_m", 0.0)),
        draft_m=float(d.get("draft_m", 0.0)),
        lwl_m=float(d.get("lwl_m", 0.0)),
        froude_number=float(d.get("froude_number", 0.0)),
        cb=float(d.get("cb", 0.0)),
        cm=float(d.get("cm", 0.0)),
        cw=float(d.get("cw", 0.0)),
        cp=float(d.get("cp", 0.0)),
        displacement_m3=float(d.get("displacement_m3", 0.0)),
        displacement_ton=float(d.get("displacement_ton", 0.0)),
        water_density_t_m3=float(d.get("water_density_t_m3", 1.025)),
        weight_items=[weight_item_from_dict(w) for w in d.get("weight_items", [])],
        weight_mismatch_percent=float(d.get("weight_mismatch_percent", 0.0)),
        kg_m=float(d.get("kg_m", 0.0)),
        lcg_m=float(d.get("lcg_m", 0.0)),
        capacity_items=[capacity_item_from_dict(c) for c in d.get("capacity_items", [])],
        endurance_days=float(d.get("endurance_days", 0.0)),
        ehp_kw=float(d.get("ehp_kw", 0.0)),
        bhp_kw=float(d.get("bhp_kw", 0.0)),
        propulsive_efficiency=float(d.get("propulsive_efficiency", 0.55)),
        sea_margin_percent=float(d.get("sea_margin_percent", 15.0)),
        geometry=geometry_data_from_dict(d["geometry"]) if d.get("geometry") else GeometryData(),
        kb_m=float(d.get("kb_m", 0.0)),
        bm_m=float(d.get("bm_m", 0.0)),
        km_m=float(d.get("km_m", 0.0)),
        gm_m=float(d.get("gm_m", 0.0)),
        lcb_m=float(d.get("lcb_m", 0.0)),
        trim_angle_deg=float(d.get("trim_angle_deg", 0.0)),
        is_complete=bool(d.get("is_complete", False)),
        updated_at=d.get("updated_at", ""),
    )

def scenario_revision_to_dict(rev: ScenarioRevision) -> Dict[str, Any]:
    return {
        "revision_id": rev.revision_id,
        "scenario_id": rev.scenario_id,
        "revision_number": rev.revision_number,
        "status": rev.status.value if hasattr(rev.status, "value") else str(rev.status),
        "data_snapshot": design_scenario_to_dict(rev.data_snapshot),
        "created_by": rev.created_by,
        "created_at": rev.created_at,
        "reason_for_change": rev.reason_for_change,
        "submitted_by": rev.submitted_by,
        "submitted_at": rev.submitted_at,
        "reviewed_by": rev.reviewed_by,
        "reviewed_at": rev.reviewed_at,
        "approval_note": rev.approval_note,
    }

def scenario_revision_from_dict(d: Dict[str, Any]) -> ScenarioRevision:
    status_str = d["status"]
    # Map status string back to RevisionStatus enum
    status = next((s for s in RevisionStatus if s.value == status_str), RevisionStatus.DRAFT)
    return ScenarioRevision(
        revision_id=d["revision_id"],
        scenario_id=d["scenario_id"],
        revision_number=int(d["revision_number"]),
        status=status,
        data_snapshot=design_scenario_from_dict(d["data_snapshot"]),
        created_by=d["created_by"],
        created_at=d["created_at"],
        reason_for_change=d.get("reason_for_change"),
        submitted_by=d.get("submitted_by"),
        submitted_at=d.get("submitted_at"),
        reviewed_by=d.get("reviewed_by"),
        reviewed_at=d.get("reviewed_at"),
        approval_note=d.get("approval_note"),
    )

def preliminary_baseline_to_dict(base: PreliminaryBaseline) -> Dict[str, Any]:
    return {
        "baseline_id": base.baseline_id,
        "project_id": base.project_id,
        "baseline_version": base.baseline_version,
        "approved_revision_id": base.approved_revision_id,
        "active": base.active,
        "locked_at": base.locked_at,
    }

def preliminary_baseline_from_dict(d: Dict[str, Any]) -> PreliminaryBaseline:
    return PreliminaryBaseline(
        baseline_id=d["baseline_id"],
        project_id=d["project_id"],
        baseline_version=d["baseline_version"],
        approved_revision_id=d["approved_revision_id"],
        active=bool(d["active"]),
        locked_at=d["locked_at"],
    )

def preliminary_audit_log_to_dict(log: PreliminaryAuditLog) -> Dict[str, Any]:
    return {
        "event_id": log.event_id,
        "project_id": log.project_id,
        "scenario_id": log.scenario_id,
        "revision_id": log.revision_id,
        "action": log.action,
        "actor": log.actor,
        "timestamp": log.timestamp,
        "old_value": log.old_value,
        "new_value": log.new_value,
        "reason": log.reason,
    }

def preliminary_audit_log_from_dict(d: Dict[str, Any]) -> PreliminaryAuditLog:
    return PreliminaryAuditLog(
        event_id=d["event_id"],
        project_id=d["project_id"],
        scenario_id=d["scenario_id"],
        revision_id=d.get("revision_id"),
        action=d["action"],
        actor=d["actor"],
        timestamp=d["timestamp"],
        old_value=d.get("old_value"),
        new_value=d.get("new_value"),
        reason=d.get("reason"),
    )

def stage2_history_to_dict(hist: Stage2History) -> Dict[str, Any]:
    return {
        "project_id": hist.project_id,
        "revisions": [scenario_revision_to_dict(r) for r in hist.revisions],
        "baselines": [preliminary_baseline_to_dict(b) for b in hist.baselines],
        "audit_trail": [preliminary_audit_log_to_dict(a) for a in hist.audit_trail],
    }

def stage2_history_from_dict(d: Dict[str, Any]) -> Stage2History:
    return Stage2History(
        project_id=d["project_id"],
        revisions=[scenario_revision_from_dict(r) for r in d.get("revisions", [])],
        baselines=[preliminary_baseline_from_dict(b) for b in d.get("baselines", [])],
        audit_trail=[preliminary_audit_log_from_dict(a) for a in d.get("audit_trail", [])],
    )
