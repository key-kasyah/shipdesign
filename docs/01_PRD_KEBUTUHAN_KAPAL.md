**PRODUCT REQUIREMENTS DOCUMENT**

PRD Tahap 1 — Kebutuhan Kapal

Project Data dan Design Requirements

| **Kode Dokumen** | PRD-01-REQ                     |
|------------------|--------------------------------|
| **Tahap Produk** | Tahap 1 dari 7                 |
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

Tahap Kebutuhan Kapal mengubah kebutuhan operasional, kapasitas, batas lingkungan, pelabuhan, regulasi, biaya, dan waktu menjadi Design Requirements Baseline yang dapat digunakan secara konsisten oleh pra-rancangan.

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Keputusan Produk<br />
</strong>Tahap ini diperlakukan sebagai gerbang formal. Pra-rancangan tidak boleh memakai kebutuhan yang belum lengkap atau belum direview. Project Data yang sudah ada menjadi fondasi, lalu diperluas menjadi requirement yang terstruktur dan dapat dilacak.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

# Latar Belakang dan Masalah

Pada proses desain kapal, kesalahan awal sering muncul karena kebutuhan pemilik, misi kapal, kapasitas, endurance, batas draft, dan regulasi tidak disusun dalam satu sumber data. Akibatnya, perubahan kebutuhan terlambat diketahui dan seluruh perhitungan berikutnya menjadi tidak sinkron.

# Tujuan

- Menetapkan satu sumber kebutuhan proyek yang terstruktur dan tervalidasi.

- Membantu pengguna memahami arti dan dampak setiap input sebelum perhitungan teknis.

- Mendeteksi kebutuhan yang hilang, bertentangan, atau tidak realistis.

- Membentuk baseline requirement dan riwayat revisi yang dapat ditelusuri.

## Bukan Tujuan

- Menghasilkan ukuran utama kapal final.

- Menggantikan keputusan owner, naval architect, class, atau regulator.

- Melakukan perhitungan stabilitas, struktur, dan daya secara detail.

# Pengguna dan Peran

| **Peran**       | **Kebutuhan Utama**                                      | **Hak/Aksi Kunci**                                    |
|-----------------|----------------------------------------------------------|-------------------------------------------------------|
| Mahasiswa       | Memahami hubungan misi kapal dengan parameter desain.    | Mengisi data, membaca penjelasan AI, menyimpan draft. |
| Naval Architect | Menyusun dan mereview design requirements.               | Mengedit, memvalidasi, menyetujui baseline.           |
| Owner/Operator  | Menetapkan kapasitas, trayek, target biaya, dan kinerja. | Memberi requirement dan menyetujui hasil.             |
| Dosen/Reviewer  | Memeriksa kelengkapan dan konsistensi akademis.          | Memberi komentar dan meminta revisi.                  |

# Ruang Lingkup

## Termasuk

- Identitas proyek dan kapal.

- Tipe kapal, fungsi, muatan, awak, dan penumpang.

- Trayek, jarak, kecepatan, endurance, serta profil operasi.

- Target DWT, payload, kapasitas ruang, dan cadangan.

- Kondisi perairan, density, cuaca desain, dan area operasi.

- Batas pelabuhan dan infrastruktur.

- Regulasi, klasifikasi, dan notasi yang dipilih.

- Kriteria keberhasilan, prioritas, dan batas biaya/waktu.

- AI Requirements Assistant dan pemeriksaan kelengkapan.

## Tidak Termasuk

- Estimasi ukuran utama dan koefisien bentuk.

- Perhitungan daya, stabilitas, lines plan, dan struktur.

- Pengelolaan procurement atau konstruksi.

# Input, Output, dan Gate

| **Jenis**    | **Rincian**                                                                                                                              |
|--------------|------------------------------------------------------------------------------------------------------------------------------------------|
| Input Utama  | Informasi misi kapal, data pemilik/operator, rute, muatan, target kinerja, lingkungan operasi, pelabuhan, regulasi, anggaran, dan waktu. |
| Output Utama | Design Requirements Baseline, requirement matrix, daftar asumsi, konflik kebutuhan, gap data, dan approval record.                       |
| Entry Gate   | Proyek telah dibuat dan pengguna memiliki peran yang sesuai.                                                                             |
| Exit Gate    | Seluruh requirement wajib lengkap, konflik kritis terselesaikan, sumber dan satuan jelas, serta baseline disetujui.                      |

# Alur Kerja Utama

| **Buat Proyek → Isi Project Data → Lengkapi Requirement → Validasi → AI Review → Human Review → Approve Baseline → Kirim ke Pra-Rancangan** |
|---------------------------------------------------------------------------------------------------------------------------------------------|

1.  Pengguna membuat identitas proyek dan memilih tipe kapal.

2.  Pengguna mengisi profil operasi, kapasitas, lingkungan, dan batas pelabuhan.

3.  Sistem memvalidasi tipe data, satuan, nilai minimum/maksimum, serta kelengkapan.

4.  AI menjelaskan arti input dan mendeteksi konflik atau data yang belum ada.

