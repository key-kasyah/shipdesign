# Architecture Decisions

Dokumen ini menggunakan format ringkas Architecture Decision Record (ADR).

---

## ADR-001 — Pengembangan Berbasis Tahap dan Stage Lock

**Status:** Accepted  
**Tanggal:** 2026-07-22

### Konteks

Platform mencakup tujuh tahap besar. Implementasi sekaligus berisiko menghasilkan sistem yang tidak konsisten dan sulit diuji.

### Keputusan

Pengembangan dilakukan per tahap, sprint, dan tugas. Hanya tahap aktif dalam `CURRENT_STAGE.md` yang boleh diimplementasikan.

### Konsekuensi

- scope lebih terkendali;
- review lebih mudah;
- fitur tahap berikutnya tertunda sampai stage gate disetujui;
- governance docs wajib dipelihara.

---

## ADR-002 — Calculation Engine Terpisah dari AI

**Status:** Accepted  
**Tanggal:** 2026-07-22

### Konteks

Perhitungan kapal harus dapat direproduksi dan diuji.

### Keputusan

AI tidak melakukan perhitungan teknik utama. Calculation engine deterministik menghasilkan angka; AI menjelaskan input, hasil, asumsi, dan dampaknya.

### Konsekuensi

- hasil dapat diuji;
- AI tidak boleh menjadi sumber angka;
- setiap what-if harus memanggil calculation engine;
- prompt AI menerima hasil terstruktur.

---

## ADR-003 — Satu Sumber Data Proyek

**Status:** Accepted  
**Tanggal:** 2026-07-22

### Konteks

Data yang sama digunakan lintas modul dan tahap.

### Keputusan

Semua data proyek disimpan melalui satu domain model proyek dengan namespace per tahap.

### Struktur konseptual

```text
Project
├── Requirements
├── PreliminaryDesign
├── BasicDesign
├── DetailDesign
├── ProductionDesign
├── Construction
└── TestingDelivery
```

### Konsekuensi

- sinkronisasi lebih mudah;
- perubahan harus melewati revision manager;
- model tidak boleh menjadi dictionary bebas tanpa schema.

---

## ADR-004 — Sistem Satuan Internal Konsisten

**Status:** Accepted  
**Tanggal:** 2026-07-22

### Keputusan

- panjang: m;
- luas: m²;
- volume: m³;
- massa: ton metrik;
- density: t/m³;
- kecepatan: knot;
- daya: kW sebagai internal utama;
- jarak: nautical mile;
- waktu: jam.

Konversi dilakukan pada boundary input/output.

### Konsekuensi

Semua field dan function harus menyatakan satuan.

---

## ADR-005 — Baseline Tidak Diubah Langsung

**Status:** Accepted  
**Tanggal:** 2026-07-22

### Konteks

Perubahan satu parameter dapat memengaruhi banyak hasil.

### Keputusan

Baseline yang disetujui bersifat immutable. Perubahan menghasilkan working revision baru.

### Konsekuensi

- revision history wajib;
- perbandingan versi dapat dilakukan;
- recalculation tidak langsung mengganti baseline.

---

## ADR-006 — Dependency Graph dan Stale Propagation

**Status:** Accepted  
**Tanggal:** 2026-07-22

### Keputusan

Relasi antarparameter disimpan dalam dependency graph. Perubahan parameter menandai hasil turunannya sebagai `STALE`.

### Konsekuensi

- pengguna mengetahui dampak perubahan;
- AI hanya menjelaskan graph yang terdaftar;
- setiap relasi penting membutuhkan test.

---

## ADR-007 — Gradio untuk Prototipe, Arsitektur Tidak Terikat Gradio

**Status:** Accepted  
**Tanggal:** 2026-07-22

### Konteks

Source awal menggunakan Gradio, Pandas, NumPy, Plotly, dan Matplotlib.

### Keputusan

Gradio digunakan untuk prototipe UI. Domain model, calculation engine, validation, persistence, dan AI service tidak boleh bergantung langsung pada komponen Gradio.

### Konsekuensi

UI dapat diganti tanpa menulis ulang calculation engine.

---

## ADR-008 — Persistence Bertahap

**Status:** Accepted  
**Tanggal:** 2026-07-22

### Keputusan

- prototipe: in-memory state dan ekspor JSON;
- MVP: database lokal/relasional;
- multi-user: database server dan object storage.

### Konsekuensi

Data model harus dapat diserialisasi sejak Tahap 1.

---

## ADR-009 — AI Menggunakan Knowledge Base Terkurasi

**Status:** Accepted  
**Tanggal:** 2026-07-22

### Keputusan

Penjelasan parameter, formula, metode, dan regulasi berasal dari knowledge base terkurasi dan metadata calculation engine.

### Konsekuensi

