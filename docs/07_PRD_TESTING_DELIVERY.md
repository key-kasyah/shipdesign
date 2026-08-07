**PRODUCT REQUIREMENTS DOCUMENT**

PRD Tahap 7 — Pengujian dan Penyerahan

Commissioning, HAT, Inclining, Sea Trial, Sertifikasi, As-Built, dan Handover

| **Kode Dokumen** | PRD-07-TST                     |
|------------------|--------------------------------|
| **Tahap Produk** | Tahap 7 dari 7                 |
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

Tahap Pengujian dan Penyerahan memverifikasi bahwa kapal yang dibangun memenuhi desain, kontrak, class, flag, dan performa; menyelesaikan defect; membentuk as-built baseline; serta menyerahkan kapal dan dokumen kepada operator.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Keputusan Produk<br />
</strong>Sistem harus menghubungkan test requirement, procedure, instrument, result, deviation, corrective action, certificate, as-built document, dan acceptance decision. Hasil aktual dibandingkan langsung dengan requirement dan design baseline.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# Latar Belakang dan Masalah

Data testing sering tersebar dalam spreadsheet, laporan vendor, dan dokumen manual. Tanpa traceability, sulit membuktikan requirement mana yang sudah diuji, penyimpangan apa yang belum selesai, dan dokumen apa yang harus diserahkan.

# Tujuan

- Mengelola test plan dari FAT hingga sea trial.

- Membandingkan design requirement dengan hasil aktual.

- Mengelola defect, corrective action, retest, dan acceptance.

- Membentuk As-Built/Delivery Baseline dan handover package.

## Bukan Tujuan

- Mengoperasikan kapal setelah warranty kecuali integrasi future.

- Menggantikan instrument data acquisition khusus.

- Mengeluarkan sertifikat class/flag secara mandiri.

# Pengguna dan Peran

| **Peran**              | **Kebutuhan Utama**                   | **Hak/Aksi Kunci**                |
|------------------------|---------------------------------------|-----------------------------------|
| Commissioning Engineer | Menyiapkan dan menjalankan test.      | Procedure, result, issue, retest. |
| Sea Trial Team         | Melaksanakan trial dan mencatat data. | Test execution and evidence.      |
| Owner/Class/Flag       | Witness dan acceptance.               | Approve, comment, certify.        |
| Document Controller    | Menyusun as-built dan handover.       | Register, completeness, release.  |
| Crew/Operator          | Menerima kapal dan training.          | Review manuals and sign-off.      |

# Ruang Lingkup

## Termasuk

- FAT/shop test references.

- Structural/tank tests, HAT, commissioning, inclining experiment.

- Sea trial: speed, endurance, maneuvering, machinery, noise/vibration, fuel.

- Result analysis, defect, corrective action, retest, acceptance.

- As-built drawings, manuals, certificates, training, delivery, warranty baseline.

- AI Testing & Delivery Assistant.

## Tidak Termasuk

- Long-term fleet operation and maintenance analytics.

- Certificate issuance authority.

# Input, Output, dan Gate

| **Jenis**    | **Rincian**                                                                                                                                                          |
|--------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Input Utama  | Design Requirements, Approved/Production/Construction Baselines, test procedures, instruments/calibration, completion records, class/flag/owner requirements.        |
| Output Utama | Test and trial records, actual performance, final stability data, accepted defect status, certificates, as-built baseline, manuals, handover, dan warranty register. |
| Entry Gate   | Mechanical completion dan testing readiness approved; test procedure dan instrumentation tersedia.                                                                   |
| Exit Gate    | Mandatory tests accepted, critical defects closed, certificates/handovers complete, as-built baseline released, dan delivery protocol ditandatangani.                |

# Alur Kerja Utama

| **Testing Readiness → Approve Procedure → Execute/Witness Test → Capture Result → Compare Requirement → Accept atau Defect → Correct/Retest → Certificates/As-Built → Training & Handover → Delivery Baseline** |
|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|

1.  Bangun master test register dan matrix requirement-to-test.

2.  Approve procedure, instruments, calibration, witness, serta prerequisites.

3.  Jalankan shop/harbor/inclining/sea trial dan rekam evidence.

4.  Bandingkan hasil dengan acceptance criteria.

5.  Kelola defect, corrective action, retest, dan sign-off.

6.  Finalisasi as-built, manuals, certificates, training, dan handover.

# Kebutuhan Produk

## Kebutuhan Fungsional

