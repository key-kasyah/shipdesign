**PRODUCT REQUIREMENTS DOCUMENT**

PRD Tahap 5 — Production Design

Model Produksi, PBS, Drawing, Material, dan Perencanaan Kerja

| **Kode Dokumen** | PRD-05-PRO                     |
|------------------|--------------------------------|
| **Tahap Produk** | Tahap 5 dari 7                 |
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

Tahap Production Design mengubah approved design menjadi informasi yang dapat difabrikasi, dirakit, dipasang, dibeli, dijadwalkan, dan dilacak oleh galangan.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Keputusan Produk<br />
</strong>Platform menjadi penghubung product model, product breakdown structure, work packages, drawing, bill of materials, dan schedule. Integrasi dengan software CAD/CAM lebih diprioritaskan daripada membangun seluruh kernel CAD sendiri.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# Latar Belakang dan Masalah

Approved drawing belum cukup untuk produksi. Galangan membutuhkan pembagian blok, cutting/nesting, assembly sequence, spool, foundation, BOM, procurement status, dan work package yang konsisten terhadap revisi terbaru.

# Tujuan

- Membentuk product breakdown structure dan model produksi.

- Menghasilkan/kelola drawing dan data untuk fabrikasi, assembly, erection, serta instalasi.

- Menghubungkan material, procurement, schedule, dan cost.

- Membentuk Production Baseline yang siap dieksekusi konstruksi.

## Bukan Tujuan

- Menggantikan seluruh software CAD/CAM/nesting khusus.

- Mencatat progres aktual konstruksi secara rinci.

- Menjalankan sea trial.

# Pengguna dan Peran

| **Peran**            | **Kebutuhan Utama**                                 | **Hak/Aksi Kunci**                |
|----------------------|-----------------------------------------------------|-----------------------------------|
| Production Engineer  | Membuat block/assembly/work package.                | Kelola PBS, drawings, sequence.   |
| CAD/CAM Designer     | Menghasilkan cutting, nesting, spool, installation. | Upload/sync models and outputs.   |
| Planner              | Menyusun schedule dan resources.                    | WBS, duration, dependencies.      |
| Procurement/Material | Mengelola BOM dan material availability.            | Purchase status and traceability. |
| Production Manager   | Menyetujui readiness.                               | Review and release packages.      |

# Ruang Lingkup

## Termasuk

- Product breakdown structure dan 3D production model references.

- Hull/system production drawings.

- Cutting, nesting, assembly, block, erection, spool, installation.

- BOM, MTO, material coding, procurement status.

- WBS, sequence, resources, man-hour, schedule, cost estimate.

- Production readiness dan AI Production Assistant.

## Tidak Termasuk

- Actual shop-floor execution dan QC records.

- Harbor/sea trials.

# Input, Output, dan Gate

| **Jenis**    | **Rincian**                                                                                                                                          |
|--------------|------------------------------------------------------------------------------------------------------------------------------------------------------|
| Input Utama  | Approved Design Baseline, CAD/CAE model, yard standards, facilities, material catalog, supplier data, schedule constraints, dan production strategy. |
| Output Utama | Production Baseline, PBS/WBS, production drawings/files, BOM/MTO, work packages, procurement plan, schedule, cost, dan readiness report.             |
| Entry Gate   | Approved Design Baseline released dan yard production strategy ditetapkan.                                                                           |
| Exit Gate    | Work packages released, material critical tersedia/terjadwal, drawing terbaru, clash kritis nol, dan production readiness approved.                  |

# Alur Kerja Utama

| **Approved Baseline → PBS/Zone Strategy → Production Model → Drawing/CAM Data → BOM/MTO → Work Packages → Procurement/Schedule → Readiness Review → Release Production Baseline** |
|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|

1.  Susun zone, system, unit, assembly, block, dan grand block.

2.  Sinkronkan model struktur dan sistem dengan approved baseline.

3.  Hasilkan atau tautkan production drawings dan CAM files.

4.  Bangun BOM/MTO dan procurement status.

5.  Susun WBS, work packages, sequence, resource, schedule, dan cost.

6.  Jalankan clash/readiness review dan release package.

# Kebutuhan Produk

## Kebutuhan Fungsional

