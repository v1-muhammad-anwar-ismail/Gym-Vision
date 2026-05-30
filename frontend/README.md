# GymVision Frontend

Ini adalah bagian antarmuka pengguna (Frontend) untuk aplikasi GymVision. GymVision adalah platform analisis pose kebugaran berbasis AI yang membantu pengguna melacak postur dan gerakan olahraga mereka.

## Alur Kerja (Workflow)
Frontend GymVision dibangun menggunakan **React** dan **Vite**. Aplikasi ini berinteraksi dengan:
1. **Backend (Laravel):** Untuk proses autentikasi pengguna, penyimpanan riwayat analisis, pengaturan profil akun, serta memuat konfigurasi model AI dari admin.
2. **AI Server (FastAPI):** Saat pengguna mengunggah video latihan untuk dianalisis, sistem akan memproses video tersebut menggunakan kecerdasan buatan, kemudian hasilnya (seperti skor, durasi, dan masalah postur) akan dikembalikan dan ditampilkan secara interaktif di layar menggunakan grafik (Recharts).

## Komponen yang Dibutuhkan
Untuk menjalankan frontend ini, Anda memerlukan komponen berikut yang harus sudah terinstal di komputer / sistem operasi Anda:
- **Node.js** (Versi 18.x atau lebih baru sangat disarankan) - Sebagai *runtime environment* JavaScript.
- **NPM** (Node Package Manager) - Biasanya sudah otomatis terinstal saat Anda menginstal Node.js.
- Editor teks / kode, seperti **VS Code**.

## Panduan Instalasi & Setup (Setup Instructions)

1. **Masuk ke Direktori Frontend**
   Buka terminal atau command prompt, lalu arahkan ke folder frontend:
   ```bash
   cd GymVision/frontend
   ```

2. **Instalasi Dependencies (Pustaka Modul)**
   Jalankan perintah berikut untuk mengunduh dan menginstal semua library pendukung yang tercatat di `package.json` (seperti react-router, recharts, lucide-react, dll):
   ```bash
   npm install
   ```

3. **Konfigurasi Environment Variables (.env)**
   Agar frontend tahu ke mana ia harus mengirim request API, kita butuh file environment.
   Buat file baru bernama `.env` di dalam folder `frontend/` (jika belum ada), dan masukkan teks berikut ke dalamnya:
   ```env
   VITE_BACKEND_URL=http://localhost:7001
   ```
   *(Pastikan port `7001` ini sesuai dengan port tempat Anda menyalakan backend Laravel Anda nantinya).*

4. **Menjalankan Development Server**
   Untuk menghidupkan server lokal di tahap pengembangan, jalankan:
   ```bash
   npm run dev
   ```
   Jika berhasil, terminal akan menampilkan tautan URL lokal (biasanya `http://localhost:5173`). Buka tautan tersebut di peramban web (Chrome/Edge/Firefox) untuk melihat antarmuka GymVision Anda!
