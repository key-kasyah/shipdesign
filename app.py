#!/usr/bin/env python3
"""
Gradio UI Prototype untuk Platform Rancang Bangun Kapal AI (Tahap 1).
Memisahkan event handling UI dari logika bisnis domain (Sprint 1.4).
"""

import os
import sys
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Tuple

# Add root folder to python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

import gradio as gr

from src.core.enums import PortConstraintHardness, VesselType, WaterType, RevisionStatus
from src.domain.stage1_requirements.models import ProjectData, ProjectHistory, ProjectRevision
from src.domain.stage1_requirements.schemas import project_data_to_dict
from src.services.stage1_service import Stage1RequirementService


def init_empty_project() -> ProjectHistory:
    """Inisialisasi project history kosong default."""
    project = ProjectData(
        project_id="PRJ-DEFAULT",
        project_name="Kapal Prototipe Baru",
        owner="PT Pelayaran Utama",
        vessel_type=VesselType.GENERAL_CARGO,
        target_dwt_ton=5000.0,
        service_speed_knots=12.0,
        water_type=WaterType.SEAWATER,
        water_density_t_m3=1.025,
    )
    return Stage1RequirementService.create_initial_history(project, creator="system")


def update_ui_inputs_from_revision(rev: ProjectRevision) -> List[Any]:
    """Mengembalikan nilai input UI dari snapshot revisi tertentu."""
    snap = rev.data_snapshot
    return [
        snap.project_id,
        snap.project_name,
        snap.owner,
        snap.organization or "",
        snap.vessel_type.value,
        snap.vessel_function or "",
        snap.target_dwt_ton or 0.0,
        snap.service_speed_knots or 0.0,
        snap.max_speed_knots or 0.0,
        snap.endurance_days or 0.0,
        snap.water_type.value,
        snap.water_density_t_m3,
        snap.route_name or "",
        snap.operating_area or "",
        snap.origin_port or "",
        snap.destination_port or "",
        snap.route_distance_nm or 0.0,
        snap.crew_count or 0,
        snap.passenger_count or 0,
        snap.max_draft_m or 0.0,
        snap.max_loa_m or 0.0,
        snap.max_breadth_m or 0.0,
    ]


def handle_create_project(project_id, project_name, owner, organization, creator) -> Tuple[gr.State, str, gr.Dropdown, List[Any], gr.HTML]:
    """Aksi membuat proyek baru."""
    if not project_id.strip() or not project_name.strip() or not owner.strip():
        return None, "Error: Project ID, Nama Proyek, dan Owner wajib diisi!", gr.skip(), gr.skip(), gr.skip()
        
    project = Stage1RequirementService.create_project(
        project_id=project_id.strip(),
        project_name=project_name.strip(),
        owner=owner.strip(),
        organization=organization.strip() if organization else None,
        target_dwt_ton=1000.0,  # default
        service_speed_knots=10.0,
        water_type=WaterType.SEAWATER,
        water_density_t_m3=1.025,
    )
    history = Stage1RequirementService.create_initial_history(project, creator=creator.strip() or "system")
    
    # Update revision dropdown options
    rev_choices = [f"Rev. {r.revision_number} ({r.status.value})" for r in history.revisions]
    latest_rev = history.revisions[-1]
    
    # Render validation and output UI values
    val_report = render_validation_html(latest_rev)
    ui_values = update_ui_inputs_from_revision(latest_rev)
    
    status_msg = f"Project '{project_name}' [ID: {project_id}] berhasil dibuat!"
    return history, status_msg, gr.Dropdown(choices=rev_choices, value=rev_choices[-1]), ui_values, val_report


