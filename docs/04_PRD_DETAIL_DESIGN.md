**PRODUCT REQUIREMENTS DOCUMENT**

PRD Tahap 4 — Detail Design & Approval

Struktur, Machinery, Piping, Electrical, Safety, dan Class Workflow

| **Kode Dokumen** | PRD-04-DET                     |
|------------------|--------------------------------|
| **Tahap Produk** | Tahap 4 dari 7                 |
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

Tahap Detail Design menerjemahkan Basic Design Baseline menjadi perhitungan dan drawing teknis yang siap ditinjau, disetujui, dan diteruskan ke Production Design.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Keputusan Produk<br />
</strong>Platform harus berfungsi sebagai common data environment dengan rule traceability dan approval workflow. Tujuan utamanya bukan menggantikan seluruh CAD/CAE, tetapi menghubungkan data, kalkulasi, dokumen, komentar, dan revisi.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# Latar Belakang dan Masalah

Detail design melibatkan banyak disiplin dan dokumen. Tanpa kontrol versi, dependency, dan comment resolution yang terpusat, perubahan satu sistem dapat tidak tercermin pada struktur, piping, electrical, atau dokumen class.

# Tujuan

- Mengelola detail structure, machinery, piping, electrical, HVAC, outfitting, dan safety.

- Menjamin data antar-disiplin konsisten dan dapat ditelusuri.

- Mengelola submission, class comment, response, revision, dan approval.

- Membentuk Approved Design Baseline untuk produksi.

## Bukan Tujuan

- Menghasilkan semua model produksi dan spool secara otomatis.

- Menggantikan class surveyor atau software FEA/CAD khusus.

- Mengelola aktivitas fabrikasi harian.

# Pengguna dan Peran

| **Peran**           | **Kebutuhan Utama**                     | **Hak/Aksi Kunci**                         |
|---------------------|-----------------------------------------|--------------------------------------------|
| Discipline Engineer | Membuat calculation dan drawing detail. | Edit data, upload drawing, resolve issues. |
| Lead Engineer       | Koordinasi lintas disiplin.             | Review, approve internal, manage change.   |
| Class/Flag Liaison  | Mengelola submission dan comment.       | Submit, assign, respond, track.            |
| Surveyor/Reviewer   | Memeriksa compliance.                   | Comment dan approve/reject.                |
| Document Controller | Mengelola nomor, revisi, distribusi.    | Release dan archive.                       |

# Ruang Lingkup

## Termasuk

- Detail structural design dan strength calculations.

- Machinery, shafting, piping, electrical, HVAC, outfitting, dan safety details.

- Document register, submission, comments, revision, approval, dan baseline.

- Cross-discipline clash/data checks.

- AI Detail Design Assistant.

## Tidak Termasuk

- Cutting/nesting, block assembly, dan construction progress.

- Final commissioning dan sea trial.

# Input, Output, dan Gate

| **Jenis**    | **Rincian**                                                                                                                  |
|--------------|------------------------------------------------------------------------------------------------------------------------------|
| Input Utama  | Basic Design Baseline, rule/class basis, equipment/vendor data, calculation models, drawings, comments, dan change requests. |
| Output Utama | Approved detail drawings/calculations, comment closure records, discipline registers, dan Approved Design Baseline.          |
| Entry Gate   | Basic Design Baseline disetujui dan design basis/class notation dikunci.                                                     |
| Exit Gate    | Dokumen wajib approved/approved with comments, semua comment kritis ditutup, dan data produksi released.                     |

# Alur Kerja Utama

| **Basic Baseline → Discipline Design → Internal Check → Cross-Discipline Review → Submit Class/Flag → Receive Comments → Revise/Respond → Approval → Approved Design Baseline** |
|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|

1.  Buat document register dan design basis tiap disiplin.

2.  Lakukan calculation dan detail drawing.

3.  Jalankan internal check serta cross-discipline review.

4.  Submit dokumen sesuai package.

5.  Kelola comment, response, revision, dan evidence.

6.  Release approved baseline untuk Production Design.

# Kebutuhan Produk

## Kebutuhan Fungsional

