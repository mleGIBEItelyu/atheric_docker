package middleware

import (
	"crypto/rand"
	"log"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"atheric-be/services"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

var (
	fallbackSecret     []byte
	fallbackSecretOnce sync.Once
)

func GetJWTSecret() []byte {
	secret := os.Getenv("JWT_SECRET")
	if secret != "" {
		return []byte(secret)
	}
	fallbackSecretOnce.Do(func() {
		log.Println("SECURITY CRITICAL: JWT_SECRET environment variable is not set! Generating random ephemeral key for session security.")
		fallbackSecret = make([]byte, 32)
		if _, err := rand.Read(fallbackSecret); err != nil {
			fallbackSecret = []byte("atheric_ai_ephemeral_fallback_key_" + strconv.FormatInt(time.Now().UnixNano(), 10))
		}
	})
	return fallbackSecret
}

// TrafficLogger middleware records HTTP request metrics into GlobalMonitor
func TrafficLogger() fiber.Handler {
	return func(c *fiber.Ctx) error {
		start := time.Now()
		err := c.Next()
		duration := time.Since(start).Seconds() * 1000 // ms
		status := c.Response().StatusCode()
		if err != nil {
			if e, ok := err.(*fiber.Error); ok {
				status = e.Code
			} else {
				status = 500
			}
		}
		services.GlobalMonitor.RecordRequest(c.Method(), c.Path(), status, c.IP(), duration)
		return err
	}
}

// Protected middleware checks for valid Bearer JWT token
func Protected() fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")

		if authHeader == "" || authHeader == "Bearer null" || authHeader == "Bearer undefined" {
			return c.Status(401).JSON(fiber.Map{
				"error": "Akses ditolak: Token autentikasi tidak ditemukan. Harap login terlebih dahulu.",
			})
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			return c.Status(401).JSON(fiber.Map{
				"error": "Akses ditolak: Format token autentikasi tidak valid.",
			})
		}

		tokenString := parts[1]
		token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fiber.NewError(401, "Unexpected signing method")
			}
			return GetJWTSecret(), nil
		})

		if err != nil || !token.Valid {
			return c.Status(401).JSON(fiber.Map{
				"error": "Akses ditolak: Token autentikasi telah kadaluarsa atau tidak valid. Harap login ulang.",
			})
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			return c.Status(401).JSON(fiber.Map{
				"error": "Akses ditolak: Klaim token tidak valid.",
			})
		}

		if userIdFloat, ok := claims["user_id"].(float64); ok {
			c.Locals("user_id", uint(userIdFloat))
		} else {
			return c.Status(401).JSON(fiber.Map{
				"error": "Akses ditolak: User ID tidak ditemukan dalam token.",
			})
		}

		if username, ok := claims["username"].(string); ok {
			c.Locals("username", username)
		} else {
			c.Locals("username", "user")
		}

		if r, hasRole := claims["role"].(string); hasRole {
			c.Locals("role", r)
		} else {
			c.Locals("role", "USER")
		}

		return c.Next()
	}
}

// AdminOnly middleware enforces strict Role-Based Access Control (RBAC) for ADMIN role only
func AdminOnly() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Check if request is authenticated
		tokenStr := strings.TrimPrefix(c.Get("Authorization"), "Bearer ")
		if tokenStr == "" || tokenStr == "null" || tokenStr == "undefined" {
			return c.Status(401).JSON(fiber.Map{
				"error": "Akses Ditolak (RBAC): Token autentikasi tidak ditemukan. Harap login terlebih dahulu.",
			})
		}

		token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fiber.NewError(401, "Unexpected signing method")
			}
			return GetJWTSecret(), nil
		})

		if err != nil || !token.Valid {
			return c.Status(401).JSON(fiber.Map{
				"error": "Sesi autentikasi telah kadaluarsa atau tidak valid. Harap login ulang.",
			})
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			return c.Status(401).JSON(fiber.Map{
				"error": "Klaim token tidak valid.",
			})
		}

		role, _ := claims["role"].(string)
		if strings.ToUpper(strings.TrimSpace(role)) != "ADMIN" {
			return c.Status(403).JSON(fiber.Map{
				"error": "Akses Ditolak (RBAC): Portal Admin hanya dapat diakses oleh akun dengan Hak Akses ADMIN.",
			})
		}

		return c.Next()
	}
}