def handle_update_revision(
    history: ProjectHistory,
    selected_rev_index: str,
    project_id, project_name, owner, organization,
    vessel_type, vessel_function, target_dwt, service_speed, max_speed, endurance,
    water_type, water_density, route_name, operating_area, origin_port, destination_port, route_distance,
    crew_count, passenger_count, max_draft, max_loa, max_breadth, actor, reason
) -> Tuple[gr.State, str, gr.HTML, gr.Dropdown]:
    """Aksi memperbarui data snapshot pada revisi aktif."""
    if not history:
        return history, "Error: Tidak ada data history proyek aktif.", gr.skip(), gr.skip()

    # Find the active revision by dropdown selection index
    try:
        rev_num = int(selected_rev_index.split()[1])
    except (IndexError, ValueError):
        return history, "Error: Nomor revisi pilihan tidak valid.", gr.skip(), gr.skip()

    revision = next((r for r in history.revisions if r.revision_number == rev_num), None)
    if not revision:
        return history, f"Error: Revisi nomor {rev_num} tidak ditemukan.", gr.skip(), gr.skip()

    if revision.status in [RevisionStatus.APPROVED, RevisionStatus.SUPERSEDED, RevisionStatus.ARCHIVED]:
        return history, f"Error: Revisi {rev_num} berstatus '{revision.status.value}' bersifat immutable (locked) dan tidak dapat diedit langsung.", gr.skip(), gr.skip()

    updates = {
        "project_id": project_id,
        "project_name": project_name,
        "owner": owner,
        "organization": organization or None,
        "vessel_type": VesselType(vessel_type),
        "vessel_function": vessel_function or None,
        "target_dwt_ton": target_dwt,
        "service_speed_knots": service_speed,
        "max_speed_knots": max_speed if max_speed > 0 else None,
        "endurance_days": endurance if endurance > 0 else None,
        "water_type": WaterType(water_type),
        "water_density_t_m3": water_density,
        "route_name": route_name or None,
        "operating_area": operating_area or None,
        "origin_port": origin_port or None,
        "destination_port": destination_port or None,
        "route_distance_nm": route_distance if route_distance > 0 else None,
        "crew_count": int(crew_count) if crew_count >= 0 else 0,
        "passenger_count": int(passenger_count) if passenger_count >= 0 else 0,
        "max_draft_m": max_draft if max_draft > 0 else None,
        "max_loa_m": max_loa if max_loa > 0 else None,
        "max_breadth_m": max_breadth if max_breadth > 0 else None,
    }

    try:
        Stage1RequirementService.update_revision_data(history, revision.revision_id, updates, actor or "system", reason)
        val_report = render_validation_html(revision)
        
        # Refresh revisions dropdown choices
        rev_choices = [f"Rev. {r.revision_number} ({r.status.value})" for r in history.revisions]
        selected_option = f"Rev. {revision.revision_number} ({revision.status.value})"
        
        return history, f"Revisi {rev_num} berhasil diperbarui!", val_report, gr.Dropdown(choices=rev_choices, value=selected_option)
    except Exception as e:
        return history, f"Gagal memperbarui: {e}", gr.skip(), gr.skip()


def handle_create_revision_branch(history: ProjectHistory, selected_rev_index: str, creator, reason) -> Tuple[gr.State, str, gr.Dropdown, List[Any], gr.HTML]:
    """Membuat revisi baru (DRAFT) dari parent baseline."""
    if not history:
        return history, "Error: Tidak ada data history proyek aktif.", gr.skip(), gr.skip(), gr.skip()

    try:
        rev_num = int(selected_rev_index.split()[1])
    except (IndexError, ValueError):
        return history, "Error: Nomor revisi parent tidak valid.", gr.skip(), gr.skip(), gr.skip()

    parent = next((r for r in history.revisions if r.revision_number == rev_num), None)
    if not parent:
        return history, f"Error: Parent revision {rev_num} tidak ditemukan.", gr.skip(), gr.skip(), gr.skip()

    try:
        new_rev = Stage1RequirementService.create_new_revision(
            history, parent.revision_id, creator or "system", reason or "Membuat revisi baru"
        )
        
        rev_choices = [f"Rev. {r.revision_number} ({r.status.value})" for r in history.revisions]
        selected_option = f"Rev. {new_rev.revision_number} ({new_rev.status.value})"
        
        ui_values = update_ui_inputs_from_revision(new_rev)
        val_report = render_validation_html(new_rev)
        
        return history, f"Revisi baru Rev. {new_rev.revision_number} berhasil dibuat!", gr.Dropdown(choices=rev_choices, value=selected_option), ui_values, val_report
    except Exception as e:
        return history, f"Gagal membuat revisi: {e}", gr.skip(), gr.skip(), gr.skip()


