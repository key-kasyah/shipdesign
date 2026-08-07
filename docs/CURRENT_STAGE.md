# Current Development Stage

## 1. Ringkasan Status

| Tahap | Nama | Status |
|---|---|---|
| 1 | Kebutuhan Kapal | `APPROVED` |
| 1-UI | Stage 1 Web UI | `APPROVED` |
| 2 | Pra-Rancangan | `WAITING_FOR_USER_REVIEW` |
| 3 | Basic Design | `LOCKED` |
| 4 | Detail Design dan Approval | `LOCKED` |
| 5 | Production Design | `LOCKED` |
| 6 | Konstruksi | `LOCKED` |
| 7 | Pengujian dan Penyerahan | `LOCKED` |

Tahap 2 sampai Tahap 7 tetap terkunci (`LOCKED`) dan tidak boleh diimplementasikan sampai pengguna membuka secara eksplisit.








---

## 2. Active Stage

**Tahap 1 — Kebutuhan Kapal / Design Requirements**

### Tujuan tahap

Menghasilkan data kebutuhan kapal yang lengkap, tervalidasi, dapat disimpan, dapat direvisi, dan siap menjadi baseline input untuk Tahap 2 — Pra-Rancangan.

### Output utama

`Requirements Foundation Baseline v0.1` (Rev. 0) - **LOCKED / APPROVED**

---

## 3. Active Sprint

**Sprint 1.1 — Fondasi Proyek dan Data Model Project Data (APPROVED)**

### Sprint goal

Membangun fondasi domain model untuk menyimpan identitas proyek dan kebutuhan utama kapal tanpa membangun perhitungan pra-rancangan.


---

## 4. Current Task

**Task 1.1.1 — Definisi dan Implementasi Data Model Project Data**

Data model minimum harus mendukung:

### Identitas proyek

- project ID;
- nama proyek;
- nama kapal;
- pemilik/operator;
- perancang/galangan;
- tanggal pembuatan;
- nomor revisi;
- status proyek.

### Misi dan operasi

- tipe kapal;
- fungsi kapal;
- trayek;
- jarak pelayaran;
- target DWT;
- target payload;
- kecepatan dinas;
- kecepatan maksimum;
- endurance;
- autonomy;
- jumlah awak;
- jumlah penumpang.

### Lingkungan dan batasan

- jenis perairan;
- density air;
- area pelayaran;
- batas maksimum draft;
- batas maksimum LOA;
- batas maksimum breadth;
- batas air draft;
- badan klasifikasi;
- negara bendera;
- regulasi yang dipilih.

### Metadata

- created at;
- updated at;
- created by;
- revision note;
- completion status;
- validation status.

---

## 5. Allowed Work

AI boleh:

- mengusulkan struktur folder yang relevan untuk Tahap 1;
- membuat domain/data model Project Data;
- membuat schema serialisasi;
- membuat enum dan tipe pendukung;
- membuat validasi tipe data dasar;
- membuat dokumentasi field;
- membuat unit test data model;
- membuat contoh data fixture;
- memperbarui governance docs yang relevan;
- menyiapkan interface atau contract yang diperlukan untuk masa depan tanpa mengimplementasikan Tahap 2.

---

## 6. Forbidden Work

AI tidak boleh:

- membuat kapal pembanding;
- membuat scaling ukuran utama;
- menghitung LOA, LBP, B, H, atau T;
- menghitung Cb, Cm, Cw, atau Cp;
- membuat Design Check;
- menghitung displacement;
- membuat estimasi NSP;
- membuat CSA;
- membuat DWL;
- membuat Gading 10;
- membuat estimasi berat;
- membuat Capacity Check;
- membuat stabilitas atau trim;
- membuat Basic Design;
- membuat fitur Tahap 3–7;
- membuat chatbot AI penuh;
- membuat database produksi;
- membuat UI lengkap;
- membuka sprint berikutnya.

---

## 7. Expected Deliverables

- domain model Project Data;
- field dictionary;
- validation rules dasar;
- serialization/deserialization;
- unit test;
- contoh payload;
- dokumentasi penggunaan model;
- changelog;
- ADR jika ada keputusan arsitektur baru.

---

## 8. Acceptance Criteria

Task dianggap selesai jika:

- seluruh field wajib dapat disimpan;
- field opsional dapat bernilai kosong tanpa merusak model;
- nilai numerik yang tidak valid ditolak;
- density, jarak, kecepatan, DWT, dan batas dimensi menggunakan satuan yang konsisten;
- model dapat diserialisasi dan dibaca kembali tanpa kehilangan data;
- revision metadata tersimpan;
- status kelengkapan dapat ditentukan;
- test relevan lulus;
- tidak ada modul Tahap 2–7 yang diimplementasikan;
- dokumentasi diperbarui.

---

## 9. Current Status

`WAITING_FOR_USER_REVIEW`

Seluruh fungsionalitas backend dan frontend untuk **Tahap 2 — Pra-Rancangan Kapal** telah selesai diimplementasikan dan diuji. Seluruh unit test matematika kalkulator (`test_preliminary_calculators.py`) dan pengujian integrasi API (`test_api_server_stage2.py`) telah lulus dengan sukses. Verifikasi visual menggunakan peramban otomatis pada port `3001` juga telah berhasil mendemonstrasikan perubahan dimensi utama (LBP), perhitungan displacement otomatis, serta render grafik kurva CSA dan DWL. Saat ini sistem menunggu peninjauan dan UAT final oleh pengguna.










---

## 10. Next Status Flow

```text
PLANNING
   ↓ persetujuan rencana
IN_PROGRESS
   ↓ implementasi dan test selesai
WAITING_FOR_REVIEW
   ↓ review pengguna
APPROVED atau REVISION_REQUIRED
```

AI tidak boleh mengubah status menjadi `APPROVED` atas inisiatif sendiri.

---

## 11. Next Candidate Task

Setelah Task 1.1.1 disetujui, kandidat berikutnya adalah:

**Task 1.1.2 — Validation Engine Project Data**

Kandidat ini hanya catatan roadmap dan belum aktif.
