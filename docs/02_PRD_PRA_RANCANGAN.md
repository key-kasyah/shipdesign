**PRODUCT REQUIREMENTS DOCUMENT**

PRD Tahap 2 — Pra-Rancangan Kapal

Ukuran Utama, Design Check, Berat, Kapasitas, Daya, dan Bentuk Awal

| **Kode Dokumen** | PRD-02-PRE                     |
|------------------|--------------------------------|
| **Tahap Produk** | Tahap 2 dari 7                 |
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

Tahap Pra-Rancangan mengubah Design Requirements Baseline menjadi konfigurasi kapal awal yang seimbang: ukuran utama, koefisien bentuk, displacement, estimasi berat dan kapasitas, daya, CSA, DWL, Gading 10, stabilitas awal, serta baseline desain pendahuluan.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Keputusan Produk<br />
</strong>Tahap ini menjadi fokus MVP utama. Modul yang sudah ada dipertahankan, dipisahkan antara calculation engine, validation engine, dependency engine, dan AI explanation. Estimasi Berat, Capacity Check, stabilitas awal, trim, dan iterasi keseimbangan menjadi fitur prioritas berikutnya.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# Latar Belakang dan Masalah

Kode saat ini telah menghitung scaling DWT, ukuran utama, koefisien bentuk, design check, daya NSP, CSA, DWL, dan Gading 10. Namun hasil belum membentuk keseimbangan berat–displacement–kapasitas–stabilitas, belum memiliki versioning permanen, dan penjelasan masih berupa teks statis yang belum terhubung ke dependency engine.

# Tujuan

- Menghasilkan preliminary design yang konsisten terhadap requirement.

- Memungkinkan iterasi ukuran, berat, kapasitas, daya, dan bentuk secara terkontrol.

- Menjelaskan setiap input, hasil, dan dampak perubahan dengan AI berbasis data proyek.

- Membentuk Preliminary Design Baseline sebagai input Basic Design.

## Bukan Tujuan

- Menghasilkan lines plan final dan class-approved.

- Menggantikan metode hambatan, stabilitas, atau klasifikasi detail.

- Menentukan scantling produksi.

# Pengguna dan Peran

| **Peran**       | **Kebutuhan Utama**                                  | **Hak/Aksi Kunci**                            |
|-----------------|------------------------------------------------------|-----------------------------------------------|
| Mahasiswa       | Belajar urutan pra-rancangan dan hubungan parameter. | Input, hitung, simulasi, baca AI explanation. |
| Naval Architect | Membentuk dan mengoptimasi desain awal.              | Kelola skenario, review, approve baseline.    |
| Dosen/Reviewer  | Memeriksa asumsi, formula, dan keseimbangan desain.  | Review hasil dan request revision.            |
| Admin Teknis    | Mengelola formula, range, dan knowledge base.        | Publish metode dan versi referensi.           |

# Ruang Lingkup

## Termasuk

- Kapal pembanding dan database referensi.

- Scaling dan optimasi ukuran utama.

- Koefisien bentuk dan perhitungan displacement.

- Design check rasio dan freeboard awal.

- Estimasi berat dan center of gravity awal.

- Capacity check, fuel, water, dan endurance.

- Estimasi daya NSP dan metode alternatif bertahap.

- CSA, DWL, Gading 10, dan koreksi Simpson.

- Stabilitas dan trim awal.

- Iterasi keseimbangan desain, skenario, baseline, serta AI assistant.

## Tidak Termasuk

- Offset table dan lines plan lengkap.

- Stabilitas lengkap semua loading condition.

- Detail propeller dan class structural calculation.

# Input, Output, dan Gate

| **Jenis**    | **Rincian**                                                                                                                                                                 |
|--------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Input Utama  | Requirement Baseline, kapal pembanding, formula/metode, LBP/B/T/H, Cb/Cm/Cw, density, kecepatan, DWT, payload, konsumsi, dan asumsi desain.                                 |
| Output Utama | Preliminary Design Baseline: ukuran utama, koefisien, displacement, weight/capacity summary, daya, bentuk awal, stabilitas/trim awal, asumsi, warning, dan revision record. |
| Entry Gate   | Requirement Baseline disetujui dan minimum satu kapal pembanding tersedia atau metode alternatif dipilih.                                                                   |
| Exit Gate    | Weight-displacement, DWT, kapasitas, daya, rasio, draft, freeboard, stabilitas awal, serta bentuk awal berada dalam toleransi yang disetujui.                               |

# Alur Kerja Utama