def handle_submit_for_review(history: ProjectHistory, selected_rev_index: str, submitter: str) -> Tuple[gr.State, str, gr.Dropdown, gr.HTML]:
    """Mengajukan revisi untuk review."""
    if not history:
        return history, "Error: Proyek kosong.", gr.skip(), gr.skip()

    try:
        rev_num = int(selected_rev_index.split()[1])
    except (IndexError, ValueError):
        return history, "Error: Nomor revisi tidak valid.", gr.skip(), gr.skip()

    rev = next((r for r in history.revisions if r.revision_number == rev_num), None)
    if not rev:
        return history, "Error: Revisi tidak ditemukan.", gr.skip(), gr.skip()

    try:
        Stage1RequirementService.submit_revision_for_review(history, rev.revision_id, submitter or "system")
        rev_choices = [f"Rev. {r.revision_number} ({r.status.value})" for r in history.revisions]
        selected_option = f"Rev. {rev.revision_number} ({rev.status.value})"
        val_report = render_validation_html(rev)
        return history, f"Revisi {rev_num} berhasil diajukan!", gr.Dropdown(choices=rev_choices, value=selected_option), val_report
    except Exception as e:
        return history, f"Gagal diajukan: {e}", gr.skip(), gr.skip()


def handle_review_revision(history: ProjectHistory, selected_rev_index: str, reviewer, decision_choice, note) -> Tuple[gr.State, str, gr.Dropdown, gr.HTML]:
    """Aksi me-review revisi."""
    if not history:
        return history, "Error: Proyek kosong.", gr.skip(), gr.skip()

    try:
        rev_num = int(selected_rev_index.split()[1])
    except (IndexError, ValueError):
        return history, "Error: Nomor revisi tidak valid.", gr.skip(), gr.skip()

    rev = next((r for r in history.revisions if r.revision_number == rev_num), None)
    if not rev:
        return history, "Error: Revisi tidak ditemukan.", gr.skip(), gr.skip()

    decision = "APPROVED" if decision_choice == "APPROVE (Setuju)" else "REJECTED"

    try:
        Stage1RequirementService.review_revision(history, rev.revision_id, reviewer or "system", decision, note)
        rev_choices = [f"Rev. {r.revision_number} ({r.status.value})" for r in history.revisions]
        selected_option = f"Rev. {rev.revision_number} ({rev.status.value})"
        val_report = render_validation_html(rev)
        return history, f"Revisi {rev_num} di-review dengan keputusan: {decision}!", gr.Dropdown(choices=rev_choices, value=selected_option), val_report
    except Exception as e:
        return history, f"Gagal memproses review: {e}", gr.skip(), gr.skip()


def handle_compare_revisions(history: ProjectHistory, r1: str, r2: str) -> gr.HTML:
    """Aksi perbandingan revisi."""
    if not history or not r1 or not r2:
        return "Silakan muat proyek dan pilih dua revisi."

    try:
        n1 = int(r1.split()[1])
        n2 = int(r2.split()[1])
    except (IndexError, ValueError):
        return "ID revisi tidak valid."

    rev1 = next((r for r in history.revisions if r.revision_number == n1), None)
    rev2 = next((r for r in history.revisions if r.revision_number == n2), None)

    if not rev1 or not rev2:
        return "Revisi tidak ditemukan."

    changes = Stage1RequirementService.compare_revisions(history, rev1.revision_id, rev2.revision_id)
    
    html = f"<h4>Perbandingan Revisi {n1} vs Revisi {n2}</h4>"
    if not changes:
        html += "<p>Tidak ada perbedaan parameter desain.</p>"
    else:
        html += "<table border='1' style='width:100%; border-collapse:collapse; text-align:left;'>"
        html += "<tr style='background-color:#f2f2f2;'><th>Field</th><th>Nilai Lama</th><th>Nilai Baru</th><th>Pengubah</th><th>Alasan</th></tr>"
        for c in changes:
            html += f"<tr><td>{c.field_path}</td><td>{c.old_value}</td><td>{c.new_value}</td><td>{c.changed_by}</td><td>{c.reason or '-'}</td></tr>"
        html += "</table>"
    return html


