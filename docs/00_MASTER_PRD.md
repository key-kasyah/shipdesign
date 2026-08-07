**PRODUCT REQUIREMENTS DOCUMENT**

PRD Induk — Platform Rancang Bangun Kapal Terintegrasi AI

Dari Kebutuhan Kapal sampai Pengujian dan Penyerahan

| **Kode Dokumen** | PRD-00-MASTER                  |
|------------------|--------------------------------|
| **Tahap Produk** | Keseluruhan Siklus 1–7         |
| **Status**       | Draft untuk Perencanaan Produk |
| **Bahasa**       | Bahasa Indonesia               |

*Dokumen ini menjadi dasar penyelarasan kebutuhan produk, desain sistem, pengembangan perangkat lunak, validasi teknis, dan penerimaan pengguna.*

# Kontrol Dokumen

| **Pemilik Dokumen**      | Product Owner / Program Director / Naval Architecture Lead                                                     |
|--------------------------|----------------------------------------------------------------------------------------------------------------|
| **Pemangku Kepentingan** | Mahasiswa, dosen, naval architect, engineer, reviewer, galangan, operator, dan administrator platform          |
| **Klasifikasi**          | Dokumen kerja produk; belum merupakan persetujuan teknis atau klasifikasi kapal                                |
| **Siklus Review**        | Ditinjau pada setiap perubahan ruang lingkup, formula, regulasi, atau baseline desain                          |
| **Prinsip Utama**        | Calculation engine menghasilkan angka; validation engine menentukan status; AI menjelaskan konteks dan dampak. |

# 1. Visi Produk

Membangun platform digital terpadu yang mendampingi pengguna dari perumusan kebutuhan kapal, pra-rancangan, basic design, detail design, production design, konstruksi, hingga pengujian dan penyerahan. Platform menggabungkan calculation engine, validation engine, dependency engine, workflow, versioning, document management, dan AI Design Companion.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Prinsip Produk<br />
</strong>Platform bukan sekadar kalkulator dan bukan pula pengganti engineer. Sistem menyediakan angka yang dapat direproduksi, status yang dapat diaudit, hubungan antartahap, serta penjelasan AI yang membantu pengguna memahami apa yang mereka isi, mengapa dibutuhkan, dan apa dampaknya.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# 2. Latar Belakang dan Peluang

Proses rancang bangun kapal berlangsung lintas tahap dan disiplin, tetapi data umumnya tersebar pada spreadsheet, software teknik, drawing, email, dokumen class, serta laporan lapangan. Hal ini menimbulkan duplikasi, inkonsistensi satuan, penggunaan revisi salah, kurangnya traceability, dan kesulitan memahami dampak perubahan. Source code awal telah membuktikan kebutuhan pada tahap pra-rancangan melalui Project Data, kapal pembanding, scaling, koefisien, design check, NSP, CSA, DWL, dan Gading 10. PRD ini mengembangkan fondasi tersebut menjadi platform lifecycle.

# 3. Sasaran dan Hasil Produk

- Menyediakan satu proyek digital yang berlanjut dari Requirement Baseline hingga Delivery Baseline.

- Memastikan setiap angka, formula, sumber, rule, dokumen, revisi, dan approval dapat ditelusuri.

- Mendeteksi dampak perubahan dan hasil yang stale sebelum kesalahan diteruskan ke tahap berikutnya.

- Meningkatkan pemahaman mahasiswa dan praktisi melalui AI Design Companion berbasis konteks proyek.

- Mengurangi penggunaan spreadsheet dan komunikasi terpisah untuk status, review, dan handover.

- Membentuk data historis yang dapat digunakan untuk benchmarking, estimasi, dan continuous improvement.

## Bukan Sasaran

- Menggantikan tanggung jawab naval architect, engineer, class, flag, owner, atau galangan.

- Menjamin kapal aman atau compliant hanya berdasarkan output AI.

- Membangun seluruh fungsi CAD/CAE/CAM/ERP/MES secara native pada rilis awal.

- Mengizinkan AI mengubah baseline, approval, test acceptance, atau dokumen released tanpa manusia.

# 4. Pengguna dan Ekosistem

