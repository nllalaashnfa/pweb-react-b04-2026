# Aku Mw Magang — Dokumentasi Sistem & Panduan Demo Praktikum

Aplikasi frontend React + TypeScript untuk membantu Kapten mengelola proses pencarian magang secara terstruktur: mulai dari eksplorasi lowongan, pencatatan lamaran manual, pengelolaan pipeline (*War Room*), pembaruan tahap seleksi, daftar persiapan, latihan *interview* berwaktu, hingga pencegahan *ghosting* dan bentrok jadwal.

---

## 1. Gambaran Besar & Penjelasan Soal

Kapten memiliki masalah saat melamar magang: lupa versi CV yang dikirim, melamar posisi yang *skill*-nya kurang cocok, terkena *ghosting* HRD lebih dari 14 hari tanpa sadar, serta jadwal *interview* yang nyaris bentrok.

Untuk menyelesaikan masalah tersebut, aplikasi wajib mematuhi **Aturan Main** berikut:
1. **Anti-duplikat lamaran:** Kombinasi `company` + `role` yang sama tidak boleh dilamar dua kali (*case-insensitive*).
2. **Transisi status ketat (*State Machine*):** Perpindahan status wajib mengikuti jalur resmi (`WISHLIST -> APPLIED -> SCREENING -> INTERVIEW -> OFFER/REJECTED/GHOSTED`), status `OFFER` dan `REJECTED` bersifat final, dan hanya `GHOSTED` yang boleh kembali ke `SCREENING`.
3. **Syarat pindah status:**
   - Ke `APPLIED`: wajib mengisi `cvVersion` dan `appliedDate`.
   - Ke `INTERVIEW`: wajib mengisi `interviewDateTime` (`YYYY-MM-DDTHH:mm`).
   - Ke `OFFER`: wajib mengisi `salaryOffer > 0` dan `workMode`.
4. **Deteksi Rawan Ghosting:** Lamaran berstatus `APPLIED` atau `SCREENING` yang tidak berubah lebih dari **14 hari** otomatis menampilkan badge **Rawan Ghosting** (dihitung langsung tanpa disimpan ke state terpisah).
5. **Deteksi Bentrok Jadwal Interview:** Jika terdapat $\ge 2$ lamaran berstatus `INTERVIEW` yang selisih waktunya **$< 60$ menit**, banner peringatan wajib muncul di atas halaman meskipun filter sedang aktif.
6. **Skill Match Score ($\%$):** Dihitung otomatis dari jumlah *skill* Kapten yang cocok dibagi total *skill* lowongan (`Math.round((cocok / total) * 100)`).
7. **Undo Delete (5 detik):** Menghapus lamaran memunculkan notifikasi *Undo* selama 5 detik; jika menghapus berulang dalam $< 5$ detik, timer lama wajib dibersihkan.
8. **Tanpa library eksternal state/form:** Seluruh state, form, timer, dan penyimpanan lokal wajib memakai React Hooks bawaan dan Custom Hooks buatan sendiri, dengan TypeScript `strict: true` tanpa tipe `any`.

### Fokus Pengerjaan Fitur 3, 4, dan 5
- **Fitur 3 — War Room Pipeline, Ghosting & Bentrok Jadwal:** Menampilkan daftar seluruh lamaran beserta status, versi CV, progres checklist, dan Skill Match $\%$; menyediakan filter gabungan (cari teks, filter status, toggle Rawan Ghosting, sorting Terbaru / Interview Terdekat / Offer Tertinggi); tombol **Simulasi +15 Hari**; serta **Banner Bentrok Jadwal** global.
- **Fitur 4 — Detail Lamaran (State Machine, Checklist & Activity Log):** Modal detail dengan tampilan 2 kolom (tahap seleksi + transisi status bersyarat + daftar persiapan dengan progress bar di kiri, latihan interview + riwayat aktivitas di kanan), update data bertingkat secara *immutable*, dan pencatatan log otomatis maupun catatan manual Kapten.
- **Fitur 5 — Interview Prep Timer:** Panel latihan *interview* berisi 6 pertanyaan magang IT dengan *countdown timer* `02:00`, tombol **Mulai/Jeda**, **Reset**, dan **Lanjut**, serta *cleanup* `clearInterval` saat modal ditutup.

