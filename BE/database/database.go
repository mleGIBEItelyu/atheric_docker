package database

import (
	"log"
	"math/rand"
	"os"
	"path/filepath"

	"atheric-be/models"

	"github.com/glebarez/sqlite"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

var DB *gorm.DB

// InitDB initializes SQLite embedded database and migrates schemas
func InitDB() *gorm.DB {
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "data/atheric.db"
	}

	// Ensure directory exists
	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		log.Fatalf("Failed to create database directory: %v", err)
	}

	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{
		PrepareStmt: true, // Cache prepared statements for fast execution
	})
	if err != nil {
		log.Fatalf("Failed to connect database: %v", err)
	}

	// Optimize SQLite PRAGMAs for high-concurrency low-spec VPS
	db.Exec("PRAGMA journal_mode = WAL;")
	db.Exec("PRAGMA synchronous = NORMAL;")
	db.Exec("PRAGMA cache_size = -32000;")
	db.Exec("PRAGMA temp_store = MEMORY;")
	db.Exec("PRAGMA mmap_size = 268435456;")
	db.Exec("PRAGMA busy_timeout = 5000;")

	// Connection Pool limits to avoid thread explosion on budget VPS
	sqlDB, err := db.DB()
	if err == nil {
		sqlDB.SetMaxOpenConns(50)
		sqlDB.SetMaxIdleConns(10)
	}

	log.Println("Database connection established (SQLite WAL Mode). Running migrations...")

	// Auto-migrate schema tables
	err = db.AutoMigrate(
		&models.User{},
		&models.ActivityLog{},
		&models.Stock{},
		&models.Watchlist{},
		&models.Evaluation{},
		&models.News{},
		&models.SupportTicket{},
		&models.UserSetting{},
		&models.DeviceSession{},
		&models.ModelForecastCache{},
	)
	if err != nil {
		log.Fatalf("Database migration failed: %v", err)
	}

	DB = db
	seedInitialData(db)

	return db
}

