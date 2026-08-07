# Definition of Done

## 1. Tujuan

Definition of Done (DoD) menentukan syarat minimum agar suatu task, sprint, tahap, atau rilis dapat dinyatakan selesai.

Pekerjaan yang “sudah berjalan” belum tentu selesai. Pekerjaan hanya selesai jika memenuhi seluruh kriteria yang relevan.

---

## 2. DoD untuk Task

Sebuah task dianggap selesai jika:

### Scope

- implementasi hanya mencakup task aktif;
- tidak ada fitur stage terkunci yang ikut dibuat;
- seluruh deliverable tersedia;
- out-of-scope dicatat.

### Kode

- kode dapat dijalankan;
- tipe data jelas;
- satuan jelas;
- tidak ada secret atau credential;
- error handling tersedia;
- tidak ada duplikasi besar yang tidak perlu;
- public interface terdokumentasi.

### Test

- test baru ditambahkan;
- test relevan lulus;
- edge case utama diuji;
- error case diuji;
- regression test tidak gagal;
- hasil test dicatat.

### Dokumentasi

- changelog diperbarui;
- ADR diperbarui jika diperlukan;
- dependency map diperbarui jika diperlukan;
- contoh penggunaan tersedia;
- batasan dicatat.

### Review

- ringkasan perubahan tersedia;
- file berubah disebutkan;
- risiko tersisa disebutkan;
- status diubah menjadi `WAITING_FOR_REVIEW`;
- AI berhenti dan menunggu persetujuan.

---

## 3. DoD untuk Data Model

Data model dianggap selesai jika:

- semua field PRD tercakup;
- required dan optional field dibedakan;
- tipe data eksplisit;
- satuan tercatat;
- enum digunakan untuk nilai terkendali;
- nilai numerik divalidasi;
- cross-field constraint utama tersedia;
- serialization berhasil;
- deserialization berhasil;
- round-trip tidak kehilangan data;
- revision metadata tersedia;
- backward compatibility atau migration plan dijelaskan;
- test lulus.

---

## 4. DoD untuk Calculation Module

Calculation module dianggap selesai jika:

- rumus dan metode terdokumentasi;
- sumber atau referensi metode tercatat;
- domain penerapan dijelaskan;
- input dan output memiliki satuan;
- validasi input tersedia;
- pembagian nol dan domain error ditangani;
- hasil deterministik;
- test menggunakan kasus terverifikasi;
- tolerance numerik didefinisikan;
- asumsi tampil pada hasil;
- warning berbeda dari error;
- AI tidak diperlukan untuk menghasilkan angka;
- dependency graph diperbarui.

---

## 5. DoD untuk Validation Module

Validation dianggap selesai jika:

- required-field validation tersedia;
- type validation tersedia;
- unit validation tersedia;
- range validation tersedia;
- cross-field validation tersedia;
- severity tersedia:
  - info;
  - warning;
  - error;
  - blocking error;
- pesan menjelaskan masalah dan parameter terkait;
- rule source dicatat;
- empirical guidance dibedakan dari regulation;
- test untuk valid, warning, error, dan boundary tersedia.

---

## 6. DoD untuk AI Feature

AI feature dianggap selesai jika:

- use case jelas;
- input context terstruktur;
- calculation output tidak diubah;
- knowledge source terdaftar;
- jawaban menyatakan asumsi;
- jawaban membedakan fakta, hasil kalkulasi, rekomendasi, dan warning;
- AI tidak mengarang regulasi;
- AI tidak menyatakan approval;
- dependency explanation berasal dari graph;
- prompt injection basic test tersedia;
- unsupported question menghasilkan jawaban aman;
- user dapat melihat data yang menjadi dasar jawaban;
- hasil AI tidak otomatis mengubah baseline;
- latency dan failure state ditangani.

---

## 7. DoD untuk UI Module

UI dianggap selesai jika:

- field sesuai data model;
- label dan satuan terlihat;
- required field terlihat;
- validasi tampil dekat input;
- loading state tersedia;
- empty state tersedia;
- error state tersedia;
- keyboard flow masuk akal;
- status tidak hanya dibedakan dengan warna;
- output calculation dapat ditelusuri ke input;
- AI explanation tidak menutupi hasil teknik;
- test event utama tersedia.

---

## 8. DoD untuk Sprint

Sprint dianggap selesai jika:

- seluruh task sprint berstatus selesai;
- acceptance criteria sprint terpenuhi;
- integration test lulus;
- tidak ada blocking defect;
- dokumentasi diperbarui;
- demo atau bukti hasil tersedia;
- technical debt baru dicatat;
- risiko sprint berikutnya dicatat;
- status sprint `WAITING_FOR_REVIEW`;
- pengguna memberikan approval eksplisit.

---

## 9. DoD untuk Tahap

Sebuah tahap dianggap selesai jika:

- semua modul wajib tahap selesai;
- output baseline tahap tersedia;
- data contract ke tahap berikutnya tersedia;
- semua blocking validation lulus;
- semua asumsi tercatat;
- daftar warning tersedia;
- requirement traceability tersedia;
- version dan revision history tersedia;
- user acceptance test lulus;
- baseline direview;
- baseline disetujui pengguna;
- tahap diubah menjadi `APPROVED`;
- tahap berikutnya dapat dibuka secara eksplisit.

### DoD Tahap 1 — Kebutuhan Kapal

Tambahan khusus:

- Project Data lengkap;
- completeness score tersedia;
- conflict detection utama tersedia;
- requirement summary tersedia;
- Design Requirements Baseline dapat diekspor;
- seluruh parameter untuk handoff Tahap 2 tersedia;
- belum ada perhitungan pra-rancangan yang tercampur ke Tahap 1.

---

## 10. DoD untuk Release

Release dianggap selesai jika:

- release scope dibekukan;
- seluruh test lulus;
- security check dasar lulus;
- migration diuji;
- rollback plan tersedia;
- version number ditetapkan;
- release notes tersedia;
- changelog diperbarui;
- deployment artifact tersedia;
- konfigurasi terdokumentasi;
- known issues dicatat;
- user guide diperbarui.

---

## 11. Kriteria Tidak Selesai

Pekerjaan tidak boleh disebut selesai jika:

- hanya UI yang dibuat tanpa data model;
- angka berasal dari AI tanpa calculation engine;
- test belum dijalankan;
- hasil gagal tetapi disembunyikan;
- satuan tidak jelas;
- source metode tidak diketahui;
- stage terkunci ikut diimplementasikan;
- dokumentasi belum diperbarui;
- baseline berubah tanpa revisi;
- acceptance criteria belum diverifikasi;
- pengguna belum melakukan review ketika review diwajibkan.

---

## 12. Checklist Ringkas

```text
[ ] Scope sesuai CURRENT_STAGE
[ ] Deliverable lengkap
[ ] Kode berjalan
[ ] Validasi tersedia
[ ] Satuan jelas
[ ] Test lulus
[ ] Dokumentasi diperbarui
[ ] Dependency diperbarui
[ ] Changelog diperbarui
[ ] Risiko dicatat
[ ] Status WAITING_FOR_REVIEW
[ ] Tidak memulai task berikutnya
```
