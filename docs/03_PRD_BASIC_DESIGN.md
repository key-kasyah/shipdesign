**PRODUCT REQUIREMENTS DOCUMENT**

PRD Tahap 3 — Basic Design

Lines Plan, Hidrostatis, Stabilitas, GA, Kapasitas, Hambatan, dan Struktur Konsep

| **Kode Dokumen** | PRD-03-BAS                     |
|------------------|--------------------------------|
| **Tahap Produk** | Tahap 3 dari 7                 |
| **Status**       | Draft untuk Perencanaan Produk |
| **Bahasa**       | Bahasa Indonesia               |

*Dokumen ini menjadi dasar penyelarasan kebutuhan produk, desain sistem, pengembangan perangkat lunak, validasi teknis, dan penerimaan pengguna.*

# Kontrol Dokumen

| **Pemilik Dokumen**      | Product Owner / Naval Architecture Lead                                                                        |
|--------------------------|----------------------------------------------------------------------------------------------------------------|
| **Pemangku Kepentingan** | Mahasiswa, dosen, naval architect, engineer, reviewer, galangan, operator, dan administrator platform          |
| **Klasifikasi**          | Dokumen kerja produk; belum merupakan persetujuan teknis atau klasifikasi kapal                                |
| **Siklus Review**        | Ditinjau pada setiap perubahan ruang lingkup, formula, regulasi, atau baseline desain                          |
| **Prinsip Utama**        | Calculation engine menghasilkan angka; validation engine menentukan status; AI menjelaskan konteks dan dampak. |

# Ringkasan Produk

Tahap Basic Design mengembangkan preliminary baseline menjadi geometri lambung lengkap, perhitungan hidrostatik dan stabilitas, general arrangement, capacity plan, resistance–propulsion, struktur konsep, dan sistem kapal awal yang saling konsisten.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Keputusan Produk<br />
</strong>Basic Design menjadi tahap pertama yang membutuhkan model geometri dan loading condition terintegrasi. Semua hasil harus dapat ditelusuri kembali ke Preliminary Baseline, dan perubahan ukuran utama harus melalui change request.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# Latar Belakang dan Masalah

Pra-rancangan hanya memberikan bentuk dan kinerja awal. Tanpa offset table, hydrostatics, loading condition, GA, capacity plan, dan resistance calculation yang terhubung, desain belum cukup untuk detail design maupun review klasifikasi.

# Tujuan

- Membentuk lines plan lengkap dan fair.

- Menghasilkan hydrostatics, Bonjean, stabilitas, trim, dan loading condition.

- Menyusun GA, capacity plan, resistance, propeller, struktur konsep, dan sistem awal.

- Membentuk Basic Design Baseline yang siap menjadi dasar detail design.

## Bukan Tujuan

- Menghasilkan semua scantling dan drawing class final.

- Menghasilkan production drawing dan nesting.

- Mengelola aktivitas konstruksi.

# Pengguna dan Peran

| **Peran**              | **Kebutuhan Utama**                                            | **Hak/Aksi Kunci**                    |
|------------------------|----------------------------------------------------------------|---------------------------------------|
| Naval Architect        | Mengembangkan bentuk, GA, hydrostatics, stability, resistance. | Edit model, run calculation, approve. |
| Marine Engineer        | Menentukan mesin, propeller, dan sistem awal.                  | Review power/system data.             |
| Structural Engineer    | Menyusun struktur konsep dan weight update.                    | Input framing dan scantling awal.     |
| Reviewer/Class Liaison | Memeriksa compliance dan konsistensi.                          | Review, comment, gate approval.       |

# Ruang Lingkup

## Termasuk

- Offset table dan lines plan lengkap.

- Fairing dan pemeriksaan volume/LCB.

- Hydrostatics dan Bonjean.

- Loading condition, intact stability, trim.

- General arrangement dan capacity plan.

- Resistance, propulsion, propeller, dan engine matching.

- Struktur konsep, sistem awal, safety concept, dan weight update.

- AI Basic Design Assistant.

## Tidak Termasuk

- Detail structural drawings dan FEA final.

- Detail piping/electrical production.

- Class approval workflow lengkap.

# Input, Output, dan Gate

