# Atheric AI -- Go Backend API (Production Ready with JWT Auth)

Layanan RESTful API backend untuk platform **Atheric AI** yang dibangun menggunakan bahasa pemrograman **Golang** dan framework **Go Fiber**, serta menggunakan **SQLite** sebagai *embedded database*.

Backend ini dirancang **Production Ready**, aman, dan sangat efisien agar dapat berjalan secara optimal pada VPS murah berspesifikasi rendah (RAM ~512MB - 1GB) dengan konsumsi memori hanya **~20MB RAM**.

---

## 🔐 Keamanan & Autentikasi (JWT Auth)

- **Tanpa Register Publik**: Pendaftaran akun publik ditiadakan demi keamanan sistem. 
- **Auto-Seeded Accounts**: Saat pertama kali aplikasi di-deploy, akun dasar otomatis dibuat secara otomatis dengan enkripsi **bcrypt**:
  - 👑 **Admin**: Username: `admin` | Password: `admin123password`
  - 👤 **User**: Username: `gibei_trader` | Password: `user123password`
- **Admin User Management**: Pembuatan akun baru hanya dapat dilakukan oleh **Admin** melalui endpoint terproteksi `/api/admin/users`.
- **JWT Protection**: Akses ke data privat seperti *watchlist* dan fitur *admin* mewajibkan *Header Authorization*: `Bearer <token_jwt>`.

---

## 📡 Daftar Endpoint API

### 🌐 Public Routes (Tanpa Auth)
| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Healthcheck status server & DB |
| `POST` | `/api/auth/login` | Login user/admin untuk mendapatkan JWT Token |
| `GET` | `/api/stocks` | Mengambil data emiten & sinyal rekomendasi |
| `POST` | `/api/tickets` | Mengirim tiket kendala teknis / dukungan |

#### Contoh Body `POST /api/auth/login`:
```json
{
  "username": "admin",
  "password": "admin123password"
}
```

---

### 🔑 Protected Routes (Mewajibkan Header `Authorization: Bearer <token>`)
| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/api/auth/me` | Mengambil profil pengguna yang sedang login |
| `GET` | `/api/watchlist` | Mengambil daftar emiten favorit pengguna |
| `POST` | `/api/watchlist/toggle` | Menambah/menghapus emiten dari daftar pantau |

---

### 🛡️ Admin Routes (Mewajibkan Role `ADMIN`)
| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/api/admin/users` | Mengambil seluruh daftar pengguna terdaftar |
| `POST` | `/api/admin/users` | Menambahkan pengguna/admin baru |

#### Contoh Body `POST /api/admin/users` (Admin Only):
```json
{
  "username": "trader_baru",
  "email": "trader2@atheric.ai",
  "password": "passwordAman123",
  "role": "USER"
}
```

---

## 🛠️ Tech Stack Backend

- **Language**: [Golang 1.22+](https://go.dev/)
- **Web Framework**: [Go Fiber v2](https://gofiber.io/)
- **Auth**: JWT ([golang-jwt/jwt](https://github.com/golang-jwt/jwt)) & Password Hashing ([bcrypt](https://pkg.go.dev/golang.org/x/crypto/bcrypt))
- **ORM**: [GORM](https://gorm.io/)
- **Database Driver**: [glebarez/sqlite](https://github.com/glebarez/sqlite) (*CGO_ENABLED=0 compatible*)
- **Container**: Docker (Alpine Linux image, size ~15MB)

---

## 🐳 Cara Build & Run Docker

```bash
# Dari direktori root proyek
docker compose up -d --build
```
Backend akan langsung aktif di port **5000** dengan database SQLite yang ter-persist di `./BE/data/atheric.db`.