---

## 2. Penjelasan Isi File Project

Berikut struktur dan peran masing-masing file agar mudah ditelusuri saat demo:

| File / Folder | Isi & Perannya dalam Sistem |
| :--- | :--- |
| [`index.html`](index.html) | Kerangka HTML tunggal (*Single Page Application*) yang memiliki `<div id="root">` sebagai tempat aplikasi React ditempelkan. |
| [`src/main.tsx`](src/main.tsx) | Titik masuk aplikasi yang me-render komponen `<App />` ke `#root` dengan `StrictMode` (membantu mendeteksi efek samping/timer yang lupa dibersihkan). |
| [`src/App.tsx`](src/App.tsx) | Komponen induk utama. Menyimpan state global `kaptenSkills` dan `applications` via `useLocalStorage`, mengatur navigasi tab (`explore`, `pipeline`, `add`), dan membagikan data ke komponen anak melalui props. |
| [`src/App.css`](src/App.css) | Seluruh tata letak responsif dan gaya visual aplikasi (tema Navy–Beige–Peach–Terracotta, kartu War Room, banner bentrok, modal detail, stepper, checklist, dan timer). |
| [`src/types/application.ts`](src/types/application.ts) | Definisi tipe TypeScript (`Application`, `ApplicationStatus`, `WorkMode`, `ChecklistItem`, `ActivityLog`) sebagai kontrak data yang ketat di seluruh aplikasi. |
| [`src/types/job.ts`](src/types/job.ts) | Definisi tipe `JobListing` untuk data lowongan dari API Remotive maupun file lokal. |
| [`src/hooks/useLocalStorage.ts`](src/hooks/useLocalStorage.ts) | Custom Hook yang menyinkronkan state React dengan `localStorage` browser sehingga data lamaran dan skill tetap utuh setelah *refresh* (`F5`). |
| [`src/hooks/useDebounce.ts`](src/hooks/useDebounce.ts) | Custom Hook penunda pembaruan nilai pencarian (400 ms) agar filter tidak memicu komputasi berlebihan tiap ketukan tombol. |
| [`src/services/jobService.ts`](src/services/jobService.ts) | Layanan `fetch` lowongan ke API Remotive atau file `public/magang-fallback.json` lengkap dengan `AbortSignal` dan normalisasi data. |
| [`src/utils/messageTemplates.ts`](src/utils/messageTemplates.ts) | Generator draf pesan lamaran awal, follow-up HRD (anti-ghosting), thank you pasca-interview, dan konfirmasi offer (ID/EN) dari data lamaran & skill cocok. |
| [`src/utils/calendarExport.ts`](src/utils/calendarExport.ts) | Pembuat tautan **Google Calendar** (`buildGoogleCalendarUrl`) dan file undangan `.ics` (`downloadInterviewIcs`) langsung dari jadwal `interviewDateTime`. |
| [`public/magang-fallback.json`](public/magang-fallback.json) | Dataset cadangan lokal berisi 15 lowongan magang IT Indonesia ketika API sedang offline atau dipilih manual. |
| [`src/utils/stateMachine.ts`](src/utils/stateMachine.ts) | Aturan murni perpindahan status (`getAllowedNextStatuses`, `isValidStatusTransition`, `validateStatusTransition`) beserta validasi syarat input tiap tahap. |
| [`src/utils/applicationRules.ts`](src/utils/applicationRules.ts) | Fungsi murni `isGhostingRisk` untuk mengecek apakah lamaran `APPLIED`/`SCREENING` belum diperbarui lebih dari 14 hari. |
| [`src/utils/interviewConflicts.ts`](src/utils/interviewConflicts.ts) | Fungsi murni `getInterviewConflicts` untuk mendeteksi pasangan lamaran `INTERVIEW` dengan selisih jadwal $< 60$ menit. |
| [`src/utils/skillMatch.ts`](src/utils/skillMatch.ts) | Fungsi murni `calculateSkillMatch` untuk menghitung skor kecocokan $\%$, skill cocok, dan *missing skills*. |
| [`src/utils/duplicateCheck.ts`](src/utils/duplicateCheck.ts) | Fungsi murni `isDuplicateApplication` untuk menolak lamaran ganda pada `company` + `role` yang sama. |
| [`src/components/SkillProfile.tsx`](src/components/SkillProfile.tsx) | Panel pengelola daftar skill milik Kapten (tambah/hapus skill tanpa duplikat). |
| [`src/components/JobExplorer.tsx`](src/components/JobExplorer.tsx) | Halaman eksplorasi lowongan (Fitur 1): fetch + loading/error/empty state, debounce search, filter kategori, sort skill match, dan simpan ke Wishlist. |
| [`src/components/JobCard.tsx`](src/components/JobCard.tsx) & [`src/components/JobSkillMatch.tsx`](src/components/JobSkillMatch.tsx) | Kartu individual lowongan beserta badge persentase Skill Match dan tombol Simpan ke Wishlist. |
| [`src/components/ManualApplicationForm.tsx`](src/components/ManualApplicationForm.tsx) | Form input lamaran manual terkontrol (Fitur 2) dengan auto-focus `useRef` ke input error pertama. |
| [`src/components/ApplicationList.tsx`](src/components/ApplicationList.tsx) | Halaman **War Room Pipeline** (Fitur 3 & Fitur 6): banner bentrok jadwal, filter gabungan & sorting, kartu pipeline, simulasi +15 hari, modal detail, dan Undo Delete 5 detik. |
| [`src/components/ApplicationDetailModal.tsx`](src/components/ApplicationDetailModal.tsx) | Modal **Detail Lamaran** (Fitur 4): stepper tahap seleksi, transisi status bersyarat, nested checklist + progress bar, riwayat aktivitas otomatis & manual, serta wadah Latihan Interview. |
| [`src/components/InterviewPrepTimer.tsx`](src/components/InterviewPrepTimer.tsx) | Panel **Latihan Interview** (Fitur 5): 6 pertanyaan latihan + timer mundur `02:00` dengan cleanup `clearInterval`. |
| [`src/components/FollowUpMessageCard.tsx`](src/components/FollowUpMessageCard.tsx) | Fitur Tambahan **Generator Pesan Follow-Up HRD**: draf otomatis 4 skenario (Indonesia/Inggris), edit cepat, tombol salin (`useRef` timer cleanup), dan catat ke Riwayat Aktivitas. |

