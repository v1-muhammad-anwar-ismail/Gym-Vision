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
- **MySQL** - Database relasional yang kita gunakan. Anda bisa menginstal MySQL secara terpisah atau menggunakan paket server lokal seperti XAMPP / Laragon.
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

   Buka file `.env` yang baru terbentuk. Cari pengaturan database dan sesuaikan dengan konfigurasi MySQL lokal Anda, misalnya:
   ```env
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=gymvision_db
   DB_USERNAME=root
   DB_PASSWORD=
   ```

4. **Men-generate Application Key**
   Buat kunci keamanan enkripsi (kriptografi) unik untuk aplikasi Anda:
   ```bash
   php artisan key:generate
   ```

5. **Membuat Database & Menjalankan Migrasi**
   Pastikan server MySQL Anda (misal dari XAMPP) sudah menyala.
   - Buat database baru di MySQL (bisa lewat phpMyAdmin atau CLI) dengan nama sesuai yang Anda isi di `.env` (misal: `gymvision_db`).
   
   Setelah database terbuat, jalankan perintah migrasi untuk secara otomatis membangun tabel-tabel di dalamnya:
   ```bash
   php artisan migrate
   ```

6. **Menjalankan Server Backend**
   Jalankan server pengembangan Laravel. Kita akan memaksa server berjalan di port `7001` agar sesuai dengan setelan di Frontend.
   ```bash
   php artisan serve --port=7001
   ```
   Selesai! Backend API Anda sekarang menyala dan siap menerima *request* di `http://localhost:7001`.