| **ID**      | **Kebutuhan**                                    | **Prioritas** | **Acceptance Criteria**                                              | **Catatan/Dependensi** |
|-------------|--------------------------------------------------|---------------|----------------------------------------------------------------------|------------------------|
| **TST-001** | Sistem mengelola master test register.           | Must          | Test ID, system, requirement, stage, procedure, witness, status.     | Construction turnover  |
| **TST-002** | Sistem menghubungkan requirement ke test case.   | Must          | Setiap requirement wajib memiliki evidence atau justification.       | Traceability           |
| **TST-003** | Sistem mengelola test procedure approval.        | Must          | Revision, prerequisites, steps, criteria, instruments, approvals.    | Workflow               |
| **TST-004** | Sistem mengelola instrument dan calibration.     | Must          | Instrument ID, range, accuracy, calibration validity.                | Quality                |
| **TST-005** | Sistem mengelola FAT/shop test references.       | Should        | Vendor result dan acceptance tersimpan.                              | Vendor                 |
| **TST-006** | Sistem mengelola tank/structural tests.          | Must          | Test type, pressure, duration, result, witness, evidence.            | Construction           |
| **TST-007** | Sistem mengelola Harbor Acceptance Test.         | Must          | System tests, alarms, generators, steering, fire, bilge, electrical. | Commissioning          |
| **TST-008** | Sistem mengelola commissioning status.           | Must          | System/subsystem prerequisites, checks, completion.                  | Turnover               |
| **TST-009** | Sistem mengelola inclining experiment.           | Must          | Condition, weights, readings, corrections, lightship, LCG/VCG.       | Stability              |
| **TST-010** | Sistem memperbarui final stability data.         | Must          | Approved inclining result linked to final booklet.                   | As-built               |
| **TST-011** | Sistem mengelola sea trial plan dan sequence.    | Must          | Weather, draft, loading, area, sequence, witness.                    | Trial                  |
| **TST-012** | Sistem mencatat speed trial.                     | Must          | Runs, corrections, speed/power, criteria, evidence.                  | Performance            |
| **TST-013** | Sistem mencatat maneuvering tests.               | Must          | Turning, zig-zag, crash stop, steering, criteria.                    | Maneuvering            |
| **TST-014** | Sistem mencatat machinery/endurance performance. | Must          | Loads, temperatures, pressures, vibration, alarms, consumption.      | Machinery              |
| **TST-015** | Sistem mencatat noise dan vibration.             | Should        | Measurement points, conditions, criteria, result.                    | Habitability           |
| **TST-016** | Sistem membandingkan design versus actual.       | Must          | Requirement, predicted, measured, correction, variance, status.      | Analytics              |
| **TST-017** | Sistem mengelola defect/punch dari test.         | Must          | Severity, owner, due, action, retest, closure.                       | Acceptance             |
| **TST-018** | Sistem mengelola corrective action dan retest.   | Must          | Defect tidak closed tanpa accepted retest/evidence.                  | Quality                |
| **TST-019** | Sistem mengelola acceptance sign-off.            | Must          | Owner/class/flag/yard role dan decision tersimpan.                   | Approval               |
| **TST-020** | Sistem mengelola as-built drawing register.      | Must          | Final revision, source redline, approval, distribution.              | Documents              |
| **TST-021** | Sistem mengelola final manuals dan spare parts.  | Must          | Manual, certificate, spare list, training material.                  | Handover               |
| **TST-022** | Sistem mengelola certificate register.           | Must          | Certificate type, issuer, validity, file, condition.                 | Certification          |
| **TST-023** | Sistem mengelola crew training dan handover.     | Should        | Topic, participant, date, evidence, acceptance.                      | Delivery               |
| **TST-024** | Sistem mengelola delivery protocol dan warranty. | Must          | Outstanding items, warranty start/end, contacts, signatories.        | Closeout               |
| **TST-025** | Sistem membentuk As-Built/Delivery Baseline.     | Must          | Final docs, data, tests, certificates, approvals snapshot.           | Final gate             |

## Kebutuhan AI Assistant

| **ID**      | **Kebutuhan**                                           | **Prioritas** | **Acceptance Criteria**                                                     | **Catatan/Dependensi** |
|-------------|---------------------------------------------------------|---------------|-----------------------------------------------------------------------------|------------------------|
| **AI7-001** | AI membandingkan hasil trial dengan design requirement. | Must          | Menggunakan measured data dan criteria; menunjukkan variance dan status.    | Analytics              |
| **AI7-002** | AI menjelaskan penyimpangan dan kemungkinan faktor.     | Should        | Memisahkan data, koreksi, asumsi, dan hipotesis yang perlu engineer review. | Safety                 |
| **AI7-003** | AI merangkum defect dan corrective status.              | Should        | Mengelompokkan severity/system/owner/due.                                   | Issues                 |
| **AI7-004** | AI memeriksa kelengkapan handover.                      | Must          | Checklist dokumen, certificates, manuals, training, outstanding.            | Handover               |
| **AI7-005** | AI membuat sea trial dan delivery summary.              | Should        | Draft report berdasarkan data valid dan perlu approval.                     | Reporting              |
| **AI7-006** | AI tidak mengubah acceptance result.                    | Must          | Keputusan hanya oleh authorized human roles.                                | Safety                 |