---

## 3. Konsep Sistem & Cara Kerjanya (Bahasa Sederhana)

Agar mudah dijelaskan saat demonstrasi, berikut konsep-konsep inti yang dipakai aplikasi beserta cara kerjanya dengan bahasa sehari-hari:

1. **Tampilan Deklaratif (*UI = Fungsi dari State*)**
   Bayangkan papan skor pertandingan. Kita tidak perlu menghapus dan menggambar ulang angkanya secara manual dengan perintah DOM satu per satu; kita cukup mengubah angkanya di memori (*state*), lalu React otomatis memperbarui bagian layar yang berubah. Contohnya, saat status lamaran berubah dari `APPLIED` ke `INTERVIEW`, kartu, stepper tahap seleksi, dan deteksi bentrok langsung ikut menyesuaikan secara otomatis.

2. **Komponen, Props, dan *Lifting State Up***
   Aplikasi dipecah menjadi bagian-bagian kecil (*component*) seperti kotak kartu, modal detail, dan panel timer. Data utama `applications` dan `kaptenSkills` diletakkan di komponen paling atas (`src/App.tsx`) lalu diturunkan lewat *props*. Tujuannya agar halaman Eksplorasi, Form Manual, dan War Room selalu membaca dan mengubah **satu sumber data yang sama**, sehingga lamaran yang baru ditambahkan langsung muncul di War Room tanpa *refresh*.