| **Kelompok**                    | **Tujuan**                                      | **Tahap Dominan** |
|---------------------------------|-------------------------------------------------|-------------------|
| Mahasiswa/Dosen                 | Pembelajaran, latihan, review akademis.         | 1–3               |
| Naval Architect/Engineer        | Perhitungan, desain, koordinasi, review.        | 1–4               |
| Owner/Operator                  | Requirement, review, acceptance, handover.      | 1, 3, 7           |
| Class/Flag/Surveyor             | Rule review, comment, approval, witness.        | 3–7               |
| Galangan/Production             | Production planning dan construction execution. | 5–6               |
| Commissioning/Trial Team        | Testing, defect, certificates, delivery.        | 7                 |
| Administrator/Knowledge Manager | User, methods, rules, templates, AI knowledge.  | Semua             |

# 5. Tahapan Lifecycle dan Baseline

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Tahap 1 Requirement Baseline<br />
↓<br />
Tahap 2 Preliminary Design Baseline<br />
↓<br />
Tahap 3 Basic Design Baseline<br />
↓<br />
Tahap 4 Approved Design Baseline<br />
↓<br />
Tahap 5 Production Baseline<br />
↓<br />
Tahap 6 Construction Completion / Turnover<br />
↓<br />
Tahap 7 As-Built &amp; Delivery Baseline</strong></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

## Ringkasan Tahap

| **Tahap** | **Nama**                 | **Input**                                                                                                                                                     | **Output**                                                                                                                                                                  | **Gate**                                                                                                                                                   |
|-----------|--------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Tahap 1   | Kebutuhan Kapal          | Informasi misi kapal, data pemilik/operator, rute, muatan, target kinerja, lingkungan operasi, pelabuhan, regulasi, anggaran, dan waktu.                      | Design Requirements Baseline, requirement matrix, daftar asumsi, konflik kebutuhan, gap data, dan approval record.                                                          | Seluruh requirement wajib lengkap, konflik kritis terselesaikan, sumber dan satuan jelas, serta baseline disetujui.                                        |
| Tahap 2   | Pra-Rancangan Kapal      | Requirement Baseline, kapal pembanding, formula/metode, LBP/B/T/H, Cb/Cm/Cw, density, kecepatan, DWT, payload, konsumsi, dan asumsi desain.                   | Preliminary Design Baseline: ukuran utama, koefisien, displacement, weight/capacity summary, daya, bentuk awal, stabilitas/trim awal, asumsi, warning, dan revision record. | Weight-displacement, DWT, kapasitas, daya, rasio, draft, freeboard, stabilitas awal, serta bentuk awal berada dalam toleransi yang disetujui.              |
| Tahap 3   | Basic Design             | Preliminary Design Baseline, geometri awal, weight estimate, requirement, metode hydrostatics/stability/resistance, equipment data, dan class basis.          | Basic Design Package dan baseline: lines plan, hydrostatics, Bonjean, stability, GA, capacity, resistance/propulsion, preliminary structure/systems, updated weight.        | Lines plan fair; hydrostatics dan loading conditions valid; stability dan capacity memenuhi; GA feasible; power/propulsion dan structure concept direview. |
| Tahap 4   | Detail Design & Approval | Basic Design Baseline, rule/class basis, equipment/vendor data, calculation models, drawings, comments, dan change requests.                                  | Approved detail drawings/calculations, comment closure records, discipline registers, dan Approved Design Baseline.                                                         | Dokumen wajib approved/approved with comments, semua comment kritis ditutup, dan data produksi released.                                                   |
| Tahap 5   | Production Design        | Approved Design Baseline, CAD/CAE model, yard standards, facilities, material catalog, supplier data, schedule constraints, dan production strategy.          | Production Baseline, PBS/WBS, production drawings/files, BOM/MTO, work packages, procurement plan, schedule, cost, dan readiness report.                                    | Work packages released, material critical tersedia/terjadwal, drawing terbaru, clash kritis nol, dan production readiness approved.                        |
| Tahap 6   | Konstruksi Kapal         | Production Baseline, released work packages, drawings, BOM, material/PO, ITP, WPS, resources, schedule, dan change notices.                                   | Completed vessel, construction records, QC dossiers, material certificates, progress/cost history, punch list, dan testing readiness.                                       | Construction complete, systems mechanically completed, QC/inspection closed, punch list terkontrol, dan testing readiness approved.                        |
| Tahap 7   | Pengujian dan Penyerahan | Design Requirements, Approved/Production/Construction Baselines, test procedures, instruments/calibration, completion records, class/flag/owner requirements. | Test and trial records, actual performance, final stability data, accepted defect status, certificates, as-built baseline, manuals, handover, dan warranty register.        | Mandatory tests accepted, critical defects closed, certificates/handovers complete, as-built baseline released, dan delivery protocol ditandatangani.      |