| **Jenis**    | **Rincian**                                                                                                                                                          |
|--------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Input Utama  | Preliminary Design Baseline, geometri awal, weight estimate, requirement, metode hydrostatics/stability/resistance, equipment data, dan class basis.                 |
| Output Utama | Basic Design Package dan baseline: lines plan, hydrostatics, Bonjean, stability, GA, capacity, resistance/propulsion, preliminary structure/systems, updated weight. |
| Entry Gate   | Preliminary Baseline disetujui dan geometri awal dapat dikembangkan tanpa blocking issue.                                                                            |
| Exit Gate    | Lines plan fair; hydrostatics dan loading conditions valid; stability dan capacity memenuhi; GA feasible; power/propulsion dan structure concept direview.           |

# Alur Kerja Utama

| **Preliminary Baseline → Lines Plan → Hydrostatics/Bonjean → GA/Capacity → Loading Conditions → Stability/Trim → Resistance/Propulsion → Structure/Systems → Weight Update → Approve Basic Baseline** |
|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|

1.  Kembangkan offset table dan fairing tiga pandangan.

2.  Hitung hydrostatics dan Bonjean pada rentang draft.

3.  Susun GA, subdivision, tank, serta capacity plan.

4.  Definisikan loading conditions dan pusat berat.

5.  Jalankan stability dan trim.

6.  Hitung resistance, power, propeller, serta engine matching.

7.  Susun struktur konsep, sistem awal, dan safety concept.

8.  Update weight report dan selesaikan design review.

# Kebutuhan Produk

## Kebutuhan Fungsional

| **ID**      | **Kebutuhan**                                                    | **Prioritas** | **Acceptance Criteria**                                                    | **Catatan/Dependensi** |
|-------------|------------------------------------------------------------------|---------------|----------------------------------------------------------------------------|------------------------|
| **BAS-001** | Sistem mengelola offset table multi-waterline dan multi-station. | Must          | Data dapat diedit, diimpor, divalidasi, dan diekspor.                      | Preliminary geometry   |
| **BAS-002** | Sistem menghasilkan body, half-breadth, dan sheer plan.          | Must          | Ketiga pandangan sinkron terhadap satu offset model.                       | Geometry               |
| **BAS-003** | Sistem menyediakan fairing manual dan spline.                    | Must          | Perubahan titik memperbarui semua pandangan dan curvature check.           | Geometry               |
| **BAS-004** | Sistem memeriksa volume, Cb, Cm, Cw, Cp, dan LCB aktual.         | Must          | Perbedaan terhadap baseline ditampilkan.                                   | Hydrostatics           |
| **BAS-005** | Sistem mengekspor lines plan ke DXF/CSV/PDF.                     | Should        | Skala, unit, layer, dan metadata tersertakan.                              | Interop                |
| **BAS-006** | Sistem menghitung hydrostatics pada banyak draft.                | Must          | Δ, KB, BM, KM, LCB, LCF, TPC, MCT, WPA tersedia.                           | Core                   |
| **BAS-007** | Sistem menghasilkan kurva hydrostatics.                          | Must          | Grafik interaktif dan tabel ekspor tersedia.                               | Visualization          |
| **BAS-008** | Sistem menghasilkan Bonjean curves.                              | Must          | Area section per draft dan station dapat divisualisasikan.                 | Strength               |
| **BAS-009** | Sistem mengelola kompartemen dan watertight subdivision.         | Must          | Boundary, volume, permeability, dan access tersimpan.                      | GA                     |
| **BAS-010** | Sistem menyediakan editor General Arrangement.                   | Must          | Deck/profile/space objects dapat ditempatkan dan diberi atribut.           | GA                     |
| **BAS-011** | Sistem mengelola tank dan capacity plan.                         | Must          | Volume dan CG tiap tank dihitung dari geometri.                            | Capacity               |
| **BAS-012** | Sistem menghasilkan sounding/ullage table.                       | Should        | Volume versus level tersedia untuk setiap tank.                            | Operations             |
| **BAS-013** | Sistem mengelola loading conditions.                             | Must          | Lightship, full, ballast, departure, arrival, dan custom.                  | Stability              |
| **BAS-014** | Sistem menghitung free-surface effect.                           | Must          | Tank slack memberi koreksi KG/GM.                                          | Stability              |
| **BAS-015** | Sistem menghitung KN/GZ curve.                                   | Must          | Range angle, downflooding, area, max GZ tersedia.                          | Stability              |
| **BAS-016** | Sistem memeriksa kriteria intact stability.                      | Must          | Rule version dan pass/fail tampil per condition.                           | Rules                  |
| **BAS-017** | Sistem menghitung trim dan draft F/A.                            | Must          | LCB, LCG, MCT, trim, draft ends tersedia.                                  | Trim                   |
| **BAS-018** | Sistem menghitung resistance curve.                              | Must          | Komponen resistance dan total per speed tersedia.                          | Performance            |
| **BAS-019** | Sistem mendukung beberapa metode resistance.                     | Should        | Metode dapat dibandingkan dengan applicability.                            | Methods                |
| **BAS-020** | Sistem menghitung EHP, delivered, shaft, dan brake power.        | Must          | Efficiency chain transparan.                                               | Propulsion             |
| **BAS-021** | Sistem mendukung pemilihan propeller awal.                       | Must          | Diameter, P/D, blade, area ratio, rpm, efficiency.                         | Propeller              |
| **BAS-022** | Sistem memeriksa cavitation awal.                                | Should        | Status dan parameter pembatas ditampilkan.                                 | Propeller              |
| **BAS-023** | Sistem melakukan engine–propeller matching.                      | Must          | Operating point dan margin tersedia.                                       | Machinery              |
| **BAS-024** | Sistem menyusun struktur konsep.                                 | Must          | Framing system, spacing, double bottom, bulkheads, preliminary scantlings. | Structure              |
| **BAS-025** | Sistem menyusun preliminary system concept.                      | Should        | Bilge, ballast, fuel, cooling, fire, electrical, ventilation, steering.    | Systems                |
| **BAS-026** | Sistem menyusun safety concept.                                  | Should        | Escape, fire zones, lifesaving, emergency systems.                         | Safety                 |
| **BAS-027** | Sistem memperbarui weight dan CG.                                | Must          | Perubahan GA/equipment memperbarui weight report.                          | Weight                 |
| **BAS-028** | Sistem menjalankan cross-domain design review.                   | Must          | Mismatch geometry, capacity, stability, power, and weight terdeteksi.      | Dependency             |
| **BAS-029** | Sistem membuat Basic Design Baseline.                            | Must          | Approval dan immutable snapshot tersedia.                                  | Gate                   |

