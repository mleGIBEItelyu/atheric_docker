package database

import (
	"log"
	"math/rand"
	"os"
	"path/filepath"
	"strings"
	"time"

	"atheric-be/models"

	"github.com/glebarez/sqlite"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var (
	DB       *gorm.DB // Database 1 (AppDB): User Auth, Sessions, Tickets, Watchlists, Forecast 1M Cache, Settings
	MarketDB *gorm.DB // Database 2 (MarketDB): Scraped Market Data, OHLCV, Technical Features, Metadata from TrainerProduksiML
)

// InitDB initializes both SQLite embedded databases and runs schema migrations
func InitDB() *gorm.DB {
	// 1. Initialize AppDB (User & Application State)
	appDBPath := os.Getenv("DB_PATH")
	if appDBPath == "" {
		appDBPath = "data/atheric_app.db"
	}

	dir := filepath.Dir(appDBPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		log.Fatalf("Failed to create database directory: %v", err)
	}

	gormLogger := logger.New(
		log.New(os.Stdout, "\r\n", log.LstdFlags),
		logger.Config{
			SlowThreshold:             500 * time.Millisecond,
			LogLevel:                  logger.Warn,
			IgnoreRecordNotFoundError: true,
			Colorful:                  false,
		},
	)

	db, err := gorm.Open(sqlite.Open(appDBPath), &gorm.Config{
		PrepareStmt: true,
		Logger:      gormLogger,
	})
	if err != nil {
		log.Fatalf("Failed to connect App Database (%s): %v", appDBPath, err)
	}

	// Optimize AppDB PRAGMAs
	db.Exec("PRAGMA journal_mode = WAL;")
	db.Exec("PRAGMA synchronous = NORMAL;")
	db.Exec("PRAGMA cache_size = -32000;")
	db.Exec("PRAGMA temp_store = MEMORY;")
	db.Exec("PRAGMA busy_timeout = 5000;")

	if sqlDB, err := db.DB(); err == nil {
		sqlDB.SetMaxOpenConns(50)
		sqlDB.SetMaxIdleConns(10)
	}

	log.Printf("[DB-1 OK] App Database connected (%s) with SQLite WAL Mode", appDBPath)

	// Auto-migrate schema tables on AppDB
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
		&models.ModelForecastCache{}, // Menyimpan hasil forecast 1 bulan ke depan
		&models.Notification{},
		&models.StockSynthesis{},
	)
	if err != nil {
		log.Fatalf("App Database migration failed: %v", err)
	}

	DB = db
	seedInitialData(db)

	// 2. Start background maintenance workers
	go startUnverifiedUserSweeper(db)
	go startAuditAndSessionPruner(db)

	// 3. Initialize MarketDB (Scraped Data & ML Store from TrainerProduksiML)
	initMarketDB(db)

	return db
}

// startUnverifiedUserSweeper periodically purges unverified registrations after 1 minute
func startUnverifiedUserSweeper(db *gorm.DB) {
	ticker := time.NewTicker(15 * time.Second)
	for range ticker.C {
		cutoff := time.Now().Add(-1 * time.Minute)
		var expired []models.User
		if err := db.Where("is_verified = ? AND (code_expires_at < ? OR created_at < ?)", false, time.Now(), cutoff).Find(&expired).Error; err == nil && len(expired) > 0 {
			for _, u := range expired {
				db.Unscoped().Delete(&u)
				log.Printf("[AUTH SWEEPER] Auto-purged unverified user '%s' (ID: %d) after 1 minute expiration", u.Username, u.ID)
			}
		}
	}
}

// startAuditAndSessionPruner periodically purges activity logs and device sessions older than 30 days
func startAuditAndSessionPruner(db *gorm.DB) {
	// Run once immediately on startup, then every 12 hours
	runPrune := func() {
		cutoff := time.Now().Add(-30 * 24 * time.Hour)
		
		// Prune audit logs
		resLogs := db.Where("created_at < ?", cutoff).Delete(&models.ActivityLog{})
		if resLogs.Error == nil && resLogs.RowsAffected > 0 {
			log.Printf("[PRUNER OK] Cleaned up %d old audit logs (>30 days).", resLogs.RowsAffected)
		}

		// Prune old inactive sessions
		resSessions := db.Where("last_active_at < ?", cutoff).Delete(&models.DeviceSession{})
		if resSessions.Error == nil && resSessions.RowsAffected > 0 {
			log.Printf("[PRUNER OK] Cleaned up %d expired device sessions (>30 days).", resSessions.RowsAffected)
		}

		// Run SQLite internal index optimization
		db.Exec("PRAGMA optimize;")
	}

	runPrune()
	ticker := time.NewTicker(12 * time.Hour)
	for range ticker.C {
		runPrune()
	}
}