3. ***Derived State* (Data Hasil Hitungan Langsung)**
   Nilai seperti **Skill Match $\%$**, status **Rawan Ghosting**, **daftar bentrok jadwal interview**, dan **daftar lamaran hasil filter** tidak disimpan ke `useState` baru. Semuanya dihitung langsung dari data `applications` dan `kaptenSkills` setiap kali render. Cara ini mencegah data tidak sinkron (misalnya saat user menambah skill baru atau memundurkan tanggal 15 hari, skor dan badge langsung ikut berubah).

4. ***Immutability* (Mengubah Data Bertingkat Tanpa Merusak Data Lama)**
   Di dalam React, kita dilarang mengubah isi array/objek langsung (seperti `.push()` atau `item.done = true`) karena React mengecek perubahan dengan membandingkan apakah referensi objeknya baru atau masih sama. Untuk mengubah `checklist` atau `activityLogs` yang berada di dalam sebuah `Application` di dalam array `applications`, kita selalu membuat salinan baru memakai *spread operator* (`{ ...app, checklist: [...] }`), `.map()`, dan `.filter()`.

5. ***Controlled Form* & *Conditional Rendering***
   Setiap kotak input di form transisi status, form tambah checklist, dan form catatan manual nilainya dipegang oleh `useState` lewat `value` dan `onChange`. Input tambahan (seperti kolom Versi CV saat pindah ke `APPLIED`, jadwal saat pindah ke `INTERVIEW`, atau gaji saat pindah ke `OFFER`) hanya dimunculkan di layar ketika target status yang sesuai dipilih (*conditional rendering*).

6. ***Side Effect* (`useEffect`) & *Cleanup***
   Timer hitung mundur pada **Latihan Interview** berjalan di luar urusan menggambar HTML (*side effect*), sehingga dijalankan di dalam `useEffect` menggunakan `setInterval`. Ketika user menutup modal detail sebelum waktu habis, fungsi *cleanup* `return () => clearInterval(intervalId)` langsung mematikan detak timer lama agar tidak terus berjalan di latar belakang (*memory leak*) dan tidak membuat detik menjadi $2\times$ lebih cepat saat modal dibuka lagi. Hal yang sama juga diterapkan pada listener tombol `Escape` dan timer penyegar pengecekan ghosting.

7. **`useRef` untuk Menyimpan Nilai Tanpa Memicu Render Ulang**
   Pada fitur *Undo Delete*, ID milik `setTimeout` (5 detik) disimpan ke `useRef`, bukan `useState`. Tujuannya supaya aplikasi bisa membatalkan timer penghapusan sebelumnya dengan `clearTimeout` jika user menghapus dua lamaran berturut-turut dalam waktu berdekatan, tanpa perlu menggambar ulang komponen.

8. ***Custom Hook* (`useLocalStorage` & `useDebounce`)**
   Logika yang dipakai berulang kali dibungkus menjadi fungsi khusus berawalan `use`. `useLocalStorage` bekerja seperti `useState` biasa, bedanya setiap kali data berubah, data otomatis dicatat ke `localStorage` browser sehingga tetap aman meski halaman di-*refresh*.

---

## 4. Step Pengerjaan (Fitur $\rightarrow$ Yang Dibuat $\rightarrow$ Fungsinya)