5.  Reviewer memeriksa requirement matrix dan memberi komentar.

6.  Product owner/naval architect mengunci Requirement Baseline Rev. 0.

# Kebutuhan Produk

## Kebutuhan Fungsional

| **ID**      | **Kebutuhan**                                                       | **Prioritas** | **Acceptance Criteria**                                                                        | **Catatan/Dependensi** |
|-------------|---------------------------------------------------------------------|---------------|------------------------------------------------------------------------------------------------|------------------------|
| **REQ-001** | Sistem menyediakan pembuatan proyek dan identitas unik.             | Must          | Project ID unik, nama proyek, owner, organisasi, tanggal, dan revisi tersimpan.                | Core project           |
| **REQ-002** | Sistem menyimpan tipe dan fungsi kapal.                             | Must          | Tipe wajib dipilih; fungsi utama dan jenis muatan tercatat.                                    | Project Data           |
| **REQ-003** | Sistem menyimpan trayek dan jarak pelayaran.                        | Must          | Nama trayek, asal, tujuan, jarak, dan sumber jarak dapat disimpan.                             | Current code           |
| **REQ-004** | Sistem menyimpan target DWT, payload, awak, dan penumpang.          | Must          | Nilai memiliki satuan, validasi non-negatif, dan status kelengkapan.                           | Stage 2                |
| **REQ-005** | Sistem menyimpan kecepatan dinas, maksimum, dan profil operasi.     | Must          | Kecepatan dinas wajib; sistem memberi warning jika nilai tidak konsisten.                      | Power                  |
| **REQ-006** | Sistem menghitung estimasi waktu pelayaran dasar.                   | Should        | Waktu = jarak/kecepatan tersedia sebagai indikasi, bukan hasil final.                          | Endurance              |
| **REQ-007** | Sistem menyimpan target endurance dan autonomy.                     | Must          | Nilai hari/jam dan reserve policy dapat dipilih.                                               | Fuel capacity          |
| **REQ-008** | Sistem menyimpan kondisi perairan dan density desain.               | Must          | Jenis air, density, temperatur, dan sumber asumsi tersimpan.                                   | Displacement           |
| **REQ-009** | Sistem menyimpan batas draft, LOA, breadth, dan air draft.          | Must          | Batas pelabuhan dapat ditandai hard limit atau soft target.                                    | Main dimensions        |
| **REQ-010** | Sistem menyimpan area pelayaran, gelombang, angin, dan arus desain. | Should        | Parameter lingkungan memiliki satuan dan sumber.                                               | Loads                  |
| **REQ-011** | Sistem menyimpan class, flag, regulasi, dan notasi.                 | Must          | Pengguna dapat memilih beberapa basis aturan dan versi dokumen.                                | All stages             |
| **REQ-012** | Sistem menyimpan target biaya dan jadwal proyek.                    | Could         | Rentang biaya dan target delivery tersedia sebagai constraint.                                 | Lifecycle              |
| **REQ-013** | Sistem menyediakan requirement matrix.                              | Must          | Setiap requirement memiliki ID, kategori, nilai, satuan, sumber, prioritas, status, dan owner. | Baseline               |
| **REQ-014** | Sistem mendeteksi data wajib yang belum lengkap.                    | Must          | Exit gate tidak dapat disetujui bila mandatory field kosong.                                   | Validation             |
| **REQ-015** | Sistem mendeteksi konflik requirement.                              | Must          | Contoh: draft target melebihi batas pelabuhan; konflik tampil dengan severity.                 | AI+rules               |
| **REQ-016** | Sistem menyediakan komentar dan review.                             | Should        | Reviewer dapat memberi komentar, resolve, dan meminta revisi.                                  | Workflow               |
| **REQ-017** | Sistem membuat baseline dan revisi.                                 | Must          | Approval membuat snapshot immutable; perubahan membuat revisi baru.                            | Versioning             |
| **REQ-018** | Sistem mengekspor requirement report.                               | Should        | Ekspor PDF/Excel memuat input, asumsi, konflik, status, dan approval.                          | Reporting              |

## Kebutuhan AI Assistant

| **ID**      | **Kebutuhan**                                                         | **Prioritas** | **Acceptance Criteria**                                                     | **Catatan/Dependensi** |
|-------------|-----------------------------------------------------------------------|---------------|-----------------------------------------------------------------------------|------------------------|
| **AI1-001** | AI menjelaskan definisi, satuan, sumber, dan contoh setiap parameter. | Must          | Jawaban menggunakan knowledge base terkurasi dan menyebut batas penerapan.  | Knowledge base         |
| **AI1-002** | AI menjelaskan dampak input terhadap pra-rancangan.                   | Must          | Jawaban menyebut parameter dan modul downstream yang relevan.               | Dependency graph       |
| **AI1-003** | AI mendeteksi requirement yang bertentangan.                          | Should        | AI hanya menyorot; status final berasal dari rule engine/reviewer.          | Rules                  |
| **AI1-004** | AI membuat ringkasan requirement.                                     | Should        | Ringkasan mencakup misi, kapasitas, batas, risiko, dan data yang belum ada. | LLM                    |
| **AI1-005** | AI menjawab pertanyaan pengguna dengan konteks proyek.                | Should        | Jawaban menyebut nilai proyek aktif dan tidak mengubah data otomatis.       | Project context        |
| **AI1-006** | AI membedakan penjelasan akademis, asumsi, dan regulasi.              | Must          | Setiap respons diberi label sumber/jenis informasi.                         | Safety                 |

