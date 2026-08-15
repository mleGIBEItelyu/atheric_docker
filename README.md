# Atheric AI — Financial Terminal & Forecast Analytics

Atheric AI adalah platform web dashboard terminal finansial modern yang dirancang untuk analisis pasar saham, pemodelan proyeksi harga (*forecast*), dan evaluasi akurasi kecerdasan buatan (AI). 

Proyek ini menggunakan arsitektur terpisah antara **Frontend (FE)** dan **Backend (BE)** untuk kemudahan pengembangan serta kemudahan deployment mandiri pada VPS berspesifikasi hemat (misal: 1 vCPU / 512MB–1GB RAM) menggunakan **Docker & Docker Compose**.

---

## 📁 Struktur Direktori Workspace

```text
athericweb/
├── FE/                   # Repositori Frontend (React + TypeScript + Vite + Nginx)
│   ├── src/              # Source code aplikasi React
│   ├── Dockerfile        # Multi-stage Dockerfile (Node.js -> Nginx Alpine)
│   ├── nginx.conf        # Konfigurasi Nginx SPA Router
│   └── README.md         # Dokumentasi khusus Frontend
├── BE/                   # Repositori Backend (Golang + Fiber + SQLite)
│   ├── database/         # Inisialisasi GORM & SQLite
│   ├── handlers/         # Controller & HTTP Handlers
│   ├── models/           # Definisi skema tabel database
│   ├── main.go           # Entrypoint aplikasi Go
│   ├── Dockerfile        # Multi-stage Dockerfile (Golang Alpine -> Alpine)
│   └── README.md         # Dokumentasi khusus Backend
├── docker-compose.yml    # Orchestrator layanan FE & BE untuk VPS
└── README.md             # Dokumentasi utama proyek
```

---

## 🛠️ Tech Stack Overview

| Komponen | Teknologi | Keterangan |
| :--- | :--- | :--- |
| **Frontend (FE)** | React 19, TypeScript, Vite, TanStack Query | SPAs Dashboard Terminals |
| **Frontend Web Server** | Nginx Alpine (Docker Container) | Ringan (~20MB), penanganan client-side routing |
| **Backend (BE)** | Golang 1.22, Fiber v2, GORM | Super cepat, konsumsi memori minim (~20MB RAM) |
| **Database** | SQLite (Embedded) | Simpan data lokal di disk VPS tanpa overhead RAM tambahan |
| **Deployment** | Docker & Docker Compose | Kontainerisasi independen untuk VPS |

---

## 🚀 Cara Menjalankan Menggunakan Docker Compose (Rekomendasi VPS)

Di lingkungan produksi atau VPS yang telah memiliki **Docker** dan **Docker Compose**:

### 1. Klon Repositori & Masuk ke Folder Utama
```bash
git clone <url-repo-utama> athericweb
cd athericweb
```

### 2. Jalankan Layanan (Frontend & Backend)
```bash
docker compose up -d --build
```

### 3. Verifikasi Layanan Berjalan
- **Frontend Dashboard**: `http://localhost` atau `http://<IP-VPS-Anda>` (Port 80)
- **Backend API**: `http://localhost:5000/api/health` atau `http://<IP-VPS-Anda>:5000/api/health`

### 4. Perintah Manajemen Docker Tambahan
- **Melihat status kontainer**: `docker compose ps`
- **Melihat log real-time**: `docker compose logs -f`
- **Menghentikan kontainer**: `docker compose down`

---

## 🔗 Port & Environment Variables

| Layanan | Port Internal | Port VPS | Variabel Lingkungan Utama |
| :--- | :--- | :--- | :--- |
| **`frontend`** | `80` | `80` | `NODE_ENV=production` |
| **`backend`** | `5000` | `5000` | `PORT=5000`, `DB_PATH=/app/data/atheric.db` |

---

## 📄 Dokumentasi Spesifik Per Layanan
- 🎨 **[Dokumentasi Frontend (FE/README.md)](file:///d:/Kodingan/%21Group/Gibei/athericweb/FE/README.md)**
- ⚡ **[Dokumentasi Backend (BE/README.md)](file:///d:/Kodingan/%21Group/Gibei/athericweb/BE/README.md)**