| **Requirement Baseline → Kapal Pembanding → Ukuran & Koefisien → Design Check → Berat & Kapasitas → Daya → CSA/DWL/Gading 10 → Stabilitas/Trim → Iterasi → Approve Preliminary Baseline** |
|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|

1.  Pilih kapal pembanding dan hitung estimasi ukuran.

2.  Pilih atau edit ukuran final dan koefisien dengan sumber metode.

3.  Jalankan design check dan perbaiki parameter yang gagal.

4.  Estimasi lightweight, deadweight components, dan pusat berat.

5.  Hitung kapasitas ruang/tangki, fuel, water, serta endurance.

6.  Hitung daya dan bentuk awal lambung.

7.  Hitung stabilitas dan trim awal.

8.  Bandingkan skenario dan setujui preliminary baseline.

# Kebutuhan Produk

## Kebutuhan Fungsional

| **ID**      | **Kebutuhan**                                             | **Prioritas** | **Acceptance Criteria**                                                                   | **Catatan/Dependensi** |
|-------------|-----------------------------------------------------------|---------------|-------------------------------------------------------------------------------------------|------------------------|
| **PRE-001** | Sistem mengelola satu atau lebih kapal pembanding.        | Must          | Data teknis, sumber, dan relevansi tersimpan; pengguna dapat memilih pembanding utama.    | Current code           |
| **PRE-002** | Sistem menghitung faktor skala DWT pangkat 1/3.           | Must          | Hasil dan formula ditampilkan; input nol/negatif ditolak.                                 | Current code           |
| **PRE-003** | Sistem mengestimasi LOA, LBP, B, T, dan H.                | Must          | Hasil scaling dapat dibandingkan dan disimpan.                                            | Current code           |
| **PRE-004** | Sistem mendukung ukuran hasil optimasi/manual.            | Must          | Pengguna dapat memilih hasil scaling atau manual dengan alasan perubahan.                 | Current code           |
| **PRE-005** | Sistem menghitung LWL dan Froude Number.                  | Must          | Satuan konsisten dan nilai diperbarui ketika LBP/speed berubah.                           | Current code           |
| **PRE-006** | Sistem menghitung Cb, Cm, Cw, Cp/Cph/Cpv.                 | Must          | Metode, sumber, applicability, dan nilai manual tersimpan.                                | Current code           |
| **PRE-007** | Sistem menghitung volume dan displacement.                | Must          | Δ = volume × density; density dan satuan terlihat.                                        | Current code           |
| **PRE-008** | Sistem menjalankan pemeriksaan L/B, B/T, H/T, L/H.        | Must          | Hasil, batas, sumber, dan status tampil.                                                  | Current code           |
| **PRE-009** | Sistem memisahkan empirical guidance dan mandatory rule.  | Must          | Warning empiris tidak otomatis dianggap pelanggaran regulasi.                             | Validation             |
| **PRE-010** | Sistem memeriksa freeboard awal dan batas draft.          | Must          | Hard limit memblokir gate; sumber batas tersimpan.                                        | Requirements           |
| **PRE-011** | Sistem mengestimasi kelompok lightweight.                 | Must          | Hull, machinery, electrical, outfit, accommodation, margin tersedia.                      | New priority           |
| **PRE-012** | Sistem mengestimasi deadweight components.                | Must          | Payload, fuel, water, stores, crew, consumable dihitung.                                  | New priority           |
| **PRE-013** | Sistem menghitung weight balance.                         | Must          | Total weight dibandingkan displacement dengan tolerance configurable.                     | Iteration              |
| **PRE-014** | Sistem menyimpan LCG/VCG/TCG kelompok berat.              | Should        | Center of gravity awal dapat digunakan untuk trim/stability.                              | Stage 3                |
| **PRE-015** | Sistem menghitung capacity check.                         | Must          | Required vs available untuk cargo dan tangki tampil dengan margin.                        | New priority           |
| **PRE-016** | Sistem menghitung fuel dan endurance awal.                | Must          | Konsumsi, waktu, reserve, dan tank volume saling terhubung.                               | Requirements           |
| **PRE-017** | Sistem menghitung estimasi EHP/BHP dengan metode NSP.     | Must          | Faktor displacement, speed, Cb, eta, correction, dan margin terlihat.                     | Current code           |
| **PRE-018** | Sistem menyediakan versi tabel/kurva NSP terdigitalisasi. | Should        | Interpolasi dapat direproduksi dan sumber data tercatat.                                  | Method data            |
| **PRE-019** | Sistem menggambar CSA 0–20 gading.                        | Must          | Grafik hover dan tabel area tersedia.                                                     | Current code           |
| **PRE-020** | Sistem mengintegrasikan CSA terhadap displacement target. | Must          | Volume hasil integrasi dibandingkan target dan dapat dikoreksi.                           | New                    |
| **PRE-021** | Sistem menghitung dan mengoreksi DWL.                     | Must          | AWL target, Simpson, correction, LCF, inertia, dan plot tersedia.                         | Current code           |
| **PRE-022** | Sistem menghitung dan mengoreksi Gading 10.               | Must          | A10 target, Simpson, correction, radius pendekatan, dan plot tersedia.                    | Current code           |
| **PRE-023** | Sistem menjaga ordinat tidak melebihi B/2.                | Must          | Auto-correct dibatalkan jika geometri melampaui batas.                                    | Current code           |
| **PRE-024** | Sistem menyediakan fairing dan smoothness check awal.     | Should        | Perubahan gradien/kelengkungan ekstrem diberi warning.                                    | Geometry               |
| **PRE-025** | Sistem menghitung stabilitas awal.                        | Must          | KB/BM/KM/KG/GM estimasi dan status tersedia.                                              | New priority           |
| **PRE-026** | Sistem menghitung trim awal.                              | Should        | LCB–LCG, trim moment, draft F/A ditampilkan.                                              | New priority           |
| **PRE-027** | Sistem mendukung beberapa skenario desain.                | Must          | Skenario dapat diduplikasi, dibandingkan, dan dipilih.                                    | Optimization           |
| **PRE-028** | Sistem menjalankan iterasi keseimbangan.                  | Must          | Menunjukkan mismatch berat, kapasitas, daya, draft, stabilitas, dan rekomendasi tindakan. | Core                   |
| **PRE-029** | Sistem menandai hasil downstream stale.                   | Must          | Perubahan input memberi daftar modul yang wajib dihitung ulang.                           | Dependency engine      |
| **PRE-030** | Sistem membuat Preliminary Design Baseline.               | Must          | Snapshot immutable, approval, laporan, dan revision history tersedia.                     | Gate                   |
| **PRE-031** | Sistem mengekspor ringkasan ke Excel/PDF/JSON.            | Should        | File memuat input, hasil, formula, status, warning, dan approval.                         | Reporting              |