# Model Data dan Status

| **Entitas/Data** | **Atribut Minimum**                                            | **Relasi/Status**                                   |
|------------------|----------------------------------------------------------------|-----------------------------------------------------|
| Project          | project_id, name, organization, owner, status, revision        | Memiliki Requirement Baseline dan tahap berikutnya. |
| Requirement      | requirement_id, category, value, unit, source, priority, owner | Draft/Reviewed/Approved/Rejected.                   |
| Route            | origin, destination, distance, environment, ports              | Berelasi ke operation profile.                      |
| Constraint       | type, min/max, hardness, source                                | Digunakan oleh validation engine.                   |
| Approval         | reviewer, date, decision, comments                             | Mengunci baseline.                                  |
| AI Explanation   | parameter, context hash, answer, source set                    | Tidak menjadi sumber angka desain.                  |

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

- Field wajib berbeda menurut tipe kapal dan profil misi.

- Semua angka harus memiliki satuan internal dan satuan tampilan.

- Hard constraint memblokir approval; soft constraint menghasilkan warning.

- Density harus disimpan bersama konteks air/temperatur dan sumber asumsi.

- Perubahan requirement yang sudah disetujui membuat revisi dan menandai tahap downstream sebagai perlu review.

- AI tidak boleh menyatakan requirement aman atau comply tanpa rule engine dan verifikasi manusia.

# Persyaratan UX

- Wizard bertahap dengan progress dan status kelengkapan.

- Panel AI di sisi kanan dengan tombol “Apa ini?”, “Mengapa perlu?”, dan “Apa dampaknya?”.

- Input menampilkan unit, contoh, rentang, sumber, dan severity jika konflik.

- Requirement matrix dapat difilter berdasarkan kategori, status, owner, dan prioritas.

- Tombol approval hanya aktif jika exit gate terpenuhi.

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

| **Metrik**               | **Target Awal**                      | **Cara Ukur**                      |
|--------------------------|--------------------------------------|------------------------------------|
| Requirement completeness | ≥95% field wajib sebelum review      | Persentase field mandatory terisi. |
| Conflict detection       | 100% rule conflict kritis tertangkap | Uji kasus constraint.              |
| Time to baseline         | Turun ≥30% dibanding proses manual   | Waktu create-to-approve.           |
| Explanation usefulness   | ≥80% rating membantu                 | Rating pengguna setelah AI answer. |

# Acceptance Criteria Tahap

- Project Data yang saat ini tersedia tetap dapat digunakan dan termigrasi.

- Requirement Baseline Rev. 0 dapat dibuat, direview, disetujui, dan diekspor.

- Sistem memblokir approval jika field wajib atau konflik kritis belum selesai.

- Setiap parameter utama memiliki penjelasan AI dan dependency downstream.

- Perubahan setelah approval membuat revisi baru dan tidak menimpa baseline lama.

# Risiko dan Mitigasi

| **Risiko**                           | **Dampak**                             | **Mitigasi**                                                     |
|--------------------------------------|----------------------------------------|------------------------------------------------------------------|
| Requirement terlalu umum atau ambigu | Desain downstream salah arah           | Gunakan template per tipe kapal, mandatory source, dan reviewer. |
| AI mengarang batas atau regulasi     | Keputusan teknis tidak dapat dipercaya | RAG dari knowledge base terkurasi; label sumber; human approval. |
| Terlalu banyak input di awal         | Pengguna berhenti mengisi              | Progressive disclosure dan level Basic/Advanced.                 |
| Perubahan requirement terlambat      | Rework besar                           | Impact analysis dan change approval.                             |

# Rencana Rilis

| **Rilis** | **Fokus**                                                                 | **Kriteria Keluar**                             |
|-----------|---------------------------------------------------------------------------|-------------------------------------------------|
| MVP       | Project Data, requirement matrix, validasi, baseline, AI explainer dasar. | Satu proyek dapat lolos gate ke Tahap 2.        |
| R1        | Constraint pelabuhan, regulasi, konflik, review workflow.                 | Review multi-user dan revisi berjalan.          |
| R2        | Template per tipe kapal, analytics, requirement comparison.               | Dapat digunakan sebagai owner requirement tool. |

# Pertanyaan Terbuka

- Tipe kapal mana yang menjadi fokus MVP pertama?

- Siapa yang berwenang menyetujui requirement baseline?

- Basis regulasi dan class apa yang diprioritaskan?

- Apakah target biaya dan jadwal wajib pada konteks akademis?
