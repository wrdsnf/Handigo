# Dokumentasi API RESTful

Berikut adalah daftar lengkap endpoint API yang tersedia, dikelompokkan berdasarkan modulnya. Semua *request* dikirimkan ke base URL server kamu (misal: `http://localhost:5000`).

---

## 1. Authentication (`/api/auth`)
Modul ini menangani pendaftaran, login, penginputan profil awal, dan manajemen sesi pengguna.

| Method | Endpoint | Auth | Deskripsi |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/auth/register` | ❌ | Mendaftarkan pengguna baru. |
| **POST** | `/api/auth/login` | ❌ | Autentikasi dan login pengguna. |
| **POST** | `/api/auth/logout` | ✅ | Mengakhiri sesi pengguna saat ini. |
| **GET** | `/api/auth/me` | ✅ | Mengambil data pengguna yang sedang login. |
| **POST** | `/api/auth/google` | ❌ | Login atau pendaftaran menggunakan akun Google. |
| **POST** | `/api/auth/complete-profile` | ❌ | Melengkapi data profil setelah registrasi. |

---

## 2. Detection (`/api/detection`)
Modul ini menangani verifikasi tanda/isyarat (sign) dan status deteksi sistem.

| Method | Endpoint | Auth | Deskripsi |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/detection/status` | ❌ | Mengambil status sistem deteksi saat ini. |
| **POST** | `/api/detection/verify` | ✅ | Memverifikasi input deteksi yang dikirimkan oleh pengguna. |

---

## 3. Exercise (`/api/exercise`)
Modul ini menangani data latihan, pencatatan skor, serta riwayat hasil pengguna.

| Method | Endpoint | Auth | Deskripsi |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/exercise/results` | ✅ | Mengambil riwayat hasil latihan pengguna. |
| **GET** | `/api/exercise/results/latest` | ✅ | Mengambil hasil dari latihan terakhir. |
| **GET** | `/api/exercise/results/latest/next` | ✅ | Mengambil hasil terakhir beserta rekomendasi latihan berikutnya. |
| **GET** | `/api/exercise/:id` | ❌ | Mengambil detail spesifik dari satu latihan (Publik). |
| **POST** | `/api/exercise/:id/result` | ✅ | Menyimpan hasil dari latihan yang baru saja diselesaikan. |

---

## 4. Module (`/api/module`)
Modul publik untuk menampilkan daftar materi atau modul pembelajaran yang tersedia.

| Method | Endpoint | Auth | Deskripsi |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/module/` | ❌ | Mengambil daftar semua modul yang tersedia. |
| **GET** | `/api/module/:id` | ❌ | Mengambil detail informasi dari satu modul spesifik. |
| **GET** | `/api/module/:id/exercises` | ❌ | Mengambil daftar latihan yang ada di dalam suatu modul. |

---

## 5. Profile (`/api/profile`)
Modul untuk manajemen data profil pengguna. Seluruh endpoint pada modul ini **wajib** melewati proses autentikasi.

| Method | Endpoint | Auth | Deskripsi |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/profile/` | ✅ | Mengambil informasi profil pengguna yang sedang aktif. |
| **PUT** | `/api/profile/` | ✅ | Memperbarui data profil pengguna. |

---

## 6. Progress (`/api/progress`)
Modul untuk melacak kemajuan belajar pengguna. Seluruh endpoint pada modul ini **wajib** melewati proses autentikasi.

| Method | Endpoint | Auth | Deskripsi |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/progress/` | ✅ | Mengambil seluruh data progress belajar pengguna. |
| **GET** | `/api/progress/last-accessed` | ✅ | Mengambil informasi modul/materi yang terakhir diakses. |
| **GET** | `/api/progress/dashboard` | ✅ | Mengambil statistik progress pengguna untuk halaman dashboard. |
| **GET** | `/api/progress/:moduleId` | ✅ | Mengambil progress pengguna pada modul tertentu. |
| **PUT** | `/api/progress/:moduleId` | ✅ | Memperbarui atau membuat baru (upsert) progress pada modul tertentu. |

---

## 7. Test (`/api/test`)
Modul evaluasi berupa tes per modul. Seluruh endpoint pada modul ini **wajib** melewati proses autentikasi.

| Method | Endpoint | Auth | Deskripsi |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/test/:moduleId/start` | ✅ | Memulai sesi tes baru untuk modul tertentu. |
| **POST** | `/api/test/answer` | ✅ | Mengirimkan jawaban (submit) untuk setiap soal. |
| **POST** | `/api/test/:sessionId/finish` | ✅ | Mengakhiri sesi tes dan mengkalkulasi hasil akhir. |
| **GET** | `/api/test/:moduleId/history` | ✅ | Mengambil riwayat statistik tes pada modul tertentu (Skor, durasi, jumlah *peeks*, benar/salah). |

---

### 💡 Catatan Penggunaan

1. **Autentikasi (Auth ✅):** Endpoint yang ditandai dengan **✅** membutuhkan Token JWT yang valid. Token dikirim melalui komponen HTTP Header seperti berikut:
   ```http
   Authorization: Bearer <your_jwt_token_here>
   ```

2. **URL Parameters:** Ganti bagian titik dua seperti `:id`, `:moduleId`, atau `:sessionId` dengan ID riil berupa angka/string unik saat melakukan pemanggilan API (Contoh: `/api/module/5/exercises` atau `/api/test/12/start`).