# 6. Status Implementasi Saat Ini

| **Area**                          | **Status** | **Keterangan**                                      |
|-----------------------------------|------------|-----------------------------------------------------|
| Project Data                      | Sudah ada  | Tipe kapal, trayek, jarak, DWT, dan kecepatan.      |
| Kapal Pembanding & Scaling        | Sudah ada  | Scaling DWT pangkat 1/3 dan estimasi ukuran.        |
| Koefisien & Displacement          | Sudah ada  | Cb, Cm, Cw, Cph/Cpv, volume, density, displacement. |
| Design Check                      | Sudah ada  | L/B, B/T, H/T, L/H, freeboard, status dan locking.  |
| Estimasi Daya NSP                 | Sudah ada  | EHP/BHP, efficiency, correction, sea margin.        |
| CSA                               | Versi awal | Kurva estimasi dan tabel area per gading.           |
| DWL                               | Versi awal | Simpson, target AWL, correction, LCF dan inertia.   |
| Gading 10                         | Versi awal | Simpson, target A10, correction dan plot.           |
| Estimasi Berat/Capacity/Iteration | Belum      | Prioritas pengembangan Tahap 2.                     |
| Tahap 3–7                         | Belum      | Dibangun setelah Preliminary Design stabil.         |

# 7. Arsitektur Produk

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Web Application / Workspace<br />
↓<br />
API &amp; Workflow Services<br />
↓<br />
Calculation Engine | Validation Engine | Dependency Engine | AI Orchestrator<br />
↓<br />
Project Database | Formula/Rule Registry | Document/Object Storage | Audit Log<br />
↓<br />
Integrations: CAD/CAE/CAM, ERP/MES, Class/Flag, Instrument/Data Acquisition</strong></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

| **Komponen**          | **Tanggung Jawab**                                                     |
|-----------------------|------------------------------------------------------------------------|
| Project Service       | Identitas proyek, stage status, baseline, revision, access.            |
| Calculation Engine    | Fungsi deterministik, units, method version, reproducible results.     |
| Validation Engine     | Rules, limits, severity, compliance status, waivers.                   |
| Dependency Engine     | Direct/downstream impacts, stale detection, recalculation plan.        |
| AI Orchestrator       | Context assembly, retrieval, tool calling, explanation, summarization. |
| Formula/Rule Registry | Metode, source, applicability, version, test cases.                    |
| Document Management   | Files, drawings, revision, release, approval, search.                  |
| Workflow/Approval     | Review, comments, sign-off, gates, role separation.                    |
| Integration Layer     | Connectors dan data contracts dengan software eksternal.               |
| Analytics/Audit       | Usage, quality, performance, changes, compliance evidence.             |

# 8. Kebutuhan Fungsional Lintas Platform

## Kebutuhan Fungsional

