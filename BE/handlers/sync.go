package handlers

import (
	"crypto/subtle"
	"encoding/json"
	"log"
	"os"
	"strings"
	"time"

	"atheric-be/database"
	"atheric-be/models"
	"atheric-be/services"

	"github.com/gofiber/fiber/v2"
)

// verifySyncKey checks secret token from X-Sync-Key or Authorization header with constant-time comparison
func verifySyncKey(c *fiber.Ctx) bool {
	syncSecret := strings.TrimSpace(os.Getenv("SYNC_SECRET_KEY"))
	if syncSecret == "" {
		syncSecret = strings.TrimSpace(os.Getenv("JWT_SECRET"))
	}
	if syncSecret == "" {
		log.Println("[SECURITY ALERT] SYNC_SECRET_KEY/JWT_SECRET is not configured on server. Rejecting sync.")
		return false
	}

	key := strings.TrimSpace(c.Get("X-Sync-Key"))
	if key == "" {
		auth := c.Get("Authorization")
		key = strings.TrimSpace(strings.TrimPrefix(auth, "Bearer "))
	}

	if key == "" {
		return false
	}

	return subtle.ConstantTimeCompare([]byte(key), []byte(syncSecret)) == 1
}

// SyncMarketDataPayload represents data sent by TrainerProduksiML scraper
type SyncMarketDataPayload struct {
	Timestamp string `json:"timestamp"`
	Date      string `json:"date"`
	Stocks    []struct {
		Ticker          string  `json:"ticker"`
		Name            string  `json:"name"`
		Price           float64 `json:"price"`
		Change          float64 `json:"change"`
		ChangePercent   float64 `json:"change_percent"`
		Signal          string  `json:"signal"`
		Category        string  `json:"category"`
		ConfidenceLevel float64 `json:"confidence_level"`
	} `json:"stocks"`
}

// SyncMarketData accepts scraped daily stock prices from Trainer and updates DBs
func SyncMarketData(c *fiber.Ctx) error {
	if !verifySyncKey(c) {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized: Invalid or missing X-Sync-Key"})
	}

	var payload SyncMarketDataPayload
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid JSON payload", "details": err.Error()})
	}

	if len(payload.Stocks) == 0 {
		return c.Status(400).JSON(fiber.Map{"error": "Empty stocks array"})
	}

	updatedCount := 0
	for _, s := range payload.Stocks {
		cleanTicker := strings.TrimSuffix(strings.ToUpper(strings.TrimSpace(s.Ticker)), ".JK")
		if cleanTicker == "" {
			continue
		}

		var existing models.Stock
		if err := database.DB.Where("ticker = ?", cleanTicker).First(&existing).Error; err != nil {
			// Insert new stock
			conf := s.ConfidenceLevel
			if conf <= 0 {
				conf = 85.0
			}
			sig := s.Signal
			if sig == "" {
				sig = "HOLD"
			}
			newStock := models.Stock{
				Ticker:          cleanTicker,
				Name:            s.Name,
				Price:           s.Price,
				Change:          s.Change,
				ChangePercent:   s.ChangePercent,
				ConfidenceLevel: conf,
				Signal:          sig,
				Category:        s.Category,
			}
			if err := database.DB.Create(&newStock).Error; err == nil {
				updatedCount++
			}
		} else {
			// Update existing stock
			updates := map[string]interface{}{
				"price":          s.Price,
				"change":         s.Change,
				"change_percent": s.ChangePercent,
			}
			if s.Name != "" {
				updates["name"] = s.Name
			}
			if s.Category != "" {
				updates["category"] = s.Category
			}
			if s.Signal != "" {
				updates["signal"] = s.Signal
			}
			if s.ConfidenceLevel > 0 {
				updates["confidence_level"] = s.ConfidenceLevel
			}
			if err := database.DB.Model(&existing).Updates(updates).Error; err == nil {
				updatedCount++
			}
		}
	}

	// Invalidate frontend stock cache
	if services.GlobalRAMCache != nil {
		services.GlobalRAMCache.Delete("api_stocks")
		services.GlobalRAMCache.Delete("api_indices")
	}

	log.Printf("[SYNC API] Successfully synced %d/%d stocks from trainer to AppDB", updatedCount, len(payload.Stocks))
	return c.JSON(fiber.Map{
		"status":        "success",
		"message":       "Market data successfully synchronized",
		"total_synced":  updatedCount,
		"sync_time_utc": time.Now().UTC().Format(time.RFC3339),
	})
}

// SyncNewsPayload represents daily scraped news articles
type SyncNewsPayload struct {
	News []struct {
		Ticker string `json:"ticker"`
		Title  string `json:"title"`
		Source string `json:"source"`
		Time   string `json:"time"`
		Impact string `json:"impact"`
		Url    string `json:"url"`
	} `json:"news"`
}

