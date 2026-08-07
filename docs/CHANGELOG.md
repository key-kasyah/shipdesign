# Changelog

Semua perubahan penting pada proyek dicatat di file ini.

Format mengikuti prinsip *Keep a Changelog* dengan kategori:

- Added
- Changed
- Deprecated
- Removed
- Fixed
- Security
- Documentation
- Decision

---

## [Unreleased]

### Added

- **Tahap 2 — Pra-Rancangan Kapal / Preliminary Design** (Waiting for Review):
  - Penulisan domain model untuk data pra-rancangan (`ComparableShip`, `DesignScenario`, `WeightItem`, `CapacityItem`, `GeometryData`, `Stage2History`) di [`src/domain/stage2_preliminary/models.py`](file:///d:/SHIP%20V1/ship-design-platform/src/domain/stage2_preliminary/models.py).
  - Implementasi formula kalkulasi deterministik perkapalan (DWT Scaling, Froude Number, tinggi KB Posdunine, metacentric radius BM, Simpson integration, EHP/BHP NSP, dan pembentukan ordinat curve default CSA/DWL/Gading 10) di [`src/domain/stage2_preliminary/calculators.py`](file:///d:/SHIP%20V1/ship-design-platform/src/domain/stage2_preliminary/calculators.py).
  - Implementasi validation engine untuk pengecekan rasio utama L/B, B/T, L/H, H/T, freeboard minimum, keselarasan berat-displacement, dan tinggi metacentra GM sesuai standar IMO di [`src/domain/stage2_preliminary/validators.py`](file:///d:/SHIP%20V1/ship-design-platform/src/domain/stage2_preliminary/validators.py).
  - Penulisan skema serialisasi/deserialisasi JSON di [`src/domain/stage2_preliminary/schemas.py`](file:///d:/SHIP%20V1/ship-design-platform/src/domain/stage2_preliminary/schemas.py).
  - Layanan `Stage2PreliminaryDesignService` untuk mengelola skenario, auto-hitung, baseline, audit trail, dan persistensi berkas JSON di [`src/services/stage2_service.py`](file:///d:/SHIP%20V1/ship-design-platform/src/services/stage2_service.py).
  - Integrasi 6 endpoint REST API di [`server.py`](file:///d:/SHIP%20V1/ship-design-platform/server.py) untuk menyajikan data kalkulasi, validasi, dan alur pimpinan approval Tahap 2.
  - Halaman dashboard interaktif premium `projects/[projectId]/stage2/page.tsx` terintegrasi penuh Next.js dengan tab menu, grafik SVG real-time, dan asisten AI.
  - Penulisan unit test (`test_preliminary_calculators.py`) dan API integration test (`test_api_server_stage2.py`) lulus 100%.

- **Sprint 1.3 — Project Data Baseline, Revision, and Approval Management** (Waiting for Review):
  - Penambahan enum `RevisionStatus` di [`src/core/enums.py`](file:///d:/SHIP%20V1/ship-design-platform/src/core/enums.py).
  - Penambahan dataclass `ProjectRevision`, `ProjectBaseline`, `ChangeEntry`, `AuditEvent`, `ApprovalRecord`, dan `ProjectHistory` di [`src/domain/stage1_requirements/models.py`](file:///d:/SHIP%20V1/ship-design-platform/src/domain/stage1_requirements/models.py).
  - Penulisan schema serialisasi dan deserialisasi penuh untuk riwayat revisi dan baseline di [`src/domain/stage1_requirements/schemas.py`](file:///d:/SHIP%20V1/ship-design-platform/src/domain/stage1_requirements/schemas.py), dengan dukung backward-compatibility penuh (otomatis mengupgrade JSON data proyek lama Sprint 1.1/1.2 menjadi history).
  - Implementasi alur kerja revisi, baseline, penolakan edit pada baseline approved (immutability), audit event logging, change comparison, dan ekspor Design Requirements Baseline terstruktur di [`src/services/stage1_service.py`](file:///d:/SHIP%20V1/ship-design-platform/src/services/stage1_service.py).
  - Penyediaan 8 unit test baru di [`tests/stage1/test_revision.py`](file:///d:/SHIP%20V1/ship-design-platform/tests/stage1/test_revision.py) (total test suite menjadi 34 test cases) lulus 100%.
  - CLI `cli.py` diperbarui dengan menu interaktif khusus untuk mengelola revisi, membandingkan data, memproses review, menampilkan log audit trail, dan mengekspor baseline.

---


## [0.3.0-baseline] — 2026-07-22

### Added

- **Baseline Status**: Hasil pekerjaan disetujui (APPROVED) dan dikunci sebagai `Project Data Validation Baseline v0.2` (Revision: `Rev. 0`).
- **File dalam Baseline**:
  - `src/core/enums.py` (ValidationSeverity enum)
  - `src/domain/stage1_requirements/models.py` (ValidationIssue, ValidationResult)
  - `src/domain/stage1_requirements/validators.py` (ValidationEngine, BaseValidationRule)
  - `src/domain/stage1_requirements/schemas.py` (JSON backward compatibility)
  - `src/services/stage1_service.py` (Service wrapper)
  - `tests/stage1/test_validators.py` (Complete unit tests)
  - `cli.py` (Interactive terminal verification tool)
- **Stable Issue Codes yang Disetujui**:
  - `REQ_PROJECT_ID_MISSING`, `REQ_PROJECT_NAME_MISSING`, `REQ_VESSEL_TYPE_MISSING`, `REQ_DWT_MISSING`, `REQ_SPEED_MISSING`, `REQ_DENSITY_MISSING`, `REQ_WATER_TYPE_MISSING`, `REQ_ROUTE_MISSING`
  - `NUM_DWT_NON_POSITIVE`, `NUM_SPEED_NON_POSITIVE`, `NUM_DENSITY_NON_POSITIVE`, `NUM_ENDURANCE_NON_POSITIVE`
  - `NUM_PAYLOAD_NEGATIVE`, `NUM_CREW_NEGATIVE`, `NUM_PASSENGER_NEGATIVE`, `NUM_DISTANCE_NEGATIVE`, `NUM_DIMENSION_NEGATIVE`
  - `CROSS_MAX_SPEED_BELOW_SERVICE`, `CROSS_PAYLOAD_EXCEEDS_DWT`
  - `WARN_ROUTE_PORTS_EQUAL`, `WARN_DENSITY_UNUSUAL_FOR_WATER_TYPE`, `WARN_ENDURANCE_BELOW_TRANSIT_TIME`
  - `WARN_CREW_ZERO`
- **Verification**:
  - **Automated Tests**: 26/26 test cases lulus 100% menggunakan `python -m unittest discover -s tests`.
  - **User Acceptance Test (UAT)**: Seluruh 10 skenario UAT dinyatakan **PASSED** oleh pengguna.

---

## [0.2.0-baseline] — 2026-07-22

### Added

- **Baseline Status**: Hasil pekerjaan dikunci sebagai `Requirements Foundation Baseline v0.1` (Revision: `Rev. 0`).
- **Implementasi Sprint 1.1**:
  - Domain Data Model `ProjectData` untuk Tahap 1 (Kebutuhan Kapal) di [`src/domain/stage1_requirements/models.py`](file:///d:/SHIP%20V1/ship-design-platform/src/domain/stage1_requirements/models.py).
  - Tipe Enum shared (`VesselType`, `WaterType`, `PortConstraintHardness`, `StageStatus`) di [`src/core/enums.py`](file:///d:/SHIP%20V1/ship-design-platform/src/core/enums.py).
  - Satuan internal SI di [`src/core/units.py`](file:///d:/SHIP%20V1/ship-design-platform/src/core/units.py).
  - Schema Serialisasi/Deserialisasi JSON & Dictionary di [`src/domain/stage1_requirements/schemas.py`](file:///d:/SHIP%20V1/ship-design-platform/src/domain/stage1_requirements/schemas.py).
  - Engine Validasi (Mandatory Fields, Range & Boundary, Speed Consistency) di [`src/domain/stage1_requirements/validators.py`](file:///d:/SHIP%20V1/ship-design-platform/src/domain/stage1_requirements/validators.py).
  - Service Layer `Stage1RequirementService` di [`src/services/stage1_service.py`](file:///d:/SHIP%20V1/ship-design-platform/src/services/stage1_service.py).
  - Sample JSON fixture data di [`data/fixtures/sample_project_data.json`](file:///d:/SHIP%20V1/ship-design-platform/data/fixtures/sample_project_data.json).
  - Interactive Terminal CLI tool di [`cli.py`](file:///d:/SHIP%20V1/ship-design-platform/cli.py) untuk input interaktif, validasi, dan simpan/muat JSON data proyek.
  - ADR-013 untuk Struktur Domain Model Project Data Tahap 1 di [`docs/ARCHITECTURE_DECISIONS.md`](file:///d:/SHIP%20V1/ship-design-platform/docs/ARCHITECTURE_DECISIONS.md).

### Changed

- Struktur direktori `src/` dan `tests/` diinisialisasi untuk modularitas Tahap 1.

### Fixed

- Mengoreksi penanda tanda kutip docstring di berkas `__init__.py`.

### Verification

- **Automated Tests**: 13/13 test cases lulus 100% menggunakan `python -m unittest discover -s tests`.
- **User Acceptance Test (UAT)**: Seluruh 11 skenario UAT dinyatakan **PASSED** oleh pengguna melalui interactive CLI.

### Documentation

- Menetapkan tata kerja AI agar memahami keseluruhan sistem tetapi hanya mengerjakan scope aktif.
- Menetapkan larangan implementasi Tahap 2–7 selama Tahap 1 masih aktif.

### Decision

- Pengembangan dilakukan bertahap dan memerlukan persetujuan eksplisit sebelum berpindah sprint atau tahap.

---



## [0.1.0-governance] — 2026-07-22

### Added

- Versi awal governance documentation.
- Struktur status:
  - `LOCKED`
  - `PLANNED`
  - `ACTIVE`
  - `WAITING_FOR_REVIEW`
  - `REVISION_REQUIRED`
  - `APPROVED`
  - `DEPRECATED`

---

## Template Entri Perubahan

```markdown
## [Unreleased]

### Added
- ...

### Changed
- ...

### Fixed
- ...

### Documentation
- ...

### Decision
- ...
```

---

## Aturan Pencatatan

Catat perubahan jika:

- ada file baru;
- ada perubahan data model;
- ada formula baru;
- ada dependency baru;
- ada perubahan API;
- ada perubahan schema;
- ada migrasi database;
- ada validasi baru;
- ada perbaikan bug;
- ada perubahan stage status;
- ada perubahan acceptance criteria;
- ada perubahan AI knowledge atau prompt behavior.

Jangan mencatat:

- perubahan format kecil tanpa dampak;
- file temporer;
- output build;
- cache.
