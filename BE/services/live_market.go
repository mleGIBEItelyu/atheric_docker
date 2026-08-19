package services

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"atheric-be/models"
)

type liveQuoteCache struct {
	price     float64
	change    float64
	changePct float64
	volume    int64
	updatedAt time.Time
}

var (
	quoteMu    sync.RWMutex
	quoteStore = make(map[string]liveQuoteCache)
	httpClient = &http.Client{Timeout: 2 * time.Second}
)

type YahooChartResponse struct {
	Chart struct {
		Result []struct {
			Meta struct {
				RegularMarketPrice float64 `json:"regularMarketPrice"`
				ChartPreviousClose float64 `json:"chartPreviousClose"`
				PreviousClose      float64 `json:"previousClose"`
				RegularMarketTime  int64   `json:"regularMarketTime"`
				RegularMarketDayHigh float64 `json:"regularMarketDayHigh"`
				RegularMarketDayLow  float64 `json:"regularMarketDayLow"`
				RegularMarketVolume  int64   `json:"regularMarketVolume"`
			} `json:"meta"`
		} `json:"result"`
		Error interface{} `json:"error"`
	} `json:"chart"`
}

// FetchLiveStockQuote fetches real-time market data from Yahoo Finance with 15s in-memory caching
func FetchLiveStockQuote(ticker string, stock *models.Stock) bool {
	cleanTicker := strings.ToUpper(strings.TrimSuffix(strings.TrimSpace(ticker), ".JK"))
	if cleanTicker == "" {
		return false
	}

	// 1. Check in-memory cache (valid for 15 seconds)
	quoteMu.RLock()
	cached, found := quoteStore[cleanTicker]
	quoteMu.RUnlock()

	if found && time.Since(cached.updatedAt) < 15*time.Second {
		stock.Price = cached.price
		stock.Change = cached.change
		stock.ChangePercent = cached.changePct
		return true
	}

	// 2. Fetch live from Yahoo Finance API
	url := fmt.Sprintf("https://query1.finance.yahoo.com/v8/finance/chart/%s.JK?interval=1d&range=1d", cleanTicker)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return false
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")

	resp, err := httpClient.Do(req)
	if err != nil || resp.StatusCode != http.StatusOK {
		if resp != nil {
			resp.Body.Close()
		}
		return false
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return false
	}

	var chartData YahooChartResponse
	if err := json.Unmarshal(body, &chartData); err != nil || len(chartData.Chart.Result) == 0 {
		return false
	}

	meta := chartData.Chart.Result[0].Meta
	if meta.RegularMarketPrice <= 0 {
		return false
	}

	price := meta.RegularMarketPrice
	prevClose := meta.ChartPreviousClose
	if prevClose <= 0 {
		prevClose = meta.PreviousClose
	}
	if prevClose <= 0 {
		prevClose = price
	}

	change := price - prevClose
	changePct := (change / prevClose) * 100

	// Update stock struct
	stock.Price = price
	stock.Change = change
	stock.ChangePercent = changePct

	// Save to memory cache
	quoteMu.Lock()
	quoteStore[cleanTicker] = liveQuoteCache{
		price:     price,
		change:    change,
		changePct: changePct,
		updatedAt: time.Now(),
	}
	quoteMu.Unlock()

	log.Printf("[LIVE QUOTE] %s -> Rp %.0f (Change: %+.1f%%)", cleanTicker, price, changePct)
	return true
}
