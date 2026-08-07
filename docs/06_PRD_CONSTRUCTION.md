**PRODUCT REQUIREMENTS DOCUMENT**

PRD Tahap 6 — Konstruksi Kapal

Material, Fabrikasi, Assembly, Erection, Instalasi, QC, Progress, dan Cost

| **Kode Dokumen** | PRD-06-CON                     |
|------------------|--------------------------------|
| **Tahap Produk** | Tahap 6 dari 7                 |
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

Tahap Konstruksi mengelola eksekusi work package dari material receipt hingga kapal selesai dibangun, termasuk progress, quality, nonconformity, perubahan, biaya, dan kesiapan pengujian.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Keputusan Produk<br />
</strong>Platform menjadi execution visibility layer yang menghubungkan work package, material, inspection, progress, dan revision. Sistem tidak menggantikan kontrol mesin produksi, tetapi menerima status dan evidence.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# Latar Belakang dan Masalah

Konstruksi kapal melibatkan ribuan item dan pekerjaan. Tanpa hubungan antara drawing, work package, material, inspection, dan progress, galangan sulit mengetahui kesiapan, keterlambatan, penggunaan revisi salah, serta dampak perubahan desain.

# Tujuan

- Menjamin pekerjaan menggunakan package dan revisi yang benar.

- Melacak material, fabrikasi, block, erection, instalasi, dan outfitting.

- Mengelola QC, NDT, NCR, corrective action, dan release.

- Memantau progress, resource, cost, delay, dan readiness testing.

## Bukan Tujuan

- Mengontrol CNC, welding robot, atau PLC secara langsung.

- Menggantikan semua ERP/MES; integrasi dapat digunakan.

- Menjalankan acceptance test final.

# Pengguna dan Peran

| **Peran**             | **Kebutuhan Utama**               | **Hak/Aksi Kunci**                    |
|-----------------------|-----------------------------------|---------------------------------------|
| Production Supervisor | Mengelola pekerjaan harian.       | Start/complete package, report issue. |
| Worker/Foreman        | Melihat instruction dan drawing.  | Update status dan evidence.           |
| QC Inspector          | Melakukan inspection dan release. | Record result, NCR, NDT.              |
| Material Controller   | Melacak receipt dan issuance.     | Manage material traceability.         |
| Project Manager       | Memantau progress, cost, delay.   | Dashboard, forecast, escalation.      |
| Surveyor/Owner Rep    | Witness/approve hold points.      | Inspection sign-off.                  |

# Ruang Lingkup

## Termasuk

- Material receiving, certificate, storage, issuance, dan traceability.

- Fabrikasi, subassembly, assembly, block, erection.

- Machinery, piping, electrical, HVAC, safety, dan outfitting installation.

- Inspection/test plan, welding/NDT, NCR/corrective action.

- Progress, man-hour, cost, delay, forecast, dan construction change.

- AI Construction Assistant.

## Tidak Termasuk

- Design calculation authoring detail.

- Production drawing creation.

- Final sea trial and vessel delivery.

# Input, Output, dan Gate

| **Jenis**    | **Rincian**                                                                                                                           |
|--------------|---------------------------------------------------------------------------------------------------------------------------------------|
| Input Utama  | Production Baseline, released work packages, drawings, BOM, material/PO, ITP, WPS, resources, schedule, dan change notices.           |
| Output Utama | Completed vessel, construction records, QC dossiers, material certificates, progress/cost history, punch list, dan testing readiness. |
| Entry Gate   | Production Baseline released dan initial material/work package tersedia.                                                              |
| Exit Gate    | Construction complete, systems mechanically completed, QC/inspection closed, punch list terkontrol, dan testing readiness approved.   |

# Alur Kerja Utama

| **Released Package → Material Ready → Execute Work → Inspect/Test → Accept atau NCR → Update Progress/Cost → Block/Erection/Install → Mechanical Completion → Testing Readiness** |
|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|

1.  Terima dan verifikasi material serta sertifikat.

2.  Issue material dan work package ke area kerja.

3.  Lakukan fabrication/assembly/erection/installation.

4.  Catat inspection, NDT, dimensional control, dan evidence.

5.  Kelola NCR, corrective action, dan reinspection.

6.  Perbarui progress, man-hour, cost, forecast, dan issue.

7.  Tutup mechanical completion dan serahkan ke testing.

# Kebutuhan Produk

## Kebutuhan Fungsional