- AI wajib menyebut sumber atau status asumsi;
- informasi regulasi harus diverifikasi;
- AI tidak boleh menjawab hanya berdasarkan model memory untuk keputusan teknis.

---

## ADR-010 — Validasi Bertingkat

**Status:** Accepted  
**Tanggal:** 2026-07-22

### Keputusan

Validasi dibagi menjadi:

1. type validation;
2. unit validation;
3. required-field validation;
4. range validation;
5. cross-field validation;
6. method applicability;
7. empirical guidance;
8. statutory/class validation.

### Konsekuensi

Warning empiris tidak otomatis diperlakukan sebagai kegagalan regulasi.

---

## ADR-011 — Status Tahap Eksplisit

**Status:** Accepted  
**Tanggal:** 2026-07-22

### Keputusan

Status standar:

- `LOCKED`;
- `PLANNED`;
- `ACTIVE`;
- `WAITING_FOR_REVIEW`;
- `REVISION_REQUIRED`;
- `APPROVED`;
- `DEPRECATED`.

### Konsekuensi

AI dan aplikasi tidak boleh membuka tahap berdasarkan asumsi.

---

## ADR-012 — Audit Trail untuk Perubahan Penting

**Status:** Accepted  
**Tanggal:** 2026-07-22

### Keputusan

Setiap perubahan baseline atau parameter penting mencatat:

- pengguna;
- timestamp;
- nilai lama;
- nilai baru;
- alasan;
- revision ID;
- hasil terdampak;
- status approval.

---

## ADR-013 — Struktur Domain Model Project Data Tahap 1

**Status:** Accepted  
**Tanggal:** 2026-07-22

### Konteks

Tahap 1 membutuhkan penyimpan data kebutuhan proyek (`ProjectData`) yang terisolasi dari UI framework dan database spesifik, serta siap untuk mendukung serialisasi JSON dan validasi bertingkat.

### Keputusan

1. `ProjectData` dimodelkan sebagai Python dataclass terpisah di `src/domain/stage1_requirements/models.py`.
2. Serialisasi JSON dan konversi dictionary dipisahkan di `src/domain/stage1_requirements/schemas.py`.
3. Validasi tipe, rentang nilai non-negatif, dan konsistensi antar-field dipisahkan di `src/domain/stage1_requirements/validators.py`.
4. Operasi pembuatan, pembaharuan, dan pemrosesan revisi dikelola oleh `Stage1RequirementService` di `src/services/stage1_service.py`.

### Konsekuensi

- Domain model terisolasi dan mudah diuji secara independen.
- Tidak ada dependensi langsung ke framework UI (Gradio) maupun ORM/database.
- Kompatibel dengan perancangan data contract untuk Tahap 2 di masa depan.

## ADR-014 — Manajemen Baseline, Riwayat Revisi, dan Batasan Keamanan AI Tahap 1

**Status:** Accepted  
**Tanggal:** 2026-07-22

### Konteks

Tahap 1 membutuhkan mekanisme audit trail, pelacakan perubahan antar-revisi, baseline data yang terkunci secara immutable, serta asisten cerdas AI. Ada kebutuhan untuk memastikan AI tidak melanggar batasan Tahap 2–7 (seperti kalkulasi ukuran utama kapal, koefisien bentuk, dll.) dan baseline yang disetujui tidak dapat dimanipulasi secara tidak sengaja.

### Keputusan

1. **Model Riwayat (ProjectHistory)**: Membungkus daftar revisi, baseline, audit trail, dan catatan persetujuan secara eksplisit.
2. **Immutability Baseline**: Revisi dengan status `APPROVED`, `SUPERSEDED`, atau `ARCHIVED` dikunci. Segala modifikasi langsung pada snapshot revisi yang terkunci akan menghasilkan error. Untuk mengubah data, wajib membuat revisi cabang baru berstatus `DRAFT`.
3. **AI Safety Gate**: Layanan AI asisten disaring secara ketat melalui metode `safety_check` untuk menolak kata kunci atau pola yang menanyakan parameter kalkulasi kapal Tahap 2-7.
4. **Skema Versi & Backup**: Penyimpanan menggunakan serialisasi JSON atomic yang menyertakan `schema_version`. Pembaruan file lama otomatis memicu backup berkas berekstensi `.bak`.

### Konsekuensi

- Sistem pelacakan dan workflow persetujuan audit-compliant 100%.
- AI tidak dapat disalahgunakan untuk melangkahi batasan tahap aktif.
- Pemuatan data lama tetap terjaga secara backward-compatible.

---

## Template ADR Baru

```markdown
## ADR-XXX — Judul

**Status:** Proposed | Accepted | Superseded | Rejected
**Tanggal:** YYYY-MM-DD

### Konteks

### Pilihan yang Dipertimbangkan

### Keputusan

### Konsekuensi

### Dampak Migrasi
```


