# ⚡ Atheric AI — Fullstack Monorepo & Docker Suite

Atheric AI adalah platform terminal finansial cerdas untuk analisis saham, pemodelan proyeksi harga (*forecast*), evaluasi akurasi AI, dan pemantauan trafik real-time melalui WebSocket.

Repositori ini adalah **Monorepo Terpadu** yang menggabungkan dua proyek independen:
1. 🎨 **Frontend (`/FE`)**: React 19 + TypeScript + Vite + Nginx Reverse Proxy
2. ⚡ **Backend (`/BE`)**: Golang 1.22 + Fiber v2 + SQLite Embedded + Resend Email API + Gemini AI

---

## 📁 Struktur Monorepo

```text
atheric_docker/
├── 📁 BE/                      # Project 1: Golang Backend API
│   ├── database/              # GORM & SQLite init, migrations, seeding
│   ├── handlers/              # API Controllers & WebSocket Handlers
│   ├── middleware/            # JWT Auth, Bot Protection, Rate Limiter, RBAC
│   ├── models/                # GORM Structs & DB Schemas
│   ├── services/              # Resend REST API, Gemini AI Proxy, WebSocket Monitor
│   ├── Dockerfile             # Multi-stage Dockerfile khusus Backend
│   ├── main.go                # Server Entrypoint
│   ├── go.mod                 # Go dependencies
│   ├── .env.example           # Template environment variables Backend
│   └── README.md              # Dokumentasi khusus Backend
│
├── 📁 FE/                      # Project 2: React Frontend Dashboard
│   ├── public/                # Static assets
│   ├── src/                   # React components, pages, hooks, context, styles
│   ├── Dockerfile             # Multi-stage Dockerfile (Node.js -> Nginx Alpine)
│   ├── nginx.conf             # Nginx SPA Router & WebSocket Reverse Proxy
│   ├── package.json           # Frontend dependencies
│   ├── vite.config.ts         # Vite configuration
│   └── README.md              # Dokumentasi khusus Frontend
│
├── 📄 docker-compose.yml       # Production Multi-Container Orchestrator (FE + BE)
├── 📄 docker-compose.dev.yml   # Development Multi-Container (Live Hot-Reload)
├── 📄 Dockerfile               # Standalone All-in-One Single Container (Opsional)
├── 📄 .env.example             # Template environment variables terpadu
├── 📄 .dockerignore            # Docker build ignore rules
└── 📄 README.md                # Dokumentasi utama monorepo
```

---

## 🛠️ Arsitektur Teknologi

| Komponen | Teknologi | Keterangan |
| :--- | :--- | :--- |
| **Frontend (FE)** | React 19, TypeScript, Vite, TanStack Query | SPAs Financial Dashboard Terminals |
| **Frontend Web Server** | Nginx Alpine | Reverse proxy `/api/` & WebSocket `/api/ws/` ke Backend |
| **Backend (BE)** | Golang 1.22, Fiber v2, GORM | High-performance API server (~20MB RAM) |
| **Database** | SQLite Embedded (`atheric.db`) | Penyimpanan lokal tanpa overhead database terpisah |
| **Email Service** | Resend REST API | Pengiriman email OTP verifikasi akun |
| **AI Integration** | Google Gemini 2.0 Flash | Server-side secure proxy & synthesis analysis |
| **Containerization** | Docker & Docker Compose | Multi-container isolation untuk deployment VPS |

---

## 🚀 Cara Menjalankan Aplikasi

### Opsi A: Menggunakan Docker Compose Production (Rekomendasi VPS)

Menjalankan versi build produksi dengan isolasi container dan Nginx reverse proxy:

1. **Salin file konfigurasi environment:**
   ```bash
   cp .env.example .env
   ```
   *(Sesuaikan `RESEND_API_KEY` dan `GEMINI_API_KEY` pada file `.env`)*

2. **Jalankan container produksi:**
   ```bash
   docker compose up -d --build
   ```

3. **Akses aplikasi:**
   * 🌐 **Frontend Dashboard**: `http://localhost` (Port 80)
   * 🔌 **Backend Healthcheck**: `http://localhost:5000/api/health`

---

### Opsi B: Menggunakan Docker Compose Development (Hot-Reload)

Menjalankan lingkungan development dengan *live reload* otomatis saat kode diubah:

```bash
docker compose -f docker-compose.dev.yml up --build
```
* Frontend: `http://localhost:5173`
* Backend: `http://localhost:5000`

---

### Opsi C: Menjalankan Secara Manual (Tanpa Docker)

#### 1. Menjalankan Backend:
```bash
cd BE
cp .env.example .env
go run main.go
```
*Server aktif di `http://localhost:5000`*

#### 2. Menjalankan Frontend:
```bash
cd FE
npm install
npm run dev
```
*Dashboard aktif di `http://localhost:5173`*

---

## 🔑 Akun Demo Default

| Role | Username | Password | Keterangan |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin` | `admin123` | Akses penuh ke Admin Portal & WebSocket Traffic Monitor |
| **USER** | `atheric_user` | `user123` | Akses terminal finansial, watchlist, dan AI chat |

---

## 📊 Manajemen Kontainer Docker

```bash
# Melihat status kontainer
docker compose ps

# Melihat log real-time
docker compose logs -f

# Menghentikan kontainer
docker compose down

# Menghentikan kontainer sekaligus membersihkan volume
docker compose down -v
```

---

## 📄 Lisensi & Hak Cipta
&copy; 2026 **Atheric AI**. All rights reserved.
