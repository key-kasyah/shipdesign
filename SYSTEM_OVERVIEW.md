# SHIP DESIGN PLATFORM — SYSTEM ARCHITECTURE & WORKFLOW GUIDE
> **Panduan Arsitektur Sistem, Komponen, dan Alur Kerja Terpadu**  
> *Dokumen ini dirancang sebagai Single Source of Truth (SSOT) agar AI Assistant dan pengembang dapat memahami seluruh cara kerja sistem secara mendalam tanpa perlu membaca ulang seluruh berkas kode sumber.*

---

## 1. RINGKASAN EKSEKUTIF & FILOSOFI SISTEM

**Ship Design Platform** adalah platform perancangan kapal end-to-end terintegrasi AI, yang mendampingi seluruh siklus hidup perancangan dan konstruksi kapal mulai dari analisis kebutuhan dasar, pra-rancangan teknis, pemodelan lines plan, hingga konstruksi dan serah terima kapal.

### Prinsip Utama Sistem (Core Architecture Principles)
1. **Pemisahan Perhitungan dan AI (Calculation Engine Separation - ADR-002):**
   - AI **TIDAK PERNAH** melakukan kalkulasi teknis kapal secara mandiri atau mengarang angka.
   - Semua angka dihitung secara deterministik oleh *Calculation Engine* (Python/TypeScript).
   - Peran AI (*AI Design Companion*) adalah menganalisis konteks, menjelaskan regulasi/teori maritim, mendeteksi potensi anomali, dan memberikan rekomendasi teknis.
2. **Kekekalan Baseline & Manajemen Revisi (Immutable Baseline - ADR-005 & ADR-014):**
   - Data desain yang berstatus `APPROVED` dikunci (*immutable*).
   - Segala perubahan data wajib melalui pencabangan revisi baru berstatus `DRAFT`.
   - Setiap modifikasi dicatat secara detail dalam *Audit Trail* (actor, timestamp, reason, diff).
3. **Satu Sumber Kebenaran Data (Single Source of Truth - ADR-003):**
   - Format data menggunakan JSON atomic storage yang terstruktur per tahap (`PRJ-XXXX.json`, `PRJ-XXXX_stage2.json`, `PRJ-XXXX_stage3.json`).
4. **Sistem Satuan Standar Internasional (ADR-004):**
   - Panjang/Tinggi: Meter ($m$)
   - Berat/Massa: Ton Metrik ($ton$)
   - Kecepatan: Knot ($knots$)
   - Densitas: Ton per meter kubik ($t/m^3$) — Air Laut: 1.025, Air Tawar: 1.000
   - Daya: Kilowatt ($kW$)
   - Jarak Rute: Nautical Miles ($NM$)

---

## 2. TECH STACK & ARSITEKTUR RUNTIME

```
+------------------------------------------------------------------------------------+
|                                FRONTEND LAYER                                      |
|  Next.js 14+ (App Router) + TypeScript + TailwindCSS + Lucide Icons                |
|  - Canvas 2D / SVG Interactive Design Studios (NURBS Profile, Waterplane, Lines)   |
|  - Client-side Fairing & AutoCAD Script (.SCR / .LSP) Exporter                    |
+------------------------------------------+-----------------------------------------+
                                           | HTTP REST API (JSON)
                                           v
+------------------------------------------------------------------------------------+
|                                 BACKEND LAYER                                      |
|  FastAPI (Python 3.10+)                                                           |
|  - Validation Engine (Multitier Checks)                                            |
|  - Naval Architecture Calculators (Displacement, Metacenter, NSP EHP, Simpson)    |
|  - Revision & Baseline Manager                                                     |
|  - Readiness & Stage Gate Assessment                                               |
|  - AI Assistant Service (OpenRouter Multi-LLM Cascade + Curated Naval Local KB)     |
+--------------------+-------------------------------------+-------------------------+
                     |                                     |
                     v                                     v
+------------------------------------+   +-------------------------------------------+
|          DATABASE & STORAGE        |   |             EXTERNAL AI API               |
| - SQLite: indonesia_ports_template |   | - OpenRouter (Gemini, DeepSeek, GPT-4o)   |
| - Atomic JSON Files: data/projects |   | - Anti-Jailbreak & Domain Safety Gate     |
+------------------------------------+   +-------------------------------------------+
```