| **ID**      | **Kebutuhan**                                               | **Prioritas** | **Acceptance Criteria**                                             | **Catatan/Dependensi** |
|-------------|-------------------------------------------------------------|---------------|---------------------------------------------------------------------|------------------------|
| **SYS-001** | Sistem mendukung satu Project ID dari tahap 1 sampai 7.     | Must          | Semua data dan dokumen terkait project dan stage yang benar.        | Core                   |
| **SYS-002** | Sistem menyediakan stage navigation dan progress.           | Must          | Status, owner, gate, warning, dan next action terlihat.             | UX                     |
| **SYS-003** | Sistem menyediakan baseline dan revision control.           | Must          | Baseline immutable; perubahan menghasilkan revision/change request. | Versioning             |
| **SYS-004** | Sistem menyediakan calculation engine teruji.               | Must          | Fungsi memiliki unit, method version, tests, dan trace ID.          | Technical              |
| **SYS-005** | Sistem menyediakan formula/rule registry.                   | Must          | Source, applicability, version, status, dan owner tersimpan.        | Knowledge              |
| **SYS-006** | Sistem menyediakan validation engine.                       | Must          | Blocking/warning/info dan pass/fail dapat dikonfigurasi.            | Rules                  |
| **SYS-007** | Sistem menyediakan dependency graph.                        | Must          | Perubahan input menandai hasil, objek, docs, dan stage terdampak.   | Core                   |
| **SYS-008** | Sistem menyediakan stale result management.                 | Must          | Hasil lama tidak dianggap valid setelah upstream change.            | Core                   |
| **SYS-009** | Sistem menyediakan scenario/branch comparison.              | Must          | What-if terpisah dari baseline dan dapat dibandingkan.              | Design                 |
| **SYS-010** | Sistem menyediakan workflow review/approval.                | Must          | Role, comments, decision, timestamp, dan evidence tercatat.         | Workflow               |
| **SYS-011** | Sistem menyediakan issue/comment/change management.         | Must          | Issue tertelusur ke data, objek, docs, dan resolution.              | Collaboration          |
| **SYS-012** | Sistem menyediakan document management.                     | Must          | Revision, status, release, obsolete control, dan search.            | DMS                    |
| **SYS-013** | Sistem menyediakan role-based access control.               | Must          | Hak view/edit/review/approve/release terpisah.                      | Security               |
| **SYS-014** | Sistem menyediakan audit trail immutable.                   | Must          | Who/when/what/why untuk perubahan dan approval.                     | Governance             |
| **SYS-015** | Sistem menyediakan unit management.                         | Must          | Internal SI, conversion controlled, unit displayed everywhere.      | Data                   |
| **SYS-016** | Sistem menyediakan data import/export.                      | Must          | JSON/CSV/Excel/PDF dan format tahap-spesifik.                       | Interop                |
| **SYS-017** | Sistem menyediakan template per tipe kapal dan organisasi.  | Should        | Required fields, formulas, rules, workflows dapat dikonfigurasi.    | Configuration          |
| **SYS-018** | Sistem menyediakan notifications dan task inbox.            | Should        | Review, overdue, stale, change, test, dan issue alerts.             | Workflow               |
| **SYS-019** | Sistem menyediakan dashboard risiko dan readiness.          | Should        | Gate blockers dan trend terlihat per stage/project.                 | Analytics              |
| **SYS-020** | Sistem menyediakan APIs dan integration events.             | Should        | Versioned contracts, webhooks/event bus untuk external systems.     | Integration            |
| **SYS-021** | Sistem menyediakan knowledge base akademis/regulasi.        | Must          | Document version, access rights, citations, and retrieval.          | AI                     |
| **SYS-022** | Sistem menyediakan AI Design Companion.                     | Must          | Explain, impact, what-if, review, summary, Q&A with context.        | AI                     |
| **SYS-023** | AI menggunakan tool calculation, validation, dan retrieval. | Must          | No unsupported numeric answers; output has trace/source.            | AI safety              |
| **SYS-024** | AI tidak dapat approve/release/accept.                      | Must          | Privileged actions selalu human-authorized.                         | Governance             |
| **SYS-025** | Sistem menyimpan feedback pengguna pada AI.                 | Should        | Helpful/not helpful, correction, category, context.                 | AI quality             |
| **SYS-026** | Sistem mendukung multi-organization tenancy.                | Should        | Data isolation dan configurable sharing.                            | Enterprise             |
| **SYS-027** | Sistem mendukung project archival dan retention.            | Should        | Retention policy, export, legal hold, deletion control.             | Governance             |
| **SYS-028** | Sistem menyediakan system health dan error reporting.       | Must          | Calculation failures, integration failures, and recovery visible.   | Operations             |
| **SYS-029** | Sistem menyediakan automated tests dan benchmarks.          | Must          | Formula, rules, geometry, performance regression tested.            | Quality                |
| **SYS-030** | Sistem menyediakan backup dan disaster recovery.            | Must          | Defined RPO/RTO and restore tests.                                  | Reliability            |

