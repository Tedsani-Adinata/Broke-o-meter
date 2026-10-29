# Broke-o-meter 💸

> **Pencatat Boncos Harian Offline-First** — Pantau pengeluaran harianmu dengan humor, status level boncos, ekspor laporan PDF, dan backup JSON yang aman tersimpan di perangkat sendiri.

![Broke-o-meter Logo](logo.png)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Capacitor](https://img.shields.io/badge/Capacitor-8.x-blue.svg)](https://capacitorjs.com/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v3.4-38bdf8.svg)](https://tailwindcss.com/)
[![Offline-First](https://img.shields.io/badge/Offline--First-100%25-green.svg)](#fitur-utama)

---

## 📱 Tentang Aplikasi

**Broke-o-meter** adalah aplikasi pelacak pengeluaran pribadi yang dirancang khusus untuk kenyamanan dan privasi penuh. Berbeda dengan aplikasi keuangan umum yang memerlukan pendaftaran akun atau koneksi internet, Broke-o-meter berjalan **100% offline-first**. Seluruh data pengeluaran dan profil tersimpan secara privat di ponsel atau browser Anda tanpa server perantara.

Aplikasi ini menyajikan status keuangan harian dengan sentuhan humor dan motivasi ("Aman Jaya" hingga "Bokek Kronis 🚨"), membantu pengguna lebih sadar akan kebiasaan berbelanja harian mereka.

---

## ✨ Fitur Utama

- 🔒 **100% Offline-First & Menjaga Privasi**: Tidak membutuhkan akun, login, atau koneksi internet. Semua data disimpan di memori lokal perangkat.
- ⚡ **Indikator Level Boncos Harian**:
  - **Sangat Hemat 🌿** (Rp 0)
  - **Aman Jaya** (≤ Rp 30.000)
  - **Mulai Goyah ⚡** (≤ Rp 75.000)
  - **Lumayan Boncos 📉** (≤ Rp 150.000)
  - **Bokek Kronis 🚨** (> Rp 150.000)
- 📊 **Gauge & Ringkasan Bulanan**: Visualisasi jarum speedometer boncos interaktif beserta petuah dompet dan persentase alokasi tiap kategori (Makan, Minum, Transport, dan Lain-lain).
- 🌓 **Tema Gelap & Terang (Dark Mode)**: Dilengkapi transisi *GPU Crossfade* yang halus (280ms) dan auto-sinkronisasi warna Status Bar native Android.
- 👤 **Profil Pengguna Kustom**: Personalisasi nama sapaan dan foto profil dengan kompresi otomatis langsung di sisi klien (*client-side canvas crop & compress*).
- 📝 **Input Cepat & Saran Otomatis**: Input nominal dan nama pengeluaran dengan tombol saran cepat (*Quick Suggestion Tags*).
- 📅 **Riwayat Transaksi**: Filter kategori, pencarian fleksibel, pengelompokan tanggal, serta modal/bottom sheet untuk edit dan hapus data.
- 📄 **Ekspor Laporan PDF**: Pembuat dokumen PDF langsung dari perangkat (offline) dengan filter Minggu Ini, Bulan Ini, atau Rentang Tanggal Kustom.
- 💾 **Cadangan & Pemulihan (Backup JSON)**: Ekspor dan impor data dengan pilihan *Ganti Semua* atau *Gabungkan Data*, ditambah pengingat cadangan berkala jika lebih dari 7 hari belum dicadangkan.
- 🤖 **Integrasi Native Android via Capacitor 8**:
  - Penanganan tombol kembali fisik (*Hardware Back Button*).
  - Kunci orientasi potret (*Portrait lock*).
  - Dialog berbagi file bawaan sistem (*Native Share & Filesystem*).

---

## 📂 Struktur Proyek

```plaintext
broke-o-meter/
├── android/                   # Konfigurasi & source project native Android (Capacitor)
├── css/
│   ├── input.css             # Tailwind source CSS (custom CSS variables & font rules)
│   └── styles.css            # Output build CSS terkompilasi
├── fonts/                    # Font Plus Jakarta Sans & Material Symbols (offline)
├── lib/                      # Library pihak ketiga yang dibundel lokal (motion, jspdf)
├── screens/                  # Mockup layar individual per modul untuk referensi UI
│   ├── hari-ini.html
│   ├── riwayat.html
│   ├── ringkasan.html
│   ├── pengaturan.html
│   └── edit-catatan.html
├── www/                      # Direktori build aset web untuk Capacitor Android
│   └── .gitkeep
├── app.js                    # Controller utama aplikasi (state, UI rendering, routing)
├── backup.js                 # Logika ekspor & impor JSON serta pengingat backup
├── capacitor.config.json     # Konfigurasi Capacitor
├── capacitorApp.js           # Integrasi plugin native Capacitor (BackButton, StatusBar, Share)
├── constants.js              # Threshold boncos, kategori, dan konstanta UI
├── dateUtils.js              # Utilitas format tanggal & waktu Bahasa Indonesia
├── index.html                # Single Page Application (SPA) entry point
├── logo.png                  # Logo utama aplikasi
├── motionHelper.js           # Helper animasi Motion (Framer Motion)
├── package.json              # Dependensi npm & script automasi
├── pdfExport.js              # Modul pembuatan laporan PDF offline (jsPDF)
├── profile.js                # Pengelola avatar & nama profil pengguna
├── server.js                 # Server HTTP lokal sederhana (Node.js tanpa dependencies)
├── storage.js                # Storage abstraction layer (Promise-based CRUD)
├── sync-www.js               # Script sinkronisasi aset dari root ke folder www/
├── tabungan.png              # Ilustrasi tabungan
├── tailwind.config.js        # Konfigurasi tema Tailwind CSS
└── theme.js                  # Pengelola tema (Light/Dark/System) & status bar
```

---

## 🚀 Panduan Memulai

### Prasyarat
1. **Node.js** (versi 18 atau lebih baru).
2. **NPM** (sudah termasuk bersama Node.js).
3. **Android Studio & JDK 21** *(Hanya jika ingin menjalankan/membangun aplikasi Android)*.

### 1. Klon Repositori & Pasang Dependensi
```bash
git clone https://github.com/Tedsani/Broke-o-meter.git
cd Broke-o-meter
npm install
```

### 2. Menjalankan di Browser (Mode Web)
Jalankan server lokal bawaan:
```bash
npm start
```
Buka peramban Anda di `http://localhost:3000`.

### 3. Kompilasi Aset & Sinkronisasi Android
Jika melakukan perubahan pada kode CSS atau tampilan:
```bash
# Kompilasi CSS Tailwind
npm run build:css

# Salin aset web ke folder www/
npm run copy:www

# Atau lakukan build penuh & sinkronisasi ke folder android/
npm run sync
```

### 4. Membuka di Android Studio
```bash
npm run open:android
```

### 5. Membangun APK Debug Langsung dari Terminal
```bash
npm run build:apk
```
*File APK yang dihasilkan akan berada di: `android/app/build/outputs/apk/debug/app-debug.apk`.*

---

## 🛠️ Tumpukan Teknologi

- **UI & Layout**: HTML5 Semantik, [Tailwind CSS](https://tailwindcss.com/)
- **Bahasa Pemrograman**: Modern JavaScript (ES Modules, Async/Await)
- **Animasi & Transisi**: [Motion](https://motion.dev/) (dibundel offline) & Browser View Transitions API
- **PDF Engine**: [jsPDF](https://github.com/parallax/jsPDF) (100% offline, tanpa server rendering)
- **Mobile Runtime**: [Capacitor](https://capacitorjs.com/) v8 (Android Native Container)
- **Tipografi**: Plus Jakarta Sans & Google Material Symbols Outlined (Local WOFF2)

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah lisensi **MIT**. Silakan lihat berkas [LICENSE](LICENSE) untuk detail lengkap.