## Kebutuhan AI Assistant

| **ID**      | **Kebutuhan**                                       | **Prioritas** | **Acceptance Criteria**                                                       | **Catatan/Dependensi** |
|-------------|-----------------------------------------------------|---------------|-------------------------------------------------------------------------------|------------------------|
| **AI3-001** | AI menjelaskan hydrostatic parameter dan grafik.    | Must          | Jawaban merujuk hasil calculation engine dan kondisi draft.                   | Context                |
| **AI3-002** | AI menjelaskan stabilitas dan loading condition.    | Must          | Menyebut kontribusi KG, free surface, GZ, dan failing criterion.              | Rules                  |
| **AI3-003** | AI menganalisis dampak perubahan GA/tank/equipment. | Should        | Dependency ke weight, CG, stability, capacity, dan access tampil.             | Dependency             |
| **AI3-004** | AI membandingkan metode resistance.                 | Should        | Menjelaskan applicability dan perbedaan hasil tanpa memilih secara absolut.   | Methods                |
| **AI3-005** | AI membantu design review.                          | Should        | Membuat checklist issue lintas geometri, GA, stability, power, dan structure. | Review                 |
| **AI3-006** | AI menjelaskan trade-off propeller/engine.          | Should        | Menjelaskan rpm, diameter, cavitation, efficiency, dan margin.                | Propulsion             |

# Model Data dan Status

| **Entitas/Data** | **Atribut Minimum**                                    | **Relasi/Status**                         |
|------------------|--------------------------------------------------------|-------------------------------------------|
| HullGeometry     | offsets, surfaces, stations, waterlines, fairing state | Satu sumber untuk views dan calculations. |
| HydrostaticSet   | draft series, hydrostatic values, method version       | Valid/Stale.                              |
| Compartment      | boundaries, type, permeability, access                 | GA/Capacity/Damage future.                |
| Tank             | geometry, fluid, density, fill, CG, FSM                | Loading conditions.                       |
| LoadingCondition | weights, tanks, draft, trim, stability results         | Draft/Approved.                           |
| ResistanceRun    | method, speed range, results, applicability            | Compared/Selected.                        |
| PropulsionCase   | propeller, engine, efficiencies, operating point       | Candidate/Selected.                       |
| BasicBaseline    | geometry+GA+stability+performance snapshot             | Input Detail Design.                      |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Status Tahap<br />
</strong>Belum Dimulai → Draft → Sedang Dikerjakan → Menunggu Review → Disetujui → Perlu Revisi → Dikunci. Perubahan terhadap baseline yang disetujui harus menghasilkan revisi baru dan impact analysis.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# Aturan Bisnis dan Validasi

- Satu hull geometry menjadi sumber lines plan, hydrostatics, Bonjean, dan tank geometry.

