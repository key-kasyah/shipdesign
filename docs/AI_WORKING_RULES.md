# AI Working Rules

## 1. Tujuan Dokumen

Dokumen ini mengatur cara AI membantu mengembangkan **Platform Rancang Bangun Kapal Terintegrasi AI** secara bertahap, terkontrol, dapat diuji, dan tidak melampaui ruang lingkup yang sedang aktif.

AI harus memahami keseluruhan sistem, tetapi hanya boleh mengimplementasikan tahap, sprint, dan tugas yang dinyatakan aktif dalam `CURRENT_STAGE.md`.

---

## 2. Hierarki Dokumen

Sebelum melakukan analisis, perencanaan, atau perubahan kode, AI wajib membaca dokumen berikut secara berurutan:

1. `00_PRD_Induk_Platform_Rancang_Bangun_Kapal_AI.md`
2. `AI_WORKING_RULES.md`
3. `CURRENT_STAGE.md`
4. PRD tahap yang sedang aktif
5. `SYSTEM_DEPENDENCIES.md`
6. `ARCHITECTURE_DECISIONS.md`
7. `DEFINITION_OF_DONE.md`
8. `CHANGELOG.md`
9. Source code dan test yang relevan

Jika terdapat pertentangan:

1. Instruksi pengguna terbaru yang eksplisit berlaku paling tinggi.
2. `CURRENT_STAGE.md` menentukan ruang lingkup yang boleh dikerjakan.
3. `AI_WORKING_RULES.md` menentukan cara kerja.
4. PRD menentukan kebutuhan produk.
5. `ARCHITECTURE_DECISIONS.md` menentukan keputusan teknis yang sudah disetujui.

---

## 3. Prinsip Utama

### 3.1 Pahami seluruh sistem, kerjakan satu bagian

AI harus memahami bahwa platform terdiri atas:

1. Kebutuhan Kapal
2. Pra-Rancangan
3. Basic Design
4. Detail Design dan Approval
5. Production Design
6. Konstruksi
7. Pengujian dan Penyerahan

Pengetahuan terhadap seluruh tahap hanya digunakan untuk:

- menjaga konsistensi data;
- mencegah desain arsitektur buntu;
- menyiapkan data contract yang diperlukan;
- memahami dampak perubahan;
- menjaga kompatibilitas antartahap.

Pengetahuan tersebut bukan izin untuk mengimplementasikan tahap yang masih dikunci.

### 3.2 Satu sprint, satu sasaran utama

AI tidak boleh menggabungkan banyak fitur besar dalam satu pekerjaan. Setiap pekerjaan harus memiliki:

- satu tahap aktif;
- satu sprint aktif;
- satu tugas aktif;
- daftar deliverable yang jelas;
- acceptance criteria;
- batas pekerjaan;
- daftar hal yang tidak dikerjakan.

### 3.3 Berhenti setelah tugas selesai

Setelah deliverable tugas aktif selesai:

1. jalankan test;
2. laporkan hasilnya;
3. perbarui dokumentasi;
4. ubah status menjadi `WAITING FOR REVIEW`;
5. jangan memulai sprint atau tugas berikutnya;
6. tunggu persetujuan eksplisit pengguna.

---

## 4. Stage Lock

AI hanya boleh mengubah modul yang tercantum pada bagian `Allowed Work` dalam `CURRENT_STAGE.md`.

### Status tahap

- `LOCKED`: tidak boleh diimplementasikan atau diubah.
- `PLANNED`: boleh dianalisis secara konseptual, tetapi belum boleh diimplementasikan.
- `ACTIVE`: boleh dikerjakan sesuai sprint aktif.
- `WAITING_FOR_REVIEW`: implementasi berhenti sampai ada review.
- `REVISION_REQUIRED`: hanya perbaikan terhadap temuan review yang boleh dilakukan.
- `APPROVED`: baseline disetujui dan dikunci.
- `DEPRECATED`: tidak lagi digunakan.

### Larangan

AI tidak boleh:

- membuka tahap berikutnya tanpa persetujuan pengguna;
- menambahkan fitur tahap lain karena dianggap “sekalian”;
- melakukan refactor besar di luar kebutuhan tugas aktif;
- mengubah data contract lintas tahap tanpa analisis dampak;
- menghapus kompatibilitas lama tanpa persetujuan;
- menganggap roadmap sebagai backlog yang otomatis boleh dikerjakan.

---

## 5. Prosedur Sebelum Coding

Sebelum mengubah file, AI harus menyampaikan:

1. ringkasan pemahaman tugas;
2. batas ruang lingkup;
3. file yang akan dibuat atau diubah;
4. dependensi yang terdampak;
5. hal yang tidak akan dikerjakan;
6. risiko teknis utama;
7. rencana implementasi kecil;
8. test yang akan dijalankan.

Jika tugas hanya meminta desain atau dokumentasi, AI tidak boleh langsung membuat implementasi kode.

---

## 6. Aturan Implementasi

### 6.1 Pemisahan komponen

Arsitektur harus memisahkan:

- UI layer;
- domain/data model;
- calculation engine;
- validation engine;
- dependency engine;
- persistence layer;
- AI assistant layer;
- reporting/export layer;
- test suite.

### 6.2 Calculation engine

Semua perhitungan teknik harus:

- deterministik;
- dapat diuji;
- memiliki satuan yang jelas;
- memiliki validasi input;
- mencatat metode dan asumsi;
- tidak bergantung pada jawaban generatif AI;
- menghasilkan error atau warning yang eksplisit.

### 6.3 AI assistant

AI hanya boleh:

- menjelaskan parameter;
- menjelaskan satuan;
- menjelaskan rumus yang sudah terdaftar;
- menjelaskan hasil calculation engine;
- menjelaskan status validasi;
- menganalisis dampak perubahan berdasarkan dependency graph;
- membantu what-if analysis melalui calculation engine;
- membuat ringkasan dan checklist;
- menunjukkan ketidakpastian dan kebutuhan verifikasi.

AI tidak boleh:

- menjadi sumber utama angka teknik;
- mengarang rumus, batas, atau regulasi;
- mengubah input tanpa persetujuan;
- menyatakan desain aman atau disetujui class;
- mengabaikan satuan;
- meloloskan stage gate yang gagal;
- memperlakukan rekomendasi empiris sebagai regulasi wajib;
- menyembunyikan asumsi.

### 6.4 Satuan internal

Kecuali ada ADR baru yang disetujui:

- panjang: meter;
- luas: meter persegi;
- volume: meter kubik;
- massa/displacement: ton metrik;
- density: ton per meter kubik;
- kecepatan kapal: knot;
- daya internal: kW;
- daya tampilan sekunder: HP jika dibutuhkan;
- jarak pelayaran: nautical mile;
- waktu: jam atau hari dengan konversi eksplisit.

### 6.5 Error handling

Setiap fungsi publik harus menangani:

- input kosong;
- tipe data salah;
- pembagian dengan nol;
- nilai negatif yang tidak diperbolehkan;
- nilai di luar domain metode;
- satuan tidak konsisten;
- data dependency belum tersedia;
- hasil tahap sebelumnya sudah kedaluwarsa.

---

## 7. Aturan Data dan Dependensi

Setiap parameter penting harus mempunyai metadata:

- `id`;
- nama;
- simbol;
- tipe data;
- satuan;
- sumber;
- nilai default;
- nilai minimum/maksimum jika ada;
- tahap pemilik data;
- modul pengguna data;
- formula yang menggunakan;
- dampak jika berubah;
- status validasi;
- revision ID.

Jika input berubah:

1. sistem menandai hasil langsung sebagai `STALE`;
2. dependency engine menelusuri dampak turunannya;
3. AI menjelaskan modul yang perlu dihitung ulang;
4. sistem tidak langsung mengganti baseline;
5. pengguna menjalankan kalkulasi ulang;
6. hasil baru direview sebelum disetujui.

---

## 8. Aturan Perubahan File

AI harus:

- meminimalkan jumlah file yang diubah;
- tidak mengganti seluruh file jika perubahan kecil cukup;
- mempertahankan gaya dan struktur repository;
- mencatat file baru dan file berubah;
- menambahkan atau memperbarui test;
- tidak menyimpan secret dalam repository;
- tidak menambahkan dependency baru tanpa alasan;
- mencatat dependency baru pada ADR dan changelog.

---

## 9. Pengujian

Untuk setiap implementasi, pilih test yang relevan:

- unit test;
- validation test;
- calculation regression test;
- serialization test;
- migration test;
- UI event test;
- integration test;
- AI grounding test;
- prompt injection resistance test;
- stage-lock test.

Test harus membuktikan acceptance criteria, bukan hanya menjalankan fungsi tanpa error.

---

## 10. Dokumentasi Setelah Implementasi

Setelah pekerjaan selesai, AI wajib memperbarui:

- `CHANGELOG.md`;
- `ARCHITECTURE_DECISIONS.md` jika ada keputusan baru;
- `SYSTEM_DEPENDENCIES.md` jika ada relasi baru;
- dokumentasi data model atau API;
- status pada `CURRENT_STAGE.md`.

Laporan akhir pekerjaan harus berisi:

- apa yang dibuat;
- file yang berubah;
- hasil test;
- acceptance criteria yang terpenuhi;
- batasan;
- risiko tersisa;
- status review;
- pekerjaan berikutnya sebagai rekomendasi saja.

---

## 11. Kondisi Berhenti

AI harus berhenti dan tidak melanjutkan otomatis ketika:

- tugas aktif selesai;
- acceptance criteria belum jelas;
- ditemukan konflik PRD dan ADR;
- perubahan memerlukan pembukaan stage yang terkunci;
- perubahan berpotensi merusak baseline;
- referensi teknis tidak tersedia;
- test gagal dan penyebab belum dapat diperbaiki dengan aman;
- pengguna perlu memilih satu dari beberapa keputusan produk penting.

---

## 12. Prompt Operasional Ringkas

Setiap sesi pengembangan harus mengikuti pola:

```text
Baca Master PRD dan seluruh governance docs.
Pahami keseluruhan platform.
Kerjakan hanya stage, sprint, dan task aktif.
Jangan implementasikan locked stages.
Tampilkan rencana sebelum perubahan.
Implementasikan perubahan minimum.
Jalankan test.
Perbarui dokumentasi.
Ubah status menjadi WAITING_FOR_REVIEW.
Berhenti.
```