### Rincian Teknologi:
- **Backend**: FastAPI (`server.py`), Pydantic & Python dataclasses.
- **Port Database**: SQLite (`data/indonesia_ports_template.db`) menyimpan data pelabuhan Indonesia (koordinat, draft maksimum, tipe).
- **Proyek Penyimpanan**: Berkas JSON atomik di folder `data/projects/` dengan mekanisme backup `.bak` otomatis.
- **Frontend**: Next.js 14+ (App Router) di folder `frontend/`, Axios/Fetch wrapper (`frontend/src/services/api.ts`).
- **Antarmuka Alternatif**: Interactive CLI (`cli.py`) dan Gradio Prototype (`app.py`).
- **CAD Interoperability**: Direct generation file `.SCR` (AutoCAD Script) & `.LSP` (AutoLISP) untuk Lines Plan.

---

## 3. SIKLUS HIDUP DESAIN 7 TAHAP (LIFECYCLE ROADMAP)

Berdasarkan `docs/00_MASTER_PRD.md`, platform mencakup 7 tahapan rancang bangun kapal:

| Tahap | Nama Tahap | Deskripsi & Ruang Lingkup | Status Implementasi |
|:---:|:---|:---|:---:|
| **1** | **Kebutuhan Kapal** *(Requirements)* | Identifikasi misi, rute pelayaran, target DWT, kecepatan, pelabuhan singgah, regulasi klasifikasi, pembentukan Requirements Baseline v0.1. | **APPROVED & FULLY IMPLEMENTED** |
| **2** | **Pra-Rancangan** *(Preliminary Design)* | Pemilihan kapal pembanding, scaling dimensi (LBP, B, H, T), estimasi Cb/Cm/Cw, perhitungan hidrostatik (KB, BM, KM, GM), estimasi berat LWT/DWT, kapasitas tangki, daya mesin (NSP/EHP), kurva CSA, DWL, dan Gading 10. | **APPROVED & FULLY IMPLEMENTED** |
| **3** | **Basic Design & Lines Plan** | NURBS Stem/Stern/Sheer Profile Editor, perhitungan Waterplane (Metode Simpson), Midship Section & Bilge Radius, Harmonizer garis air, Lines Plan 3-View (Body Plan, Half-Breadth, Sheer), dan ekspor AutoCAD. | **IMPLEMENTED (Frontend & Backend)** |
| **4** | **Detail Design & Approval** | Konstruksi gading, sekat kedap air, bukaan geladak, approval gambar kelas (BKI/IACS). | *PLANNED (LOCKED)* |
| **5** | **Production Design** | Nesting pelat, bill of materials (BOM), work packages bengkel perakitan. | *PLANNED (LOCKED)* |
| **6** | **Konstruksi Kapal** | Erection blok lambung, inspeksi QC/NDT, tracking kemajuan galangan. | *PLANNED (LOCKED)* |
| **7** | **Pengujian & Penyerahan** | Inclining test, sea trial, sertifikasi statutory, delivery acceptance protocol. | *PLANNED (LOCKED)* |

---

## 4. STRUKTUR DIREKTORI & PEMETAAN KODE