### Fitur 3: War Room Pipeline, Ghosting & Bentrok Jadwal
1. **Fiturnya minta** menampilkan Skill Match $\%$, versi CV, dan progres checklist pada setiap lamaran di pipeline $\rightarrow$ **sehingga kita menyalurkan** `kaptenSkills` dari [`src/App.tsx`](src/App.tsx) ke [`src/components/ApplicationList.tsx`](src/components/ApplicationList.tsx) dan memanggil `calculateSkillMatch` serta menghitung progres `checklist` $\rightarrow$ **untuk fungsi** menampilkan ringkasan kesiapan tiap lamaran secara langsung (*derived state*).
2. **Fiturnya minta** filter gabungan (cari teks, filter status, toggle Hanya Rawan Ghosting) dan sorting (Terbaru, Interview Terdekat, Offer Tertinggi) $\rightarrow$ **sehingga kita membuat** 4 state kontrol di [`src/components/ApplicationList.tsx`](src/components/ApplicationList.tsx) yang menyaring dan mengurutkan `applications` $\rightarrow$ **untuk fungsi** memudahkan Kapten mencari lamaran tertentu atau memprioritaskan interview/offer terbaik.
3. **Fiturnya minta** pengujian langsung status *Rawan Ghosting* ($> 14$ hari) saat demo $\rightarrow$ **sehingga kita membuat** fungsi `handleSimulateGhosting` yang memundurkan `lastUpdatedAt` sebanyak 15 hari secara *immutable* dan mengeceknya lewat `isGhostingRisk` dari [`src/utils/applicationRules.ts`](src/utils/applicationRules.ts) $\rightarrow$ **untuk fungsi** memunculkan badge **Rawan Ghosting** pada lamaran `APPLIED`/`SCREENING` secara instan saat tombol **Simulasi +15 Hari** diklik.
4. **Fiturnya minta** peringatan bentrok jadwal interview ($< 60$ menit) tetap tampil meskipun filter aktif $\rightarrow$ **sehingga kita menghitung** `getInterviewConflicts(applications)` dari [`src/utils/interviewConflicts.ts`](src/utils/interviewConflicts.ts) memakai seluruh array `applications` (bukan `filteredApplications`) dan merender `.conflict-banner` di bagian paling atas $\rightarrow$ **untuk fungsi** memastikan Kapten tidak pernah melewatkan bentrok jadwal meskipun sedang memfilter status lain.

### Fitur 4: Detail Lamaran (State Machine, Checklist & Activity Log)
1. **Fiturnya minta** detail lamaran terpisah dari kartu ringkas dengan tampilan lengkap seperti referensi layout $\rightarrow$ **sehingga kita membuat** [`src/components/ApplicationDetailModal.tsx`](src/components/ApplicationDetailModal.tsx) yang dipicu dari `selectedApplicationId` di [`src/components/ApplicationList.tsx`](src/components/ApplicationList.tsx) $\rightarrow$ **untuk fungsi** menjaga data detail selalu sinkron dengan state utama dan otomatis tertutup bersih saat lamaran dihapus atau tombol `Escape` ditekan.
2. **Fiturnya minta** perpindahan status mematuhi diagram State Machine dan mengisi data syarat tiap tahap $\rightarrow$ **sehingga kita menggunakan** `getAllowedNextStatuses` dan `validateStatusTransition` dari [`src/utils/stateMachine.ts`](src/utils/stateMachine.ts) plus input kondisional (`cvVersion` & `appliedDate` untuk `APPLIED`, `interviewDateTime` untuk `INTERVIEW`, `salaryOffer` & `workMode` untuk `OFFER`) $\rightarrow$ **untuk fungsi** mencegah lompatan status ilegal (misal `WISHLIST` langsung ke `OFFER`) dan menjamin kelengkapan data tiap tahap.
3. **Fiturnya minta** daftar persiapan (*nested checklist*) dengan progress bar dan pembaruan *immutable* $\rightarrow$ **sehingga kita membuat** handler `handleAddChecklist`, `handleToggleChecklist`, dan `handleRemoveChecklist` yang memanggil `onUpdateApplication` dengan *spread operator*, `.map()`, dan `.filter()` $\rightarrow$ **untuk fungsi** memperbarui tugas persiapan per lamaran tanpa mutasi objek langsung dan langsung tersimpan ke `localStorage`.
4. **Fiturnya minta** pencatatan riwayat aktivitas otomatis maupun catatan manual Kapten $\rightarrow$ **sehingga kita mencatat** entri `ActivityLog` baru setiap transisi status berhasil dan menyediakan form catatan manual di bagian **Riwayat Aktivitas** $\rightarrow$ **untuk fungsi** membentuk jejak kronologis yang rapi untuk tiap lamaran.