| **ID**      | **Kebutuhan**                                             | **Prioritas** | **Acceptance Criteria**                                        | **Catatan/Dependensi** |
|-------------|-----------------------------------------------------------|---------------|----------------------------------------------------------------|------------------------|
| **CON-001** | Sistem menerima Production Baseline dan package released. | Must          | Hanya package valid/released yang dapat dieksekusi.            | Stage 5                |
| **CON-002** | Sistem mengelola material receipt dan inspection.         | Must          | PO/item/qty/certificate/date/status tersimpan.                 | Material               |
| **CON-003** | Sistem mengelola material storage dan issuance.           | Must          | Location, reservation, issue-to-package, remaining qty.        | Warehouse              |
| **CON-004** | Sistem melacak heat/batch/material certificate.           | Must          | Material dapat ditelusuri ke part/block dan certificate.       | Traceability           |
| **CON-005** | Sistem mengelola fabrication task.                        | Must          | Part, machine/process, worker, start/end, status, evidence.    | Shop                   |
| **CON-006** | Sistem mengelola assembly dan block construction.         | Must          | Package, components, alignment, weld, completion.              | Hull                   |
| **CON-007** | Sistem mengelola erection sequence dan status.            | Must          | Block lift, alignment, weld, survey, release.                  | Erection               |
| **CON-008** | Sistem mengelola machinery installation.                  | Must          | Equipment receipt, foundation, lifting, alignment, completion. | Machinery              |
| **CON-009** | Sistem mengelola system installation.                     | Must          | Piping, cable, HVAC, navigation, safety installation.          | Systems                |
| **CON-010** | Sistem mengelola pre-outfitting dan final outfitting.     | Should        | Package dan completion per zone/block.                         | Outfit                 |
| **CON-011** | Sistem mengelola Inspection and Test Plan.                | Must          | Inspection point, hold/witness/review, criteria, responsible.  | Quality                |
| **CON-012** | Sistem mengelola welding records.                         | Must          | Joint, welder, WPS, consumable, date, result.                  | Quality                |
| **CON-013** | Sistem mengelola NDT records.                             | Must          | Method, coverage, result, report, acceptance.                  | Quality                |
| **CON-014** | Sistem mengelola dimensional control.                     | Should        | Target, actual, tolerance, survey report.                      | Quality                |
| **CON-015** | Sistem mengelola NCR.                                     | Must          | Issue, severity, disposition, owner, due, evidence, status.    | Quality                |
| **CON-016** | Sistem mengelola corrective action dan reinspection.      | Must          | NCR tidak closed tanpa evidence dan sign-off.                  | Quality                |
| **CON-017** | Sistem mengelola inspection release.                      | Must          | Work dapat lanjut hanya setelah hold point released.           | Workflow               |
| **CON-018** | Sistem mencatat planned dan actual progress.              | Must          | Progress per WBS/package/block/system.                         | Planning               |
| **CON-019** | Sistem mencatat man-hour dan resource.                    | Should        | Actual versus estimate dan productivity tersedia.              | Cost                   |
| **CON-020** | Sistem memantau cost dan earned value.                    | Should        | PV/EV/AC, variance, forecast.                                  | Project control        |
| **CON-021** | Sistem menganalisis delay dan critical path impact.       | Should        | Issue/change/material delay memengaruhi forecast.              | Planning               |
| **CON-022** | Sistem mengelola field change dan redline.                | Must          | Perubahan terkait design change dan as-built update.           | Change                 |
| **CON-023** | Sistem mengelola punch list.                              | Must          | Item, location, owner, due, severity, closure.                 | Completion             |
| **CON-024** | Sistem mengelola mechanical completion.                   | Must          | Checklist per system/zone dan turnover package.                | Stage 7                |
| **CON-025** | Sistem membuat construction completion report.            | Should        | Progress, quality, material, outstanding, readiness.           | Reporting              |

## Kebutuhan AI Assistant

| **ID**      | **Kebutuhan**                                    | **Prioritas** | **Acceptance Criteria**                                              | **Catatan/Dependensi** |
|-------------|--------------------------------------------------|---------------|----------------------------------------------------------------------|------------------------|
| **AI6-001** | AI merangkum progres dan blocker.                | Must          | Menggunakan data schedule/progress/issue terkini.                    | Dashboard              |
| **AI6-002** | AI mendeteksi potensi keterlambatan.             | Should        | Menjelaskan dependency dan evidence, bukan prediksi tanpa dasar.     | Planning               |
| **AI6-003** | AI menjelaskan NCR dan tindakan berikutnya.      | Should        | Merangkum requirement, disposition, due, dan affected work.          | Quality                |
| **AI6-004** | AI menunjukkan dampak revisi desain di lapangan. | Must          | Menelusuri package, part, material, completed work, dan rework risk. | Dependency             |
| **AI6-005** | AI membantu inspection checklist dan report.     | Should        | Checklist berasal dari ITP/WPS/rules dan perlu inspector sign-off.   | Quality                |
| **AI6-006** | AI membuat construction status report.           | Should        | Ringkasan progress, cost, quality, risk, dan next actions.           | Reporting              |