```
shipdesign/
├── data/
│   ├── indonesia_ports_template.db      # SQLite master data pelabuhan Indonesia (draft, koordinat)
│   ├── project_index.json               # Index cepat proyek untuk listing di UI/API
│   └── projects/                        # Penyimpanan data proyek berbasis JSON
│       ├── PRJ-XXXX.json                # Snapshot & History Tahap 1
│       ├── PRJ-XXXX_stage2.json         # Snapshot & History Tahap 2 (Skenario Desain)
│       └── PRJ-XXXX_stage3.json         # Snapshot Tahap 3 (Data NURBS, Waterlines, Offsets)
├── docs/                                # Dokumentasi PRD, ADR, Governance
│   ├── 00_MASTER_PRD.md                 # PRD Induk Platform
│   ├── ARCHITECTURE_DECISIONS.md        # Catatan ADR 001 - 014
│   ├── CURRENT_STAGE.md                 # Status aktif pengerjaan
│   └── SYSTEM_DEPENDENCIES.md           # Graph dependensi antarparameter
├── frontend/                            # Next.js 14 Frontend Application
│   └── src/
│       ├── app/
│       │   ├── page.tsx                 # Dashboard & Summary Utama
│       │   └── projects/
│       │       ├── page.tsx             # Manajemen & Filter Proyek
│       │       ├── new/page.tsx         # Wizard Pembuatan Proyek Baru
│       │       ├── import/page.tsx      # Upload & Import JSON Proyek
│       │       └── [projectId]/
│       │           ├── page.tsx         # Workspace Tahap 1 (Kebutuhan Kapal & Rute)
│       │           ├── stage2/page.tsx  # Workspace Tahap 2 (Pra-Rancangan & Kalkulasi)
│       │           └── stage3/page.tsx  # Studio Tahap 3 (Lines Plan & Profil CAD)
│       ├── components/
│       │   ├── design/
│       │   │   ├── SideProfileNurbsEditor.tsx     # Canvas visual spline haluan, buritan & sheer
│       │   │   ├── WaterPlaneCalculationSheet.tsx # Lembar integrasi Simpson & kurva garis air
│       │   │   ├── MidshipBilgeCalculationSheet.tsx # Lembar Midship Section & radius bilga
│       │   │   ├── UnifiedWaterplaneBilgeHarmonizer.tsx # Sinkronisasi waterplane & bilga
│       │   │   ├── LinesPlanThreeView.tsx         # 3-View Lines Plan CAD Viewer
│       │   │   ├── CsaToBodyPlanProjection.tsx    # Proyeksi CSA ke gading kapal
│       │   │   └── DesignConstraintsSummary.tsx   # Header ringkasan constraint desain
│       │   └── layout/
│       │       └── DashboardLayout.tsx            # Sidebar, Navigasi Tahap, Tema
│       ├── services/
│       │   └── api.ts                             # Client API Axios ke backend FastAPI
│       ├── types/
│       │   └── index.ts                           # Interface TypeScript untuk seluruh domain
│       └── utils/
│           └── fairingEngine.ts                   # Utilitas interpolasi offset & exporter AutoCAD
├── src/                                 # Backend Python Modules
│   ├── core/
│   │   ├── enums.py                     # Definisi Enum (VesselType, RevisionStatus, dsb)
│   │   └── units.py                     # Standarisasi konversi satuan
│   ├── domain/
│   │   ├── stage1_requirements/
│   │   │   ├── models.py                # Dataclass ProjectData, ProjectHistory, Baseline
│   │   │   ├── schemas.py               # Serialisasi & deserialisasi JSON Stage 1
│   │   │   └── validators.py            # Multitier Validation Engine Stage 1
│   │   ├── stage2_preliminary/
│   │   │   ├── models.py                # Dataclass DesignScenario, WeightItem, GeometryData
│   │   │   ├── schemas.py               # Serialisasi JSON Stage 2
│   │   │   ├── calculators.py           # Mesin matematika hidrostatik & hambatan
│   │   │   └── validators.py            # Validasi rasio teknis & kestabilan Stage 2
│   │   └── stage3_lines_plan/
│   │       └── fairing_engine.py        # Algoritma half-breadth generator & AutoCAD SCR
│   └── services/
│       ├── stage1_service.py            # Service logika bisnis Tahap 1
│       ├── stage2_service.py            # Service logika bisnis Tahap 2 & Skenario
│       ├── ai_service.py                # AIAssistantService (Safety, LLM, Local KB)
│       └── readiness_service.py         # Readiness & Handover Gate Checker
├── app.py                               # UI Prototype Gradio (Legacy/Alternative)
├── cli.py                               # Terminal Interactive CLI Wizard
├── server.py                            # FastAPI Main Application Backend Server
└── SYSTEM_OVERVIEW.md                   # Dokumen ini (AI System Reference Guide)
```

