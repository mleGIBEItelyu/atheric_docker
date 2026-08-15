package services

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

type GeminiPart struct {
	Text string `json:"text"`
}

type GeminiContent struct {
	Role  string       `json:"role"`
	Parts []GeminiPart `json:"parts"`
}

type GeminiSystemInstruction struct {
	Parts []GeminiPart `json:"parts"`
}

type GeminiGenConfig struct {
	Temperature     float64 `json:"temperature,omitempty"`
	MaxOutputTokens int     `json:"maxOutputTokens,omitempty"`
}

type GeminiAPIRequest struct {
	SystemInstruction *GeminiSystemInstruction `json:"systemInstruction,omitempty"`
	Contents          []GeminiContent          `json:"contents"`
	GenerationConfig  *GeminiGenConfig         `json:"generationConfig,omitempty"`
}

type GeminiCandidate struct {
	Content struct {
		Parts []GeminiPart `json:"parts"`
	} `json:"content"`
}

type GeminiAPIResponse struct {
	Candidates []GeminiCandidate `json:"candidates"`
	Error      *struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

// CallGeminiAPI handles server-side communication with Google Gemini AI API
func CallGeminiAPI(contents []GeminiContent, systemPrompt string, temp float64, maxTokens int) (string, error) {
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		return "", errors.New("GEMINI_API_KEY belum dikonfigurasi di server Backend (.env)")
	}

	model := os.Getenv("GEMINI_MODEL")
	if model == "" {
		model = "gemini-2.0-flash"
	}

	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", model, apiKey)

	reqBody := GeminiAPIRequest{
		Contents: contents,
		GenerationConfig: &GeminiGenConfig{
			Temperature:     temp,
			MaxOutputTokens: maxTokens,
		},
	}

	if systemPrompt != "" {
		reqBody.SystemInstruction = &GeminiSystemInstruction{
			Parts: []GeminiPart{{Text: systemPrompt}},
		}
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("failed to connect to Gemini API: %w", err)
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response body: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("Gemini API error %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var geminiResp GeminiAPIResponse
	if err := json.Unmarshal(bodyBytes, &geminiResp); err != nil {
		return "", fmt.Errorf("failed to parse Gemini response: %w", err)
	}

	if geminiResp.Error != nil {
		return "", fmt.Errorf("Gemini API error: %s", geminiResp.Error.Message)
	}

	if len(geminiResp.Candidates) > 0 && len(geminiResp.Candidates[0].Content.Parts) > 0 {
		return geminiResp.Candidates[0].Content.Parts[0].Text, nil
	}

	return "", errors.New("Gemini tidak mengembalikan respons teks")
}