def handle_show_audit_trail(history: ProjectHistory) -> gr.HTML:
    """Tampilkan Log Audit Trail."""
    if not history or not history.audit_trail:
        return "Belum ada log aktivitas."
        
    html = "<h4>Audit Trail Proyek</h4>"
    html += "<table border='1' style='width:100%; border-collapse:collapse; text-align:left;'>"
    html += "<tr style='background-color:#f2f2f2;'><th>Timestamp</th><th>Aksi</th><th>Aktor</th><th>Nilai Lama</th><th>Nilai Baru</th><th>Keterangan / Alasan</th></tr>"
    for a in reversed(history.audit_trail):
        html += f"<tr><td>{a.timestamp}</td><td>{a.action}</td><td>{a.actor}</td><td>{a.old_value or '-'}</td><td>{a.new_value or '-'}</td><td>{a.reason or '-'}</td></tr>"
    html += "</table>"
    return html


def render_validation_html(rev: ProjectRevision) -> str:
    """Merender Validasi Report menjadi representasi HTML Gradio."""
    res = Stage1RequirementService.validate_project_rich(rev.data_snapshot)
    
    status_color = "#4CAF50" if res.is_valid else "#F44336"
    complete_color = "#2196F3" if res.is_complete else "#FF9800"
    
    html = f"<div style='border:1px solid #ccc; padding:10px; border-radius:5px; margin-bottom:15px;'>"
    html += f"<h3>Status Dokumen</h3>"
    html += f"<p>Revisi: <b>Rev. {rev.revision_number}</b> (Status: <b>{rev.status.value}</b>)</p>"
    html += f"<p>Validitas: <span style='background-color:{status_color}; color:white; padding:3px 8px; border-radius:3px;'><b>{'VALID' if res.is_valid else 'INVALID'}</b></span></p>"
    html += f"<p>Kelengkapan: <span style='background-color:{complete_color}; color:white; padding:3px 8px; border-radius:3px;'><b>{'LENGKAP' if res.is_complete else 'DRAFT'}</b></span></p>"
    html += f"<p>Baseline Gate: <b>{'SIAP DI-BASELINE-KAN' if res.can_approve_baseline else 'BELUM LAYAK'}</b></p>"
    html += f"</div>"

    if res.issues:
        html += "<h3>Daftar Temuan Masalah</h3>"
        for i in res.issues:
            color = "#ffcccc" if i.severity in [RevisionStatus.APPROVED, "BLOCKING_ERROR", "ERROR"] else "#fff2cc"
            badge = f"[{i.severity}]"
            html += f"<div style='background-color:{color}; border-left:5px solid #ff0000; padding:8px; margin-bottom:8px; border-radius:3px;'>"
            html += f"<b>{badge} Field: '{i.field_path}'</b> - {i.message}<br/>"
            html += f"<small>Saran: {i.suggestion} (Sumber: {i.rule_source})</small>"
            html += f"</div>"
    else:
        html += "<p style='color:green;'><b>[+] Semua parameter valid dan aman!</b></p>"
        
    return html