# 9. AI Design Companion

AI Design Companion hadir pada setiap layar sebagai lapisan edukasi, navigasi, dan review. AI menerima konteks proyek, parameter, hasil calculation/validation, dependency graph, serta potongan knowledge base yang diizinkan. AI tidak menjadi sumber utama angka dan tidak melakukan tindakan approval atau perubahan baseline.

| **Kapabilitas**       | **Contoh**                            | **Guardrail**                                             |
|-----------------------|---------------------------------------|-----------------------------------------------------------|
| Parameter Explainer   | “Apa itu density air laut?”           | Jawaban dari knowledge base; unit dan source ditampilkan. |
| Result Explainer      | “Mengapa H/T gagal?”                  | Membaca validation result, tidak menentukan rule sendiri. |
| Impact Analysis       | “Apa dampak B dinaikkan?”             | Membaca dependency graph dan daftar stale results.        |
| What-If               | “Turunkan T 0,5 m.”                   | Membuat scenario copy dan memanggil calculation engine.   |
| Cross-Stage Assistant | “Dokumen apa terdampak revisi mesin?” | Menelusuri objects, docs, packages, schedule, test.       |
| Design Review         | Ringkasan issue dan checklist.        | Memerlukan human review; tidak memberi approval.          |
| Document Assistant    | Draft report/response/comment.        | Tidak mengirim/release tanpa user action.                 |
| Regulation Assistant  | Menemukan rule dan applicability.     | Citation wajib; access/licensing dijaga.                  |

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>User Question / Button<br />
↓<br />
Context Builder (project + stage + parameter + result + permissions)<br />
↓<br />
Retriever + Calculation/Validation/Dependency Tools<br />
↓<br />
AI Response with labels, sources, assumptions, impacts, and next action<br />
↓<br />
Human Review / Optional Approved Action</strong></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# 10. Model Data Inti

| **Entitas**    | **Fungsi**                            | **Atribut Kunci**                           |
|----------------|---------------------------------------|---------------------------------------------|
| Project        | Kontainer lifecycle.                  | ID, organization, owner, type, status.      |
| Stage          | Tahapan 1–7.                          | status, owner, entry/exit gate, baseline.   |
| Baseline       | Snapshot disetujui.                   | revision, data hash, approvals, date.       |
| Parameter      | Input/derived data.                   | symbol, value, unit, source, confidence.    |
| Method         | Formula/model/rule.                   | version, source, applicability, tests.      |
| Result         | Output calculation.                   | inputs hash, method, output, status, stale. |
| Dependency     | Hubungan data.                        | source, target, impact type, recalculation. |
| Design Object  | Hull/space/equipment/material/system. | ID, properties, geometry reference.         |
| Document       | Drawing/report/manual/certificate.    | number, revision, status, file.             |
| Issue/Comment  | Review dan problem.                   | severity, owner, due, resolution.           |
| Change Request | Perubahan baseline.                   | reason, impact, approvals, implementation.  |
| Task/Workflow  | Pekerjaan dan approval.               | assignee, status, due, evidence.            |
| AI Interaction | Pertanyaan dan respons.               | context hash, sources, tools, feedback.     |

# 11. Workflow, Gate, dan Change Control

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Edit Draft → Validate → Calculate → Explain/Review → Resolve Issues → Approve Baseline → Downstream Work<br />
↑ ↓<br />
└──────── Change Request ← Impact Analysis ← Change ────────┘</strong></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

- Setiap tahap memiliki entry gate dan exit gate yang dapat dikonfigurasi.

- Baseline adalah immutable snapshot; koreksi dilakukan pada revision/branch baru.

- Dependency engine menghasilkan impact report sebelum perubahan disetujui.

- Downstream results dan documents diberi status stale, review required, atau obsolete sesuai jenis perubahan.

- Waiver/concession harus memiliki authority, alasan, masa berlaku, dan evidence.