---

## 5. FLOW BISNIS & ALUR DATA END-TO-END

### FLOW 1: TAHAP 1 — KEBUTUHAN KAPAL (REQUIREMENTS STAGE)

```
[User Input / UI Form] 
       │
       ▼
[POST /api/projects] ──────────► Buat ProjectData & ProjectHistory (Rev. 0 DRAFT)
       │
       ├─► [Pilih Pelabuhan Rute] ──► [POST /api/ports/calculate-route]
       │                                 └─► Query DB Pelabuhan -> Hitung Haversine NM
       │
       ├─► [Update Data / PUT] ───► [Multitier Validation Engine]
       │                                 ├─► Tipe & Required Fields Check
       │                                 ├─► Range & Cross-Field Check (Draft vs Kedalaman Pelabuhan)
       │                                 └─► Output: INFO, WARNING, ERROR, BLOCKING
       │
       ├─► [Readiness Check] ─────► [ReadinessService]
       │                                 ├─► Completeness Score (0-100%)
       │                                 └─► Risk & Assumption Matrix
       │
       ├─► [Submit for Review] ───► Status: WAITING_FOR_REVIEW
       │
       └─► [Persetujuan Lead] ────► Status: APPROVED -> Terbentuk IMMUTABLE BASELINE v0.1
```

1. **Pembuatan Proyek**: Pengguna membuat proyek baru dengan memasukkan nama, pemilik, tipe kapal (`VesselType`), target DWT, kecepatan dinas, jenis perairan (`SEAWATER` / `FRESHWATER`).
2. **Kalkulasi Rute Pelayaran**: Pengguna memilih urutan pelabuhan di Indonesia. Sistem menghitung jarak *leg-by-leg* dan total nautical miles menggunakan formula Haversine via SQLite.
3. **Validasi Bertingkat (Multitier Validation)**:
   - *Level 1*: Format data, field wajib, dan batas numerik non-negatif.
   - *Level 2*: Rasio kecepatan Froude Number dasar dan kecukupan hari jelajah (*endurance*).
   - *Level 3*: Validasi kompatibilitas sarat (*draft*) terhadap kedalaman draft maksimum pelabuhan singgah.
4. **Readiness & Handoff**: `ReadinessService` memverifikasi kesiapan proyek menuju Tahap 2. Jika seluruh data valid dan disetujui, dihasilkan `ProjectBaseline` terkunci.

---

### FLOW 2: TAHAP 2 — PRA-RANCANGAN (PRELIMINARY DESIGN)

```
[Requirement Baseline Tahap 1]
       │
       ▼
[Pilih Kapal Pembanding (Comparable Ship)] 
       │
       ▼
[Kalkulator Scaling Dimensi] ──► Menghitung LBP, Breadth, Depth, Draft, Cb
       │
       ▼
[Automated Hydrostatic & Power Engine]
       ├─► Displacement (m3 & Ton)
       ├─► Koefisien Bentuk: Cm, Cw, Cp = Cb / Cm
       ├─► Hidrostatik Awal: KB, BM, KM
       ├─► Berat & Titik Berat: KG, LCG, Berat Baja Lambung, Mesin, Outfit, Muatan
       ├─► Stabilitas Awal: GM = KM - KG (Wajib GM >= 0.15 m)
       ├─► Validasi Berat vs Displacement (Mismatch <= 5%)
       ├─► Estimasi Hambatan & Daya Mesin: Metode NSP (EHP & BHP kW)
       └─► Kurva Geometri Awal: CSA, DWL, Gading 10
       │
       ▼
[Skenario Iteratif (What-If Analysis)] ──► Simpan Revisi Skenario
       │
       ▼
[Submit & Approval Gate] ───────────────► Terbentuk PRELIMINARY BASELINE v0.1
```

