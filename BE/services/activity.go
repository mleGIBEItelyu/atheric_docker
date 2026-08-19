package services

import (
	"log"
	"strings"
	"time"

	"atheric-be/database"
	"atheric-be/models"

	"github.com/gofiber/fiber/v2"
)

// GetRealClientIP extracts the real visitor client IP address supporting Cloudflare, Nginx, X-Forwarded-For, X-Real-IP for production
func GetRealClientIP(c *fiber.Ctx) string {
	if c == nil {
		return "127.0.0.1"
	}

	// 1. Cloudflare header
	if cfIP := strings.TrimSpace(c.Get("CF-Connecting-IP")); cfIP != "" {
		return cfIP
	}

	// 2. True-Client-IP / Fastly-Client-IP
	if trueIP := strings.TrimSpace(c.Get("True-Client-IP")); trueIP != "" {
		return trueIP
	}
	if fastlyIP := strings.TrimSpace(c.Get("Fastly-Client-IP")); fastlyIP != "" {
		return fastlyIP
	}

	// 3. X-Real-IP header (Nginx / Reverse Proxies)
	if realIP := strings.TrimSpace(c.Get("X-Real-IP")); realIP != "" {
		return realIP
	}

	// 4. X-Client-IP
	if clientIP := strings.TrimSpace(c.Get("X-Client-IP")); clientIP != "" {
		return clientIP
	}

	// 5. X-Forwarded-For header (Comma-separated client IPs: first non-private IP or first IP is original client)
	if xff := strings.TrimSpace(c.Get("X-Forwarded-For")); xff != "" {
		parts := strings.Split(xff, ",")
		for _, p := range parts {
			cleanP := strings.TrimSpace(p)
			if cleanP != "" && !IsPrivateIP(cleanP) {
				return cleanP
			}
		}
		if len(parts) > 0 {
			ip := strings.TrimSpace(parts[0])
			if ip != "" {
				return ip
			}
		}
	}

	// 6. Fallback to direct connection IP
	ip := c.IP()
	if ip == "" || ip == "::1" {
		return "127.0.0.1"
	}
	return ip
}

// RecordActivity records a user action to the activity_logs database table synchronously & safely with real client IP
func RecordActivity(c *fiber.Ctx, userID uint, username, role, action, details string) {
	ip := GetRealClientIP(c)
	ua := ""
	if c != nil {
		ua = c.Get("User-Agent")
		if len(ua) > 512 {
			ua = ua[:512]
		}
	}

	logEntry := models.ActivityLog{
		UserID:    userID,
		Username:  username,
		Role:      role,
		Action:    action,
		Details:   details,
		IP:        ip,
		UserAgent: ua,
		CreatedAt: time.Now(),
	}

	if database.DB != nil {
		if err := database.DB.Create(&logEntry).Error; err != nil {
			log.Printf("[ACTIVITY LOG ERROR] Failed to record log: %v", err)
		} else {
			log.Printf("[ACTIVITY LOG RECORDED] %s | User: %s | IP: %s | Details: %s", action, username, ip, details)
		}
	}
}