| **ID**      | **Kebutuhan**                                                     | **Prioritas** | **Acceptance Criteria**                                                         | **Catatan/Dependensi** |
|-------------|-------------------------------------------------------------------|---------------|---------------------------------------------------------------------------------|------------------------|
| **PRO-001** | Sistem mengelola product breakdown structure.                     | Must          | Zone/system/unit/assembly/block hierarchy tersedia.                             | Approved baseline      |
| **PRO-002** | Sistem mengelola referensi model produksi 3D.                     | Must          | Model/version/object IDs tertelusur ke approved data.                           | CAD integration        |
| **PRO-003** | Sistem melakukan clash issue management.                          | Must          | Clash memiliki location, objects, severity, owner, status.                      | 3D                     |
| **PRO-004** | Sistem mengelola plate development dan cutting files.             | Should        | File, plate ID, material, thickness, revision, machine format.                  | CAM                    |
| **PRO-005** | Sistem mengelola nesting.                                         | Should        | Plate utilization, remnants, revision, approval.                                | Material               |
| **PRO-006** | Sistem mengelola subassembly/assembly/block drawings.             | Must          | Drawing terkait PBS dan revision released.                                      | Hull production        |
| **PRO-007** | Sistem mengelola erection drawings dan sequence.                  | Must          | Block order, reference points, tolerances, lifting data.                        | Erection               |
| **PRO-008** | Sistem mengelola welding details.                                 | Should        | Joint, process, weld size, WPS reference, inspection.                           | Quality                |
| **PRO-009** | Sistem mengelola pipe spool drawings.                             | Must          | Spool ID, line, material, dimensions, fittings, welds.                          | Piping                 |
| **PRO-010** | Sistem mengelola support, cable, HVAC, dan installation drawings. | Should        | Object IDs, location, revision, work package.                                   | Systems                |
| **PRO-011** | Sistem mengelola equipment foundations.                           | Must          | Equipment, load, location, drawing, installation sequence.                      | Outfitting             |
| **PRO-012** | Sistem menghasilkan Bill of Materials.                            | Must          | Material/item/quantity/unit/grade/source object/work package.                   | Material               |
| **PRO-013** | Sistem menghasilkan Material Take-Off.                            | Must          | MTO dapat dibandingkan antar revisi.                                            | Cost/procurement       |
| **PRO-014** | Sistem mengelola material coding dan traceability.                | Must          | Unique code, certificate requirement, batch/heat future link.                   | Construction           |
| **PRO-015** | Sistem mengelola procurement status.                              | Must          | RFQ/PO/vendor/delivery/inspection status.                                       | Supply chain           |
| **PRO-016** | Sistem mengelola Work Breakdown Structure.                        | Must          | Activity, duration, dependency, resource, work package.                         | Planning               |
| **PRO-017** | Sistem mengelola work packages.                                   | Must          | Scope, drawings, BOM, instructions, QC points, release status.                  | Construction           |
| **PRO-018** | Sistem menghitung man-hour dan resource estimate.                 | Should        | Basis productivity dan assumptions tersimpan.                                   | Planning               |
| **PRO-019** | Sistem menyusun production schedule.                              | Must          | Dependencies, milestones, critical path, baseline.                              | Planning               |
| **PRO-020** | Sistem menghitung production cost estimate.                       | Should        | Material, labor, subcontract, equipment, contingency.                           | Cost                   |
| **PRO-021** | Sistem menjalankan production readiness review.                   | Must          | Drawing, material, tools, facilities, sequence, QC readiness.                   | Gate                   |
| **PRO-022** | Sistem mengendalikan perubahan setelah release.                   | Must          | Change notice memperbarui package, material, schedule, dan construction impact. | Change                 |
| **PRO-023** | Sistem membentuk Production Baseline.                             | Must          | Released package snapshot dan version history.                                  | Gate                   |

## Kebutuhan AI Assistant

