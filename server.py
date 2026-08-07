import os
import json
import uuid
import math
import random
import sqlite3
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from src.core.enums import VesselType, WaterType, RevisionStatus
from src.domain.stage1_requirements.models import ProjectData, ProjectHistory, ProjectRevision
from src.domain.stage1_requirements.schemas import (
    project_history_to_dict,
    project_data_from_json,
    project_data_to_json,
)
from src.services.stage1_service import Stage1RequirementService
from src.services.ai_service import AIAssistantService, AISafetyException
from src.services.readiness_service import ReadinessService
from src.services.stage2_service import Stage2PreliminaryDesignService
from src.domain.stage2_preliminary.validators import validate_preliminary_design
from src.domain.stage2_preliminary.models import PreliminaryAuditLog, ComparableShip
from src.domain.stage2_preliminary.schemas import (
    stage2_history_to_dict,
    design_scenario_to_dict,
    comparable_ship_from_dict,
    weight_item_from_dict,
    capacity_item_from_dict,
)


app = FastAPI(title="Ship Design AI Platform Backend API", version="1.0")

# Setup CORS for Next.js (usually runs on port 3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECTS_DIR = os.path.join(BASE_DIR, "data", "projects")
INDEX_PATH = os.path.join(BASE_DIR, "data", "project_index.json")
DB_PORTS_PATH = os.path.join(BASE_DIR, "data", "indonesia_ports_template.db")

if not os.path.exists(PROJECTS_DIR):
    os.makedirs(PROJECTS_DIR, exist_ok=True)


def get_project_file_path(project_id: str) -> str:
    # Sanitize project id to prevent path traversal
    safe_id = "".join(c for c in project_id if c.isalnum() or c in "-_")
    return os.path.join(PROJECTS_DIR, f"{safe_id}.json")


def haversine_nm(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 3440.065 # Earth radius in nautical miles
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 1)


class RouteCalculatePayload(BaseModel):
    port_ids: List[int]


# DTO Schemas
class ProjectCreatePayload(BaseModel):
    project_id: Optional[str] = None
    project_name: str
    owner: str
    organization: Optional[str] = None
    creator: str
    vessel_type: Optional[str] = None
    target_dwt_ton: Optional[float] = None
    service_speed_knots: Optional[float] = None
    route_name: Optional[str] = None
    route_distance_nm: Optional[float] = None


class ProjectUpdatePayload(BaseModel):
    project_id: str
    project_name: str
    owner: str
    organization: Optional[str] = None
    vessel_type: str
    vessel_function: Optional[str] = None
    target_dwt_ton: float
    service_speed_knots: float
    max_speed_knots: Optional[float] = None
    endurance_days: Optional[float] = None
    water_type: str
    water_density_t_m3: float
    route_name: Optional[str] = None
    operating_area: Optional[str] = None
    origin_port: Optional[str] = None
    destination_port: Optional[str] = None
    route_distance_nm: Optional[float] = None
    crew_count: Optional[int] = None
    passenger_count: Optional[int] = None
    max_draft_m: Optional[float] = None
    max_loa_m: Optional[float] = None
    max_breadth_m: Optional[float] = None
    actor: str
    reason: str


class RevisionCreatePayload(BaseModel):
    parent_revision_id: str
    creator: str
    reason: str


class ReviewPayload(BaseModel):
    reviewer: str
    decision: str
    note: str


class AIQueryPayload(BaseModel):
    question: str
    mode: str
    revision_id: str


class ComparableShipDTO(BaseModel):
    ship_name: str
    vessel_type: str
    dwt_ton: float
    loa_m: float
    lbp_m: float
    breadth_m: float
    draft_m: float
    depth_m: float
    service_speed_knots: float
    cb: float
    source_reference: Optional[str] = None


class WeightItemDTO(BaseModel):
    group_name: str
    weight_ton: float
    lcg_m: float = 0.0
    vcg_m: float = 0.0
    tcg_m: float = 0.0
    margin_percent: float = 0.0


class CapacityItemDTO(BaseModel):
    compartment_name: str
    required_volume_m3: float
    available_volume_m3: float
    lcg_m: float = 0.0
    vcg_m: float = 0.0


