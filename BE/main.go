package main

import (
	"log"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"atheric-be/database"
	"atheric-be/handlers"
	"atheric-be/middleware"
	"atheric-be/services"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/compress"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/etag"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/websocket/v2"
	"github.com/golang-jwt/jwt/v5"
)

func loadEnvFile(filename string) {
	data, err := os.ReadFile(filename)
	if err != nil {
		return
	}

	lines := strings.Split(string(data), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			key := strings.TrimSpace(parts[0])
			val := strings.TrimSpace(parts[1])
			if strings.HasPrefix(val, "\"") && strings.HasSuffix(val, "\"") {
				val = strings.Trim(val, "\"")
			} else if strings.HasPrefix(val, "'") && strings.HasSuffix(val, "'") {
				val = strings.Trim(val, "'")
			}
			if os.Getenv(key) == "" && key != "" {
				_ = os.Setenv(key, val)
			}
		}
	}
	log.Printf("[ENV] Loaded %s", filename)
}

func main() {
	loadEnvFile(".env")
	loadEnvFile(".env.local")

	database.InitDB()
	services.InitGenesisManager()

	app := fiber.New(fiber.Config{
		AppName:               "Atheric AI Financial API",
		BodyLimit:             2 * 1024 * 1024,
		ReadTimeout:           15 * time.Second,
		WriteTimeout:          15 * time.Second,
		IdleTimeout:           60 * time.Second,
		DisableStartupMessage: false,
	})

	app.Use(recover.New(recover.Config{
		EnableStackTrace: false,
	}))

	allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
	if allowedOrigins == "" || allowedOrigins == "*" {
		allowedOrigins = "http://localhost:5173, http://localhost:3000, http://127.0.0.1:5173, http://localhost:80, http://127.0.0.1:80, http://localhost"
	}

	app.Use(cors.New(cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization, X-Genesis-Key, X-Sync-Key, X-Requested-With",
		AllowMethods:     "GET, POST, PUT, DELETE, OPTIONS, PATCH",
		AllowCredentials: true,
	}))

	// Gzip / Brotli Payload Compression (High speed on low-bandwidth/mobile connections)
	app.Use(compress.New(compress.Config{
		Level: compress.LevelBestSpeed,
	}))

	// HTTP Entity Tags (ETag) for 304 Not Modified caching
	app.Use(etag.New())

	// Enterprise Security Headers (OWASP & Production Hardening)
	app.Use(func(c *fiber.Ctx) error {
		c.Set("X-Content-Type-Options", "nosniff")
		c.Set("X-Frame-Options", "SAMEORIGIN")
		c.Set("X-XSS-Protection", "1; mode=block")
		c.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Set("Permissions-Policy", "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()")
		c.Set("Cross-Origin-Opener-Policy", "same-origin")
		c.Set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' ws: wss: http: https:;")
		return c.Next()
	})

	// Active Web Application Firewall (WAF) Payload Inspector
	app.Use(middleware.WAFSanitizer())
	app.Use(middleware.BotProtection())

	app.Use(logger.New())
	app.Use(middleware.TrafficLogger())

	app.Use("/api/ws/monitor", func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			tokenStr := c.Query("token")
			if tokenStr == "" {
				authHeader := c.Get("Authorization")
				tokenStr = strings.TrimPrefix(authHeader, "Bearer ")
			}
			if tokenStr == "" || tokenStr == "null" || tokenStr == "undefined" {
				return c.Status(401).JSON(fiber.Map{
					"error": "Akses Ditolak (WS): Token autentikasi tidak ditemukan.",
				})
			}

			token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
				if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, fiber.NewError(401, "Unexpected signing method")
				}
				return middleware.GetJWTSecret(), nil
			})

			if err != nil || !token.Valid {
				return c.Status(401).JSON(fiber.Map{
					"error": "Akses Ditolak (WS): Token tidak valid atau kadaluarsa.",
				})
			}

			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				return c.Status(401).JSON(fiber.Map{
					"error": "Akses Ditolak (WS): Klaim token tidak valid.",
				})
			}

			role, _ := claims["role"].(string)
			if strings.ToUpper(strings.TrimSpace(role)) != "ADMIN" {
				return c.Status(403).JSON(fiber.Map{
					"error": "Akses Ditolak (WS): WebSocket Monitor hanya untuk ADMIN.",
				})
			}

			c.Locals("allowed", true)
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})

	globalLimiter := limiter.New(limiter.Config{
		Max:        60,
		Expiration: 1 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(429).JSON(fiber.Map{
				"error": "Rate limit exceeded. Silakan coba sesaat lagi.",
			})
		},
	})

	loginLimiter := limiter.New(limiter.Config{
		Max:        5,
		Expiration: 1 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(429).JSON(fiber.Map{
				"error": "Terlalu banyak percobaan login. Coba lagi dalam 1 menit.",
			})
		},
	})

	ticketLimiter := limiter.New(limiter.Config{
		Max:        3,
		Expiration: 5 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(429).JSON(fiber.Map{
				"error": "Batas pengiriman tiket tercapai. Coba lagi dalam 5 menit.",
			})
		},
	})

	app.Get("/api/ws/monitor", websocket.New(handlers.WSMonitor))

	api := app.Group("/api", globalLimiter)

	// Public Routes
	api.Get("/health", handlers.HealthCheck)
	api.Post("/auth/login", loginLimiter, middleware.BotProtection(), handlers.Login)
	api.Post("/auth/register", loginLimiter, middleware.BotProtection(), handlers.Register)
	api.Post("/auth/verify-code", loginLimiter, middleware.BotProtection(), handlers.VerifyEmailCode)
	api.Post("/auth/resend-code", loginLimiter, middleware.BotProtection(), handlers.ResendVerificationCode)
	api.Get("/indices", handlers.GetIndices)
	api.Get("/stocks", handlers.GetStocks)
	api.Get("/stock/:ticker", handlers.GetStockDetail)
	api.Get("/forecast/:ticker", handlers.GetForecast)
	api.Get("/target/:ticker", handlers.GetTarget)
	api.Get("/keylevels/:ticker", handlers.GetKeyLevels)
	api.Get("/sentiment/:ticker", handlers.GetSentiment)
	api.Get("/synthesis/:ticker", handlers.GetStockSynthesis)
	api.Get("/stock/:ticker/synthesis", handlers.GetStockSynthesis)
	api.Post("/stock/:ticker/synthesis/refresh", handlers.RefreshStockSynthesis)
	api.Get("/ranking/highlights", handlers.GetRankingHighlights)
	api.Get("/evaluations", handlers.GetEvaluations)
	api.Get("/news", handlers.GetNews)
	api.Get("/stocks/:ticker/news", handlers.GetNews)
	api.Post("/tickets", ticketLimiter, handlers.CreateSupportTicket)

	// AI & Genesis Model Routes
	api.Get("/ai/status", handlers.GetAIStatus)
	api.Post("/ai/generate", handlers.GenerateAIResponse)
	api.Get("/genesis/summary", handlers.GetGenesisSummary)
	api.Get("/genesis/release", handlers.GetGenesisRelease)
	api.Get("/genesis/metrics", handlers.GetGenesisMetrics)
	api.Get("/genesis/config", handlers.GetGenesisConfig)

	// Automated Sync Routes (Protected by X-Sync-Key)
	api.Post("/sync/market", handlers.SyncMarketData)
	api.Post("/sync/news", handlers.SyncNews)
	api.Post("/sync/forecast", handlers.SyncForecast)

	// User Routes
	protected := api.Group("", middleware.Protected())
	protected.Get("/auth/me", handlers.GetMe)
	protected.Get("/watchlist", handlers.GetWatchlist)
	protected.Post("/watchlist/toggle", handlers.ToggleWatchlist)
	protected.Get("/settings", handlers.GetUserSettings)
	protected.Post("/settings", handlers.SaveUserSettings)
	protected.Get("/sessions", handlers.GetDeviceSessions)
	protected.Delete("/sessions/:id", handlers.RevokeDeviceSession)
	protected.Get("/notifications", handlers.GetNotifications)
	protected.Post("/notifications/test", handlers.SendTestNotification)
	protected.Put("/notifications/read-all", handlers.MarkAllNotificationsRead)
	protected.Put("/notifications/:id/toggle-read", handlers.ToggleNotificationRead)
	protected.Delete("/notifications", handlers.ClearNotifications)

	// Admin Routes
	admin := protected.Group("/admin", middleware.AdminOnly())
	admin.Get("/users", handlers.GetUsersByAdmin)
	admin.Post("/users", handlers.CreateUserByAdmin)
	admin.Put("/users/:id", handlers.UpdateUserDetailsByAdmin)
	admin.Put("/users/:id/role", handlers.UpdateUserRoleByAdmin)
	admin.Put("/users/:id/status", handlers.ToggleUserStatusByAdmin)
	admin.Delete("/users/:id", handlers.DeleteUserByAdmin)
	admin.Get("/traffic", handlers.GetTrafficStatsHTTP)
	admin.Get("/activity-logs", handlers.GetActivityLogsByAdmin)
	admin.Post("/genesis/reload", handlers.ReloadGenesis)
	admin.Get("/genesis/token", handlers.GetDynamicGenesisToken)

	// Static SPA Fallback
	if _, err := os.Stat("./public"); err == nil {
		app.Static("/", "./public", fiber.Static{
			Compress: true,
		})
		app.Use(func(c *fiber.Ctx) error {
			if !strings.HasPrefix(c.Path(), "/api") {
				return c.SendFile("./public/index.html")
			}
			return c.Next()
		})
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "5000"
	}

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	go func() {
		log.Printf("Server aktif di port %s", port)
		if err := app.Listen("0.0.0.0:" + port); err != nil {
			log.Printf("Server stopped: %v", err)
		}
	}()

	<-stop
	log.Println("Shutting down server...")
	_ = app.Shutdown()
	log.Println("Server stopped.")
}
