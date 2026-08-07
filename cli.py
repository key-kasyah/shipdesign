#!/usr/bin/env python3
"""
CLI Interactive Tool untuk Input & Validasi Project Data (Tahap 1 — Kebutuhan Kapal).
Mendukung Revision, Baseline, dan Approval Workflow Management (Sprint 1.3).
"""

import json
import os
import sys
from typing import Optional, Dict, Any, List

# Ensure src package is accessible from root directory
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from src.core.enums import PortConstraintHardness, VesselType, WaterType, RevisionStatus
from src.domain.stage1_requirements.models import ProjectData, ProjectHistory, ProjectRevision, ProjectBaseline, AuditEvent
from src.domain.stage1_requirements.schemas import (
    project_data_from_json,
    project_data_to_json,
    project_history_from_json,
    project_history_to_json,
)
from src.services.stage1_service import Stage1RequirementService


def clear_screen():
    os.system("cls" if os.name == "nt" else "clear")


def print_header():
    print("=" * 65)
    print("   PLATFORM RANCANG BANGUN KAPAL TERINTEGRASI AI")
    print("   Interactive CLI — Input & Validasi Project Data (Tahap 1)")
    print("=" * 65)


def prompt_str(label: str, default: Optional[str] = None, required: bool = False) -> Optional[str]:
    default_str = f" [{default}]" if default else ""
    req_str = " *" if required else ""
    while True:
        val = input(f"{label}{req_str}{default_str}: ").strip()
        if not val:
            if default is not None:
                return default
            if required:
                print("   [!] Field ini wajib diisi!")
                continue
            return None
        return val


def prompt_float(label: str, default: Optional[float] = None, required: bool = False) -> Optional[float]:
    default_str = f" [{default}]" if default is not None else ""
    req_str = " *" if required else ""
    while True:
        raw = input(f"{label}{req_str}{default_str}: ").strip()
        if not raw:
            if default is not None:
                return default
            if required:
                print("   [!] Field ini wajib diisi dengan angka!")
                continue
            return None
        try:
            val = float(raw)
            return val
        except ValueError:
            print("   [!] Masukkan angka desimal/int yang valid!")


def prompt_int(label: str, default: Optional[int] = None, required: bool = False) -> Optional[int]:
    default_str = f" [{default}]" if default is not None else ""
    req_str = " *" if required else ""
    while True:
        raw = input(f"{label}{req_str}{default_str}: ").strip()
        if not raw:
            if default is not None:
                return default
            if required:
                print("   [!] Field ini wajib diisi dengan angka bulat!")
                continue
            return None
        try:
            val = int(raw)
            return val
        except ValueError:
            print("   [!] Masukkan angka bulat (integer) yang valid!")


def prompt_enum(enum_cls, label: str, default=None):
    options = [e.value for e in enum_cls]
    print(f"\nPilih {label}:")
    for idx, opt in enumerate(options, 1):
        def_mark = " (default)" if default and opt == default.value else ""
        print(f"  {idx}. {opt}{def_mark}")

    while True:
        raw = input(f"Masukkan pilihan (1-{len(options)}) atau tekan Enter: ").strip()
        if not raw:
            if default:
                return default
            return enum_cls(options[0])
        try:
            idx = int(raw)
            if 1 <= idx <= len(options):
                return enum_cls(options[idx - 1])
        except ValueError:
            pass
        print(f"   [!] Pilihan tidak valid. Masukkan angka 1-{len(options)}.")