- Approval, release, acceptance, dan certificate tetap merupakan tindakan manusia berwenang.

# 12. Persyaratan UX Utama

- Sidebar lifecycle tahap 1–7 dengan status, progress, blocker, dan baseline aktif.

- Halaman menggunakan pola konsisten: konteks → input → hasil → grafik/dokumen → warning → AI assistant → approval.

- Setiap input menampilkan label, simbol, satuan, contoh, sumber, range, dan dependency.

- AI panel memberikan quick questions tanpa menutupi data utama.

- Perubahan besar menampilkan impact preview sebelum save/approve.

- Role-specific dashboard menyederhanakan informasi bagi mahasiswa, engineer, reviewer, dan worker.

- Aksesibilitas: status tidak hanya mengandalkan warna; keyboard navigation; tabel dan grafik memiliki deskripsi.

# 13. Non-Fungsional, Keamanan, dan Tata Kelola

| **Kategori**      | **Persyaratan**                                                                                                                |
|-------------------|--------------------------------------------------------------------------------------------------------------------------------|
| Akurasi           | Hasil numerik harus berasal dari fungsi deterministik, memiliki satuan, metode, sumber, dan batas penerapan.                   |
| Auditabilitas     | Setiap perubahan input, hasil hitung, approval, dan revisi dicatat dengan pengguna, waktu, nilai lama, nilai baru, dan alasan. |
| Keamanan          | Kontrol akses berbasis peran; data proyek tidak dapat diakses lintas organisasi tanpa izin.                                    |
| Kinerja           | Interaksi form dan kalkulasi umum memberikan respons dalam ≤3 detik untuk proyek standar.                                      |
| Reliabilitas      | Autosave, recovery sesi, dan validasi mencegah kehilangan data serta kalkulasi dengan input tidak lengkap.                     |
| Keterjelasan      | Semua input menampilkan nama, simbol, satuan, definisi, sumber, contoh, serta dampak ke modul berikutnya.                      |
| Interoperabilitas | Data dapat diekspor melalui format terbuka yang relevan seperti JSON, CSV, Excel, PDF, atau DXF sesuai tahap.                  |
| Skalabilitas      | Arsitektur mendukung proyek kecil akademis hingga multi-user galangan dengan storage besar.                                    |
| Observability     | Log, metrics, traces, calculation errors, AI tool calls, dan integration health tersedia.                                      |
| AI Governance     | Model/version, prompt, retrieval source, tool calls, feedback, dan safety event diaudit.                                       |
| Data Residency    | Dapat dikonfigurasi sesuai organisasi dan yurisdiksi.                                                                          |
| Privacy           | Data proyek tidak digunakan untuk training eksternal tanpa persetujuan eksplisit.                                              |
| Recovery          | Backup terjadwal, restore test, RPO/RTO sesuai tier deployment.                                                                |

# 14. Integrasi

| **Kategori**           | **Contoh Sistem**              | **Data**                              |
|------------------------|--------------------------------|---------------------------------------|
| CAD/CAE                | Hull/structure/3D/FEA tools    | Geometry, objects, drawings, results. |
| CAM/Nesting            | Plate cutting dan nesting      | Parts, plates, NC files, utilization. |
| ERP/Procurement        | Material, PO, vendor, cost     | BOM, inventory, delivery, invoice.    |
| MES/Planning           | Work package dan shop progress | Status, man-hour, resource, schedule. |
| Class/Flag             | Submission dan approval portal | Transmittal, comments, approvals.     |
| Instrumentation        | Trial/data acquisition         | Readings, timestamp, calibration.     |
| Identity/Collaboration | SSO, email, notifications      | Users, roles, task alerts.            |

# 15. Metrik Produk

