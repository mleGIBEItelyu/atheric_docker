package middleware

import (
	"log"
	"strings"

	"atheric-be/services"

	"github.com/gofiber/fiber/v2"
)

// Known bad bot user agent keywords
var suspiciousBotAgents = []string{
	"python-requests", "curl/", "wget/", "go-http-client", "postmanruntime",
	"headlesschrome", "phantomjs", "selenium", "sqlmap", "nikto", "nmap",
	"burpsuite", "libwww-perl", "python-urllib", "scrapy",
}

// BotProtection middleware detects automated bots, spam tools, and honeypot traps
func BotProtection() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Only check POST/PUT/DELETE requests for public auth routes
		if c.Method() == "POST" || c.Method() == "PUT" {
			userAgent := strings.ToLower(c.Get("User-Agent"))

			// 1. Check User-Agent header for automated scraping tools
			for _, bot := range suspiciousBotAgents {
				if strings.Contains(userAgent, bot) {
					realIP := services.GetRealClientIP(c)
					log.Printf("[BOT BLOCKED] IP: %s | UA: %s | Path: %s | Reason: Automated bot tool signature", realIP, c.Get("User-Agent"), c.Path())
					services.GlobalMonitor.RecordBotAttempt()
					return c.Status(403).JSON(fiber.Map{
						"error": "Akses ditolak. Perilaku bot atau skrip otomatis terdeteksi.",
					})
				}
			}

			// 2. Honeypot check if form body contains hidden 'hp_website' field filled by automated bots
			type HoneypotReq struct {
				HpWebsite string `json:"hp_website"`
			}
			var hp HoneypotReq
			if err := c.BodyParser(&hp); err == nil && strings.TrimSpace(hp.HpWebsite) != "" {
				log.Printf("[BOT HONEYPOT TRAPPED] IP: %s | Path: %s | Value: %s", c.IP(), c.Path(), hp.HpWebsite)
				services.GlobalMonitor.RecordBotAttempt()
				return c.Status(403).JSON(fiber.Map{
					"error": "Bot spam terdeteksi melalui bidang jebakan honeypot.",
				})
			}
		}

		return c.Next()
	}
}