def display_project_summary(project: ProjectData, rev_status: Optional[RevisionStatus] = None):
    res = Stage1RequirementService.validate_project_rich(project)
    print("\n" + "-" * 65)
    print(f"RINGKASAN PROJECT DATA: {project.project_name} ({project.project_id})")
    print("-" * 65)
    print(f" Pemilik / Owner      : {project.owner}")
    print(f" Tipe Kapal           : {project.vessel_type.value}")
    print(f" Target DWT           : {project.target_dwt_ton} ton")
    print(f" Kecepatan Dinas      : {project.service_speed_knots} knots")
    print(f" Kecepatan Maksimum   : {project.max_speed_knots or '-'} knots")
    print(f" Endurance            : {project.endurance_days} hari")
    print(f" Densitas Air         : {project.water_density_t_m3} t/m³ ({project.water_type.value})")
    print(f" Area Operasi         : {project.operating_area or '-'}")
    print(f" Trayek               : {project.origin_port or '-'} -> {project.destination_port or '-'}")
    print(f" Jarak                : {project.route_distance_nm or '-'} nm")
    print(f" Awak / Penumpang     : {project.crew_count or 0} awak / {project.passenger_count or 0} penumpang")
    print(f" Nomor Revisi         : Rev. {project.revision_number}")
    print(f" Waktu Update         : {project.updated_at}")
    if rev_status:
        print(f" Status Revisi        : {rev_status.value}")
    print("-" * 65)
    print("STATUS VALIDASI & KELENGKAPAN (Sprint 1.3):")
    print(f" Valid Status         : {'VALID (OK)' if res.is_valid else 'INVALID (ERRORS)'}")
    print(f" Complete Status      : {'COMPLETE (LENGKAP)' if res.is_complete else 'INCOMPLETE (DRAFT)'}")
    print(f" Timestamp Validasi   : {res.timestamp}")

    if res.issues:
        print("\nTEMUAN MASALAH / ISSUES:")
        blocking = [i for i in res.issues if i.severity == "BLOCKING_ERROR"]
        errors = [i for i in res.issues if i.severity == "ERROR"]
        warnings = [i for i in res.issues if i.severity == "WARNING"]
        infos = [i for i in res.issues if i.severity == "INFO"]

        if blocking:
            print("\n [!] BLOCKING ERROR (Memblokir Kelanjutan Tahap):")
            for i in blocking:
                print(f"     - [{i.code}] Field '{i.field_path}': {i.message}")
                print(f"       Saran: {i.suggestion} (Sumber: {i.rule_source})")

        if errors:
            print("\n [X] ERROR VALIDASI:")
            for i in errors:
                print(f"     - [{i.code}] Field '{i.field_path}': {i.message}")
                print(f"       Saran: {i.suggestion} (Sumber: {i.rule_source})")

        if warnings:
            print("\n [?] PERINGATAN KONSISTENSI & KEWAJARAN (WARNING):")
            for i in warnings:
                print(f"     - [{i.code}] Field '{i.field_path}': {i.message}")
                print(f"       Saran: {i.suggestion} (Sumber: {i.rule_source})")

        if infos:
            print("\n [*] INFORMASI (INFO):")
            for i in infos:
                print(f"     - [{i.code}] Field '{i.field_path}': {i.message}")
                print(f"       Saran: {i.suggestion}")
    else:
        print("\n [+] Tidak ada temuan isu. Proyek siap dideploy!")
    print("-" * 65)