## Kebutuhan AI Assistant

| **ID**      | **Kebutuhan**                                             | **Prioritas** | **Acceptance Criteria**                                                        | **Catatan/Dependensi** |
|-------------|-----------------------------------------------------------|---------------|--------------------------------------------------------------------------------|------------------------|
| **AI2-001** | AI menjelaskan parameter dan hasil dengan konteks proyek. | Must          | Jawaban menyebut nilai, satuan, rumus yang menggunakan, dan dampaknya.         | Knowledge+context      |
| **AI2-002** | AI menjelaskan mengapa design check gagal.                | Must          | Jawaban mengacu status validation engine dan menawarkan opsi, bukan keputusan. | Rules                  |
| **AI2-003** | AI menjalankan what-if melalui calculation engine.        | Should        | AI mengubah salinan skenario, bukan baseline, dan menampilkan before/after.    | Scenario engine        |
| **AI2-004** | AI menjelaskan dependency perubahan.                      | Must          | Perubahan B/T/Cb/density menampilkan direct dan downstream impacts.            | Dependency graph       |
| **AI2-005** | AI merangkum asumsi dan risiko pra-rancangan.             | Should        | Ringkasan memisahkan data, asumsi, warning, dan rekomendasi review.            | Review                 |
| **AI2-006** | AI tidak menghitung angka teknik sendiri.                 | Must          | Semua angka berasal dari tool calculation engine dengan trace ID.              | Safety                 |
| **AI2-007** | AI menyebut sumber formula dan batas penerapan.           | Must          | Jawaban menampilkan metode dan applicability dari formula registry.            | RAG                    |
| **AI2-008** | AI dapat membandingkan skenario.                          | Should        | Perbandingan menjelaskan trade-off kapasitas, daya, stabilitas, dan ukuran.    | Scenario               |

# Model Data dan Status

| **Entitas/Data**  | **Atribut Minimum**                               | **Relasi/Status**                          |
|-------------------|---------------------------------------------------|--------------------------------------------|
| ComparableShip    | dimensions, DWT, speed, BHP, coefficients, source | Dapat menjadi primary/secondary reference. |
| DesignScenario    | LBP, B, T, H, LWL, coefficients, density, speed   | Draft/Calculated/Reviewed/Selected.        |
| CalculationResult | method_id, inputs hash, outputs, units, timestamp | Valid/Stale/Error.                         |
| WeightItem        | group, mass, LCG, VCG, TCG, margin                | Lightweight/Deadweight.                    |
| CapacityItem      | space/tank, required, available, margin, CG       | Berelasi ke GA pada tahap berikutnya.      |
| GeometryData      | stations, ordinates, factors, correction          | CSA/DWL/Gading10.                          |
| ValidationResult  | rule_id, value, limit, status, severity           | Blocking/Warning/Info.                     |
| Baseline          | scenario snapshot, approvals, reports             | Input Tahap 3.                             |

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