#### Formula Utama Tahap 2 (`src/domain/stage2_preliminary/calculators.py`):
1. **Faktor Skala Dimensi ($\lambda$):**
   $$\lambda = \left( \frac{\text{Target DWT}}{\text{DWT}_{\text{pembanding}}} \right)^{1/3}$$
   $$LBP = LBP_{\text{comp}} \times \lambda, \quad B = B_{\text{comp}} \times \lambda, \quad T = T_{\text{comp}} \times \lambda, \quad H = H_{\text{comp}} \times \lambda$$
2. **Displacement Kapal:**
   $$\nabla = LBP \times B \times T \times C_b \quad (m^3)$$
   $$\Delta = \nabla \times \rho \quad (ton)$$
3. **Froude Number ($Fn$):**
   $$Fn = \frac{V}{\sqrt{g \cdot L_{wl}}} \quad \text{di mana } V \text{ dalam } m/s \text{ (1 knot} = 0.514444\text{ m/s)}$$
4. **Pusat Apung Vertikal (KB) — Formula Morrish/Posdunine:**
   $$KB = T \times \left( 1 - \frac{C_b}{C_b + C_w} \right)$$
5. **Radius Metasentrik Transversal (BM):**
   $$BM = \frac{C_w^2 \cdot B^2}{12 \cdot C_b \cdot T}$$
   $$KM = KB + BM$$
6. **Tinggi Metasentrik Awal (GM):**
   $$GM = KM - KG \quad (\text{Standar IMO: } GM \ge 0.15\text{ m})$$
7. **Daya Efektif Lambung (EHP) — Pendekatan NSP:**
   $$EHP = \frac{\Delta^{2/3} \times V_{\text{knots}}^3}{C_{NSP}}$$
   $$BHP = \frac{EHP}{\eta_p} \times (1 + \text{Sea Margin})$$

---

### FLOW 3: TAHAP 3 — BASIC DESIGN & LINES PLAN STUDIO

```
[Preliminary Baseline Tahap 2]
       │
       ▼
[Tab 1: Side Profile NURBS Editor]
       ├─► Edit Spline Linggi Haluan (Stem Profile) & Forecastle Flare
       ├─► Edit Spline Transom & Bossing Buritan (Stern Profile)
       ├─► Edit Kurva Sheer (Kelengkungan Geladak Utama)
       └─► Output: LOA Eksak, Fore Overhang, Aft Overhang
       │
       ▼
[Tab 2: WaterPlane Calculation Sheet]
       ├─► Integrasi Simpson Aturan 1 & 2 untuk Multi-Waterline (WL0 s/d WL10)
       ├─► Perhitungan Karakteristik Garis Air: Awp, Cw, LCF, IT, IL, BMT, BML, TPC, MTC
       └─► Editor Interaktif Ordinat Lebar Garis Air (Half-Breadth)
       │
       ▼
[Tab 3: Midship Bilge Calculation Sheet]
       ├─► Perhitungan Midship Area (Am) & Koefisien Midship (Cm)
       ├─► Optimasi Radius Bilga (R) & Sudut Deadrise (Rise of Floor)
       └─► Koordinat Transisi Bilga: Flat of Bottom (FOB) & Flat of Side (FOS)
       │
       ▼
[Tab 4: Unified Harmonizer & CSA Projection]
       ├─► Harmonisasi kelengkungan bilga terhadap garis air
       └─► Proyeksi kurva luasan penampang (CSA) ke bentuk Body Plan
       │
       ▼
[Lines Plan Three View Viewer]
       ├─► Body Plan (Gading Haluan Kanan, Gading Buritan Kiri)
       ├─► Half-Breadth Plan (Garis Air WL0 s/d Geladak)
       ├─► Sheer / Profile Plan (Buttocks & Garis Sent)
       └─► Ekspor Otomatis ke AutoCAD (.SCR Script & .LSP AutoLISP)
```

