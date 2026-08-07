# System Dependencies

## 1. Tujuan

Dokumen ini memetakan kepemilikan data, hubungan antarmodul, dampak perubahan, dan kebutuhan perhitungan ulang pada Platform Rancang Bangun Kapal.

Dependency graph digunakan oleh:

- calculation engine;
- validation engine;
- stale-result detector;
- revision manager;
- AI Design Assistant;
- change-impact report;
- stage gate.

---

## 2. Prinsip Dependensi

### 2.1 Ownership

Setiap parameter memiliki satu tahap pemilik. Tahap lain hanya membaca atau menghasilkan turunan dari parameter tersebut.

### 2.2 Immutable baseline

Data baseline yang disetujui tidak diubah langsung. Perubahan menghasilkan revisi baru.

### 2.3 Stale propagation

Jika parameter sumber berubah, hasil turunannya ditandai `STALE` sampai dihitung dan direview ulang.

### 2.4 No hidden recalculation

Sistem tidak boleh mengganti hasil baseline diam-diam. Kalkulasi ulang harus terlihat dan menghasilkan change report.

---

## 3. Dependensi Antartahap

```text
Tahap 1 — Kebutuhan Kapal
    ↓ Design Requirements Baseline
Tahap 2 — Pra-Rancangan
    ↓ Preliminary Design Baseline
Tahap 3 — Basic Design
    ↓ Basic Design Baseline
Tahap 4 — Detail Design dan Approval
    ↓ Approved Design Baseline
Tahap 5 — Production Design
    ↓ Production Package
Tahap 6 — Konstruksi
    ↓ Completed Vessel Data
Tahap 7 — Pengujian dan Penyerahan
    ↓ As-Built and Delivery Baseline
```

Tahap berikutnya tidak boleh aktif jika baseline wajib dari tahap sebelumnya belum disetujui.

---

## 4. Dependency Map Tahap 1 ke Tahap 2

| Parameter Tahap 1 | Dampak Langsung di Tahap 2 | Dampak Lanjutan |
|---|---|---|
| Tipe kapal | Pemilihan kapal pembanding, metode koefisien, batas rasio | Bentuk lambung, kapasitas, struktur, sistem |
| Fungsi kapal | Payload dan ruang utama | General arrangement dan capacity plan |
| Trayek | Profil operasi | Fuel, endurance, area pelayaran |
| Jarak pelayaran | Waktu operasi dan kebutuhan bahan bakar | DWT component, volume tank, displacement |
| Target DWT | Scaling dan estimasi ukuran | Displacement, kapasitas, daya |
| Target payload | Capacity check | Ukuran ruang muat, DWT balance |
| Kecepatan dinas | Froude number, Cb, hambatan, daya | Bentuk lambung, mesin, propeller |
| Kecepatan maksimum | Power margin | Pemilihan mesin dan trial criteria |
| Endurance | Kebutuhan consumable | Fuel tank, fresh water, DWT |
| Jumlah awak | Consumable dan akomodasi | GA, weight, capacity |
| Jumlah penumpang | Akomodasi dan safety | Weight, stability, evacuation |
| Jenis perairan | Density default | Displacement dan draft |
| Density air | Konversi volume menjadi displacement | Weight balance, draft, daya |
| Maksimum draft | Batas T | Displacement, capacity, stability |
| Maksimum LOA | Batas panjang | Ukuran utama dan port compatibility |
| Maksimum breadth | Batas B | Stabilitas, capacity, port compatibility |
| Air draft | Batas tinggi total | Superstructure dan route clearance |
| Area pelayaran | Rule applicability | Struktur, safety, operasional |
| Badan klasifikasi | Rule set | Basic dan detail design |
| Negara bendera | Statutory requirements | Approval dan certification |

---

## 5. Dependency Map Pra-Rancangan

Bagian ini adalah konteks dan belum menjadi izin implementasi Tahap 2.

### 5.1 Ukuran utama

```text
Target DWT
+ Kapal Pembanding
+ Batas Pelabuhan
    ↓
LOA, LBP, B, T, H, LWL
    ↓
Rasio Ukuran
Displacement
Freeboard
CSA
DWL
Gading 10
Weight Estimate
Capacity Check
Resistance and Power
Stability Awal
```

### 5.2 Density air

```text
Density
   ↓
Displacement
   ↓
Weight Balance
   ↓
Draft and Trim
   ↓
Resistance and Power
   ↓
Stability and Structural Load
```

