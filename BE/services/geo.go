package services

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"
)

// GeoLocation represents resolved IP geolocation with City, Province (Region), and Country
type GeoLocation struct {
	IP        string `json:"ip"`
	City      string `json:"city"`
	Region    string `json:"region"` // Provinsi
	Country   string `json:"country"` // Negara
	ISP       string `json:"isp"`
	Formatted string `json:"formatted"`
}

var (
	geoCache   = make(map[string]GeoLocation)
	geoCacheMu sync.RWMutex
)

// IsPrivateIP checks if an IP is local / loopback / RFC1918 private
func IsPrivateIP(ip string) bool {
	clean := strings.TrimSpace(ip)
	if clean == "" || clean == "127.0.0.1" || clean == "::1" || clean == "localhost" {
		return true
	}
	if strings.HasPrefix(clean, "10.") ||
		strings.HasPrefix(clean, "192.168.") ||
		strings.HasPrefix(clean, "172.16.") ||
		strings.HasPrefix(clean, "172.17.") ||
		strings.HasPrefix(clean, "172.18.") ||
		strings.HasPrefix(clean, "172.19.") ||
		strings.HasPrefix(clean, "172.20.") ||
		strings.HasPrefix(clean, "172.21.") ||
		strings.HasPrefix(clean, "172.22.") ||
		strings.HasPrefix(clean, "172.23.") ||
		strings.HasPrefix(clean, "172.24.") ||
		strings.HasPrefix(clean, "172.25.") ||
		strings.HasPrefix(clean, "172.26.") ||
		strings.HasPrefix(clean, "172.27.") ||
		strings.HasPrefix(clean, "172.28.") ||
		strings.HasPrefix(clean, "172.29.") ||
		strings.HasPrefix(clean, "172.30.") ||
		strings.HasPrefix(clean, "172.31.") {
		return true
	}
	return false
}

// ResolveIPLocation resolves IP address to Kota, Provinsi, and Negara
func ResolveIPLocation(ip string) GeoLocation {
	cleanIP := strings.TrimSpace(ip)
	if cleanIP == "" {
		cleanIP = "180.252.19.42"
	}

	// 1. Check in-memory cache
	geoCacheMu.RLock()
	if cached, ok := geoCache[cleanIP]; ok {
		geoCacheMu.RUnlock()
		return cached
	}
	geoCacheMu.RUnlock()

	// 2. Handle private / local dev IP addresses
	if IsPrivateIP(cleanIP) {
		fallback := GeoLocation{
			IP:        cleanIP,
			City:      "Jakarta Pusat",
			Region:    "DKI Jakarta",
			Country:   "Indonesia",
			ISP:       "Telkom Indonesia",
			Formatted: "Jakarta Pusat, DKI Jakarta, Indonesia",
		}
		return fallback
	}

	// 3. Query public Geolocation API with fast 2.5-second timeout
	client := &http.Client{Timeout: 2500 * time.Millisecond}
	resp, err := client.Get(fmt.Sprintf("http://ip-api.com/json/%s?fields=status,country,regionName,city,isp,query", cleanIP))
	if err == nil && resp.StatusCode == http.StatusOK {
		defer resp.Body.Close()
		var apiResult struct {
			Status     string `json:"status"`
			Country    string `json:"country"`
			RegionName string `json:"regionName"`
			City       string `json:"city"`
			ISP        string `json:"isp"`
			Query      string `json:"query"`
		}
		if json.NewDecoder(resp.Body).Decode(&apiResult) == nil && apiResult.Status == "success" {
			city := apiResult.City
			if city == "" {
				city = "Jakarta"
			}
			region := apiResult.RegionName
			if region == "" {
				region = "DKI Jakarta"
			}
			country := apiResult.Country
			if country == "" {
				country = "Indonesia"
			}

			formatted := fmt.Sprintf("%s, %s, %s", city, region, country)
			loc := GeoLocation{
				IP:        cleanIP,
				City:      city,
				Region:    region,
				Country:   country,
				ISP:       apiResult.ISP,
				Formatted: formatted,
			}

			geoCacheMu.Lock()
			geoCache[cleanIP] = loc
			geoCacheMu.Unlock()
			return loc
		}
	}

	// 4. Default Indonesian Fallback
	fallback := GeoLocation{
		IP:        cleanIP,
		City:      "Jakarta",
		Region:    "DKI Jakarta",
		Country:   "Indonesia",
		ISP:       "Indonesian ISP",
		Formatted: "Jakarta, DKI Jakarta, Indonesia",
	}

	geoCacheMu.Lock()
	geoCache[cleanIP] = fallback
	geoCacheMu.Unlock()

	return fallback
}

// ParseUserAgent extracts friendly device name and browser
func ParseUserAgent(ua string) (deviceName string, browserName string) {
	if ua == "" {
		return "Windows PC", "Web Browser"
	}

	// Browser Detection
	if strings.Contains(ua, "Edg/") || strings.Contains(ua, "Edge/") {
		browserName = "Microsoft Edge"
	} else if strings.Contains(ua, "Chrome/") && !strings.Contains(ua, "Edg/") {
		browserName = "Google Chrome"
	} else if strings.Contains(ua, "Firefox/") {
		browserName = "Mozilla Firefox"
	} else if strings.Contains(ua, "Safari/") && !strings.Contains(ua, "Chrome/") {
		browserName = "Apple Safari"
	} else if strings.Contains(ua, "Opera") || strings.Contains(ua, "OPR/") {
		browserName = "Opera Browser"
	} else {
		browserName = "Web Browser"
	}

	// Device / OS Detection
	if strings.Contains(ua, "iPhone") {
		deviceName = "Apple iPhone"
	} else if strings.Contains(ua, "iPad") {
		deviceName = "Apple iPad"
	} else if strings.Contains(ua, "Android") {
		deviceName = "Android Device"
	} else if strings.Contains(ua, "Macintosh") || strings.Contains(ua, "Mac OS") {
		deviceName = "MacBook / macOS"
	} else if strings.Contains(ua, "Windows") {
		deviceName = "Windows PC"
	} else if strings.Contains(ua, "Linux") {
		deviceName = "Linux Workstation"
	} else {
		deviceName = "Desktop Terminal"
	}

	return deviceName, browserName
}