1. **Side Profile NURBS Editor**: Mengizinkan pengguna mengontrol titik bobot kurva haluan (*bulbous bow/raked stem*), transom buritan, serta garis lengkung geladak (*sheer line*). Menghasilkan LOA eksak secara matematis.
2. **WaterPlane Calculation Sheet**:
   - Menghitung integral luasan bidang garis air menggunakan aturan Simpson:
     $$A_{wp} = 2 \times \frac{s}{3} \sum (y_i \cdot \text{SM}_i)$$
   - Menghitung koefisien garis air $C_w = A_{wp} / (LBP \times B)$, momen inersia transversal $I_T$, inersia longitudinal $I_L$, titik apung bidang garis air $LCF$, serta ton per centimeter immersion $TPC = A_{wp} \cdot \rho / 100$.
3. **Midship Bilge Calculation Sheet**:
   - Menghitung radius bilga ($R$) analitik agar luasan midship section persis memenuhi $A_m = B \times T \times C_m$.
4. **Lines Plan 3-View & AutoCAD Export**:
   - Menghasilkan gambar 2D/3D interaktif di browser.
   - Menyediakan fitur download script AutoCAD (`.SCR`) dan script AutoLISP (`.LSP`) lengkap dengan layer khusus (`FRAME`, `WATERLINE`, `BUTTOCK`, `DIAGONAL`, `SAC`, `CENTERLINE`).

---

### FLOW 4: ARSITEKTUR AI DESIGN COMPANION & SAFETY GATE

```
[User Query / Chat UI]
       │
       ▼
[AIAssistantService.safety_check]
       │
       ├─► [Jailbreak / Prompt Injection?] ──► BLOCKED! (Kembalikan Peringatan Keamanan)
       │
       ├─► [Di Luar Domain Maritim?] ────────► BLOCKED! (Arahkan Kembali ke Ranah Kapal)
       │
       └─► [Safe & Relevant Query]
                 │
                 ▼
       [Inject Project Context & Validation Issues]
                 │
                 ▼
       [Try OpenRouter LLM API Cascade]
       (1. Gemini 2.5 Flash Lite -> 2. DeepSeek V4 -> 3. GPT-4o Mini)
                 │
                 ├─► [API Response Sukses] ──► Format Bullet Points Markdown ──► User UI
                 │
                 └─► [API Offline / No Key] ──► Fallback: Deterministic Maritime Local KB ──► User UI
```

- **Penyaring Keamanan (Safety Guardrails)**: Dilengkapi regex terhadap pola *jailbreak* (misal: "ignore previous instructions", "act as dan") dan menolak percakapan di luar domain arsitektur perkapalan.
- **Injeksi Konteks Otomatis**: Pertanyaan pengguna secara otomatis diperkaya dengan status proyek terkini (DWT, kecepatan, draft, rute, isu validasi aktif).
- **Fallback Deterministic Local KB**: Jika koneksi OpenRouter terputus atau API key belum dikonfigurasi, sistem menggunakan *Naval Architecture Knowledge Base* lokal bawaan sehingga AI tetap dapat menjelaskan fungsi DWT, densitas air, sarat, displacement, dan kebutuhan daya mesin.

---

## 6. KATALOG ENDPOINT REST API BACKEND (`server.py`)