def build_app():
    """Membangun blok UI Gradio."""
    with gr.Blocks(title="Ship Design AI Platform") as app:
        history_state = gr.State(default_factory=init_empty_project)
        
        gr.Markdown("# PLATFORM INTEGRASI AI RANCANG BANGUN KAPAL")
        gr.Markdown("### Tahap 1 — Kebutuhan Kapal / Design Requirements")
        
        status_box = gr.Textbox(label="Status Operasi", value="Aplikasi siap digunakan.", interactive=False)
        
        with gr.Tab("Manajemen Proyek & Input"):
            with gr.Row():
                with gr.Column(scale=1):
                    gr.Markdown("### 1. Inisialisasi Proyek")
                    p_id = gr.Textbox(label="Project ID *", value="PRJ-2026-001")
                    p_name = gr.Textbox(label="Nama Proyek *", value="KM Nusantara 01")
                    p_owner = gr.Textbox(label="Owner / Pemilik *", value="PT Pelayaran Nasional")
                    p_org = gr.Textbox(label="Organisasi / Kampus", value="ITS Surabaya")
                    p_creator = gr.Textbox(label="Aktor Pembuat *", value="designer@ship.com")
                    
                    btn_create = gr.Button("Buat Proyek Baru", variant="primary")
                    
                with gr.Column(scale=2):
                    gr.Markdown("### 2. Parameter Desain (Snapshot Revisi Aktif)")
                    
                    with gr.Row():
                        v_type = gr.Dropdown(choices=[e.value for e in VesselType], value=VesselType.GENERAL_CARGO.value, label="Tipe Kapal *")
                        v_func = gr.Textbox(label="Fungsi Kapal Spesifik", value="Angkutan barang")
                        
                    with gr.Row():
                        t_dwt = gr.Number(label="Target DWT (ton) *", value=5000.0)
                        s_speed = gr.Number(label="Kecepatan Dinas (knots) *", value=12.0)
                        m_speed = gr.Number(label="Kecepatan Maksimum (knots)", value=14.0)
                        endur = gr.Number(label="Endurance (hari)", value=10.0)

                    with gr.Row():
                        w_type = gr.Dropdown(choices=[e.value for e in WaterType], value=WaterType.SEAWATER.value, label="Jenis Air Perairan *")
                        w_density = gr.Number(label="Densitas Air (t/m³) *", value=1.025)

                    with gr.Row():
                        r_name = gr.Textbox(label="Nama Rute / Trayek", value="Jawa-Sulawesi")
                        r_area = gr.Textbox(label="Area Operasi", value="Java Sea")
                        r_origin = gr.Textbox(label="Pelabuhan Asal", value="Tanjung Perak")
                        r_dest = gr.Textbox(label="Pelabuhan Tujuan", value="Makassar")
                        r_dist = gr.Number(label="Jarak Rute (nm)", value=450.0)

                    with gr.Row():
                        crew = gr.Number(label="Jumlah Awak Kapal", value=18)
                        passenger = gr.Number(label="Jumlah Penumpang", value=0)
                        m_draft = gr.Number(label="Batas Maks Draft (m)", value=6.5)
                        m_loa = gr.Number(label="Batas Maks LOA (m)", value=100.0)
                        m_breadth = gr.Number(label="Batas Maks Lebar (m)", value=18.0)

            with gr.Row():
                gr.Markdown("### 3. Simpan dan Validasi Revisi Aktif")
            with gr.Row():
                rev_dropdown = gr.Dropdown(label="Pilih Revisi Proyek Aktif", choices=["Rev. 0 (DRAFT)"], value="Rev. 0 (DRAFT)")
                edit_actor = gr.Textbox(label="Aktor Editor *", value="designer@ship.com")
                edit_reason = gr.Textbox(label="Alasan Perubahan *", value="Inisialisasi spesifikasi awal.")
                
            with gr.Row():
                btn_save_rev = gr.Button("Update & Validasi Revisi Aktif", variant="primary")

        with gr.Tab("Workflow & Approval Baseline"):
            with gr.Row():
                with gr.Column(scale=1):
                    gr.Markdown("### Ajukan Review (DRAFT -> WAITING_FOR_REVIEW)")
                    submitter_name = gr.Textbox(label="Aktor Pengaju", value="designer@ship.com")
                    btn_submit = gr.Button("Ajukan Review", variant="secondary")
                    
                    gr.Markdown("---")
                    gr.Markdown("### Review Approval (WAITING_FOR_REVIEW -> APPROVED)")
                    reviewer_name = gr.Textbox(label="Nama Reviewer", value="lead@ship.com")
                    review_decision = gr.Dropdown(choices=["APPROVE (Setuju)", "REJECT (Butuh Perbaikan)"], value="APPROVE (Setuju)", label="Keputusan")
                    review_note = gr.Textbox(label="Catatan Review", value="Memenuhi operational profile.")
                    btn_review = gr.Button("Kirim Keputusan Review", variant="primary")
                    
                    gr.Markdown("---")
                    gr.Markdown("### Cabang Revisi Baru dari Baseline")
                    branch_creator = gr.Textbox(label="Aktor Pembuat Revisi Baru", value="designer@ship.com")
                    branch_reason = gr.Textbox(label="Alasan Pembuatan Revisi Baru", value="Perubahan target kargo rute baru")
                    btn_branch = gr.Button("Buat Revisi Baru", variant="secondary")

                with gr.Column(scale=2):
                    gr.Markdown("### Laporan Validasi & Kelengkapan")
                    val_report_html = gr.HTML("Silakan buat atau muat proyek.")

        with gr.Tab("Perbandingan & Log Audit"):
            with gr.Row():
                comp_r1 = gr.Textbox(label="Revisi 1 (contoh: Rev. 0)")
                comp_r2 = gr.Textbox(label="Revisi 2 (contoh: Rev. 1)")
                btn_compare = gr.Button("Bandingkan Perbedaan Parameter")
            with gr.Row():
                compare_output_html = gr.HTML("Hasil perbandingan akan muncul di sini.")
                
            gr.Markdown("---")
            btn_show_audit = gr.Button("Tampilkan Log Audit Trail")
            audit_trail_html = gr.HTML("Log trail aktivitas sistem akan ditampilkan di sini.")

        # Event Handlers

        # Create project handler
        btn_create.click(
            fn=handle_create_project,
            inputs=[p_id, p_name, p_owner, p_org, p_creator],
            outputs=[history_state, status_box, rev_dropdown, 
                     [p_id, p_name, p_owner, p_org, v_type, v_func, t_dwt, s_speed, m_speed, endur, w_type, w_density, r_name, r_area, r_origin, r_dest, r_dist, crew, passenger, m_draft, m_loa, m_breadth],
                     val_report_html]
        )

        # Update / edit revision handler
        btn_save_rev.click(
            fn=handle_update_revision,
            inputs=[history_state, rev_dropdown, p_id, p_name, p_owner, p_org, v_type, v_func, t_dwt, s_speed, m_speed, endur, w_type, w_density, r_name, r_area, r_origin, r_dest, r_dist, crew, passenger, m_draft, m_loa, m_breadth, edit_actor, edit_reason],
            outputs=[history_state, status_box, val_report_html, rev_dropdown]
        )

        # Submit revision handler
        btn_submit.click(
            fn=handle_submit_for_review,
            inputs=[history_state, rev_dropdown, submitter_name],
            outputs=[history_state, status_box, rev_dropdown, val_report_html]
        )

        # Review / Approval handler
        btn_review.click(
            fn=handle_review_revision,
            inputs=[history_state, rev_dropdown, reviewer_name, review_decision, review_note],
            outputs=[history_state, status_box, rev_dropdown, val_report_html]
        )

        # Branch new revision handler
        btn_branch.click(
            fn=handle_create_revision_branch,
            inputs=[history_state, rev_dropdown, branch_creator, branch_reason],
            outputs=[history_state, status_box, rev_dropdown,
                     [p_id, p_name, p_owner, p_org, v_type, v_func, t_dwt, s_speed, m_speed, endur, w_type, w_density, r_name, r_area, r_origin, r_dest, r_dist, crew, passenger, m_draft, m_loa, m_breadth],
                     val_report_html]
        )

        # Compare revisions handler
        btn_compare.click(
            fn=handle_compare_revisions,
            inputs=[history_state, comp_r1, comp_r2],
            outputs=compare_output_html
        )

        # Audit trail handler
        btn_show_audit.click(
            fn=handle_show_audit_trail,
            inputs=[history_state],
            outputs=audit_trail_html
        )

    return app


if __name__ == "__main__":
    app = build_app()
    app.launch(server_name="127.0.0.1", server_port=7860)
