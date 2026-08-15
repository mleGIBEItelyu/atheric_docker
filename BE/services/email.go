package services

import (
	"bytes"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/big"
	"net/http"
	"os"
	"strings"
	"time"
)

// GenerateOTP generates a cryptographically random 6-digit verification code string
func GenerateOTP() string {
	nBig, err := rand.Int(rand.Reader, big.NewInt(900000))
	if err != nil {
		return "849201"
	}
	return fmt.Sprintf("%06d", nBig.Int64()+100000)
}

type ResendEmailPayload struct {
	From    string   `json:"from"`
	To      []string `json:"to"`
	Subject string   `json:"subject"`
	Html    string   `json:"html"`
	Text    string   `json:"text"`
}

// sendViaResendAPI sends email directly via Resend REST API (https://api.resend.com/emails)
func sendViaResendAPI(apiKey, fromEmail, toEmail, subject, htmlBody, plainBody string) error {
	if fromEmail == "" {
		fromEmail = "Atheric AI <onboarding@resend.dev>"
	}

	payload := ResendEmailPayload{
		From:    fromEmail,
		To:      []string{toEmail},
		Subject: subject,
		Html:    htmlBody,
		Text:    plainBody,
	}

	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequest("POST", "https://api.resend.com/emails", bytes.NewBuffer(bodyBytes))
	if err != nil {
		return err
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("[RESEND API ERROR] Failed to send email to %s: %v", toEmail, err)
		return err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		log.Printf("[RESEND API SUCCESS] OTP email sent successfully to %s! Response: %s", toEmail, string(respBody))
		return nil
	}

	log.Printf("[RESEND API FAILED] Status: %d | Response: %s", resp.StatusCode, string(respBody))
	return fmt.Errorf("resend API error (%d): %s", resp.StatusCode, string(respBody))
}

// SendVerificationEmail sends the 6-digit verification code using Resend REST API
func SendVerificationEmail(toEmail string, code string) error {
	resendKey := strings.TrimSpace(os.Getenv("RESEND_API_KEY"))
	fromEmail := strings.TrimSpace(os.Getenv("RESEND_FROM_EMAIL"))
	if fromEmail == "" {
		fromEmail = strings.TrimSpace(os.Getenv("SMTP_FROM"))
	}
	if fromEmail == "" {
		fromEmail = "Atheric AI <onboarding@resend.dev>"
	}

	subject := fmt.Sprintf("Kode Verifikasi Akun Atheric AI: %s", code)

	// Plain text version (Essential for Anti-Spam Filter score)
	plainBody := fmt.Sprintf(`Halo,

Kode verifikasi pendaftaran akun Atheric AI Anda adalah: %s

Kode ini berlaku selama 15 menit. Silakan masukkan kode di atas pada halaman verifikasi untuk menyelesaikan pendaftaran akun Anda.

Jika Anda tidak merasa melakukan pendaftaran di Atheric AI, harap abaikan pesan email ini. Demi keamanan, jangan pernah berikan kode ini kepada siapa pun.

Hormat kami,
Tim Keamanan Atheric AI
https://atheric.ai
`, code)

	// High-Fidelity HTML Email Template
	htmlBody := fmt.Sprintf(`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kode Verifikasi Atheric AI</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0e14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e7eaf1;">
  <table role="presentation" width="100%%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0b0e14; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #161b26; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.08); overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 28px 32px; background: linear-gradient(135deg, rgba(59, 110, 246, 0.12), rgba(15, 23, 42, 0.6)); border-bottom: 1px solid rgba(255, 255, 255, 0.06); text-align: left;">
              <table role="presentation" width="100%%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="font-size: 20px; font-weight: 800; color: #3b6ef6; letter-spacing: -0.5px;">Atheric AI</span>
                    <span style="display: block; font-size: 11px; color: #8a93a6; font-weight: 600; margin-top: 2px; text-transform: uppercase; letter-spacing: 1px;">Platform Analisis Finansial</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 32px; text-align: left;">
              <h1 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #ffffff;">Verifikasi Alamat Email Anda</h1>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #8a93a6;">
                Terima kasih telah mendaftar di <strong>Atheric AI</strong>. Gunakan kode verifikasi 6 digit di bawah ini untuk menyelesaikan autentikasi akun Anda:
              </p>

              <!-- Prominent OTP Code Box -->
              <table role="presentation" width="100%%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center" style="padding: 20px; background-color: rgba(59, 110, 246, 0.08); border: 1.5px dashed #3b6ef6; border-radius: 10px;">
                    <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; color: #3b6ef6; letter-spacing: 12px; display: inline-block; padding-left: 12px;">%s</span>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 20px 0; font-size: 13px; color: #8a93a6; line-height: 1.5;">
                ⏱️ Kode ini hanya berlaku selama <strong>15 Menit</strong>.
              </p>

              <!-- Security Disclaimer Box -->
              <table role="presentation" width="100%%" border="0" cellspacing="0" cellpadding="0" style="background-color: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 14px 16px; font-size: 12.5px; color: #8a93a6; line-height: 1.5;">
                    <strong style="color: #e7eaf1;">🔒 Peringatan Keamanan:</strong> Jangan berikan kode OTP ini kepada siapa pun, termasuk pihak yang mengaku dari tim Atheric AI. Kami tidak pernah meminta kode verifikasi Anda.
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 13px; color: #64748b;">
                Jika Anda tidak merasa meminta verifikasi ini, Anda dapat mengabaikan email ini dengan aman.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #0f172a; border-top: 1px solid rgba(255, 255, 255, 0.06); text-align: center; font-size: 11.5px; color: #64748b;">
              &copy; 2026 Atheric AI. All rights reserved. &bull; Automated Security Service
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`, code)

	// Always output to dev log
	log.Printf("[EMAIL VERIFICATION OTP] Target: %s | Code: %s", toEmail, code)

	// Send via Resend REST API
	if resendKey != "" {
		log.Printf("[RESEND EMAIL] Sending email via Resend REST API to %s...", toEmail)
		return sendViaResendAPI(resendKey, fromEmail, toEmail, subject, htmlBody, plainBody)
	}

	// Dev mode fallback if RESEND_API_KEY is not configured
	log.Println("[DEV MODE] RESEND_API_KEY is not configured. OTP printed above.")
	return nil
}