class ScenarioCreatePayload(BaseModel):
    scenario_name: str
    creator: str
    primary_comparable_ship: Optional[ComparableShipDTO] = None


class ScenarioUpdatePayload(BaseModel):
    scenario_name: str
    lbp_m: float
    loa_m: float
    breadth_m: float
    depth_m: float
    draft_m: float
    cb: float
    cm: float
    cw: float
    weight_items: List[WeightItemDTO]
    capacity_items: List[CapacityItemDTO]
    actor: str
    reason: str


class ScenarioReviewPayload(BaseModel):
    reviewer: str
    decision: str
    note: str



@app.get("/api/ports")
def get_ports():
    """Mengambil daftar seluruh pelabuhan dari database SQLite indonesia_ports_template.db."""
    if not os.path.exists(DB_PORTS_PATH):
        return []
    try:
        conn = sqlite3.connect(DB_PORTS_PATH)
        cur = conn.cursor()
        cur.execute("SELECT port_id, port_code, port_name, province, latitude, longitude, operator, port_type FROM ports ORDER BY port_name ASC")
        rows = cur.fetchall()
        conn.close()
        ports = [
            {
                "port_id": r[0],
                "port_code": r[1],
                "port_name": r[2],
                "province": r[3],
                "latitude": r[4],
                "longitude": r[5],
                "operator": r[6],
                "port_type": r[7]
            }
            for r in rows
        ]
        return ports
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal mengambil database pelabuhan: {e}")


