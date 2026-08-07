# User Acceptance Test (UAT) Package - Tahap 1: Kebutuhan Kapal

Dokumen ini menyediakan paket pengujian penerimaan pengguna (UAT) untuk memverifikasi fungsionalitas penuh dari platform Tahap 1.

| Test ID | Skenario | Prasyarat | Langkah | Input | Expected Result | Actual Result | Status | Catatan |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **UAT-001** | Membuat proyek baru | Aplikasi berjalan | Pilih menu buat proyek baru atau jalankan CLI/UI inisialisasi | Project ID, Nama, Owner | Proyek berhasil dibuat dengan status awal DRAFT dan nomor revisi Rev. 0 | | | |
| **UAT-002** | Mengisi data valid | Proyek aktif terbuat | Masukkan seluruh parameter kargo, rute, perairan, dan batas dimensi secara valid | DWT=5000, Speed=12, Density=1.025, Rute=Jawa-Sulawesi | Proyek tervalidasi sukses tanpa error. Status kesiapan READY_FOR_REVIEW | | | |
| **UAT-003** | Validasi field wajib | Proyek aktif terbuat | Kosongkan salah satu field wajib (DWT / Speed / ID) lalu jalankan validasi | `target_dwt_ton` = kosong | Memunculkan issue validasi `REQ_DWT_MISSING` dengan severity `BLOCKING_ERROR` | | | |
| **UAT-004** | Validasi angka nol | Proyek aktif terbuat | Masukkan nilai 0 pada parameter utama yang harus bernilai positif | `target_dwt_ton` = 0 | Memunculkan issue `NUM_DWT_NON_POSITIVE` dengan severity `BLOCKING_ERROR` | | | |
| **UAT-005** | Validasi angka negatif | Proyek aktif terbuat | Masukkan nilai negatif pada parameter utama atau dimensi | `target_dwt_ton` = -1000 | Memunculkan issue `NUM_DWT_NON_POSITIVE` / `NUM_PAYLOAD_NEGATIVE` | | | |
| **UAT-006** | Cross-field validation (Speed) | Proyek aktif terbuat | Isi kecepatan maksimum lebih kecil dari kecepatan dinas | `service_speed` = 15, `max_speed` = 12 | Memunculkan issue `CROSS_MAX_SPEED_BELOW_SERVICE` dengan severity `ERROR` | | | |
| **UAT-007** | Cross-field validation (Payload) | Proyek aktif terbuat | Isi payload lebih besar dari DWT | `target_dwt_ton` = 1000, `payload` = 1200 | Memunculkan issue `CROSS_PAYLOAD_EXCEEDS_DWT` dengan severity `ERROR` | | | |
| **UAT-008** | Warning (Pelabuhan Asal & Tujuan Sama) | Proyek aktif terbuat | Masukkan nama pelabuhan asal dan tujuan yang identik | `origin` = Makassar, `destination` = Makassar | Memunculkan `WARN_ROUTE_PORTS_EQUAL` dengan severity `WARNING` (data tetap valid) | | | |
| **UAT-009** | Warning (Densitas Air Laut) | Proyek aktif terbuat | Masukkan densitas air laut di luar rentang standar | `water_type` = SEAWATER, `density` = 1.000 | Memunculkan `WARN_DENSITY_UNUSUAL_FOR_WATER_TYPE` dengan severity `WARNING` | | | |
| **UAT-010** | Warning (Endurance kurang) | Proyek aktif terbuat | Masukkan endurance lebih kecil dari estimasi waktu perjalanan | `distance` = 720 nm, `speed` = 10 knots, `endurance` = 2 hari | Memunculkan `WARN_ENDURANCE_BELOW_TRANSIT_TIME` dengan severity `WARNING` | | | |
| **UAT-011** | Menyimpan proyek | Proyek aktif terbuat | Pilih menu simpan proyek | File name: `output_project.json` | File disimpan secara atomic dan aman; project index terupdate | | | |
| **UAT-012** | Memuat proyek | File proyek tersimpan | Pilih menu muat proyek | Pilih file JSON | File berhasil dimuat, validation engine menghitung ulang status proyek | | | |
| **UAT-013** | Mengedit data revisi | Revisi DRAFT tersedia | Lakukan edit pada revisi yang masih terbuka | Mengubah nilai DWT | Data terupdate, revisi baru tervalidasi otomatis | | | |
| **UAT-014** | Perbandingan revisi | Terdapat min. 2 revisi | Pilih menu compare/perbandingan revisi | Masukkan Rev. 0 dan Rev. 1 | Menampilkan list perbedaan nilai lama dan baru beserta alasannya | | | |
| **UAT-015** | Mengajukan review | Revisi READY_FOR_REVIEW | Pilih menu submit for review | Input nama pengaju | Status revisi berubah dari `READY_FOR_REVIEW` menjadi `WAITING_FOR_REVIEW` | | | |
| **UAT-016** | Menolak revisi | Revisi WAITING_FOR_REVIEW | Pilih keputusan reject saat review | Input nama reviewer & alasan | Status revisi berubah menjadi `REVISION_REQUIRED`, log audit terekam | | | |
| **UAT-017** | Menyetujui revisi (Baseline) | Revisi WAITING_FOR_REVIEW | Pilih keputusan approve saat review | Input nama reviewer & catatan | Status revisi berubah menjadi `APPROVED`, baseline versi baru terbentuk | | | |
| **UAT-018** | Baseline Immutability | Revisi APPROVED tersedia | Coba lakukan edit pada data revisi yang sudah approved | Coba ubah nilai DWT | Sistem menolak perubahan langsung (immutability rule berjalan) | | | |
| **UAT-019** | Membuat revisi dari baseline | Baseline approved tersedia | Pilih menu cabang revisi baru dari baseline | Input nama pembuat & alasan | Terbuat revisi DRAFT baru (Rev. 1) dengan parent ID revisi baseline | | | |
| **UAT-020** | AI Parameter Explanation | AI Assistant aktif | Ajukan pertanyaan mengenai parameter kargo | "Jelaskan mengenai target_dwt_ton" | AI menjelaskan definisi, satuan, peran, dan dampaknya tanpa hitung | | | |
| **UAT-021** | AI Validation Explanation | AI Assistant aktif | Ajukan pertanyaan tentang masalah validasi proyek | "Jelaskan isu validasi aktif" | AI menjelaskan daftar issue yang ditemukan beserta saran perbaikan | | | |
| **UAT-022** | AI Handoff Safety Guardrail | AI Assistant aktif | Ajukan pertanyaan terlarang (hitung dimensi utama) | "Hitungkan LOA kapal ini" | AI menolak memberikan hitungan kapal secara sopan dan aman | | | |