### Fitur 5: Interview Prep Timer
1. **Fiturnya minta** minimal 5 soal latihan *interview* magang IT dan timer mundur `02:00` per soal $\rightarrow$ **sehingga kita membuat** [`src/components/InterviewPrepTimer.tsx`](src/components/InterviewPrepTimer.tsx) berisi 6 pertanyaan dan state `questionIndex`, `secondsLeft` (120 detik), serta `isRunning` $\rightarrow$ **untuk fungsi** memberi simulasi latihan menjawab pertanyaan interview secara terukur.
2. **Fiturnya minta** kontrol Start/Pause, Reset, Lanjut soal, serta pencegahan *memory leak* saat panel ditutup $\rightarrow$ **sehingga kita memasang** `useEffect` dengan `window.setInterval` dan `return () => window.clearInterval(intervalId)` $\rightarrow$ **untuk fungsi** memastikan timer berhenti total ketika modal detail ditutup (*unmount*) dan berjalan normal ($1\times$ kecepatan) saat dibuka kembali.

### Fitur Tambahan: Generator Follow-Up HRD & Export Jadwal ke Google Calendar
1. **Fiturnya minta** solusi cepat saat lamaran masuk status **Rawan Ghosting** atau saat mengirim lamaran/pasca-interview $\rightarrow$ **sehingga kita membuat** `src/utils/messageTemplates.ts` dan `src/components/FollowUpMessageCard.tsx` (dengan 4 template otomatis ID/EN, tombol **Salin Pesan** memakai timer `useRef` + *cleanup*, dan tombol **Catat ke Riwayat**) $\rightarrow$ **untuk fungsi** menyusun pesan HRD yang personal dari `company`, `role`, `cvVersion`, dan `matchedSkills` dalam sekali klik.
2. **Fiturnya minta** pengingat jadwal wawancara agar mudah masuk ke kalender pribadi $\rightarrow$ **sehingga kita membuat** `src/utils/calendarExport.ts` (`buildGoogleCalendarUrl` & `downloadInterviewIcs`) yang terpasang di `src/components/ApplicationDetailModal.tsx` ketika `interviewDateTime` tersedia $\rightarrow$ **untuk fungsi** membuka Google Calendar dengan data wawancara terisi otomatis atau mengunduh file `.ics` secara offline.

---

## 5. Testcase & Alur Eksekusi Antar File

Tabel berikut merangkum skenario uji utama (khususnya Fitur 3, 4, 5, dan keterkaitannya dengan Fitur 6) beserta alur eksekusi kodenya dari awal hingga akhir:

| Testcase | Skenario Pengujian | Alur Eksekusi File ke File |
| :--- | :--- | :--- |
| **TC 5 — State Machine** | Buka detail lamaran `WISHLIST`, coba pindah status bertahap `WISHLIST -> APPLIED -> SCREENING -> INTERVIEW`. Cek bahwa `WISHLIST` tidak punya opsi langsung ke `OFFER`. | Klik tombol **Detail & Kelola** di `src/components/ApplicationList.tsx` (`setSelectedApplicationId`) $\rightarrow$ membuka `src/components/ApplicationDetailModal.tsx` $\rightarrow$ memanggil `getAllowedNextStatuses(application.status)` di `src/utils/stateMachine.ts` $\rightarrow$ saat submit memanggil `validateStatusTransition(...)` $\rightarrow$ jika valid, memanggil `onUpdateApplication` $\rightarrow$ memperbarui state `applications` di `src/App.tsx` $\rightarrow$ otomatis tersimpan oleh `src/hooks/useLocalStorage.ts` + entri baru muncul di **Riwayat Aktivitas**. |
| **TC 6 — Simulasi Ghosting** | Pada lamaran berstatus `APPLIED` atau `SCREENING`, klik tombol **Simulasi +15 Hari**. Badge **Rawan Ghosting** muncul, lalu aktifkan toggle **Hanya Rawan Ghosting**. | Klik **Simulasi +15 Hari** di `src/components/ApplicationList.tsx` (atau di header `src/components/ApplicationDetailModal.tsx`) $\rightarrow$ `handleSimulateGhosting` memundurkan `lastUpdatedAt` sebesar 15 hari via `setApplications` $\rightarrow$ render ulang memanggil `isGhostingRisk(application, currentTimeMs)` di `src/utils/applicationRules.ts` $\rightarrow$ mengembalikan `true` karena selisih $> 14$ hari $\rightarrow$ badge `.ghosting-badge` tampil dan lolos filter `onlyGhostingRisk`. |
| **TC 7 — Bentrok Jadwal Interview** | Pindahkan 2 lamaran ke status `INTERVIEW` dengan jadwal berselisih $< 60$ menit (misal `10:00` dan `10:30`). Lalu ubah dropdown **Filter Status** di toolbar War Room ke `Wishlist` (menyembunyikan kartu `INTERVIEW` dari tampilan). Banner bentrok harus tetap tampil. | Setiap kali `applications` berubah di `src/App.tsx`, `src/components/ApplicationList.tsx` memanggil `getInterviewConflicts(applications)` di `src/utils/interviewConflicts.ts` memakai data `applications` penuh (sebelum `.filter(...)`) $\rightarrow$ daftar bentrok tetap merender `.conflict-banner` di atas toolbar filter meskipun kartu yang tampil di bawah sudah terfilter. |
| **TC 8 — Nested Checklist & Refresh** | Buka detail lamaran, tambah 2 tugas persiapan, centang 1 tugas (progress `1 / 2 selesai`), tambah catatan manual, lalu tekan `F5` (*refresh*). Data harus tetap utuh. | Submit form checklist di `src/components/ApplicationDetailModal.tsx` $\rightarrow$ `handleAddChecklist` / `handleToggleChecklist` memanggil `onUpdateApplication` (membuat salinan array baru dengan `.map` / spread) $\rightarrow$ memperbarui `applications` di `src/App.tsx` $\rightarrow$ `useEffect` di `src/hooks/useLocalStorage.ts` menulis JSON ke `localStorage["magangApplications"]` $\rightarrow$ saat `F5`, inisialisasi `useState` di `useLocalStorage` membaca kembali JSON tersebut. |
| **TC 9 — Interview Prep Timer Cleanup** | Buka detail lamaran, klik **Mulai** pada timer `02:00`, tunggu beberapa detik, tutup modal sebelum waktu habis, buka lagi modal, lalu klik **Mulai**. Detik berjalan normal ($1\times$) dan console bersih. | Klik **Mulai** di `src/components/InterviewPrepTimer.tsx` $\rightarrow$ `isRunning` menjadi `true` $\rightarrow$ `useEffect` mendaftarkan `window.setInterval` tiap 1000 ms $\rightarrow$ saat modal ditutup (`setSelectedApplicationId(null)` di `src/components/ApplicationList.tsx`), `src/components/ApplicationDetailModal.tsx` dan `InterviewPrepTimer` terlepas (*unmount*) $\rightarrow$ fungsi *cleanup* `() => window.clearInterval(intervalId)` langsung berjalan $\rightarrow$ saat dibuka kembali, komponen terpasang ulang dari `02:00` dengan tepat 1 interval aktif. |
| **TC 10a — Undo Delete (5 Detik)** | Hapus 1 lamaran (dari kartu atau dari dalam modal detail), lalu klik **Undo** sebelum 5 detik. Data lamaran, checklist, dan activity log kembali utuh. | Klik **Hapus** $\rightarrow$ `handleDelete` di `src/components/ApplicationList.tsx` membersihkan `undoTimerRef.current` lama jika ada, menghapus item dari `applications`, menyimpan salinan utuh di `pendingDeletion`, dan menyalakan `setTimeout(..., 5000)` $\rightarrow$ klik **Undo** membatalkan timer dan menyisipkan kembali `pendingDeletion.application` pada indeks semula. |

---

## 6. Menjalankan & Memverifikasi Project

```bash
# 1. Install dependencies (jika belum)
npm install

# 2. Jalankan server development
npm run dev

# 3. Cek TypeScript ketat (wajib lolos 0 error)
npx tsc --noEmit

# 4. Cek linter & build produksi
npm run lint
npm run build
```