- Perubahan offset membuat semua hasil geometry-dependent stale.

- Loading condition wajib balance terhadap displacement dan trim tolerance.

- Rule check menyimpan versi regulasi dan kondisi aplikasi.

- Perubahan GA yang memengaruhi berat/CG memicu stability recalculation.

- Basic baseline tidak disetujui jika condition wajib gagal atau clash kritis belum selesai.

# Persyaratan UX

- Workspace split view untuk model, tabel, grafik, dan AI assistant.

- Layer visibility untuk stations, waterlines, buttocks, compartments, tanks.

- Dashboard loading condition dan stability criteria.

- Change-impact drawer sebelum menyimpan perubahan besar.

- Review mode dengan issue pins dan komentar.

# Persyaratan Non-Fungsional

| **Kategori**      | **Persyaratan**                                                                                                                |
|-------------------|--------------------------------------------------------------------------------------------------------------------------------|
| Akurasi           | Hasil numerik harus berasal dari fungsi deterministik, memiliki satuan, metode, sumber, dan batas penerapan.                   |
| Auditabilitas     | Setiap perubahan input, hasil hitung, approval, dan revisi dicatat dengan pengguna, waktu, nilai lama, nilai baru, dan alasan. |
| Keamanan          | Kontrol akses berbasis peran; data proyek tidak dapat diakses lintas organisasi tanpa izin.                                    |
| Kinerja           | Interaksi form dan kalkulasi umum memberikan respons dalam ≤3 detik untuk proyek standar.                                      |
| Reliabilitas      | Autosave, recovery sesi, dan validasi mencegah kehilangan data serta kalkulasi dengan input tidak lengkap.                     |
| Keterjelasan      | Semua input menampilkan nama, simbol, satuan, definisi, sumber, contoh, serta dampak ke modul berikutnya.                      |
| Interoperabilitas | Data dapat diekspor melalui format terbuka yang relevan seperti JSON, CSV, Excel, PDF, atau DXF sesuai tahap.                  |

# Metrik Keberhasilan

| **Metrik**                     | **Target Awal**                            | **Cara Ukur**     |
|--------------------------------|--------------------------------------------|-------------------|
| Geometry consistency           | 100% view berasal dari model sama          | Cross-view tests. |
| Hydrostatic verification       | Selisih terhadap benchmark dalam tolerance | Benchmark hulls.  |
| Stability traceability         | 100% criterion memiliki source/version     | Audit.            |
| Design review closure          | ≥90% issue ditutup sebelum gate            | Issue tracker.    |
| External spreadsheet reduction | ≥60% proses basic design di platform       | Pilot usage.      |

# Acceptance Criteria Tahap

- Offset table menghasilkan tiga pandangan yang sinkron dan fair.

- Hydrostatics, Bonjean, loading conditions, stability, dan trim dapat dihitung ulang.

- GA dan capacity plan terhubung ke tank volumes dan CG.

- Resistance–propulsion dan weight update terhubung ke baseline.

- Basic Design Baseline dapat direview, disetujui, dan diteruskan ke Detail Design.

# Risiko dan Mitigasi

| **Risiko**                        | **Dampak**             | **Mitigasi**                                        |
|-----------------------------------|------------------------|-----------------------------------------------------|
| Model geometri tidak cukup robust | Hasil downstream salah | Gunakan library geometry teruji dan benchmark hull. |
| Scope CAD terlalu besar           | Delivery tertunda      | Mulai dari parametric/2D editor sebelum 3D penuh.   |
| Regulation complexity             | Rule engine salah      | Prioritaskan rule set terbatas dan verifikasi ahli. |
| Data equipment belum tersedia     | GA/weight tidak akurat | Placeholder dengan confidence dan margin.           |

# Rencana Rilis

| **Rilis** | **Fokus**                                                         | **Kriteria Keluar**                |
|-----------|-------------------------------------------------------------------|------------------------------------|
| MVP       | Offset table, lines views, hydrostatics, basic loading/stability. | Benchmark hull lulus.              |
| R1        | GA, capacity, tank CG, trim, reports.                             | Satu basic design lengkap.         |
| R2        | Resistance, propeller, structure/system concept, review.          | Basic baseline siap detail design. |

# Pertanyaan Terbuka

- Apakah editor geometri dibangun native web atau integrasi CAD?

- Kriteria stability dan tipe kapal mana diprioritaskan?

- Format DXF/layer standard apa yang digunakan?

- Metode resistance dan propeller mana menjadi default?