def interactive_input() -> ProjectData:
    print("\n--- INPUT DATA PROYEK BARU ---")
    project_id = prompt_str("Project ID", default="PRJ-2026-001", required=True)
    project_name = prompt_str("Nama Proyek / Kapal", default="KM Nusantara 01", required=True)
    owner = prompt_str("Pemilik / Owner", default="PT Pelayaran Utama", required=True)
    organization = prompt_str("Organisasi / Kampus / Galangan", default="ITS Naval Arch")

    vessel_type = prompt_enum(VesselType, "Tipe Kapal", default=VesselType.GENERAL_CARGO)
    vessel_function = prompt_str("Fungsi Kapal Spesifik", default="Angkutan kargo umum")

    print("\n--- PERFORMANCE & DWT ---")
    target_dwt_ton = prompt_float("Target DWT (ton)", default=5000.0, required=True)
    service_speed_knots = prompt_float("Kecepatan Dinas (knots)", default=12.5, required=True)
    max_speed_knots = prompt_float("Kecepatan Maksimum (knots)", default=14.0)
    endurance_days = prompt_float("Endurance / Daya Jelajah (hari)", default=10.0)

    print("\n--- KONDISI PERAIRAN ---")
    water_type = prompt_enum(WaterType, "Jenis Air", default=WaterType.SEAWATER)
    water_density_t_m3 = prompt_float("Densitas Air (t/m³)", default=1.025, required=True)

    print("\n--- TRAYEK, AREA & JALUR ---")
    route_name = prompt_str("Nama Trayek / Rute (e.g. Jawa-Sumatera)", default="Jawa-Sulawesi")
    operating_area = prompt_str("Area Operasi (e.g. Java Sea / ALKI II)", default="Java Sea")
    origin_port = prompt_str("Pelabuhan Asal", default="Tanjung Perak")
    destination_port = prompt_str("Pelabuhan Tujuan", default="Makassar")
    route_distance_nm = prompt_float("Jarak Pelayaran (nautical miles)", default=450.0)

    print("\n--- AKOMODASI & BATAS PELABUHAN (OPSIONAL) ---")
    crew_count = prompt_int("Jumlah Awak Kapal", default=18)
    passenger_count = prompt_int("Jumlah Penumpang", default=0)
    max_draft_m = prompt_float("Batas Maksimum Draft (m)", default=6.5)
    max_loa_m = prompt_float("Batas Maksimum LOA (m)", default=100.0)
    max_breadth_m = prompt_float("Batas Maksimum Lebar (m)", default=18.0)

    project = Stage1RequirementService.create_project(
        project_id=project_id,
        project_name=project_name,
        owner=owner,
        organization=organization,
        vessel_type=vessel_type,
        vessel_function=vessel_function,
        target_dwt_ton=target_dwt_ton,
        service_speed_knots=service_speed_knots,
        max_speed_knots=max_speed_knots,
        endurance_days=endurance_days,
        water_type=water_type,
        water_density_t_m3=water_density_t_m3,
        route_name=route_name,
        operating_area=operating_area,
        origin_port=origin_port,
        destination_port=destination_port,
        route_distance_nm=route_distance_nm,
        crew_count=crew_count,
        passenger_count=passenger_count,
        max_draft_m=max_draft_m,
        max_loa_m=max_loa_m,
        max_breadth_m=max_breadth_m,
    )
    return project


