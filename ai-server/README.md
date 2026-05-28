# GymVision AI Server

Ini adalah server kecerdasan buatan (AI) independen khusus untuk memproses video GymVision. Server ini menggunakan framework **FastAPI** (Python) dan model visi **MediaPipe** (dari Google) untuk menganalisis pergerakan, postur tubuh, serta menghitung besaran sudut antar sendi manusia.

## Alur Kerja (Workflow)
Server ini adalah "mesin penggerak" dari fitur *Analyze Video*:
1. **Penerimaan Video:** Aplikasi klien (GymVision) akan mengirimkan berkas (file) video MP4 beserta tipe latihan apa yang sedang dilakukan (misal: push-up, squat).
2. **Ekstraksi Rangka (Pose Landmarker):** Menggunakan model komputer visi `pose_landmarker_lite`, AI ini akan memeriksa video tersebut dari awal sampai akhir, mendeteksi dan melacak koordinat titik-titik persendian kunci (bahu, siku, panggul, lutut, dll) pada setiap pergerakan frame.
3. **Kalkulasi Matematis (Sudut Gerakan):** Dengan ilmu trigonometri (fungsi `calculate_angle`), server menghitung derajat lipatan/sudut sendi. Misalnya, memastikan seberapa turun pantat pengguna saat Squat, atau sudut siku saat Push-up.
4. **Memberikan Hasil (Respons API):** Jika dipasangkan dengan LLM/API eksternal (OpenRouter), hasil matematis ini dirangkai menjadi masukan bahasa natural, dan dikembalikan ke pengguna dalam format JSON berisi skor serta evaluasi gerakannya benar/salah.

## Komponen yang Dibutuhkan
Tim Anda wajib menginstal perangkat lunak berikut untuk bisa menjalankan AI Server di mesin lokal mereka:
- **Python** (Sangat disarankan memakai Versi 3.9, 3.10, atau 3.11). *Hindari versi terlama atau terlalu baru yang bisa membuat MediaPipe error.*
- **PIP** (Package Installer for Python) - Biasanya otomatis terinstal saat Anda menginstal Python di Windows.

## Panduan Instalasi & Setup (Setup Instructions)

1. **Masuk ke Direktori AI Server**
   Buka terminal atau command prompt baru, lalu masuk ke folder AI:
   ```bash
   cd GymVision/ai-server
   ```

2. **Membuat Virtual Environment (Sangat Disarankan!)**
   Virtual Environment (*venv*) berguna agar perpustakaan/library Python aplikasi ini terisolasi dan tidak merusak project lain di PC Anda.
   Ketik perintah berikut:
   ```bash
   python -m venv venv
   ```
   Lalu nyalakan environment tersebut:
   - **Bagi pengguna Windows:**
     ```bash
     venv\Scripts\activate
     ```
   - **Bagi pengguna Mac / Linux:**
     ```bash
     source venv/bin/activate
     ```
   *(Jika berhasil, biasanya akan ada tulisan `(venv)` di sebelah kiri prompt terminal Anda).*

3. **Menginstal Dependencies (Pustaka Python)**
   Pastikan environment masih dalam keadaan aktif, lalu jalankan perintah ini untuk menginstal alat bantu (FastAPI, OpenCV, MediaPipe, dll) sesuai daftar `requirements.txt`:
   ```bash
   pip install -r requirements.txt
   ```

4. **Konfigurasi Environment (.env)**
   Buat file baru bernama `.env` di dalam folder `ai-server/` (sejajar dengan file `main.py`). Isikan kode penentu port:
   ```env
   PORT=7002
   ```

5. **Pengunduhan Model MediaPipe Secara Otomatis**
   *Tahap ini tidak butuh langkah ekstra.* Saat Anda menjalankan kode `main.py` untuk pertama kali, sistem akan mendeteksi apakah file `pose_landmarker_lite.task` sudah ada. Jika belum, skrip akan **mengunduhnya secara otomatis** langsung dari server Google. Pastikan PC Anda terhubung dengan internet yang stabil saat pertama kali menjalankan server.

6. **Menjalankan Server (Uvicorn)**
   Pastikan *venv* masih menyala. Gunakan perintah Uvicorn berikut untuk mulai menjalankan *Live Server*:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 7002
   ```
   *(Jika terjadi error 'uvicorn not recognized', Anda bisa memanggilnya lewat modul python: `python -m uvicorn main:app --host 0.0.0.0 --port 7002`)*

   Bagus! Server AI sekarang sudah aktif dan mendengarkan permintaan (*request*) di URL `http://localhost:7002`.
