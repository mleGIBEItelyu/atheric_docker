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

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/websocket/v2"
	"github.com/golang-jwt/jwt/v5"
)

// loadEnvFile reads a .env file and sets environment variables for Go backend
func loadEnvFile(filename string) {
	data, err := os.ReadFile(filename)
	if err != nil {
		return // .env optional or not found
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
	log.Printf("[ENV] Loaded environment variables from %s", filename)
}

func main() {
	// Auto-load .env or .env.local configuration file if present
	loadEnvFile(".env")
	loadEnvFile(".env.local")

	// Initialize SQLite Database & Seeding
	database.InitDB()

	// Configure Fiber with strict Payload Limits (Anti-Payload Bombing via Burp Suite)
	app := fiber.New(fiber.Config{
		AppName:               "Atheric AI Financial API",
		BodyLimit:             2 * 1024 * 1024, // Max 2MB request body (Prevents memory exhaustion attacks)
		ReadTimeout:           15 * time.Second,
		WriteTimeout:          15 * time.Second,
		IdleTimeout:           60 * time.Second,
		DisableStartupMessage: false,
	})

	// Panic Recovery Middleware (Prevents server crash on unhandled panics)
	app.Use(recover.New(recover.Config{
		EnableStackTrace: true,
	}))

	// Enterprise Security Headers Middleware (OWASP Defense)
	app.Use(func(c *fiber.Ctx) error {
		c.Set("X-Content-Type-Options", "nosniff")
		c.Set("X-Frame-Options", "SAMEORIGIN")
		c.Set("X-XSS-Protection", "1; mode=block")
		c.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Set("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
		return c.Next()
	})

	// Logger & Traffic Metrics Middleware
	app.Use(logger.New())
	app.Use(middleware.TrafficLogger())

	// CORS Middleware - Configurable via ALLOWED_ORIGINS
	allowedOrigins := os.Getenv("ALLOWED_ORIGINS")
	if allowedOrigins == "" || allowedOrigins == "*" {
		log.Println("[CORS NOTICE] ALLOWED_ORIGINS wildcard or empty detected, defaulting to local dev domains for security")
		allowedOrigins = "http://localhost:5173, http://localhost:3000, http://127.0.0.1:5173"
	}

	app.Use(cors.New(cors.Config{
		AllowOrigins: allowedOrigins,
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
		AllowMethods: "GET, POST, PUT, DELETE, OPTIONS",
	}))

	// WebSocket Upgrade Check & Auth Middleware for Admin Traffic Monitoring
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

	// --- Anti-Spam / Anti-Burp Suite Rate Limiters ---

	// 1. Global API Limiter: Max 60 requests per 1 minute per IP (Protects all endpoints from DoS/scraping)
	globalLimiter := limiter.New(limiter.Config{
		Max:        60,
		Expiration: 1 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(429).JSON(fiber.Map{
				"error": "Global rate limit exceeded. Please slow down your requests.",
			})
		},
	})

	// 2. Login Limiter: Max 5 attempts per 1 minute per IP (Anti-Brute Force / Credential Stuffing)
	loginLimiter := limiter.New(limiter.Config{
		Max:        5,
		Expiration: 1 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(429).JSON(fiber.Map{
				"error": "Too many login attempts. Please try again after 1 minute.",
			})
		},
	})

	// 3. Ticket Spam Limiter: Max 3 support tickets per 5 minutes per IP (Anti-DB Flooding)
	ticketLimiter := limiter.New(limiter.Config{
		Max:        3,
		Expiration: 5 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(429).JSON(fiber.Map{
				"error": "Support ticket submission limit reached. Please wait 5 minutes before submitting another ticket.",
			})
		},
	})

	// WebSocket Monitor Route
	app.Get("/api/ws/monitor", websocket.New(handlers.WSMonitor))

	// API Route Group (Protected by Global Rate Limiter)
	api := app.Group("/api", globalLimiter)

	// --- Public Routes ---
	api.Get("/health", handlers.HealthCheck)
	api.Post("/auth/login", loginLimiter, middleware.BotProtection(), handlers.Login)                 // Strict Anti-Brute Force & Bot Protection
	api.Post("/auth/register", loginLimiter, middleware.BotProtection(), handlers.Register)           // Self-registration & Bot Protection
	api.Post("/auth/verify-code", loginLimiter, middleware.BotProtection(), handlers.VerifyEmailCode)  // OTP Verification
	api.Post("/auth/resend-code", loginLimiter, middleware.BotProtection(), handlers.ResendVerificationCode)
	api.Get("/indices", handlers.GetIndices)
	api.Get("/stocks", handlers.GetStocks)
	api.Get("/stock/:ticker", handlers.GetStockDetail)
	api.Get("/forecast/:ticker", handlers.GetForecast)
	api.Get("/target/:ticker", handlers.GetTarget)
	api.Get("/keylevels/:ticker", handlers.GetKeyLevels)
	api.Get("/sentiment/:ticker", handlers.GetSentiment)
	api.Get("/synthesis/:ticker", handlers.GetSynthesis)
	api.Get("/ranking/highlights", handlers.GetRankingHighlights)
	api.Get("/evaluations", handlers.GetEvaluations)
	api.Get("/news", handlers.GetNews)
	api.Get("/stocks/:ticker/news", handlers.GetNews)
	api.Post("/tickets", ticketLimiter, handlers.CreateSupportTicket) // Strict Anti-Spam (3 req/5min)

	// --- AI Generation Proxy Routes ---
	api.Get("/ai/status", handlers.GetAIStatus)
	api.Post("/ai/generate", handlers.GenerateAIResponse)

	// --- Protected User Routes (Requires JWT Token) ---
	protected := api.Group("", middleware.Protected())
	protected.Get("/auth/me", handlers.GetMe)
	protected.Get("/watchlist", handlers.GetWatchlist)
	protected.Post("/watchlist/toggle", handlers.ToggleWatchlist)
	protected.Get("/settings", handlers.GetUserSettings)
	protected.Post("/settings", handlers.SaveUserSettings)
	protected.Get("/sessions", handlers.GetDeviceSessions)
	protected.Delete("/sessions/:id", handlers.RevokeDeviceSession)

	// --- Protected Admin Routes (Requires Admin Role) ---
	admin := protected.Group("/admin", middleware.AdminOnly())
	admin.Get("/users", handlers.GetUsersByAdmin)
	admin.Post("/users", handlers.CreateUserByAdmin)
	admin.Put("/users/:id", handlers.UpdateUserDetailsByAdmin)
	admin.Put("/users/:id/role", handlers.UpdateUserRoleByAdmin)
	admin.Put("/users/:id/status", handlers.ToggleUserStatusByAdmin)
	admin.Delete("/users/:id", handlers.DeleteUserByAdmin)
	admin.Get("/traffic", handlers.GetTrafficStatsHTTP)
	admin.Get("/activity-logs", handlers.GetActivityLogsByAdmin)

	// --- Serve Frontend Static Files & SPA Fallback ---
	if _, err := os.Stat("./public"); err == nil {
		log.Println("Serving Frontend static files from ./public directory")
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

	// Graceful Shutdown Channel
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	go func() {
		log.Printf("Starting Atheric AI Go Backend server on port %s...", port)
		if err := app.Listen(":" + port); err != nil {
			log.Printf("Server stopped: %v", err)
		}
	}()

	<-stop
	log.Println("Gracefully shutting down Atheric AI server...")
	_ = app.Shutdown()
	log.Println("Server gracefully stopped.")
}