def manage_revisions_menu(history: ProjectHistory):
    while True:
        clear_screen()
        print("=" * 65)
        print("   SUB-MENU: MANAJEMEN REVISI, BASELINE & APPROVAL")
        print("=" * 65)
        
        # Display baseline if active
        active_baseline = next((b for b in history.baselines if b.active), None)
        if active_baseline:
            print(f" BASELINE AKTIF: Version {active_baseline.baseline_version} (Locked at: {active_baseline.locked_at})")
        else:
            print(" BASELINE AKTIF: Belum ada baseline aktif.")
            
        print("-" * 65)
        print(" 1. Tampilkan Daftar Revisi / Revisions History")
        print(" 2. Buat Working Revision Baru (DRAFT) dari Baseline")
        print(" 3. Edit / Update Data pada Revisi")
        print(" 4. Ajukan Revisi untuk Review (READY_FOR_REVIEW -> WAITING_FOR_REVIEW)")
        print(" 5. Berikan Review Approval (Reviewer Decision: APPROVED / REJECTED)")
        print(" 6. Bandingkan Dua Revisi (Change Comparison)")
        print(" 7. Lihat Log Trail Audit (System Audit Events)")
        print(" 8. Ekspor Design Requirements Baseline (Structured JSON)")
        print(" 0. Kembali ke Menu Utama")
        print("-" * 65)

        choice = input("\nPilih menu (0-8): ").strip()

        if choice == "1":
            print("\nDAFTAR REVISI PROYEK:")
            for r in history.revisions:
                print(f" - Rev. {r.revision_number} [ID: {r.revision_id[:8]}]")
                print(f"   Status  : {r.status.value}")
                print(f"   Pembuat : {r.created_by} pada {r.created_at}")
                if r.reason_for_change:
                    print(f"   Alasan  : {r.reason_for_change}")
                print("-" * 35)
            input("\nTekan Enter untuk kembali...")

        elif choice == "2":
            # Find parent rev
            options = {str(r.revision_number): r.revision_id for r in history.revisions}
            print("\nPilih revisi parent (nomor revisi):")
            for r in history.revisions:
                print(f"  {r.revision_number}. Status: {r.status.value} (ID: {r.revision_id[:8]})")
            
            p_num = input("Nomor revisi parent: ").strip()
            if p_num in options:
                parent_id = options[p_num]
                creator = prompt_str("Nama Pembuat Revisi Baru", default="designer@ship.com", required=True)
                reason = prompt_str("Alasan Perubahan (Reason for Change)", default="Optimasi target DWT lambung", required=True)
                try:
                    new_rev = Stage1RequirementService.create_new_revision(history, parent_id, creator, reason)
                    input(f"\n[+] Revisi baru Rev. {new_rev.revision_number} berhasil dibuat! Tekan Enter...")
                except Exception as e:
                    input(f"\n[!] Gagal membuat revisi: {e}. Tekan Enter...")
            else:
                input("\n[!] Nomor revisi tidak valid. Tekan Enter...")

        elif choice == "3":
            print("\nPilih revisi yang ingin diedit (hanya status DRAFT / VALIDATION_FAILED / REVISION_REQUIRED):")
            editable = [r for r in history.revisions if r.status in [RevisionStatus.DRAFT, RevisionStatus.VALIDATION_FAILED, RevisionStatus.REVISION_REQUIRED]]
            if not editable:
                input("\n[!] Tidak ada revisi yang dapat diedit saat ini. Buat revisi baru terlebih dahulu. Tekan Enter...")
                continue
                
            for r in editable:
                print(f"  Revisi {r.revision_number} (Status: {r.status.value}) [ID: {r.revision_id[:8]}]")
            
            r_num_str = input("Masukkan nomor revisi yang ingin diedit: ").strip()
            target_rev = next((r for r in editable if str(r.revision_number) == r_num_str), None)
            if target_rev:
                # Prompt edit fields
                print(f"\n--- Mengedit Data Revisi {target_rev.revision_number} ---")
                new_dwt = prompt_float("Update Target DWT (ton)", default=target_rev.data_snapshot.target_dwt_ton)
                new_speed = prompt_float("Update Kecepatan Dinas (knots)", default=target_rev.data_snapshot.service_speed_knots)
                new_density = prompt_float("Update Densitas Air (t/m³)", default=target_rev.data_snapshot.water_density_t_m3)
                actor = prompt_str("Nama Editor", default="designer@ship.com", required=True)
                reason = prompt_str("Alasan Modifikasi Field", default="Penyesuaian draft operasional pelabuhan", required=True)
                
                updates = {
                    "target_dwt_ton": new_dwt,
                    "service_speed_knots": new_speed,
                    "water_density_t_m3": new_density
                }
                
                try:
                    Stage1RequirementService.update_revision_data(history, target_rev.revision_id, updates, actor, reason)
                    input("\n[+] Data revisi berhasil diperbarui dan status divalidasi ulang! Tekan Enter...")
                except Exception as e:
                    input(f"\n[!] Gagal mengupdate data: {e}. Tekan Enter...")
            else:
                input("\n[!] Nomor revisi tidak valid atau tidak dapat diedit. Tekan Enter...")

        elif choice == "4":
            print("\nPilih revisi READY_FOR_REVIEW untuk diajukan:")
            submittable = [r for r in history.revisions if r.status == RevisionStatus.READY_FOR_REVIEW]
            if not submittable:
                input("\n[!] Tidak ada revisi berstatus READY_FOR_REVIEW. Pastikan data lengkap dan valid. Tekan Enter...")
                continue
                
            for r in submittable:
                print(f"  Revisi {r.revision_number} (ID: {r.revision_id[:8]})")
                
            r_num_str = input("Nomor revisi: ").strip()
            target_rev = next((r for r in submittable if str(r.revision_number) == r_num_str), None)
            if target_rev:
                actor = prompt_str("Nama Pengaju / Submitter", default="designer@ship.com", required=True)
                try:
                    Stage1RequirementService.submit_revision_for_review(history, target_rev.revision_id, actor)
                    input("\n[+] Revisi berhasil diajukan untuk review! Status WAITING_FOR_REVIEW. Tekan Enter...")
                except Exception as e:
                    input(f"\n[!] Gagal mengajukan revisi: {e}. Tekan Enter...")
            else:
                input("\n[!] Pilihan tidak valid. Tekan Enter...")

        elif choice == "5":
            print("\nPilih revisi WAITING_FOR_REVIEW yang ingin di-review:")
            reviewable = [r for r in history.revisions if r.status == RevisionStatus.WAITING_FOR_REVIEW]
            if not reviewable:
                input("\n[!] Tidak ada revisi yang menunggu review saat ini. Tekan Enter...")
                continue
                
            for r in reviewable:
                print(f"  Revisi {r.revision_number} (Diajukan oleh: {r.submitted_by} pada {r.submitted_at}) [ID: {r.revision_id[:8]}]")
                
            r_num_str = input("Masukkan nomor revisi untuk di-review: ").strip()
            target_rev = next((r for r in reviewable if str(r.revision_number) == r_num_str), None)
            if target_rev:
                reviewer = prompt_str("Nama Reviewer", default="lead@ship.com", required=True)
                decision_choice = prompt_str("Keputusan (1: APPROVED, 2: REJECTED)", default="1", required=True)
                decision = "APPROVED" if decision_choice == "1" else "REJECTED"
                note = prompt_str("Catatan Review / Approval Note", default="Memenuhi kriteria payload operasional", required=True)
                
                try:
                    Stage1RequirementService.review_revision(history, target_rev.revision_id, reviewer, decision, note)
                    input(f"\n[+] Review berhasil diproses! Hasil: {decision}. Tekan Enter...")
                except Exception as e:
                    input(f"\n[!] Gagal memproses review: {e}. Tekan Enter...")
            else:
                input("\n[!] Pilihan tidak valid. Tekan Enter...")

        elif choice == "6":
            print("\nDAFTAR REVISI UNTUK DIBANDINGKAN:")
            for r in history.revisions:
                print(f"  Rev {r.revision_number} (Status: {r.status.value}) [ID: {r.revision_id[:8]}]")
                
            rev_old_str = input("Pilih nomor revisi lama: ").strip()
            rev_new_str = input("Pilih nomor revisi baru: ").strip()
            
            old_rev = next((r for r in history.revisions if str(r.revision_number) == rev_old_str), None)
            new_rev = next((r for r in history.revisions if str(r.revision_number) == rev_new_str), None)
            
            if old_rev and new_rev:
                try:
                    changes = Stage1RequirementService.compare_revisions(history, old_rev.revision_id, new_rev.revision_id)
                    print(f"\nPERBEDAAN HASH DATA (Revisi {rev_old_str} -> {rev_new_str}):")
                    if not changes:
                        print("  [+] Tidak ada perbedaan parameter desain.")
                    else:
                        for c in changes:
                            print(f" - Field      : {c.field_path}")
                            print(f"   Old Value  : {c.old_value}")
                            print(f"   New Value  : {c.new_value}")
                            print(f"   Aktor      : {c.changed_by}")
                            print(f"   Alasan     : {c.reason or '-'}")
                            print("-" * 35)
                    input("\nTekan Enter...")
                except Exception as e:
                    input(f"\n[!] Gagal membandingkan: {e}. Tekan Enter...")
            else:
                input("\n[!] Salah satu nomor revisi tidak ditemukan. Tekan Enter...")

        elif choice == "7":
            print("\nLOG AUDIT TRAIL:")
            if not history.audit_trail:
                print("  Belum ada log audit trail.")
            else:
                for a in history.audit_trail:
                    print(f" [{a.timestamp}] Event: {a.action}")
                    print(f"   Actor   : {a.actor}")
                    if a.old_value or a.new_value:
                        print(f"   Detail  : {a.old_value} -> {a.new_value}")
                    if a.reason:
                        print(f"   Reason  : {a.reason}")
                    print("-" * 45)
            input("\nTekan Enter...")

        elif choice == "8":
            if not history.baselines:
                input("\n[!] Belum ada baseline yang disetujui. Tekan Enter...")
                continue
                
            print("\nPilih versi baseline untuk diekspor:")
            for b in history.baselines:
                print(f"  Version: {b.baseline_version} (Active: {b.active})")
                
            b_ver = input("Masukkan versi baseline (e.g. v1.0): ").strip()
            try:
                json_data = Stage1RequirementService.export_baseline(history, b_ver)
                filename = f"design_requirements_baseline_{b_ver.replace('.', '_')}.json"
                with open(filename, "w", encoding="utf-8") as f:
                    f.write(json_data)
                input(f"\n[+] Berkas baseline berhasil diekspor ke '{filename}'! Tekan Enter...")
            except Exception as e:
                input(f"\n[!] Gagal ekspor baseline: {e}. Tekan Enter...")

        elif choice == "0":
            break


