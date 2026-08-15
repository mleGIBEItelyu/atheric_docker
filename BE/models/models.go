package models

import (
	"math/rand"
	"time"

	"gorm.io/gorm"
)

// User represents system accounts (supports USER and ADMIN roles)
type User struct {
	ID               uint       `gorm:"primaryKey" json:"id"`
	Username         string     `gorm:"uniqueIndex;not null" json:"username"`
	Email            string     `gorm:"uniqueIndex;not null" json:"email"`
	Password         string     `json:"-"` // Excluded from JSON responses for security
	Role             string     `gorm:"default:'USER'" json:"role"` // USER or ADMIN
	IsVerified       bool       `gorm:"default:false" json:"isVerified"`
	VerificationCode string     `json:"-"`
	CodeExpiresAt    *time.Time `json:"-"`
	IsActive         bool       `gorm:"default:true" json:"isActive"`
	CreatedAt        time.Time  `json:"createdAt"`
	UpdatedAt        time.Time  `json:"updatedAt"`
}

// BeforeCreate GORM hook automatically assigns a random 6-digit uint ID
func (u *User) BeforeCreate(tx *gorm.DB) (err error) {
	if u.ID < 100000 {
		u.ID = uint(100000 + rand.Intn(899999))
	}
	return nil
}

// ActivityLog represents read-only audit log entries of all user actions across the platform
type ActivityLog struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"index" json:"userId"`
	Username  string    `json:"username"`
	Role      string    `json:"role"`
	Action    string    `json:"action"` // LOGIN, REGISTER, UPDATE_ROLE, DELETE_USER, TOGGLE_WATCHLIST, SUBMIT_TICKET, BOT_BLOCKED, etc.
	Details   string    `json:"details"`
	IP        string    `json:"ip"`
	UserAgent string    `json:"userAgent"`
	CreatedAt time.Time `json:"createdAt"`
}

// RequestLog represents live HTTP traffic records for monitoring
type RequestLog struct {
	ID        string    `json:"id"`
	Method    string    `json:"method"`
	Path      string    `json:"path"`
	Status    int       `json:"status"`
	IP        string    `json:"ip"`
	LatencyMs float64   `json:"latencyMs"`
	Timestamp time.Time `json:"timestamp"`
}

// TrafficStats represents real-time server and traffic health streamed over WebSocket
type TrafficStats struct {
	Timestamp            time.Time    `json:"timestamp"`
	ServerStatus         string       `json:"serverStatus"` // ONLINE, DEGRADED, OFFLINE
	UptimeSeconds        int64        `json:"uptimeSeconds"`
	ActiveUsers          int          `json:"activeUsers"`
	TotalRequests        int64        `json:"totalRequests"`
	BlockedBots          int64        `json:"blockedBots"`
	RequestsPerMin       int          `json:"requestsPerMin"`
	RequestsLast1Min     int          `json:"requestsLast1Min"`
	RequestsLast5Min     int          `json:"requestsLast5Min"`
	RequestsLast15Min    int          `json:"requestsLast15Min"`
	UniqueUsers15Min     int          `json:"uniqueUsers15Min"`
	PeakRequestsPerMin   int          `json:"peakRequestsPerMin"`
	AvgLatencyMs         float64      `json:"avgLatencyMs"`
	ErrorRatePct         float64      `json:"errorRatePct"`
	CpuUsagePct          float64      `json:"cpuUsagePct"`
	MemoryUsageMb        float64      `json:"memoryUsageMb"`
	MemoryUsagePct       float64      `json:"memoryUsagePct"`
	TopEndpoints         []EndpointHit `json:"topEndpoints"`
	RecentLogs           []RequestLog `json:"recentLogs"`
}

// EndpointHit represents endpoint access counts for traffic charts
type EndpointHit struct {
	Path  string `json:"path"`
	Count int64  `json:"count"`
}

// Stock represents market ticker item
type Stock struct {
	ID              uint      `gorm:"primaryKey" json:"id"`
	Ticker          string    `gorm:"uniqueIndex;not null" json:"ticker"`
	Name            string    `json:"name"`
	Price           float64   `json:"price"`
	Change          float64   `json:"change"`
	ChangePercent   float64   `json:"changePercent"`
	ConfidenceLevel float64   `json:"confidenceLevel"`
	Signal          string    `json:"signal"` // BUY, HOLD, SELL
	Category        string    `json:"category"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

// Watchlist represents user starred tickers
type Watchlist struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"index;not null" json:"userId"`
	Ticker    string    `gorm:"not null" json:"ticker"`
	CreatedAt time.Time `json:"createdAt"`
}

// SupportTicket represents submitted user feedback / support requests
type SupportTicket struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Subject   string    `json:"subject"`
	Category  string    `json:"category"`
	Message   string    `json:"message"`
	Status    string    `gorm:"default:'OPEN'" json:"status"` // OPEN, IN_PROGRESS, RESOLVED
	CreatedAt time.Time `json:"createdAt"`
}

// Evaluation represents model AI performance comparison
type Evaluation struct {
	ID                 uint      `gorm:"primaryKey" json:"id"`
	ModelName          string    `json:"modelName"`
	AccuracyPercentage float64   `json:"accuracyPercentage"`
	MapeScore          float64   `json:"mapeScore"`
	Pros               string    `json:"pros"`
	Cons               string    `json:"cons"`
	Notes              string    `json:"notes"`
	CreatedAt          time.Time `json:"createdAt"`
}

// News represents scraped market news articles per ticker
type News struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Ticker    string    `gorm:"index;not null" json:"ticker"`
	Title     string    `gorm:"not null" json:"title"`
	Source    string    `json:"source"`
	Time      string    `json:"time"`
	Impact    string    `json:"impact"` // High +, High -, Medium, Low
	Url       string    `json:"url"`
	CreatedAt time.Time `json:"createdAt"`
}

// UserSetting represents customizable user options (AI Model, CI, Theme, Topbar Index, Alerts)
type UserSetting struct {
	ID                 uint      `gorm:"primaryKey" json:"id"`
	UserID             uint      `gorm:"uniqueIndex;not null" json:"userId"`
	AiModel            string    `gorm:"default:'generative'" json:"aiModel"`
	ConfidenceInterval string    `gorm:"default:'90'" json:"confidenceInterval"`
	TopbarIndex        string    `gorm:"default:'IHSG'" json:"topbarIndex"`
	Theme              string    `gorm:"default:'dark'" json:"theme"`
	EmailAlerts        bool      `gorm:"default:true" json:"emailAlerts"`
	InAppAlerts        bool      `gorm:"default:true" json:"inAppAlerts"`
	UpdatedAt          time.Time `json:"updatedAt"`
}

// DeviceSession represents real active user login session across devices
type DeviceSession struct {
	ID                uint      `gorm:"primaryKey" json:"id"`
	UserID            uint      `gorm:"index;not null" json:"userId"`
	Device            string    `json:"device"`
	Browser           string    `json:"browser"`
	IP                string    `json:"ip"`
	Location          string    `json:"location"`
	FirstLoginDaysAgo int       `json:"firstLoginDaysAgo"`
	LastActive        string    `json:"lastActive"`
	IsCurrent         bool      `json:"isCurrent"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
}