# Model Data dan Status

| **Entitas/Data** | **Atribut Minimum**                                    | **Relasi/Status**     |
|------------------|--------------------------------------------------------|-----------------------|
| TestRequirement  | source requirement, criteria, method, evidence needed  | Mapped to test case.  |
| TestProcedure    | revision, steps, instruments, prerequisites, approvals | Approved/Obsolete.    |
| TestRun          | conditions, readings, corrections, results, witnesses  | Pass/Fail/Retest.     |
| Instrument       | range, accuracy, calibration certificate/validity      | Valid/Expired.        |
| Defect           | test source, severity, action, retest, closure         | Open/Closed.          |
| Certificate      | issuer, type, number, validity, conditions             | Current.              |
| HandoverItem     | document/equipment/training, owner, status             | Complete/Outstanding. |
| DeliveryBaseline | as-built data, tests, certificates, approvals          | Final snapshot.       |

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

- Test tidak dapat dijalankan resmi tanpa approved procedure dan valid calibration.

- Pass/fail ditentukan acceptance criteria, bukan AI.

- Test condition dan correction method wajib disimpan bersama result.

- Defect kritis memblokir delivery sampai closed atau formal concession.

- As-built drawing harus menggabungkan approved field changes/redlines.

- Certificate dan manual wajib memiliki completeness status.

- Delivery baseline immutable; warranty changes dicatat sebagai lifecycle record.

# Persyaratan UX

- Master test matrix dengan status dan coverage requirement.

- Execution mode untuk tablet dengan steps, readings, photos, signatures.

- Real-time dashboard trial dan deviation.

- Side-by-side predicted vs measured charts.

- Handover completeness dashboard dan digital dossier.

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
| Data Integrity    | Test data dan sign-off harus memiliki immutable audit trail serta tamper evidence.                                             |
| Time Sync         | Timestamp dan source device untuk data trial harus tersinkronisasi.                                                            |

# Metrik Keberhasilan

| **Metrik**                 | **Target Awal**                    | **Cara Ukur**                 |
|----------------------------|------------------------------------|-------------------------------|
| Requirement test coverage  | 100% mandatory requirement covered | Trace matrix.                 |
| Critical defect closure    | 100% sebelum delivery              | Defect register.              |
| Handover completeness      | 100% mandatory items               | Checklist.                    |
| Report preparation time    | Turun ≥40%                         | Trial-to-report duration.     |
| Design prediction accuracy | Tercatat untuk feedback model      | Predicted vs actual variance. |

# Acceptance Criteria Tahap

- Master test matrix menghubungkan requirement, procedure, result, evidence, dan acceptance.

- Inclining dan sea trial result dapat dibandingkan dengan design prediction.

- Defect, retest, certificate, as-built, manual, dan handover berjalan end-to-end.

- Delivery Baseline dapat dibekukan dan diekspor sebagai digital dossier.

# Risiko dan Mitigasi

| **Risiko**                         | **Dampak**         | **Mitigasi**                                       |
|------------------------------------|--------------------|----------------------------------------------------|
| Data instrument tidak terintegrasi | Input manual error | Import templates/API dan double verification.      |
| Acceptance criteria berubah        | Retest/rework      | Versioned requirements/procedures.                 |
| Sign-off digital tidak diakui      | Dokumen ganda      | Configurable signatures dan export official forms. |
| As-built terlambat                 | Handover tertunda  | Redline workflow dimulai sejak konstruksi.         |

# Rencana Rilis

| **Rilis** | **Fokus**                                            | **Kriteria Keluar**         |
|-----------|------------------------------------------------------|-----------------------------|
| MVP       | Test register, procedure, execution, defect, report. | HAT satu system selesai.    |
| R1        | Inclining, sea trial, predicted-vs-actual.           | Trial package lengkap.      |
| R2        | Certificates, as-built, training, handover dossier.  | Delivery baseline complete. |

# Pertanyaan Terbuka

- Sistem instrument/data acquisition apa yang harus diintegrasikan?

- Template test dan correction method mana yang menjadi default?

- Siapa authority acceptance untuk setiap jenis test?

- Apakah digital dossier harus mengikuti format tertentu?