// Seed initial demo data for ADMIN and USER roles
func seedInitialData(db *gorm.DB) {
	adminHash, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	userHash, _ := bcrypt.GenerateFromPassword([]byte("user123"), bcrypt.DefaultCost)

	demoUsers := []models.User{
		{ID: uint(100000 + rand.Intn(899999)), Username: "admin", Email: "admin@atheric.ai", Password: string(adminHash), Role: "ADMIN", IsVerified: true, IsActive: true},
		{ID: uint(100000 + rand.Intn(899999)), Username: "atheric_user", Email: "user@atheric.ai", Password: string(userHash), Role: "USER", IsVerified: true, IsActive: true},
	}

	for _, u := range demoUsers {
		var existing models.User
		if err := db.Where("username = ? OR email = ?", u.Username, u.Email).First(&existing).Error; err != nil {
			db.Create(&u)
		} else {
			db.Model(&existing).Updates(map[string]interface{}{
				"password":    u.Password,
				"role":        u.Role,
				"is_verified": true,
				"is_active":   true,
			})
		}
	}
	log.Println("Synchronized Demo Accounts with ADMIN and USER roles (admin: admin123, atheric_user: user123)")

	// Clean any dummy system init logs
	db.Where("action LIKE ?", "%INIT%").Delete(&models.ActivityLog{})

	// Seed Stock market data if empty
	var stockCount int64
	db.Model(&models.Stock{}).Count(&stockCount)
	if stockCount == 0 {
		log.Println("Seeding initial stock market data...")
		stocks := []models.Stock{
			{Ticker: "BBCA", Name: "Bank Central Asia Tbk", Price: 10250, Change: 150, ChangePercent: 1.48, ConfidenceLevel: 94.2, Signal: "BUY", Category: "Banking"},
			{Ticker: "BBRI", Name: "Bank Rakyat Indonesia Tbk", Price: 5125, Change: -50, ChangePercent: -0.97, ConfidenceLevel: 89.5, Signal: "HOLD", Category: "Banking"},
			{Ticker: "BMRI", Name: "Bank Mandiri Tbk", Price: 7050, Change: 100, ChangePercent: 1.44, ConfidenceLevel: 91.8, Signal: "BUY", Category: "Banking"},
			{Ticker: "TLKM", Name: "Telkom Indonesia Tbk", Price: 3890, Change: 20, ChangePercent: 0.52, ConfidenceLevel: 85.0, Signal: "HOLD", Category: "Telco"},
			{Ticker: "ASII", Name: "Astra International Tbk", Price: 5200, Change: -125, ChangePercent: -2.35, ConfidenceLevel: 78.4, Signal: "SELL", Category: "Automotive"},
			{Ticker: "GOTO", Name: "GoTo Gojek Tokopedia Tbk", Price: 68, Change: 2, ChangePercent: 3.03, ConfidenceLevel: 82.1, Signal: "BUY", Category: "Tech"},
		}
		db.Create(&stocks)
	}

	// Seed Evaluation data if empty
	var evalCount int64
	db.Model(&models.Evaluation{}).Count(&evalCount)
	if evalCount == 0 {
		log.Println("Seeding initial evaluation performance data...")
		evals := []models.Evaluation{
			{
				ModelName:          "Atheric Generative Financial LLM v2",
				AccuracyPercentage: 73.3,
				MapeScore:          4.2,
				Pros:               "Akurasi arah sektor perbankan sangat tinggi (BBCA, BBRI, BMRI); Confidence interval valid 90% untuk 60%+ saham",
				Cons:               "Sektor tech (GOTO) berfluktuasi tinggi; Sentimen suku bunga makro mendadak perlu tuning lebih lanjut",
				Notes:              "Bulan terkuat sejak Q1 2025. Fundamental-driven stocks berperforma sangat presisi.",
			},
			{
				ModelName:          "Statistical Ensemble (ARIMA + GARCH)",
				AccuracyPercentage: 66.7,
				MapeScore:          5.1,
				Pros:               "Sangat handal pada pergerakan saham bluechip tanpa anomaly eksternal; Estimasi volatilitas GARCH stabil",
				Cons:               "Sensitivitas rendah terhadap sentimen berita berita mendadak / corporate actions",
				Notes:              "Baseline model untuk perbandingan volatilitas harian.",
			},
		}
		db.Create(&evals)
	}

	// Seed News data if empty
	var newsCount int64
	db.Model(&models.News{}).Count(&newsCount)
	if newsCount == 0 {
		log.Println("Seeding initial stock news data...")
		newsItems := []models.News{
			{Ticker: "BBCA", Title: "BBCA Cetak Laba Bersih Rp 48,6 T di Kuartal III 2024", Source: "Bisnis.com", Time: "10:42", Impact: "High +", Url: "https://bisnis.com"},
			{Ticker: "BBCA", Title: "OJK Longgarkan Aturan Modal Minimum Perbankan Nasional", Source: "Kontan", Time: "09:15", Impact: "High +", Url: "https://kontan.co.id"},
			{Ticker: "BBCA", Title: "Analis Naikkan Target Harga BBCA ke Rp 10.500", Source: "CNBC Indonesia", Time: "08:30", Impact: "Medium", Url: "https://cnbcindonesia.com"},
			{Ticker: "BBRI", Title: "BBRI Salurkan Kredit UMKM Tembus Rp 1.100 Triliun", Source: "Investor Daily", Time: "11:20", Impact: "High +", Url: "https://investor.id"},
			{Ticker: "GOTO", Title: "GoTo Gandeng Mitra Strategis Perluas Ekosistem Fintech", Source: "Tech in Asia", Time: "14:15", Impact: "Medium", Url: "https://techinasia.com"},
		}
		db.Create(&newsItems)
	}
}
