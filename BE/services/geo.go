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

// ParseUserAgent extracts friendly device name, OS, and browser with version
func ParseUserAgent(ua string) (deviceName string, browserName string) {
	if ua == "" {
		return "Windows PC", "Web Browser"
	}

	cleanUA := strings.TrimSpace(ua)

	// -------------------------------------------------------------
	// 1. Browser Detection (with Version when available)
	// -------------------------------------------------------------
	if strings.Contains(cleanUA, "Brave/") {
		browserName = extractBrowserWithVersion("Brave", "Brave/", cleanUA)
	} else if strings.Contains(cleanUA, "Arc/") {
		browserName = extractBrowserWithVersion("Arc Browser", "Arc/", cleanUA)
	} else if strings.Contains(cleanUA, "Vivaldi/") {
		browserName = extractBrowserWithVersion("Vivaldi", "Vivaldi/", cleanUA)
	} else if strings.Contains(cleanUA, "SamsungBrowser/") {
		browserName = extractBrowserWithVersion("Samsung Internet", "SamsungBrowser/", cleanUA)
	} else if strings.Contains(cleanUA, "OPR/") {
		browserName = extractBrowserWithVersion("Opera", "OPR/", cleanUA)
	} else if strings.Contains(cleanUA, "Opera") {
		browserName = "Opera Browser"
	} else if strings.Contains(cleanUA, "Edg/") || strings.Contains(cleanUA, "Edge/") {
		tag := "Edg/"
		if strings.Contains(cleanUA, "Edge/") {
			tag = "Edge/"
		}
		browserName = extractBrowserWithVersion("Microsoft Edge", tag, cleanUA)
	} else if strings.Contains(cleanUA, "Chrome/") || strings.Contains(cleanUA, "CriOS/") {
		tag := "Chrome/"
		if strings.Contains(cleanUA, "CriOS/") {
			tag = "CriOS/"
		}
		browserName = extractBrowserWithVersion("Google Chrome", tag, cleanUA)
	} else if strings.Contains(cleanUA, "Firefox/") || strings.Contains(cleanUA, "FxiOS/") {
		tag := "Firefox/"
		if strings.Contains(cleanUA, "FxiOS/") {
			tag = "FxiOS/"
		}
		browserName = extractBrowserWithVersion("Mozilla Firefox", tag, cleanUA)
	} else if strings.Contains(cleanUA, "Safari/") && !strings.Contains(cleanUA, "Chrome/") && !strings.Contains(cleanUA, "Android") {
		if strings.Contains(cleanUA, "Version/") {
			browserName = extractBrowserWithVersion("Apple Safari", "Version/", cleanUA)
		} else {
			browserName = "Apple Safari"
		}
	} else if strings.Contains(cleanUA, "PostmanRuntime/") {
		browserName = "Postman Client"
	} else if strings.Contains(cleanUA, "curl/") {
		browserName = "cURL CLI"
	} else if strings.Contains(cleanUA, "python-requests") || strings.Contains(cleanUA, "Python/") {
		browserName = "Python API Client"
	} else {
		browserName = "Web Browser"
	}

	// -------------------------------------------------------------
	// 2. OS & Device Detection
	// -------------------------------------------------------------
	if strings.Contains(cleanUA, "iPhone") {
		iosVer := extractOSVersion("OS ", cleanUA)
		if iosVer != "" {
			deviceName = fmt.Sprintf("Apple iPhone (iOS %s)", iosVer)
		} else {
			deviceName = "Apple iPhone (iOS)"
		}
	} else if strings.Contains(cleanUA, "iPad") {
		iosVer := extractOSVersion("OS ", cleanUA)
		if iosVer != "" {
			deviceName = fmt.Sprintf("Apple iPad (iPadOS %s)", iosVer)
		} else {
			deviceName = "Apple iPad (iPadOS)"
		}
	} else if strings.Contains(cleanUA, "Android") {
		andVer := extractOSVersion("Android ", cleanUA)
		model := extractAndroidDeviceModel(cleanUA)
		if model != "" && andVer != "" {
			deviceName = fmt.Sprintf("%s (Android %s)", model, andVer)
		} else if andVer != "" {
			deviceName = fmt.Sprintf("Android %s Device", andVer)
		} else {
			deviceName = "Android Mobile"
		}
	} else if strings.Contains(cleanUA, "Macintosh") || strings.Contains(cleanUA, "Mac OS X") {
		macVer := extractOSVersion("Mac OS X ", cleanUA)
		if macVer != "" {
			macVer = strings.ReplaceAll(macVer, "_", ".")
			deviceName = fmt.Sprintf("macOS (%s)", macVer)
		} else {
			deviceName = "Apple Mac (macOS)"
		}
	} else if strings.Contains(cleanUA, "Windows NT 10.0") {
		if strings.Contains(cleanUA, "Win64; x64") || strings.Contains(cleanUA, "WOW64") {
			deviceName = "Windows 10/11 (64-bit)"
		} else {
			deviceName = "Windows 10/11 PC"
		}
	} else if strings.Contains(cleanUA, "Windows NT 6.3") {
		deviceName = "Windows 8.1 PC"
	} else if strings.Contains(cleanUA, "Windows NT 6.1") {
		deviceName = "Windows 7 PC"
	} else if strings.Contains(cleanUA, "Windows") {
		deviceName = "Windows PC"
	} else if strings.Contains(cleanUA, "CrOS") {
		deviceName = "Google Chromebook"
	} else if strings.Contains(cleanUA, "Ubuntu") {
		deviceName = "Ubuntu Linux"
	} else if strings.Contains(cleanUA, "Debian") {
		deviceName = "Debian Linux"
	} else if strings.Contains(cleanUA, "Fedora") {
		deviceName = "Fedora Linux"
	} else if strings.Contains(cleanUA, "Linux") {
		deviceName = "Linux Workstation"
	} else {
		deviceName = "Desktop Terminal"
	}

	return deviceName, browserName
}

