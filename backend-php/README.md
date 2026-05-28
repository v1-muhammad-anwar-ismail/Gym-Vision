# GymVision Backend API

Ini adalah sistem backend berbasis **Laravel** untuk aplikasi GymVision. Backend ini berfungsi sebagai otak pengelola data, menangani semua urusan basis data, autentikasi sesi, serta menghubungkan layanan pihak ketiga.

## Alur Kerja (Workflow)
Backend Laravel berperan sebagai perantara (API) utama antara layar pengguna (Frontend) dengan sistem kecerdasan buatan:
1. **Otentikasi & Manajemen Akun:** Menangani pendaftaran pengguna, login (termasuk OTP atau integrasi OAuth/Socialite), ubah password, dan pembaruan foto profil. Keamanan API dijaga menggunakan **Laravel Sanctum**.
2. **Rekam Jejak Data (Database):** Menyimpan dan mengambil riwayat analisis video tiap pengguna, mencatat login-history, serta menyimpan statistik penggunaan platform.
3. **Gateway AI:** Meskipun pemrosesan video berat dilakukan di *AI Server*, backend Laravel bertugas menyediakan pengaturan (konfigurasi AI), dan bisa menjadi rute perantara permintaan dari frontend ke server AI.

## Komponen yang Dibutuhkan
Pastikan tim Anda sudah menginstal komponen-komponen berikut di komputernya:
- **PHP** (Versi 8.3 atau lebih baru) - Mesin utama untuk menjalankan framework Laravel 11.
- **Composer** (Package Manager untuk PHP) - Untuk mengunduh plugin dan modul backend.
- **SQLite** - Database relasional ringan. Biasanya sudah otomatis didukung oleh PHP (ekstensi `pdo_sqlite`). Anda tidak perlu repot menginstal server database berat seperti MySQL.
- **Node.js & NPM** (Opsional/Pendukung) - Meski ini backend PHP, instalasi Node kadang diminta oleh paket aset internal Laravel.

## Panduan Instalasi & Setup (Setup Instructions)

1. **Masuk ke Direktori Backend**
   Buka terminal, dan arahkan ke folder backend:
   ```bash
   cd GymVision/backend-php
   ```

2. **Instalasi Pustaka (Dependencies) PHP**
   Gunakan Composer untuk mengunduh semua inti Laravel beserta paket lainnya yang tercatat di `composer.json`:
   ```bash
   composer install
   ```

3. **Konfigurasi Environment (.env)**
   Kita perlu membuat file konfigurasi lingkungan dari template bawaan Laravel.
   Gandakan atau *copy* file template tersebut:
   ```bash
   cp .env.example .env
   ```
   *(Jika Anda menggunakan Windows dan tidak ada perintah `cp`, cukup *copy* file `.env.example` lalu *paste* dan ganti namanya menjadi `.env` secara manual lewat File Explorer).*

   Buka file `.env` yang baru terbentuk. Cari tulisan `DB_CONNECTION` dan ubah menjadi:
   ```env
   DB_CONNECTION=sqlite
   ```
   (Anda boleh menghapus baris `DB_HOST`, `DB_PORT`, `DB_DATABASE` dan `DB_USERNAME` di bawahnya karena SQLite menggunakan file lokal alih-alih server).

4. **Men-generate Application Key**
   Buat kunci keamanan enkripsi (kriptografi) unik untuk aplikasi Anda:
   ```bash
   php artisan key:generate
   ```

5. **Membuat File Database & Menjalankan Migrasi**
   Oleh karena kita menggunakan SQLite, kita hanya perlu satu file kosong sebagai database-nya.
   - Buat file kosong bernama `database.sqlite` dan simpan di dalam folder `database/` (bisa dengan klik kanan -> New File -> `database.sqlite`).
   
   Setelah file terbuat, jalankan perintah migrasi untuk secara otomatis membangun tabel-tabel di dalamnya:
   ```bash
   php artisan migrate
   ```
   *(Pilih "Yes" jika ada pertanyaan konfirmasi untuk membuat database otomatis).*

6. **Menjalankan Server Backend**
   Jalankan server pengembangan Laravel. Kita akan memaksa server berjalan di port `7001` agar sesuai dengan setelan di Frontend.
   ```bash
   php artisan serve --port=7001
   ```
   Selesai! Backend API Anda sekarang menyala dan siap menerima *request* di `http://localhost:7001`.