# Model Data dan Status

| **Entitas/Data** | **Atribut Minimum**                               | **Relasi/Status**           |
|------------------|---------------------------------------------------|-----------------------------|
| MaterialLot      | item, heat/batch, certificate, location, quantity | Received/Accepted/Issued.   |
| ExecutionTask    | work package, object, process, assignee, dates    | Ready/In progress/Complete. |
| Inspection       | ITP point, result, evidence, inspector            | Pass/Fail/Hold.             |
| WeldRecord       | joint, welder, WPS, NDT links                     | Accepted/Repair.            |
| NCR              | issue, severity, disposition, actions, status     | Open/Closed.                |
| ProgressRecord   | WBS/package, planned, actual, manhours, cost      | Time series.                |
| PunchItem        | location, category, owner, due, status            | Open/Closed.                |
| TurnoverPackage  | system/zone, documents, outstanding               | Ready/Accepted.             |

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

- Work tidak dapat dimulai tanpa package released dan material valid.

- Hold point memblokir pekerjaan berikutnya sampai release.

- Material certificate harus tertelusur ke part/block sesuai requirement.

- NCR closure memerlukan corrective evidence dan approval.

- Perubahan drawing setelah pekerjaan mulai memicu field impact assessment.

- Progress tidak boleh melebihi completion evidence yang disyaratkan.

- AI tidak dapat menutup NCR, inspection, atau punch item.

# Persyaratan UX

- Mobile-friendly work package dan inspection views.

- QR/barcode untuk material, package, block, equipment, dan location.

- Offline capture dengan sinkronisasi ketika koneksi tersedia.

- Dashboard visual per zone/block/system dan schedule.

- Alert untuk obsolete drawing, hold point, material shortage, dan overdue NCR.

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
| Offline           | Fungsi kritis lapangan mendukung offline capture dan conflict-safe synchronization.                                            |
| Evidence          | Foto, dokumen, tanda tangan, dan waktu/lokasi dapat disimpan secara aman.                                                      |

# Metrik Keberhasilan

| **Metrik**                 | **Target Awal**                          | **Cara Ukur**         |
|----------------------------|------------------------------------------|-----------------------|
| Obsolete drawing incidents | 0 pekerjaan baru dengan drawing obsolete | Field audit.          |
| NCR closure time           | Turun ≥20%                               | Median open-to-close. |
| Material traceability      | 100% material kritis tertelusur          | Trace audit.          |
| Schedule predictability    | Forecast error turun ≥20%                | Baseline vs actual.   |
| Digital completion         | ≥80% work package tanpa kertas           | Usage analytics.      |

# Acceptance Criteria Tahap

- Work package dapat dieksekusi dari material readiness sampai inspection release.

- Material, weld, NDT, NCR, progress, dan punch list dapat ditelusuri ke block/system.

- Change impact menandai pekerjaan completed/in-progress yang terdampak.

- Mechanical completion dan turnover package dapat diserahkan ke Tahap 7.

# Risiko dan Mitigasi

| **Risiko**               | **Dampak**         | **Mitigasi**                                        |
|--------------------------|--------------------|-----------------------------------------------------|
| Koneksi lapangan buruk   | Update tertunda    | Offline-first dan sync queue.                       |
| Adopsi pekerja rendah    | Data tidak lengkap | UI sederhana, QR, training, minimal input.          |
| Integrasi ERP/MES gagal  | Duplikasi data     | API contracts dan staged integration.               |
| Evidence tidak dipercaya | Sengketa kualitas  | Timestamp, identity, audit trail, signature policy. |

# Rencana Rilis

| **Rilis** | **Fokus**                                           | **Kriteria Keluar**            |
|-----------|-----------------------------------------------------|--------------------------------|
| MVP       | Work package, material, inspection, NCR, progress.  | Satu block workflow digital.   |
| R1        | QR/offline, welding/NDT, punch, turnover.           | Mechanical completion digital. |
| R2        | ERP/MES integration, earned value, predictive risk. | Project-wide deployment.       |

# Pertanyaan Terbuka

- Perangkat lapangan dan kebijakan offline apa yang digunakan?

- ERP/MES/warehouse mana yang harus diintegrasikan?

- Apakah tanda tangan digital memiliki kebutuhan legal tertentu?

- Level detail progress dan cost yang boleh dilihat tiap peran?