// SyncNews accepts daily news scraped from trainer and updates AppDB
func SyncNews(c *fiber.Ctx) error {
	if !verifySyncKey(c) {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized: Invalid or missing X-Sync-Key"})
	}

	var payload SyncNewsPayload
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid JSON payload", "details": err.Error()})
	}

	syncedCount := 0
	for _, n := range payload.News {
		cleanTicker := strings.TrimSuffix(strings.ToUpper(strings.TrimSpace(n.Ticker)), ".JK")
		if n.Title == "" {
			continue
		}

		var existing models.News
		if err := database.DB.Where("title = ?", n.Title).First(&existing).Error; err != nil {
			newNews := models.News{
				Ticker: cleanTicker,
				Title:  n.Title,
				Source: n.Source,
				Time:   n.Time,
				Impact: n.Impact,
				Url:    n.Url,
			}
			if err := database.DB.Create(&newNews).Error; err == nil {
				syncedCount++
			}
		}
	}

	log.Printf("[SYNC API] Synced %d new news items from trainer to AppDB", syncedCount)
	return c.JSON(fiber.Map{
		"status":       "success",
		"news_created": syncedCount,
	})
}

// SyncForecastPayload represents monthly forecast from Model C training
type SyncForecastPayload struct {
	PeriodMonth string `json:"period_month"` // e.g. 2026-08-01_1M
	ModelName   string `json:"model_name"`
	Forecasts   []struct {
		Ticker      string  `json:"ticker"`
		Signal      string  `json:"signal"`
		RankScore   float64 `json:"rank_score"`
		PredReturn  float64 `json:"pred_return"`
		TargetPrice float64 `json:"target_price"`
		StopLoss    float64 `json:"stop_loss"`
	} `json:"forecasts"`
}

// SyncForecast accepts monthly predictions from Model C and caches in AppDB
func SyncForecast(c *fiber.Ctx) error {
	if !verifySyncKey(c) {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized: Invalid or missing X-Sync-Key"})
	}

	var payload SyncForecastPayload
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid JSON payload", "details": err.Error()})
	}

	if payload.PeriodMonth == "" {
		payload.PeriodMonth = time.Now().Format("2006-01-02") + "_1M"
	}
	if payload.ModelName == "" {
		payload.ModelName = "Genesis2.0"
	}

	expiresAt := time.Now().Add(35 * 24 * time.Hour) // Cache for 35 days (1 month + buffer)
	syncedCount := 0

	for _, f := range payload.Forecasts {
		cleanTicker := strings.TrimSuffix(strings.ToUpper(strings.TrimSpace(f.Ticker)), ".JK")
		if cleanTicker == "" {
			continue
		}

		var stock models.Stock
		_ = database.DB.Where("ticker = ?", cleanTicker).First(&stock)
		basePrice := stock.Price
		if basePrice <= 0 {
			basePrice = 1000.0
		}

		// Generate 20-day path projection based on calibrated pred_return
		pts := 20
		fwdPoints := make([]int, pts)
		actualPoints := make([]int, 10)
		ciUpperPoints := make([]int, pts)
		ciLowerPoints := make([]int, pts)

		for i := 0; i < 10; i++ {
			actualPoints[i] = int(basePrice * (1.0 + float64(i-9)*0.002))
		}

		stepRet := (f.PredReturn / 100.0) / float64(pts)
		for i := 0; i < pts; i++ {
			val := basePrice * (1.0 + stepRet*float64(i+1))
			fwdPoints[i] = int(val)
			ciUpperPoints[i] = int(val * 1.05)
			ciLowerPoints[i] = int(val * 0.95)
		}

		actJSON, _ := json.Marshal(actualPoints)
		fwdJSON, _ := json.Marshal(fwdPoints)
		ciUJSON, _ := json.Marshal(ciUpperPoints)
		ciLJSON, _ := json.Marshal(ciLowerPoints)

		cacheItem := models.ModelForecastCache{
			Ticker:         cleanTicker,
			PeriodMonth:    payload.PeriodMonth,
			ModelName:      payload.ModelName,
			HorizonDays:    20,
			Signal:         f.Signal,
			HistoricalJSON: string(actJSON),
			ForecastJSON:   string(fwdJSON),
			CIUpperJSON:    string(ciUJSON),
			CILowerJSON:    string(ciLJSON),
			ExpiresAt:      expiresAt,
		}

		var existing models.ModelForecastCache
		if err := database.DB.Where("ticker = ? AND period_month = ?", cleanTicker, payload.PeriodMonth).First(&existing).Error; err != nil {
			database.DB.Create(&cacheItem)
		} else {
			database.DB.Model(&existing).Updates(cacheItem)
		}
		syncedCount++
	}

	log.Printf("[SYNC API] Successfully cached %d monthly forecasts for period %s in AppDB", syncedCount, payload.PeriodMonth)
	return c.JSON(fiber.Map{
		"status":          "success",
		"forecast_cached": syncedCount,
		"period_month":    payload.PeriodMonth,
		"expires_at":      expiresAt.Format(time.RFC3339),
	})
}