// initMarketDB connects to Market Data SQLite store and synchronizes stocks to AppDB
func initMarketDB(appDB *gorm.DB) {
	marketCandidates := []string{
		os.Getenv("MARKET_DB_PATH"),
		"data/idx_scraped_data.db",
		"../BE/data/idx_scraped_data.db",
		"BE/data/idx_scraped_data.db",
		"/app/data/idx_scraped_data.db",
		"data/atheric_market.db",
	}

	for _, p := range marketCandidates {
		if p == "" {
			continue
		}
		if _, err := os.Stat(p); err == nil {
			mDB, err := gorm.Open(sqlite.Open(p), &gorm.Config{
				PrepareStmt: true,
				Logger: logger.New(
					log.New(os.Stdout, "\r\n", log.LstdFlags),
					logger.Config{
						SlowThreshold:             500 * time.Millisecond,
						LogLevel:                  logger.Warn,
						IgnoreRecordNotFoundError: true,
						Colorful:                  false,
					},
				),
			})
			if err == nil {
				mDB.Exec("PRAGMA query_only = ON;") // Read-only safety on market scraped store
				MarketDB = mDB
				log.Printf("[DB-2 OK] Market Scraper Database connected (%s)", p)
				break
			}
		}
	}

	if MarketDB == nil {
		log.Printf("[DB-2 INFO] Market Scraper Database not found or offline. Using cached stocks in AppDB.")
		return
	}

	// Sync scraped metadata and latest prices to AppDB in background so server boots up instantly
	go SyncMarketDataToApp(appDB, MarketDB)
}

// SyncMarketDataToApp synchronizes scraped stocks from MarketDB into AppDB
func SyncMarketDataToApp(appDB, mDB *gorm.DB) {
	if mDB == nil || appDB == nil {
		return
	}

	type ScrapedMeta struct {
		Ticker   string `gorm:"column:ticker"`
		Sector   string `gorm:"column:sector"`
		Name     string `gorm:"column:name"`
	}

	var scrapedList []ScrapedMeta
	if err := mDB.Table("metadata_saham").Select("ticker, sector, name").Scan(&scrapedList).Error; err == nil && len(scrapedList) > 0 {
		log.Printf("[SYNC] Syncing %d stocks from MarketDB to AppDB in background...", len(scrapedList))
		for _, sm := range scrapedList {
			cleanTicker := strings.TrimSuffix(strings.ToUpper(sm.Ticker), ".JK")
			
			// Find latest close from raw_teknikal if exists
			type LatestPrice struct {
				Close float64 `gorm:"column:close"`
				Date  string  `gorm:"column:date"`
			}
			var lp LatestPrice
			_ = mDB.Table("raw_teknikal").Where("ticker = ?", sm.Ticker).Order("date desc").Limit(1).Scan(&lp)

			var existing models.Stock
			if err := appDB.Where("ticker = ?", cleanTicker).First(&existing).Error; err != nil {
				// Insert new stock from scraped universe
				price := lp.Close
				if price <= 0 {
					price = 1000
				}
				appDB.Create(&models.Stock{
					Ticker:          cleanTicker,
					Name:            sm.Name,
					Price:           price,
					Category:        sm.Sector,
					ConfidenceLevel: 85.0,
					Signal:          "HOLD",
				})
			} else if lp.Close > 0 {
				// Update latest scraped price and sector
				appDB.Model(&existing).Updates(map[string]interface{}{
					"price":    lp.Close,
					"category": sm.Sector,
				})
			}
		}
		log.Printf("[SYNC OK] Market universe successfully synchronized to AppDB.")
	}
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

	// Clean initial system logs
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
