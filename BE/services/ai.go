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

	primaryModel := os.Getenv("GEMINI_MODEL")
	if primaryModel == "" || primaryModel == "gemini-2.0-flash" {
		primaryModel = "gemini-flash-latest"
	}

	modelCandidates := []string{primaryModel, "gemini-flash-latest", "gemini-3.6-flash", "gemini-3.7-flash"}
	var lastErr error

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

	for _, model := range modelCandidates {
		url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", model, apiKey)
		resp, err := client.Post(url, "application/json", bytes.NewBuffer(jsonData))
		if err != nil {
			lastErr = fmt.Errorf("failed to connect to Gemini API (%s): %w", model, err)
			continue
		}

		bodyBytes, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			lastErr = fmt.Errorf("failed to read response body (%s): %w", model, err)
			continue
		}

		if resp.StatusCode != http.StatusOK {
			lastErr = fmt.Errorf("Gemini API error %d (%s): %s", resp.StatusCode, model, string(bodyBytes))
			continue
		}

		var geminiResp GeminiAPIResponse
		if err := json.Unmarshal(bodyBytes, &geminiResp); err != nil {
			lastErr = fmt.Errorf("failed to parse Gemini response (%s): %w", model, err)
			continue
		}

		if geminiResp.Error != nil {
			lastErr = fmt.Errorf("Gemini API error (%s): %s", model, geminiResp.Error.Message)
			continue
		}

		if len(geminiResp.Candidates) > 0 && len(geminiResp.Candidates[0].Content.Parts) > 0 {
			return geminiResp.Candidates[0].Content.Parts[0].Text, nil
		}
	}

	if lastErr != nil {
		return "", lastErr
	}
	return "", errors.New("Gemini tidak mengembalikan respons teks")
}