| **Metrik**                        | **Target Arah**          | **Makna**                                      |
|-----------------------------------|--------------------------|------------------------------------------------|
| Stage cycle time                  | Menurun per tahap        | Kecepatan dari entry sampai approved baseline. |
| Rework akibat perubahan terlambat | Menurun                  | Efektivitas impact analysis.                   |
| Obsolete document incidents       | Mendekati nol            | Kualitas release/version control.              |
| Calculation reproducibility       | 100%                     | Kepercayaan hasil teknik.                      |
| Requirement-to-test traceability  | 100% mandatory           | Coverage lifecycle.                            |
| AI helpfulness                    | ≥80%                     | Nilai edukasi dan bantuan.                     |
| AI unsupported claims             | 0 critical               | Safety dan source compliance.                  |
| External spreadsheet dependency   | Menurun bertahap         | Adopsi platform.                               |
| Baseline quality                  | Issue downstream menurun | Kualitas gate tiap tahap.                      |

# 16. Strategi Pengembangan

| **Fase**                           | **Ruang Lingkup**                                                       | **Hasil**                         |
|------------------------------------|-------------------------------------------------------------------------|-----------------------------------|
| Fase 0 — Refactor                  | Pisahkan UI, calculation, validation, state; tambah database dan tests. | Fondasi source code stabil.       |
| Fase 1 — MVP Preliminary           | Tahap 1–2 lengkap, AI explainer, dependency, baseline.                  | Produk akademis/pra-rancangan.    |
| Fase 2 — Basic Design              | Geometry, hydrostatics, stability, GA/capacity.                         | Basic Design Baseline.            |
| Fase 3 — Detail & Approval         | DMS, disciplines, comments, approvals.                                  | Approved Design Baseline.         |
| Fase 4 — Production & Construction | PBS, work package, material, QC, progress.                              | Galangan digital workflow.        |
| Fase 5 — Testing & Delivery        | Test matrix, trial, as-built, handover.                                 | Digital vessel dossier.           |
| Fase 6 — Optimization              | Historical benchmarking, advanced AI, integrations.                     | Continuous improvement ecosystem. |

# 17. Acceptance Criteria PRD Induk

- Tujuh tahap memiliki PRD, input/output, gate, requirements, AI scope, dan baseline yang jelas.

- Satu Project ID dan revision model dapat membawa data dari Tahap 1 sampai Tahap 7.

- Calculation, validation, dependency, AI, workflow, documents, dan audit memiliki tanggung jawab terpisah.

- Perubahan upstream dapat menghasilkan impact report dan menandai downstream stale/review required.

- AI hanya menjelaskan dan mengorkestrasi tools; angka serta keputusan formal berasal dari engine dan manusia.

- Roadmap memprioritaskan Tahap 1–2 sebagai MVP tanpa mengunci pengembangan tahap 3–7.

# 18. Risiko Program dan Mitigasi

| **Risiko**                          | **Dampak**              | **Mitigasi**                                             |
|-------------------------------------|-------------------------|----------------------------------------------------------|
| Scope lifecycle terlalu besar       | Produk tidak selesai    | Stage-based releases dan MVP Tahap 1–2.                  |
| Formula/rule tidak tervalidasi      | Hasil tidak dipercaya   | Registry, expert review, benchmarks, automated tests.    |
| AI hallucination                    | Keputusan salah         | Tool-grounding, RAG, citations, labels, human authority. |
| Integrasi software heterogen        | Data silo tetap ada     | Open data model, API contracts, priority connectors.     |
| Perubahan organisasi/adopsi         | Data tidak lengkap      | Role-based UX, training, pilot, champions.               |
| IP/regulation licensing             | Knowledge base terbatas | Access-controlled licensed content and metadata.         |
| Data proyek sensitif                | Risiko keamanan         | Tenant isolation, encryption, audit, deployment options. |
| Model geometri/engineering kompleks | Defect teknis           | Benchmark datasets dan staged technical validation.      |

# 19. Keputusan yang Harus Ditetapkan

- Nama produk dan target utama MVP: akademis, konsultan, atau galangan.

- Tipe kapal pertama serta formula/rule set yang diprioritaskan.

- Teknologi backend/database dan strategi migrasi dari Gradio prototype.

- Model AI, deployment, privacy, serta sumber knowledge base yang diizinkan.

- Standar unit, data IDs, document numbering, baseline, dan approval roles.

- Software eksternal yang menjadi integrasi prioritas.

- Benchmark cases dan pihak ahli yang memvalidasi hasil setiap tahap.