func extractBrowserWithVersion(prefix, tag, ua string) string {
	idx := strings.Index(ua, tag)
	if idx == -1 {
		return prefix
	}
	sub := ua[idx+len(tag):]
	end := strings.IndexAny(sub, " \t;)(")
	var ver string
	if end != -1 {
		ver = sub[:end]
	} else {
		ver = sub
	}
	ver = strings.TrimSpace(ver)
	if ver != "" {
		parts := strings.Split(ver, ".")
		if len(parts) >= 2 {
			ver = parts[0] + "." + parts[1]
		}
		return fmt.Sprintf("%s %s", prefix, ver)
	}
	return prefix
}

func extractOSVersion(tag, ua string) string {
	idx := strings.Index(ua, tag)
	if idx == -1 {
		return ""
	}
	sub := ua[idx+len(tag):]
	end := strings.IndexAny(sub, ";) ")
	if end != -1 {
		sub = sub[:end]
	}
	return strings.TrimSpace(strings.ReplaceAll(sub, "_", "."))
}

func extractAndroidDeviceModel(ua string) string {
	idx := strings.Index(ua, "Android")
	if idx == -1 {
		return ""
	}
	sub := ua[idx:]
	semiIdx := strings.Index(sub, ";")
	if semiIdx == -1 {
		return ""
	}
	afterSemi := sub[semiIdx+1:]
	closeParen := strings.Index(afterSemi, ")")
	if closeParen != -1 {
		afterSemi = afterSemi[:closeParen]
	}
	buildIdx := strings.Index(afterSemi, "Build/")
	if buildIdx != -1 {
		afterSemi = afterSemi[:buildIdx]
	}
	model := strings.TrimSpace(afterSemi)
	if len(model) > 25 {
		model = model[:25]
	}
	return model
}
