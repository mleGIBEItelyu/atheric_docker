package middleware

import (
	"log"
	"regexp"
	"strings"

	"atheric-be/services"

	"github.com/gofiber/fiber/v2"
)

// Suspicious bot & vulnerability scanner signatures
var suspiciousBotAgents = []string{
	"sqlmap", "nikto", "nmap", "masscan", "dirbuster", "gobuster", "wpscan",
	"ffuf", "hydra", "metasploit", "zgrab", "censys", "shodan", "acunetix",
	"qualys", "openvas", "burpsuite", "libwww-perl", "python-urllib", "scrapy",
	"headlesschrome", "phantomjs", "selenium",
}

// Attack patterns: SQLi, Path Traversal, Command Injection, XSS
var (
	sqliRegex    = regexp.MustCompile(`(?i)(union\s+select|select\s+.*\s+from|insert\s+into|drop\s+table|delete\s+from|update\s+.*\s+set|exec(\s|\+)+(s|x)p|--|/\*|\*/|;\s*drop|or\s+1\s*=\s*1|or\s+'1'\s*=\s*'1')`)
	xssRegex     = regexp.MustCompile(`(?i)(<script|javascript:|onerror\s*=|onload\s*=|alert\(|<iframe|eval\(|document\.cookie)`)
	pathTravRegex = regexp.MustCompile(`(\.\./|\.\.\\|%2e%2e%2f|%2e%2e\/)`)
	cmdInjRegex  = regexp.MustCompile(`(?i)(;\s*(cat|ls|rm|wget|curl|chmod|bash|sh|powershell|cmd\.exe)\s|\|\s*(cat|ls|rm|wget|curl|chmod|bash|sh))`)
)

// BotProtection detects automated vulnerability scanners and bot scrapers
func BotProtection() fiber.Handler {
	return func(c *fiber.Ctx) error {
		userAgent := strings.ToLower(c.Get("User-Agent"))

		// Block empty user agent on mutating methods
		if userAgent == "" && (c.Method() == "POST" || c.Method() == "PUT" || c.Method() == "DELETE") {
			services.GlobalMonitor.RecordBotAttempt()
			return c.Status(403).JSON(fiber.Map{
				"error": "Akses ditolak: User-Agent wajib disertakan.",
			})
		}

		// Check User-Agent against automated vulnerability tools
		for _, bot := range suspiciousBotAgents {
			if strings.Contains(userAgent, bot) {
				realIP := services.GetRealClientIP(c)
				log.Printf("[SECURITY WAF] Blocked scanner tool: IP=%s | Tool=%s | Path=%s", realIP, bot, c.Path())
				services.GlobalMonitor.RecordBotAttempt()
				return c.Status(403).JSON(fiber.Map{
					"error": "Akses ditolak: Pola scanner atau bot otomatis terdeteksi.",
				})
			}
		}

		// Honeypot check for spam bots
		if c.Method() == "POST" || c.Method() == "PUT" {
			type HoneypotReq struct {
				HpWebsite string `json:"hp_website"`
			}
			var hp HoneypotReq
			if err := c.BodyParser(&hp); err == nil && strings.TrimSpace(hp.HpWebsite) != "" {
				services.GlobalMonitor.RecordBotAttempt()
				return c.Status(403).JSON(fiber.Map{
					"error": "Bot spam terdeteksi melalui bidang honeypot.",
				})
			}
		}

		return c.Next()
	}
}

// WAFSanitizer provides active Web Application Firewall inspection for SQLi, XSS, Path Traversal, and Command Injection
func WAFSanitizer() fiber.Handler {
	return func(c *fiber.Ctx) error {
		rawURI := c.OriginalURL()

		// 1. Inspect URI & Query Parameters
		if sqliRegex.MatchString(rawURI) || xssRegex.MatchString(rawURI) || pathTravRegex.MatchString(rawURI) || cmdInjRegex.MatchString(rawURI) {
			realIP := services.GetRealClientIP(c)
			log.Printf("[SECURITY WAF] Malicious payload blocked in URL: IP=%s | URL=%s", realIP, rawURI)
			services.GlobalMonitor.RecordBotAttempt()
			return c.Status(400).JSON(fiber.Map{
				"error": "Permintaan diblokir oleh WAF: Karakter atau pola tidak aman terdeteksi.",
			})
		}

		// 2. Inspect Body for non-binary requests
		if c.Method() == "POST" || c.Method() == "PUT" {
			contentType := c.Get("Content-Type")
			if strings.Contains(contentType, "application/json") || strings.Contains(contentType, "application/x-www-form-urlencoded") {
				body := string(c.Body())
				if len(body) > 0 {
					if sqliRegex.MatchString(body) || xssRegex.MatchString(body) || pathTravRegex.MatchString(body) || cmdInjRegex.MatchString(body) {
						realIP := services.GetRealClientIP(c)
						log.Printf("[SECURITY WAF] Malicious payload blocked in Body: IP=%s | Path=%s", realIP, c.Path())
						services.GlobalMonitor.RecordBotAttempt()
						return c.Status(400).JSON(fiber.Map{
							"error": "Permintaan diblokir oleh WAF: Karakter atau muatan berbahaya terdeteksi dalam data.",
						})
					}
				}
			}
		}

		return c.Next()
	}
}