| **ID**      | **Kebutuhan**                                                 | **Prioritas** | **Acceptance Criteria**                                                        | **Catatan/Dependensi** |
|-------------|---------------------------------------------------------------|---------------|--------------------------------------------------------------------------------|------------------------|
| **DET-001** | Sistem mengelola design basis dan rule set per disiplin.      | Must          | Rule/version/notasi dapat ditelusuri ke calculation dan drawing.               | Basic baseline         |
| **DET-002** | Sistem mengelola document/drawing register.                   | Must          | Nomor, title, discipline, revision, status, owner, due date tersedia.          | DMS                    |
| **DET-003** | Sistem mengelola structural detail objects.                   | Must          | Plate, stiffener, frame, girder, bulkhead, deck, foundation terdata.           | Structure              |
| **DET-004** | Sistem menyimpan scantling calculations.                      | Must          | Input, rule formula, result, utilization, dan approval tersimpan.              | Rules                  |
| **DET-005** | Sistem mendukung longitudinal strength.                       | Must          | SWBM, wave BM, SF, section modulus, utilization tersedia.                      | Strength               |
| **DET-006** | Sistem mendukung buckling/local strength checks.              | Should        | Panel/stiffener checks dan evidence tersimpan.                                 | Structure              |
| **DET-007** | Sistem mengelola FEA references/results.                      | Could         | Model ID, load case, mesh, result summary, report link.                        | CAE integration        |
| **DET-008** | Sistem mengelola machinery arrangement dan equipment.         | Must          | Equipment, foundation, maintenance envelope, weight/CG.                        | Machinery              |
| **DET-009** | Sistem mengelola shafting dan alignment calculations.         | Should        | Shaft components, bearing, alignment, torsional references.                    | Machinery              |
| **DET-010** | Sistem mengelola piping systems.                              | Must          | Line list, fluid, size, class, material, pressure, temperature, diagram.       | Piping                 |
| **DET-011** | Sistem mengelola pump/valve/equipment selection.              | Should        | Duty point dan specification link tersedia.                                    | Piping                 |
| **DET-012** | Sistem mengelola electrical load balance.                     | Must          | Load cases, generator sizing, emergency load, margin.                          | Electrical             |
| **DET-013** | Sistem mengelola single-line dan cable schedule.              | Should        | Panel, feeder, cable, route, termination tersimpan.                            | Electrical             |
| **DET-014** | Sistem mengelola HVAC heat load dan duct concept.             | Should        | Space, airflow, fan, duct, temperature criteria.                               | HVAC                   |
| **DET-015** | Sistem mengelola outfitting dan safety details.               | Must          | Mooring, anchoring, doors, escape, fire, lifesaving.                           | Safety                 |
| **DET-016** | Sistem menjalankan cross-discipline consistency checks.       | Must          | Equipment weight/CG, penetrations, routes, clearances, power, cooling sinkron. | Dependency             |
| **DET-017** | Sistem mengelola change request.                              | Must          | Reason, affected objects/docs, impact, approval, implementation.               | Change                 |
| **DET-018** | Sistem mengelola internal review workflow.                    | Must          | Prepared/checked/approved roles terpisah.                                      | Workflow               |
| **DET-019** | Sistem membuat submission package.                            | Must          | Dokumen, revision, transmittal, recipient, date, dan due response.             | Class                  |
| **DET-020** | Sistem mengelola class/flag comments.                         | Must          | Comment ID, category, severity, assignee, response, evidence, status.          | Approval               |
| **DET-021** | Sistem menghubungkan comment ke drawing/calculation revision. | Must          | Traceability dari comment ke perubahan dan closure.                            | Approval               |
| **DET-022** | Sistem mengelola approved drawing status.                     | Must          | Approved, approved with comments, resubmit, rejected.                          | Approval               |
| **DET-023** | Sistem mencegah release dokumen obsolete.                     | Must          | Hanya revision released/approved yang dapat dipakai downstream.                | DMS                    |
| **DET-024** | Sistem membentuk Approved Design Baseline.                    | Must          | Snapshot documents, object data, comments, approvals.                          | Gate                   |
| **DET-025** | Sistem mengekspor approval register dan MDR.                  | Should        | Excel/PDF status dan overdue tersedia.                                         | Reporting              |

## Kebutuhan AI Assistant

