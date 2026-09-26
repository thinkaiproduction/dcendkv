# 📘 PANDUAN MENJALANKAN APLIKASI — DCEN DKV

Platform **Live Streaming Booking & Rental Alat Multimedia**
Stack: **Next.js 15** (frontend + backend API) · **MongoDB** · **JWT Auth**

---

## 🧩 1. Prasyarat (Wajib Diinstall)

| Software | Versi Minimal | Cara Cek |
|----------|---------------|----------|
| **Node.js** | 18.18+ / 20+ | `node -v` |
| **Yarn** | 1.22+ | `yarn -v` |
| **MongoDB** | 6.0+ | `mongod --version` |
| **Git** (opsional) | — | `git --version` |

> ⚠️ **Gunakan `yarn`, JANGAN `npm`.** Mencampur keduanya bisa merusak dependency.

Install Yarn (jika belum ada):
```bash
npm install -g yarn
```

---

## 🖥️ 2. MENJALANKAN OFFLINE (LOCALHOST)

### Langkah 2.1 — Siapkan MongoDB Lokal

**Opsi A — MongoDB terinstall di komputer**

- **Windows**: Install [MongoDB Community Server](https://www.mongodb.com/try/download/community), lalu jalankan service `MongoDB` (otomatis via Services).
- **macOS** (Homebrew):
  ```bash
  brew tap mongodb/brew
  brew install mongodb-community@7.0
  brew services start mongodb-community@7.0
  ```
- **Linux (Ubuntu/Debian)**:
  ```bash
  sudo systemctl start mongod
  sudo systemctl enable mongod   # agar auto-start
  ```

Cek MongoDB berjalan di port default `27017`:
```bash
mongosh --eval "db.runCommand({ ping: 1 })"
```

**Opsi B — MongoDB via Docker** (praktis, tanpa install manual):
```bash
docker run -d --name dcen-mongo -p 27017:27017 mongo:7
```

---

### Langkah 2.2 — Ambil Kode & Install Dependency

```bash
# masuk ke folder project
cd /app          # atau folder tempat Anda menaruh project

# install semua dependency
yarn install
```

---

### Langkah 2.3 — Konfigurasi Environment (`.env`)

Buat/isi file **`.env`** di root project:

```env
# Koneksi MongoDB lokal
MONGO_URL=mongodb://localhost:27017

# Nama database (bebas)
DB_NAME=dcen_dkv

# URL dasar aplikasi (untuk lokal biarkan localhost)
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Kunci rahasia JWT (ganti dengan string acak Anda sendiri)
JWT_SECRET=ganti-dengan-kunci-rahasia-anda

CORS_ORIGINS=*
```

> 🔐 Untuk produksi, WAJIB ganti `JWT_SECRET` dengan string acak yang panjang.

---

### Langkah 2.4 — Jalankan Aplikasi (Mode Development)

```bash
yarn dev
```

Buka browser ke: **http://localhost:3000**

- Halaman pertama akan **otomatis melakukan seed** data contoh (12 alat, 8 portofolio, 4 testimoni, 5 crew, 2 akun default).
- Kompilasi pertama bisa memakan waktu 30–70 detik (wajar untuk Next.js dev), berikutnya cepat.

---

### Langkah 2.5 — Menjalankan Mode Production di Localhost

Untuk performa optimal (lebih cepat & stabil dari dev):

```bash
yarn build      # build produksi
yarn start      # jalankan server produksi di port 3000
```

Buka: **http://localhost:3000**

---

## 🔑 3. Akun Demo (Login)

| Peran | Email | Password |
|-------|-------|----------|
| **Owner/Admin** | `admin@dcen.com` | `admin123` |
| **Customer** | `customer@dcen.com` | `customer123` |

- Login **Admin** → akses **Dashboard Admin** (statistik, booking, rental, alat, crew).
- Login **Customer** → akses **Pesanan Saya** + booking & rental.
- Anda juga bisa mendaftar akun baru lewat tombol **Daftar**.

---

## 🌱 4. Seed / Reset Data Contoh (Manual)

Seed berjalan otomatis saat halaman dibuka. Untuk memicu manual atau **reset paksa**:

```bash
# Seed (hanya kalau kosong)
curl -X POST http://localhost:3000/api/seed -H "Content-Type: application/json" -d '{}'

# Reset PAKSA (hapus & isi ulang alat/portfolio/testimoni/crew)
curl -X POST http://localhost:3000/api/seed -H "Content-Type: application/json" -d '{"force": true}'
```

---

## 🌐 5. MENJALANKAN ONLINE (DEPLOYMENT)

### Opsi A — Deploy via Tombol Emergent (Termudah)
Klik tombol **Deploy** di platform Emergent. Sistem akan otomatis mem-build, menyediakan MongoDB, mengatur environment, dan memberi Anda **URL publik** yang siap dibagikan.

### Opsi B — Deploy ke Vercel + MongoDB Atlas (Mandiri)

1. **Database cloud (MongoDB Atlas)** — gratis:
   - Daftar di https://www.mongodb.com/atlas
   - Buat *Cluster* → *Database User* → izinkan akses IP `0.0.0.0/0`
   - Salin *Connection String*, contoh:
     `mongodb+srv://user:password@cluster0.xxxxx.mongodb.net`

2. **Deploy kode ke Vercel**:
   - Push project ke GitHub
   - Di https://vercel.com → *New Project* → import repo
   - Isi **Environment Variables** di Vercel:
     ```
     MONGO_URL      = mongodb+srv://user:password@cluster0.xxxxx.mongodb.net
     DB_NAME        = dcen_dkv
     JWT_SECRET     = kunci-rahasia-produksi-anda
     NEXT_PUBLIC_BASE_URL = https://nama-app-anda.vercel.app
     CORS_ORIGINS   = *
     ```
   - Klik **Deploy**. Selesai — aplikasi online di URL Vercel Anda.

3. Buka URL produksi → seed otomatis jalan → login pakai akun demo di atas.

> Provider lain (Render, Railway, VPS) juga bisa: cukup sediakan `MONGO_URL`,
> lalu jalankan `yarn build && yarn start`.

---

## 📁 6. Struktur Project (Ringkas)

```
/app
├── app/
│   ├── api/[[...path]]/route.js   # SEMUA backend API (auth, booking, equipment, dll)
│   ├── page.js                    # SELURUH UI (landing, booking, katalog, admin)
│   ├── layout.js                  # layout + metadata SEO + Toaster
│   └── globals.css                # style global
├── public/
│   └── logo-dkv.webp              # logo aplikasi
├── .env                           # konfigurasi environment
├── package.json                   # dependency & script
└── PANDUAN.md                     # dokumen ini
```

---

## 🔌 7. Daftar Endpoint API (Prefix `/api`)

| Method | Endpoint | Keterangan |
|--------|----------|------------|
| POST | `/api/auth/register` | Daftar akun |
| POST | `/api/auth/login` | Login (email/HP + password) |
| GET | `/api/auth/me` | Data user (butuh token) |
| GET | `/api/packages` | Daftar paket layanan |
| GET | `/api/equipment` | Daftar alat (publik) |
| POST/PUT/DELETE | `/api/equipment[/:id]` | CRUD alat (admin) |
| POST | `/api/bookings/estimate` | Hitung estimasi harga |
| GET/POST | `/api/bookings` | List / buat booking |
| PUT | `/api/bookings/:id` | Update status/crew/invoice (admin) |
| GET/POST | `/api/rentals` | List / buat rental |
| PUT | `/api/rentals/:id` | Update status rental (admin) |
| GET/POST/DELETE | `/api/crew[/:id]` | Kelola crew |
| GET | `/api/portfolio` · `/api/testimonials` | Data publik |
| GET | `/api/stats` | Statistik dashboard (admin) |
| POST | `/api/seed` | Isi data contoh |

> Autentikasi: kirim header `Authorization: Bearer <token>` untuk endpoint yang butuh login.

---

## 🛠️ 8. Troubleshooting

| Masalah | Solusi |
|---------|--------|
| **`ECONNREFUSED 27017`** | MongoDB belum jalan. Start service / Docker MongoDB. |
| **Halaman kosong / data tak muncul** | Tunggu kompilasi pertama selesai, refresh. Pastikan `/api/packages` mengembalikan 200. |
| **Port 3000 dipakai** | Matikan proses lain, atau ubah port: `yarn dev -p 3001`. |
| **Login gagal terus** | Pastikan seed sudah jalan (akun demo dibuat saat seed). |
| **Error 502 saat dev** | Dev server kehabisan memori → sudah dinaikkan ke 2GB di `package.json`. Restart `yarn dev`. |
| **Data ingin di-reset** | Jalankan seed `force:true` (lihat bagian 4). |

---

## ⚙️ 9. Perintah Cepat (Cheat Sheet)

```bash
yarn install         # install dependency
yarn dev             # jalankan mode development (localhost:3000)
yarn build           # build produksi
yarn start           # jalankan produksi
```

---

**© 2025 DCEN DKV — Premium Multimedia Production Studio**