def main():
    current_history: Optional[ProjectHistory] = None

    while True:
        clear_screen()
        print_header()

        # Display latest revision summary if available
        if current_history and current_history.revisions:
            latest_rev = current_history.revisions[-1]
            display_project_summary(latest_rev.data_snapshot, latest_rev.status)

        print("\nMENU UTAMA:")
        print(" 1. Input Data Proyek Baru secara Interaktif")
        print(" 2. Muat Data Fixture Contoh (data/fixtures/sample_project_data.json)")
        print(" 3. Muat Data Proyek / History dari File JSON")
        if current_history:
            print(" 4. Simpan Seluruh Riwayat Proyek Aktif ke JSON")
            print(" 5. Buka Menu Manajemen Revisi & Approval Workflow")
        print(" 0. Keluar")

        choice = input("\nPilih menu (0-5): ").strip()

        if choice == "1":
            project = interactive_input()
            creator = prompt_str("Nama Pembuat Data", default="designer@ship.com", required=True)
            current_history = Stage1RequirementService.create_initial_history(project, creator)
            input("\n[+] Data berhasil dibuat dan inisialisasi history selesai! Tekan Enter untuk melanjutkan...")

        elif choice == "2":
            fixture_path = os.path.join("data", "fixtures", "sample_project_data.json")
            if os.path.exists(fixture_path):
                try:
                    with open(fixture_path, "r", encoding="utf-8") as f:
                        current_history = project_history_from_json(f.read())
                    input("\n[+] Data fixture contoh berhasil dimuat dan di-upgrade ke history! Tekan Enter...")
                except Exception as e:
                    input(f"\n[!] Gagal memuat fixture: {e}. Tekan Enter...")
            else:
                input(f"\n[!] Berkas fixture '{fixture_path}' tidak ditemukan. Tekan Enter...")

        elif choice == "3":
            filepath = input("\nMasukkan path file JSON: ").strip()
            if os.path.exists(filepath):
                try:
                    with open(filepath, "r", encoding="utf-8") as f:
                        current_history = project_history_from_json(f.read())
                    input("\n[+] Riwayat proyek berhasil dimuat! Tekan Enter...")
                except Exception as e:
                    input(f"\n[!] Gagal memuat JSON: {e}. Tekan Enter...")
            else:
                input("\n[!] File tidak ditemukan. Tekan Enter...")

        elif choice == "4" and current_history:
            out_file = input("\nMasukkan nama file output (contoh: project_history.json): ").strip()
            if not out_file:
                out_file = "project_history.json"
            try:
                json_str = project_history_to_json(current_history)
                with open(out_file, "w", encoding="utf-8") as f:
                    f.write(json_str)
                input(f"\n[+] Riwayat proyek berhasil disimpan ke '{out_file}'! Tekan Enter...")
            except Exception as e:
                input(f"\n[!] Gagal menyimpan file: {e}. Tekan Enter...")

        elif choice == "5" and current_history:
            manage_revisions_menu(current_history)

        elif choice == "0":
            print("\nTerima kasih telah menggunakan Platform Rancang Bangun Kapal AI.")
            break


if __name__ == "__main__":
    main()