- Calculation engine adalah sumber tunggal angka; AI hanya mengorkestrasi dan menjelaskan.

- Formula wajib memiliki version ID, sumber, tipe kapal, dan applicability.

- Design check empiris dan regulasi dipisahkan berdasarkan severity dan authority.

- Auto-correct geometri tidak boleh melewati B/2 atau menghasilkan nilai negatif.

- Perubahan ukuran, koefisien, density, atau speed membuat hasil terkait stale.

- Preliminary baseline hanya dapat disetujui jika semua blocking check lulus atau waiver formal tersedia.

- Skenario what-if tidak boleh mengubah baseline sebelum approval.

# Persyaratan UX

- Sidebar modul dengan progress dan stale indicator.

- Panel summary menampilkan ukuran, weight balance, capacity, power, stability, dan warning.

- Setiap input memiliki info button, dependency preview, dan source.

- Grafik interaktif untuk CSA, DWL, Gading 10, serta perbandingan skenario.

- Tombol “Hitung Ulang yang Terdampak” menjalankan kalkulasi terpilih.

- Approval menampilkan change summary dan unresolved warning.

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

| **Metrik**                  | **Target Awal**                                            | **Cara Ukur**                |
|-----------------------------|------------------------------------------------------------|------------------------------|
| Calculation reproducibility | 100% hasil dapat direproduksi                              | Input hash + method version. |
| Weight balance convergence  | Mismatch ≤ tolerance proyek                                | Δ versus total weight.       |
| Stale detection             | 100% dependency utama tertandai                            | Automated change tests.      |
| User comprehension          | ≥80% pengguna memahami dampak input                        | Task survey.                 |
| Preliminary completion      | ≥70% proyek uji lolos baseline tanpa spreadsheet eksternal | Pilot projects.              |

# Acceptance Criteria Tahap

- Semua fitur source code saat ini tersedia dalam arsitektur modular.

- Estimasi Berat dan Capacity Check terhubung ke displacement dan requirement.

- AI menjelaskan density, ukuran, koefisien, check, daya, dan geometri dengan konteks proyek.

- Dependency engine menandai modul stale setelah perubahan input.

- Satu desain dapat melalui iterasi sampai Preliminary Baseline disetujui dan diekspor.

# Risiko dan Mitigasi

| **Risiko**                                      | **Dampak**                    | **Mitigasi**                                              |
|-------------------------------------------------|-------------------------------|-----------------------------------------------------------|
| Formula empiris digunakan di luar applicability | Hasil menyesatkan             | Formula registry, applicability check, dan warning.       |
| Weight estimate terlalu kasar                   | Keseimbangan desain palsu     | Confidence range, margin, dan update progresif.           |
| AI memodifikasi nilai tanpa sadar               | Baseline rusak                | What-if selalu di skenario salinan dan perlu approval.    |
| Geometri auto-correct tidak fair                | Lines plan sulit dikembangkan | Smoothness check dan human review.                        |
| Ruang lingkup MVP terlalu besar                 | Pengembangan lambat           | Rilis bertahap: weight/capacity lalu stability/iteration. |

# Rencana Rilis

| **Rilis** | **Fokus**                                                           | **Kriteria Keluar**                       |
|-----------|---------------------------------------------------------------------|-------------------------------------------|
| MVP-A     | Refactor current modules, database, formula registry, AI explainer. | Fitur lama stabil dan tersimpan permanen. |
| MVP-B     | Weight estimate, capacity, fuel/endurance, dependency engine.       | Weight-capacity balance dapat dihitung.   |
| R1        | Stability/trim awal, scenario compare, iteration, baseline.         | Preliminary design dapat di-approve.      |
| R2        | Metode alternatif, fairing awal, laporan lengkap.                   | Siap menjadi input Basic Design.          |

# Pertanyaan Terbuka

- Metode estimasi berat mana yang diprioritaskan per tipe kapal?

- Tolerance weight-displacement dan capacity margin berapa?

- Apakah NSP tetap metode utama atau kontrol pembanding?

- Kriteria stabilitas awal apa yang digunakan pada MVP?

- Apakah ordinat default harus digenerasikan per tipe kapal?