| **ID**      | **Kebutuhan**                                  | **Prioritas** | **Acceptance Criteria**                                                  | **Catatan/Dependensi** |
|-------------|------------------------------------------------|---------------|--------------------------------------------------------------------------|------------------------|
| **AI4-001** | AI menjelaskan rule requirement dengan sumber. | Must          | Jawaban menunjuk rule/version/paragraph yang tersedia di knowledge base. | RAG                    |
| **AI4-002** | AI merangkum class comments.                   | Should        | Mengelompokkan topic/severity tanpa mengubah isi resmi.                  | Comments               |
| **AI4-003** | AI membantu draft response to comment.         | Should        | Draft menyertakan evidence yang dipilih dan perlu human approval.        | Writing                |
| **AI4-004** | AI mendeteksi potensi konflik lintas disiplin. | Should        | Menggunakan dependency/rule data, bukan inferensi bebas saja.            | Checks                 |
| **AI4-005** | AI membuat design review checklist.            | Should        | Checklist disesuaikan discipline, status, dan unresolved issue.          | Review                 |
| **AI4-006** | AI menjelaskan dampak change request.          | Must          | Menampilkan objek, dokumen, calculation, dan tahap produksi terdampak.   | Dependency             |

# Model Data dan Status

| **Entitas/Data** | **Atribut Minimum**                                  | **Relasi/Status**            |
|------------------|------------------------------------------------------|------------------------------|
| DesignObject     | type, geometry/ref, properties, source baseline      | Structure/Machinery/System.  |
| Document         | doc_no, title, discipline, revision, status, file    | Register and distribution.   |
| Calculation      | method/rule, inputs, outputs, utilization, checker   | Linked to objects/docs.      |
| Comment          | source, severity, text, assignee, response, evidence | Open/Answered/Closed.        |
| ChangeRequest    | reason, impact, approvals, implementation status     | Links objects and documents. |
| Submission       | transmittal, documents, recipient, dates             | Class/Flag.                  |
| ApprovedBaseline | released objects and documents                       | Input Production Design.     |

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

- Prepared, checked, dan approved harus memiliki role separation sesuai konfigurasi.

- Dokumen obsolete tidak dapat dirilis ke produksi.

- Comment kritis wajib closed sebelum gate.

- Setiap calculation menyimpan rule version dan trace ke design object.

- Change terhadap approved baseline harus melalui change request dan impact analysis.

- AI-generated response tidak dapat dikirim tanpa persetujuan manusia.

# Persyaratan UX

- Dashboard discipline dan approval status.

- Document register dengan filter revision/status/overdue.

- Comment workspace dengan side-by-side drawing, comment, response, evidence.

- Impact map untuk change request.

- Review checklist dan sign-off digital.

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

| **Metrik**              | **Target Awal**                     | **Cara Ukur**          |
|-------------------------|-------------------------------------|------------------------|
| Comment closure time    | Turun ≥25%                          | Median open-to-close.  |
| Revision traceability   | 100% released revision tertelusur   | Audit.                 |
| Obsolete usage          | 0 dokumen obsolete dipakai produksi | Release control.       |
| Cross-discipline issues | ≥80% ditemukan sebelum produksi     | Issue source analysis. |

# Acceptance Criteria Tahap

- Document register, review, submission, comment, revision, dan approval berjalan end-to-end.

- Data disiplin utama dapat dikaitkan dengan drawing dan calculation.

- Change request menampilkan dampak lintas disiplin dan downstream.

- Approved Design Baseline hanya berisi dokumen released/approved.

- AI assistant menghasilkan penjelasan dan draft yang memerlukan approval manusia.

# Risiko dan Mitigasi

| **Risiko**                                     | **Dampak**              | **Mitigasi**                                             |
|------------------------------------------------|-------------------------|----------------------------------------------------------|
| Integrasi CAD/CAE beragam                      | Data tidak konsisten    | Mulai dari metadata/link/API terbatas dan format netral. |
| Hak cipta rule/class                           | Knowledge base terbatas | Lisensi, access control, dan citation-only retrieval.    |
| Approval digital tidak diterima pihak tertentu | Workflow ganda          | Support export/transmittal dan signature policy.         |
| Volume dokumen besar                           | Kinerja DMS             | Object storage, indexing, dan lifecycle policy.          |

# Rencana Rilis

| **Rilis** | **Fokus**                                                | **Kriteria Keluar**              |
|-----------|----------------------------------------------------------|----------------------------------|
| MVP       | Document register, review, comments, revision, approval. | Satu package submission selesai. |
| R1        | Discipline object data dan cross-check.                  | Perubahan data terlacak ke docs. |
| R2        | Integrasi CAD/CAE/class portal terpilih.                 | Approved baseline siap produksi. |

# Pertanyaan Terbuka

- Apakah class/flag akan memiliki akses langsung atau melalui liaison?

- Format electronic approval/signature apa yang diperlukan?

- Integrasi CAD/CAE mana yang diprioritaskan?

- Dokumen rule apa yang dapat dimasukkan ke knowledge base secara legal?