Backend berjalan pada port default `8000` (dapat diakses via http://localhost:8000).

### 1. Manajemen Pelabuhan & Rute
| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/ports` | Mengambil seluruh daftar pelabuhan Indonesia dari SQLite. |
| `POST` | `/api/ports/calculate-route` | Menghitung jarak rute antar-pelabuhan (Haversine formula dalam NM). |

### 2. Manajemen Proyek & Tahap 1
| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/projects` | Mengambil daftar seluruh proyek beserta status revisinya. |
| `POST` | `/api/projects` | Membuat proyek baru (menginisialisasi Rev. 0 `DRAFT`). |
| `GET` | `/api/projects/{project_id}` | Mengambil detail riwayat lengkap dan snapshot aktif proyek. |
| `PUT` | `/api/projects/{project_id}` | Memperbarui parameter proyek Tahap 1 (memicu revisi baru). |
| `POST` | `/api/projects/{project_id}/validate` | Menjalankan mesin validasi bertingkat pada proyek. |
| `POST` | `/api/projects/{project_id}/revisions` | Membuat cabang revisi manual baru dari revisi sebelumnya. |
| `POST` | `/api/projects/{project_id}/revisions/{rev_id}/submit` | Mengajukan revisi ke status `WAITING_FOR_REVIEW`. |
| `POST` | `/api/projects/{project_id}/revisions/{rev_id}/approve` | Menyetujui revisi dan menguncinya menjadi `ProjectBaseline`. |
| `POST` | `/api/projects/{project_id}/revisions/{rev_id}/reject` | Menolak revisi dan mengembalikan ke status `REVISION_REQUIRED`. |
| `GET` | `/api/projects/{project_id}/readiness` | Mengambil laporan skor kesiapan handoff Tahap 1 ke Tahap 2. |
| `POST` | `/api/projects/{project_id}/assistant` | AI Assistant Tahap 1 (penjelasan parameter & validasi). |
| `POST` | `/api/projects/import` | Mengimpor berkas JSON proyek. |
| `GET` | `/api/projects/{project_id}/export` | Mengekspor riwayat proyek ke berkas JSON. |
| `GET` | `/api/projects/{project_id}/export-baseline` | Mengekspor baseline aktif proyek dalam format JSON murni. |
| `DELETE` | `/api/projects/{project_id}` | Menghapus proyek beserta seluruh berkas historinya. |

### 3. Tahap 2: Pra-Rancangan (Preliminary Design)
| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/projects/{project_id}/stage2/history` | Memuat seluruh skenario, revisi, dan baseline Tahap 2. |
| `POST` | `/api/projects/{project_id}/stage2/scenarios` | Membuat skenario baru dengan kalkulasi scaling otomatis. |
| `PUT` | `/api/projects/{project_id}/stage2/scenarios/{rev_id}` | Memperbarui parameter skenario (LBP, B, T, Cb, bobot, dsb). |
| `POST` | `/api/projects/{project_id}/stage2/scenarios/{rev_id}/submit` | Mengajukan skenario pra-rancangan untuk direview. |
| `POST` | `/api/projects/{project_id}/stage2/scenarios/{rev_id}/review` | Memberikan keputusan approval / reject pada skenario. |
| `GET` | `/api/projects/{project_id}/stage2/scenarios/{rev_id}/validate` | Memvalidasi rasio teknis dimensi utama dan kestabilan. |
| `POST` | `/api/projects/{project_id}/stage2/assistant` | AI Companion khusus analisis teknis pra-rancangan. |

### 4. Tahap 3: Basic Design & Lines Plan
| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/projects/{project_id}/stage3` | Memuat data profil NURBS, kurva garis air, dan konfigurasi Tahap 3. |
| `PUT` | `/api/projects/{project_id}/stage3` | Menyimpan perubahan konfigurasi garis air dan kurva profil Tahap 3. |

---

## 7. STRUKTUR DATA JSON & MODEL PERSISTENSI

Penyimpanan berkas proyek berlokasi di `data/projects/`.

### 1. `PRJ-XXXX.json` (Tahap 1 History)
```json
{
  "schema_version": "1.0",
  "project_id": "PRJ-2026-001",
  "current_revision_id": "REV-001",
  "active_baseline_id": "BASE-001",
  "revisions": [
    {
      "revision_id": "REV-001",
      "revision_number": 0,
      "status": "APPROVED",
      "data_snapshot": {
        "project_id": "PRJ-2026-001",
        "project_name": "Kapal Kargo Nusantara",
        "owner": "PT Pelayaran Indonesia",
        "vessel_type": "GENERAL_CARGO",
        "target_dwt_ton": 5000.0,
        "service_speed_knots": 12.5,
        "water_type": "SEAWATER",
        "water_density_t_m3": 1.025,
        "route_name": "Jakarta - Surabaya",
        "route_distance_nm": 420.0
      },
      "created_by": "lead_designer",
      "created_at": "2026-09-23T10:00:00Z"
    }
  ],
  "baselines": [
    {
      "baseline_id": "BASE-001",
      "baseline_version": "v0.1",
      "approved_revision_id": "REV-001",
      "active": true
    }
  ],
  "audit_trail": [
    {
      "action": "APPROVE_BASELINE",
      "actor": "lead_designer",
      "timestamp": "2026-09-23T11:00:00Z",
      "reason": "Baseline disetujui"
    }
  ]
}
```

### 2. `PRJ-XXXX_stage2.json` (Tahap 2 Skenario & Baseline)
```json
{
  "project_id": "PRJ-2026-001",
  "revisions": [
    {
      "revision_id": "SREV-001",
      "scenario_id": "SCEN-001",
      "status": "APPROVED",
      "data_snapshot": {
        "scenario_name": "Skenario Dasar Hull",
        "lbp_m": 95.0,
        "loa_m": 103.5,
        "breadth_m": 16.2,
        "depth_m": 8.1,
        "draft_m": 5.8,
        "cb": 0.72,
        "cm": 0.98,
        "cw": 0.79,
        "displacement_m3": 6438.96,
        "displacement_ton": 6599.93,
        "kb_m": 3.09,
        "bm_m": 3.79,
        "km_m": 6.88,
        "kg_m": 4.85,
        "gm_m": 2.03,
        "ehp_kw": 1850.4,
        "bhp_kw": 2980.2,
        "weight_items": [
          {"group_name": "Hull Structure", "weight_ton": 1200.0, "lcg_m": 46.0, "vcg_m": 4.5}
        ],
        "geometry": {
          "csa_ordinates": [0.0, 12.5, 35.0, "..."],
          "dwl_ordinates": [0.0, 3.2, 7.8, "..."]
        }
      }
    }
  ]
}
```

### 3. `PRJ-XXXX_stage3.json` (Tahap 3 Lines Plan Data)
Menyimpan titik kontrol kurva NURBS untuk haluan, buritan, dan sheer line, konfigurasi elevasi garis air (WL0–WL10), serta matriks half-breadth di setiap station (St. -2 hingga St. 20.5).

---

## 8. PANDUAN PENTING UNTUK PENGEMBANG & AI ASSISTANT

1. **JANGAN PERNAH MENGUBAH REVISI TERKUNCI SECARA LANGSUNG**:
   - Jika status revisi adalah `APPROVED`, `SUPERSEDED`, atau `ARCHIVED`, selalu buat cabang revisi baru (`create_new_revision_branch`). Modifikasi in-place akan merusak integritas audit trail dan memicu exception.
2. **KONSISTENSI SATUAN INTERNAL**:
   - Tidak diperkenankan menyimpan kecepatan dalam km/jam (gunakan *knots*).
   - Jangan menyimpan berat dalam kilogram atau pound (selalu gunakan *metric tons*).
   - Dimensi geometris selalu dalam meter.
3. **LOGIKA PERHITUNGAN TEKNIK HARUS DI DALAM ENGINE**:
   - Jika ada fitur kalkulasi baru (misalnya stabilitas damage atau Bonjean curve), tempatkan di folder `src/domain/` atau `src/services/`. Jangan menuliskan formula kalkulasi acak di dalam prompt LLM.
4. **KOMPATIBILITAS SEVERITY VALIDASI**:
   - `INFO`: Saran optimasi desain.
   - `WARNING`: Nilai tidak biasa secara empiris, namun masih dimungkinkan secara fisis.
   - `ERROR`: Melanggar aturan teknis atau batas regulasi (harus diperbaiki sebelum diajukan).
   - `BLOCKING`: Data hilang atau mustahil secara fisik (misal: sarat lebih besar dari tinggi kapal, $T > H$), mencegah pengajuan approval.

---
*Dokumen ini diperbarui secara berkala seiring bertambahnya fungsionalitas dan pembaruan pada modul tahapan sistem.*