| **ID**      | **Kebutuhan**                                     | **Prioritas** | **Acceptance Criteria**                                            | **Catatan/Dependensi** |
|-------------|---------------------------------------------------|---------------|--------------------------------------------------------------------|------------------------|
| **AI5-001** | AI merangkum production readiness.                | Must          | Menampilkan missing drawing/material/clash/resource dan severity.  | Readiness              |
| **AI5-002** | AI menjelaskan dampak revisi design.              | Must          | Menelusuri block, drawing, BOM, PO, schedule, dan work package.    | Dependency             |
| **AI5-003** | AI membantu pemeriksaan kelengkapan work package. | Should        | Checklist berdasarkan package type dan yard standard.              | Knowledge              |
| **AI5-004** | AI membantu analisis material dan schedule risk.  | Should        | Menggunakan status aktual, lead time, dan dependencies.            | Planning               |
| **AI5-005** | AI merangkum clash dan rekomendasi koordinasi.    | Should        | Tidak mengubah model; membuat issue summary dan owner suggestions. | 3D                     |

# Model Data dan Status

| **Entitas/Data**   | **Atribut Minimum**                                     | **Relasi/Status**              |
|--------------------|---------------------------------------------------------|--------------------------------|
| PBSNode            | hierarchy, zone, system, block, attributes              | Links design objects and work. |
| ProductionDrawing  | type, revision, release, PBS/work package               | Current/Obsolete.              |
| BOMItem            | material/item, quantity, source, procurement status     | Linked to packages.            |
| WorkPackage        | scope, drawings, BOM, resources, QC, dates              | Draft/Ready/Released.          |
| ScheduleActivity   | WBS, duration, predecessors, resources, progress future | Baseline.                      |
| ClashIssue         | objects, location, severity, owner, status              | Open/Closed.                   |
| ProductionBaseline | released packages and plans                             | Input construction.            |

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

- Hanya approved design revision dapat menjadi sumber production data.

- Work package tidak dapat released bila drawing/BOM/QC point wajib belum lengkap.

- Perubahan source design menandai package dan material terkait stale.

- Nesting dan cutting file wajib terkait material grade/thickness/revision.

- Purchase order terdampak perubahan harus memicu material change review.

- AI tidak boleh mengubah schedule, PO, atau release status tanpa approval.

# Persyaratan UX

- PBS tree sebagai navigasi utama.

- Work package dashboard dengan readiness score.

- Visual issue/clash list terhubung ke model viewer.

- BOM/MTO comparison antar revisi.

- Schedule view dan change-impact timeline.

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

| **Metrik**                  | **Target Awal**                   | **Cara Ukur**            |
|-----------------------------|-----------------------------------|--------------------------|
| Ready package rate          | ≥95% package lengkap saat release | Readiness checklist.     |
| Rework due obsolete drawing | Turun ≥50%                        | NCR/rework cause.        |
| Material variance           | MTO vs issued ≤ target            | Material reconciliation. |
| Change propagation          | 100% affected package terdeteksi  | Dependency test.         |

# Acceptance Criteria Tahap

- Approved baseline dapat diturunkan menjadi PBS, drawings, BOM, dan work packages.

- Work package readiness memblokir release bila data kritis kurang.

- Change impact menelusuri material, schedule, dan package.

- Production Baseline dapat dibekukan dan digunakan Tahap 6.

# Risiko dan Mitigasi

| **Risiko**                 | **Dampak**                | **Mitigasi**                                      |
|----------------------------|---------------------------|---------------------------------------------------|
| Integrasi CAD/CAM kompleks | Data manual dan duplikasi | Prioritaskan connectors/API dan open formats.     |
| Yard standard berbeda      | Template tidak cocok      | Configurable yard templates.                      |
| BOM tidak sinkron          | Material shortage/rework  | Object-level traceability dan revision compare.   |
| Schedule terlalu detail    | Kinerja dan adopsi rendah | Hierarchical planning dan level-of-detail policy. |

# Rencana Rilis

| **Rilis** | **Fokus**                                           | **Kriteria Keluar**                   |
|-----------|-----------------------------------------------------|---------------------------------------|
| MVP       | PBS, drawing register, BOM, work package readiness. | Satu block package released.          |
| R1        | Procurement, schedule, change impact.               | Production baseline lengkap.          |
| R2        | 3D/clash/CAM integrations dan costing.              | Multi-discipline production workflow. |

# Pertanyaan Terbuka

- CAD/CAM dan planning software apa yang akan diintegrasikan?

- Standar coding material dan PBS galangan mana yang digunakan?

- Apakah procurement berada dalam platform atau hanya integrasi?

- Level detail schedule yang diperlukan pada MVP?
