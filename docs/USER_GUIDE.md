# User Guide - Tahap 1: Kebutuhan Kapal

Panduan ini menjelaskan cara mengoperasikan Platform Rancang Bangun Kapal terintegrasi AI untuk **Tahap 1 — Kebutuhan Kapal / Design Requirements**.

## 1. Antarmuka CLI Interaktif
Untuk menjalankan alat bantu terminal interaktif:
```bash
python cli.py
```
Menu Utama CLI:
1. **Input Data Proyek Baru**: Memandu Anda memasukkan parameter kapal secara terstruktur.
2. **Muat Data Fixture Contoh**: Mengambil data default dari `data/fixtures/sample_project_data.json` dan menginisialisasi riwayat proyek.
3. **Muat Data Proyek dari File JSON**: Membuka data proyek atau file history kustom.
4. **Simpan Riwayat Proyek**: Menyimpan status history proyek ke format JSON terpadu.
5. **Sub-Menu Manajemen Revisi & Approval Workflow**:
   - Menampilkan riwayat revisi.
   - Membuat revisi DRAFT baru dari baseline.
   - Mengedit parameter kargo revisi aktif (otomatis re-validasi).
   - Mengajukan review (DRAFT -> READY -> WAITING).
   - Memproses Review (Approve -> baseline / Reject).
   - Membandingkan perbedaan antar revisi (*change comparison*).
   - Menampilkan log sistem (*audit trail*).
   - Mengekspor baseline terstruktur.

## 2. Antarmuka UI Gradio (Prototype)
Untuk menjalankan prototipe web Gradio secara lokal:
```bash
python app.py
```
Akses UI melalui peramban web di alamat: `http://127.0.0.1:7860/`

Grup Tab UI:
- **Manajemen Proyek & Input**: Form pengisian parameter kapal lengkap beserta pendaftaran aktor editor dan alasan perubahan data.
- **Workflow & Approval Baseline**: Panel tombol alur kerja pengajuan review, approval reviewer, pembuatan cabang revisi baru, serta visualisasi isu validasi langsung.
- **Perbandingan & Log Audit**: Form perbandingan dua revisi secara komparatif serta daftar tabel log audit trail aktivitas.

## 3. AI Requirements Assistant (Sprint 1.6)
AI Assistant Tahap 1 terintegrasi dalam sistem untuk membantu menjelaskan:
- Arti dan pentingnya parameter kargo (DWT, kecepatan dinas, endurance, densitas).
- Isu validasi (error & warning) beserta langkah perbaikan yang disarankan.
- Dampak perubahan parameter kebutuhan terhadap fase pra-rancangan.

*Catatan Keselamatan AI*: AI dilarang keras melakukan estimasi dimensi kapal (LOA/B/H/T), koefisien bentuk lambung (Cb, Cm, Cp), displacement, stabilitas, trim, atau daya mesin untuk mematuhi pembatasan **LOCKED** Tahap 2–7.

## 4. Ekspor Handoff Kontrak untuk Tahap 2
Setelah revisi disetujui, Anda dapat mengekspor payload handoff resmi:
- Namespace payload: `handoff.stage2_requirements`
- Payload ini berisi parameter kargo final yang terverifikasi, catatan persetujuan reviewer, status validitas lengkap, dan metadata audit trail.
- File handoff ini dapat dibaca oleh modul Tahap 2 di masa mendatang sebagai parameter gate input mutlak.