@app.post("/api/ports/calculate-route")
def calculate_route(payload: RouteCalculatePayload):
    """Menghitung leg-by-leg distance, max single leg distance (S), dan total rute."""
    if not os.path.exists(DB_PORTS_PATH):
        raise HTTPException(status_code=500, detail="Database pelabuhan tidak ditemukan.")
    if len(payload.port_ids) < 2:
        raise HTTPException(status_code=400, detail="Minimal pilih 2 pelabuhan untuk menghitung rute.")

    try:
        conn = sqlite3.connect(DB_PORTS_PATH)
        cur = conn.cursor()

        ports_dict = {}
        for pid in payload.port_ids:
            cur.execute("SELECT port_id, port_name, latitude, longitude FROM ports WHERE port_id = ?", (pid,))
            row = cur.fetchone()
            if row:
                ports_dict[pid] = {"name": row[1], "lat": row[2], "lon": row[3]}

        legs = []
        max_leg = 0.0
        total_dist = 0.0
        names = []

        for i in range(len(payload.port_ids)):
            pid = payload.port_ids[i]
            pinfo = ports_dict.get(pid, {"name": f"Port #{pid}", "lat": 0, "lon": 0})
            names.append(pinfo["name"])

            if i < len(payload.port_ids) - 1:
                next_pid = payload.port_ids[i+1]
                next_pinfo = ports_dict.get(next_pid, {"name": f"Port #{next_pid}", "lat": 0, "lon": 0})

                cur.execute("SELECT distance_nm FROM sea_distance WHERE origin_id = ? AND destination_id = ?", (pid, next_pid))
                dist_row = cur.fetchone()
                if dist_row and dist_row[0] is not None:
                    dist = float(dist_row[0])
                else:
                    dist = haversine_nm(pinfo["lat"], pinfo["lon"], next_pinfo["lat"], next_pinfo["lon"])

                legs.append({
                    "origin_id": pid,
                    "origin_name": pinfo["name"],
                    "destination_id": next_pid,
                    "destination_name": next_pinfo["name"],
                    "distance_nm": dist
                })
                total_dist += dist
                if dist > max_leg:
                    max_leg = dist

        conn.close()

        clean_names = [n.split("(")[0].strip() if "(" in n else n for n in names]
        route_str = " - ".join(clean_names)

        return {
            "route_name": route_str,
            "legs": legs,
            "max_leg_nm": round(max_leg, 1),
            "total_distance_nm": round(total_dist, 1)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal menghitung rute: {e}")


@app.get("/api/projects")
def list_projects():
    """Mendapatkan daftar semua proyek dari indeks lokal."""
    try:
        valid_data = {}
        if os.path.exists(INDEX_PATH):
            try:
                with open(INDEX_PATH, "r", encoding="utf-8") as f:
                    data = json.load(f)
                if isinstance(data, dict):
                    for pid, pinfo in data.items():
                        file_path = get_project_file_path(pid)
                        if os.path.exists(file_path):
                            pinfo["file_path"] = file_path
                            valid_data[pid] = pinfo
            except Exception:
                valid_data = {}

        # Scan folder projects jika index kosong tapi file proyek ada
        if not valid_data and os.path.exists(PROJECTS_DIR):
            for fname in os.listdir(PROJECTS_DIR):
                if fname.endswith(".json") and not fname.endswith(".bak"):
                    fpath = os.path.join(PROJECTS_DIR, fname)
                    try:
                        with open(fpath, "r", encoding="utf-8") as pf:
                            pjson = json.load(pf)
                            pid = pjson.get("project_id", fname.replace(".json", ""))
                            pname = pjson.get("project_name", pid)
                            valid_data[pid] = {
                                "project_id": pid,
                                "project_name": pname,
                                "latest_revision": 0,
                                "file_path": fpath,
                                "last_updated": datetime.now(timezone.utc).isoformat()
                            }
                    except Exception:
                        pass

        # Simpan kembali index yang valid
        try:
            with open(INDEX_PATH, "w", encoding="utf-8") as f:
                json.dump(valid_data, f, indent=2)
        except Exception:
            pass

        return list(valid_data.values())
    except Exception as e:
        print(f"Error in list_projects: {e}")
        return []


@app.post("/api/projects")
def create_project(payload: ProjectCreatePayload):
    """Membuat proyek baru beserta inisialisasi history."""
    pid = payload.project_id.strip() if payload.project_id and payload.project_id.strip() else None

    # Auto-generate unique Project ID if not supplied or default prefix
    if not pid or pid == "PRJ-2026-" or len(pid) < 5:
        year = datetime.now().year
        for _ in range(200):
            rand_num = random.randint(1000, 9999)
            candidate_id = f"PRJ-{year}-{rand_num}"
            if not os.path.exists(get_project_file_path(candidate_id)):
                pid = candidate_id
                break

    file_path = get_project_file_path(pid)
    if os.path.exists(file_path):
        raise HTTPException(status_code=400, detail=f"Proyek dengan ID {pid} sudah ada.")

    try:
        extra_args = {}
        if payload.vessel_type:
            extra_args["vessel_type"] = payload.vessel_type
        if payload.route_name:
            extra_args["route_name"] = payload.route_name
        if payload.route_distance_nm is not None:
            extra_args["route_distance_nm"] = payload.route_distance_nm

        project = Stage1RequirementService.create_project(
            project_id=pid,
            project_name=payload.project_name.strip(),
            owner=payload.owner.strip(),
            organization=payload.organization.strip() if payload.organization else None,
            target_dwt_ton=payload.target_dwt_ton if payload.target_dwt_ton is not None else 1000.0,
            service_speed_knots=payload.service_speed_knots if payload.service_speed_knots is not None else 10.0,
            water_type=WaterType.SEAWATER,
            water_density_t_m3=1.025,
            **extra_args
        )
        history = Stage1RequirementService.create_initial_history(project, creator=payload.creator)
        Stage1RequirementService.save_project_history(history, file_path)
        return project_history_to_dict(history)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal membuat proyek: {e}")


@app.get("/api/projects/{project_id}")
def get_project(project_id: str):
    """Memuat data history proyek lengkap."""
    file_path = get_project_file_path(project_id)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Proyek tidak ditemukan.")
    try:
        history = Stage1RequirementService.load_project_history(file_path)
        return project_history_to_dict(history)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal memuat proyek: {e}")


@app.put("/api/projects/{project_id}")
def update_project(project_id: str, payload: ProjectUpdatePayload):
    """Mengupdate data snapshot pada revisi aktif proyek."""
    file_path = get_project_file_path(project_id)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Proyek tidak ditemukan.")

    try:
        history = Stage1RequirementService.load_project_history(file_path)
        # Find active (latest) revision that is not approved/superseded
        active_rev = history.revisions[-1]
        if active_rev.status in [RevisionStatus.APPROVED, RevisionStatus.SUPERSEDED, RevisionStatus.ARCHIVED]:
            raise HTTPException(status_code=400, detail="Revisi aktif saat ini telah terkunci dan tidak dapat diedit.")

        updates = {
            "project_name": payload.project_name,
            "owner": payload.owner,
            "organization": payload.organization,
            "vessel_type": VesselType(payload.vessel_type),
            "vessel_function": payload.vessel_function,
            "target_dwt_ton": payload.target_dwt_ton,
            "service_speed_knots": payload.service_speed_knots,
            "max_speed_knots": payload.max_speed_knots,
            "endurance_days": payload.endurance_days,
            "water_type": WaterType(payload.water_type),
            "water_density_t_m3": payload.water_density_t_m3,
            "route_name": payload.route_name,
            "operating_area": payload.operating_area,
            "origin_port": payload.origin_port,
            "destination_port": payload.destination_port,
            "route_distance_nm": payload.route_distance_nm,
            "crew_count": payload.crew_count,
            "passenger_count": payload.passenger_count,
            "max_draft_m": payload.max_draft_m,
            "max_loa_m": payload.max_loa_m,
            "max_breadth_m": payload.max_breadth_m,
        }

        Stage1RequirementService.update_revision_data(
            history, active_rev.revision_id, updates, payload.actor, payload.reason
        )
        Stage1RequirementService.save_project_history(history, file_path)
        return project_history_to_dict(history)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal mengupdate proyek: {e}")


@app.post("/api/projects/{project_id}/validate")
def validate_project(project_id: str):
    """Menjalankan validasi terhadap snapshot proyek revisi aktif."""
    file_path = get_project_file_path(project_id)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Proyek tidak ditemukan.")
    try:
        history = Stage1RequirementService.load_project_history(file_path)
        active_snap = history.revisions[-1].data_snapshot
        res = Stage1RequirementService.validate_project_rich(active_snap)
        
        # Serialize ValidationResult
        return {
            "is_valid": res.is_valid,
            "is_complete": res.is_complete,
            "can_approve_baseline": res.can_approve_baseline,
            "error_count": res.error_count,
            "warning_count": res.warning_count,
            "timestamp": res.timestamp,
            "issues": [
                {
                    "code": i.code,
                    "field_path": i.field_path,
                    "severity": i.severity.value,
                    "message": i.message,
                    "suggestion": i.suggestion
                } for i in res.issues
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal melakukan validasi: {e}")


@app.post("/api/projects/{project_id}/revisions")
def create_revision(project_id: str, payload: RevisionCreatePayload):
    """Membuat revisi baru dari parent revision."""
    file_path = get_project_file_path(project_id)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Proyek tidak ditemukan.")
    try:
        history = Stage1RequirementService.load_project_history(file_path)
        new_rev = Stage1RequirementService.create_new_revision(
            history, payload.parent_revision_id, payload.creator, payload.reason
        )
        Stage1RequirementService.save_project_history(history, file_path)
        return project_history_to_dict(history)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal membuat cabang revisi: {e}")


@app.post("/api/projects/{project_id}/revisions/{revision_id}/submit")
def submit_revision(project_id: str, revision_id: str, actor: str = Body(..., embed=True)):
    """Mengajukan revisi untuk review approval."""
    file_path = get_project_file_path(project_id)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Proyek tidak ditemukan.")
    try:
        history = Stage1RequirementService.load_project_history(file_path)
        Stage1RequirementService.submit_revision_for_review(history, revision_id, actor)
        Stage1RequirementService.save_project_history(history, file_path)
        return project_history_to_dict(history)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal mengajukan review: {e}")


@app.post("/api/projects/{project_id}/revisions/{revision_id}/approve")
def approve_revision(project_id: str, revision_id: str, payload: ReviewPayload):
    """Reviewer menyetujui revisi kapal (tercipta baseline baru)."""
    file_path = get_project_file_path(project_id)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Proyek tidak ditemukan.")
    try:
        history = Stage1RequirementService.load_project_history(file_path)
        Stage1RequirementService.review_revision(
            history, revision_id, payload.reviewer, "APPROVED", payload.note
        )
        Stage1RequirementService.save_project_history(history, file_path)
        return project_history_to_dict(history)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal menyetujui revisi: {e}")


@app.post("/api/projects/{project_id}/revisions/{revision_id}/reject")
def reject_revision(project_id: str, revision_id: str, payload: ReviewPayload):
    """Reviewer menolak revisi kapal."""
    file_path = get_project_file_path(project_id)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Proyek tidak ditemukan.")
    try:
        history = Stage1RequirementService.load_project_history(file_path)
        Stage1RequirementService.review_revision(
            history, revision_id, payload.reviewer, "REJECTED", payload.note
        )
        Stage1RequirementService.save_project_history(history, file_path)
        return project_history_to_dict(history)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal menolak revisi: {e}")


@app.get("/api/projects/{project_id}/readiness")
def get_readiness(project_id: str):
    """Memuat laporan kesiapan serah terima (readiness report) Tahap 1."""
    file_path = get_project_file_path(project_id)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Proyek tidak ditemukan.")
    try:
        history = Stage1RequirementService.load_project_history(file_path)
        active_rev = history.revisions[-1]
        report = ReadinessService.generate_readiness_report(active_rev.data_snapshot, active_rev)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal memuat laporan kesiapan: {e}")


@app.post("/api/projects/{project_id}/assistant")
def ai_assistant(project_id: str, payload: AIQueryPayload):
    """Tanya jawab asisten cerdas AI Tahap 1 dengan guardrail keselamatan."""
    file_path = get_project_file_path(project_id)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Proyek tidak ditemukan.")
    try:
        history = Stage1RequirementService.load_project_history(file_path)
        revision = next((r for r in history.revisions if r.revision_id == payload.revision_id), None)
        if not revision and history.revisions:
            revision = history.revisions[-1]
        if not revision:
            raise HTTPException(status_code=404, detail="Revisi proyek tidak ditemukan.")

        val_res = Stage1RequirementService.validate_project_rich(revision.data_snapshot)
        context = AIAssistantService.build_context(revision.data_snapshot, val_res)

        answer = AIAssistantService.answer_question(payload.question, context, payload.mode)
        return {"answer": answer}
    except AISafetyException as e:
        return {"answer": str(e), "safety_blocked": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error AI Assistant: {e}")


@app.post("/api/projects/import")
def import_project(data: Dict[str, Any] = Body(...)):
    """Mengimport file JSON proyek ke penyimpanan aktif."""
    try:
        # Pre-validate and extract details
        preview = Stage1RequirementService.get_import_preview(json.dumps(data))
        project_id = preview["project_id"]
        if not project_id:
            raise HTTPException(status_code=400, detail="Data JSON tidak memiliki Project ID valid.")

        file_path = get_project_file_path(project_id)
        
        # Write JSON data to the safe file path
        # Let's verify it decodes using load_project_history logic
        tmp_path = file_path + ".tmp"
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

        # Attempt to read to verify correctness
        try:
            Stage1RequirementService.load_project_history(tmp_path)
        except Exception as e:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
            raise ValueError(f"Validasi struktur import gagal: {e}")

        # Atomically rename
        if os.path.exists(file_path):
            os.remove(file_path)
        os.rename(tmp_path, file_path)

        # Trigger index update
        history = Stage1RequirementService.load_project_history(file_path)
        latest = history.revisions[-1]
        Stage1RequirementService.update_project_index(
            project_id=project_id,
            name=latest.data_snapshot.project_name,
            latest_rev=latest.revision_number,
            file_path=file_path
        )
        return {"success": True, "project_id": project_id, "preview": preview}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Gagal melakukan import: {e}")


@app.get("/api/projects/{project_id}/export")
def export_project(project_id: str):
    """Mengekspor berkas JSON project history lengkap."""
    file_path = get_project_file_path(project_id)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Proyek tidak ditemukan.")
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal melakukan ekspor: {e}")


@app.get("/api/projects/{project_id}/export-baseline")
def export_baseline(project_id: str, version: str = "v1.0"):
    """Mengekspor handoff payload baseline terstruktur."""
    file_path = get_project_file_path(project_id)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Proyek tidak ditemukan.")
    try:
        history = Stage1RequirementService.load_project_history(file_path)
        payload = Stage1RequirementService.generate_handoff_payload(history, version)
        return payload
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal mengekspor baseline payload: {e}")


@app.delete("/api/projects/{project_id}")
def delete_project(project_id: str):
    """Menghapus berkas proyek Stage 1 & Stage 2 serta memperbarui index."""
    file_path = get_project_file_path(project_id)
    stage2_path = get_stage2_file_path(project_id)

    deleted_any = False

    if os.path.exists(file_path):
        os.remove(file_path)
        deleted_any = True

    if os.path.exists(stage2_path):
        os.remove(stage2_path)

    # Remove from project_index.json
    if os.path.exists(INDEX_PATH):
        try:
            with open(INDEX_PATH, "r", encoding="utf-8") as f:
                index_data = json.load(f)

            if isinstance(index_data, list):
                new_index = [p for p in index_data if p.get("project_id") != project_id]
                with open(INDEX_PATH, "w", encoding="utf-8") as f:
                    json.dump(new_index, f, indent=2)
            elif isinstance(index_data, dict) and "projects" in index_data:
                index_data["projects"] = [p for p in index_data["projects"] if p.get("project_id") != project_id]
                with open(INDEX_PATH, "w", encoding="utf-8") as f:
                    json.dump(index_data, f, indent=2)
        except Exception as err:
            print(f"Error updating index on delete: {err}")

    if not deleted_any:
        raise HTTPException(status_code=404, detail="Proyek tidak ditemukan.")

    return {"success": True, "message": f"Proyek {project_id} berhasil dihapus."}


def get_stage2_file_path(project_id: str) -> str:
    safe_id = "".join(c for c in project_id if c.isalnum() or c in "-_")
    return os.path.join(PROJECTS_DIR, f"{safe_id}_stage2.json")


@app.get("/api/projects/{project_id}/stage2/history")
def get_stage2_history(project_id: str):
    """Mendapatkan data history Tahap 2. Menginisialisasi jika belum ada."""
    file_path = get_stage2_file_path(project_id)
    history1_path = get_project_file_path(project_id)
    
    if not os.path.exists(history1_path):
        raise HTTPException(status_code=404, detail="Proyek Tahap 1 tidak ditemukan.")
        
    try:
        # Load Stage 1 details to initialize default values if history doesn't exist
        hist1 = Stage1RequirementService.load_project_history(history1_path)
        latest_rev1 = hist1.revisions[-1]
        target_dwt = latest_rev1.data_snapshot.target_dwt_ton or 1000.0
        speed_knots = latest_rev1.data_snapshot.service_speed_knots or 10.0
        
        hist2 = Stage2PreliminaryDesignService.load_stage2_history(file_path, project_id)
        
        # If new history, create Scenario 0
        if not hist2.revisions:
            scen0 = Stage2PreliminaryDesignService.create_scenario(
                project_id=project_id,
                name="Skenario Desain Awal",
                target_dwt=target_dwt,
                speed_knots=speed_knots
            )
            rev0 = Stage2PreliminaryDesignService.create_initial_history_revision(scen0, "system")
            hist2.revisions.append(rev0)
            Stage2PreliminaryDesignService.save_stage2_history(hist2, file_path)
            
        return stage2_history_to_dict(hist2)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal memuat history Tahap 2: {e}")


@app.post("/api/projects/{project_id}/stage2/scenarios")
def create_stage2_scenario(project_id: str, payload: ScenarioCreatePayload):
    """Membuat skenario baru Tahap 2."""
    file_path = get_stage2_file_path(project_id)
    history1_path = get_project_file_path(project_id)
    
    if not os.path.exists(history1_path):
        raise HTTPException(status_code=404, detail="Proyek Tahap 1 tidak ditemukan.")
        
    try:
        hist1 = Stage1RequirementService.load_project_history(history1_path)
        latest_rev1 = hist1.revisions[-1]
        target_dwt = latest_rev1.data_snapshot.target_dwt_ton or 1000.0
        speed_knots = latest_rev1.data_snapshot.service_speed_knots or 10.0
        
        hist2 = Stage2PreliminaryDesignService.load_stage2_history(file_path, project_id)
        
        comp = None
        if payload.primary_comparable_ship:
            comp = comparable_ship_from_dict(payload.primary_comparable_ship.dict())
            
        new_scen = Stage2PreliminaryDesignService.create_scenario(
            project_id=project_id,
            name=payload.scenario_name,
            target_dwt=target_dwt,
            speed_knots=speed_knots,
            comp=comp
        )
        
        new_rev = Stage2PreliminaryDesignService.create_initial_history_revision(new_scen, payload.creator)
        hist2.revisions.append(new_rev)
        
        # Log audit
        hist2.audit_trail.append(PreliminaryAuditLog(
            event_id=f"AUD-{uuid.uuid4().hex[:6].upper()}",
            project_id=project_id,
            scenario_id=new_scen.scenario_id,
            revision_id=new_rev.revision_id,
            action="CREATE_SCENARIO",
            actor=payload.creator,
            timestamp=datetime.now(timezone.utc).isoformat(),
            reason=f"Membuat skenario '{payload.scenario_name}'"
        ))
        
        Stage2PreliminaryDesignService.save_stage2_history(hist2, file_path)
        return stage2_history_to_dict(hist2)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal membuat skenario Tahap 2: {e}")


@app.put("/api/projects/{project_id}/stage2/scenarios/{revision_id}")
def update_stage2_scenario(project_id: str, revision_id: str, payload: ScenarioUpdatePayload):
    """Mengupdate data parameter dalam skenario tertentu (revisi aktif)."""
    file_path = get_stage2_file_path(project_id)
    history1_path = get_project_file_path(project_id)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Proyek Tahap 2 tidak ditemukan.")
        
    try:
        hist1 = Stage1RequirementService.load_project_history(history1_path)
        speed_knots = hist1.revisions[-1].data_snapshot.service_speed_knots or 10.0
        
        hist2 = Stage2PreliminaryDesignService.load_stage2_history(file_path, project_id)
        
        # Find revision
        rev = next((r for r in hist2.revisions if r.revision_id == revision_id), None)
        if not rev:
            raise HTTPException(status_code=404, detail="Skenario revisi tidak ditemukan.")
            
        if rev.status in [RevisionStatus.APPROVED, RevisionStatus.SUPERSEDED, RevisionStatus.ARCHIVED]:
            raise HTTPException(status_code=400, detail="Revisi ini sudah terkunci (immutable).")
            
        scen = rev.data_snapshot
        
        # Map payload updates to model updates
        updates = {
            "scenario_name": payload.scenario_name,
            "lbp_m": payload.lbp_m,
            "loa_m": payload.loa_m,
            "breadth_m": payload.breadth_m,
            "depth_m": payload.depth_m,
            "draft_m": payload.draft_m,
            "cb": payload.cb,
            "cm": payload.cm,
            "cw": payload.cw,
            "weight_items": [weight_item_from_dict(w.dict()) for w in payload.weight_items],
            "capacity_items": [capacity_item_from_dict(c.dict()) for c in payload.capacity_items],
        }
        
        # Trigger recalculation
        Stage2PreliminaryDesignService.update_scenario_data(scen, updates, speed_knots)
        
        # Auto-update revision metadata
        rev.reason_for_change = payload.reason
        rev.updated_by = payload.actor
        rev.updated_at = datetime.now(timezone.utc).isoformat()
        
        # Re-validate
        res = validate_preliminary_design(scen)
        if not res.is_valid:
            rev.status = RevisionStatus.VALIDATION_FAILED
        elif res.is_complete:
            rev.status = RevisionStatus.READY_FOR_REVIEW
        else:
            rev.status = RevisionStatus.DRAFT
            
        # Log audit
        hist2.audit_trail.append(PreliminaryAuditLog(
            event_id=f"AUD-{uuid.uuid4().hex[:6].upper()}",
            project_id=project_id,
            scenario_id=scen.scenario_id,
            revision_id=revision_id,
            action="UPDATE_SCENARIO",
            actor=payload.actor,
            timestamp=datetime.now(timezone.utc).isoformat(),
            reason=payload.reason
        ))
        
        Stage2PreliminaryDesignService.save_stage2_history(hist2, file_path)
        return stage2_history_to_dict(hist2)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal mengupdate skenario Tahap 2: {e}")


@app.post("/api/projects/{project_id}/stage2/scenarios/{revision_id}/submit")
def submit_stage2_scenario(project_id: str, revision_id: str, payload: Dict[str, str] = Body(...)):
    """Mengajukan skenario revisi Tahap 2 untuk review baseline."""
    file_path = get_stage2_file_path(project_id)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Proyek tidak ditemukan.")
    try:
        actor = payload.get("actor", "system")
        hist2 = Stage2PreliminaryDesignService.load_stage2_history(file_path, project_id)
        Stage2PreliminaryDesignService.submit_scenario_revision(hist2, revision_id, actor)
        Stage2PreliminaryDesignService.save_stage2_history(hist2, file_path)
        return stage2_history_to_dict(hist2)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal mengajukan review: {e}")


@app.post("/api/projects/{project_id}/stage2/scenarios/{revision_id}/review")
def review_stage2_scenario(project_id: str, revision_id: str, payload: ScenarioReviewPayload):
    """Pemberian keputusan review (APPROVE / REJECT) pada skenario Tahap 2."""
    file_path = get_stage2_file_path(project_id)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Proyek tidak ditemukan.")
    try:
        hist2 = Stage2PreliminaryDesignService.load_stage2_history(file_path, project_id)
        if payload.decision == "APPROVED":
            Stage2PreliminaryDesignService.approve_scenario_revision(
                hist2, revision_id, payload.reviewer, payload.note
            )
        else:
            Stage2PreliminaryDesignService.reject_scenario_revision(
                hist2, revision_id, payload.reviewer, payload.note
            )
        Stage2PreliminaryDesignService.save_stage2_history(hist2, file_path)
        return stage2_history_to_dict(hist2)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal memproses review: {e}")


@app.get("/api/projects/{project_id}/stage2/scenarios/{revision_id}/validate")
def validate_stage2_scenario(project_id: str, revision_id: str):
    """Menjalankan validation engine khusus Tahap 2 terhadap skenario tertentu."""
    file_path = get_stage2_file_path(project_id)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Proyek tidak ditemukan.")
    try:
        hist2 = Stage2PreliminaryDesignService.load_stage2_history(file_path, project_id)
        rev = next((r for r in hist2.revisions if r.revision_id == revision_id), None)
        if not rev:
            raise HTTPException(status_code=404, detail="Skenario revisi tidak ditemukan.")
            
        res = validate_preliminary_design(rev.data_snapshot)
        return {
            "is_valid": res.is_valid,
            "is_complete": res.is_complete,
            "can_approve_baseline": res.can_approve_baseline,
            "error_count": res.error_count,
            "warning_count": res.warning_count,
            "timestamp": res.timestamp,
            "issues": [
                {
                    "code": i.code,
                    "field_path": i.field_path,
                    "severity": i.severity.value if hasattr(i.severity, "value") else str(i.severity),
                    "message": i.message,
                    "suggestion": i.suggestion,
                    "actual_value": i.actual_value,
                    "rule_name": i.rule_name,
                    "rule_source": i.rule_source
                } for i in res.issues
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal melakukan validasi: {e}")


@app.post("/api/projects/{project_id}/stage2/assistant")
def stage2_ai_assistant(project_id: str, payload: Dict[str, Any] = Body(...)):
    """Tanya jawab asisten cerdas AI Tahap 2 dengan data hidrostatik & guardrail keselamatan."""
    file_path = get_project_file_path(project_id)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Proyek tidak ditemukan.")
    try:
        history1 = Stage1RequirementService.load_project_history(file_path)
        active_rev1 = history1.revisions[-1]
        val_res1 = Stage1RequirementService.validate_project_rich(active_rev1.data_snapshot)

        question = payload.get("question", "")
        mode = payload.get("mode", "SECTION_EXPLAINER")
        stage2_data = payload.get("stage2_data", {})

        context = AIAssistantService.build_context(active_rev1.data_snapshot, val_res1, stage2_data=stage2_data)

        answer = AIAssistantService.answer_question(question, context, mode)
        return {"answer": answer}
    except AISafetyException as e:
        return {"answer": str(e), "safety_blocked": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error Stage 2 AI Assistant: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=8080, reload=True)