### 5.3 LBP

```text
LBP
├── L/B
├── L/H
├── LWL
├── Froude Number
├── Displacement
├── Station Spacing
├── CSA
├── Longitudinal Strength
└── General Arrangement
```

### 5.4 Breadth

```text
B
├── L/B
├── B/T
├── Displacement
├── Midship Area
├── Waterplane Area
├── Stability
├── Capacity
├── Gading 10
└── Port Limit
```

### 5.5 Draft

```text
T
├── B/T
├── H/T
├── Freeboard
├── Displacement
├── Midship Area
├── Under-keel Clearance
├── Stability
└── Capacity
```

### 5.6 Block coefficient

```text
Cb
├── Displacement
├── Cp
├── CSA fullness
├── Resistance estimate
├── Power estimate
└── Cargo volume tendency
```

---

## 6. Cross-Stage Dependency Summary

### Tahap 2 ke Tahap 3

- ukuran utama → lines plan dan GA;
- koefisien bentuk → offset table dan hydrostatics;
- weight estimate → loading conditions;
- preliminary power → resistance and propeller study;
- preliminary lines → full lines plan;
- requirement limits → basic design validation.

### Tahap 3 ke Tahap 4

- lines plan → structural geometry;
- GA → equipment and system arrangement;
- hydrostatics → stability booklet;
- capacity plan → tank structure and piping;
- propulsion selection → machinery detail;
- structural concept → scantling detail.

### Tahap 4 ke Tahap 5

- approved drawings → production model;
- approved scantlings → cutting and nesting;
- approved systems → spool and routing;
- equipment data → foundations and installation;
- approval revisions → production revision control.

### Tahap 5 ke Tahap 6

- production drawings → fabrication;
- BOM → procurement;
- block breakdown → assembly and erection;
- installation drawings → machinery and outfitting;
- production schedule → progress monitoring.

### Tahap 6 ke Tahap 7

- completed construction → test readiness;
- QC records → acceptance evidence;
- actual weight → inclining experiment;
- commissioned systems → harbor and sea trial;
- construction changes → as-built documents.

---

## 7. Stale Result Rules

Contoh aturan:

| Perubahan | Hasil yang Menjadi Stale |
|---|---|
| Target DWT | ukuran utama, displacement, berat, kapasitas, daya |
| Kecepatan dinas | Cb otomatis, Fn, NSP, resistance, power |
| Density air | displacement, draft balance, daya |
| LBP | rasio, LWL, Fn, displacement, CSA, DWL |
| B | rasio, displacement, DWL, Gading 10, stabilitas |
| T | rasio, freeboard, displacement, Gading 10 |
| H | H/T, L/H, freeboard, volume internal |
| Cb | displacement, Cp, CSA, daya |
| Cm | Cp, Gading 10, CSA |
| Cw | DWL, waterplane properties, stability awal |
| Weight item | total weight, KG, LCG, trim, stability |
| Tank volume | capacity, loading conditions, DWT |
| GA compartment | capacity, weight, escape, systems |
| Approved structure | production drawings, BOM, schedule |

---

## 8. Dependency Status

Setiap node dapat memiliki status:

- `NOT_AVAILABLE`;
- `DRAFT`;
- `VALID`;
- `STALE`;
- `ERROR`;
- `WAITING_FOR_REVIEW`;
- `APPROVED`;
- `LOCKED`.

Tahap berikutnya hanya boleh membaca node berstatus `APPROVED`, kecuali mode eksplorasi secara eksplisit diaktifkan.

---

## 9. Interface Minimum untuk AI

AI menerima dependency context dalam format konseptual:

```json
{
  "changed_parameter": "density_water",
  "old_value": 1.025,
  "new_value": 1.000,
  "direct_impacts": ["displacement"],
  "downstream_impacts": [
    "weight_balance",
    "draft",
    "trim",
    "resistance",
    "power",
    "stability"
  ],
  "stale_outputs": [
    "preliminary.displacement",
    "preliminary.nsp_power"
  ]
}
```

AI hanya menjelaskan hasil graph tersebut. AI tidak boleh mengarang dependensi yang belum tercatat.

---

## 10. Perubahan Dependency Graph

Setiap perubahan dependency harus:

1. memiliki alasan;
2. menyebut node sumber dan target;
3. menjelaskan direct atau downstream impact;
4. memiliki test;
5. dicatat pada changelog;
6. dicatat sebagai ADR jika mengubah prinsip arsitektur.
