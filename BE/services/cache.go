package services

import (
	"sync"
	"time"
)

type cacheItem struct {
	data      []byte
	expiresAt time.Time
}

// FastRAMCache is a thread-safe, lock-optimized in-memory cache for ultra-low VPS CPU/RAM utilization
type FastRAMCache struct {
	mu    sync.RWMutex
	items map[string]cacheItem
}

var GlobalRAMCache = &FastRAMCache{
	items: make(map[string]cacheItem),
}

// Get retrieves cached JSON payload if still valid
func (c *FastRAMCache) Get(key string) ([]byte, bool) {
	c.mu.RLock()
	item, found := c.items[key]
	c.mu.RUnlock()

	if !found {
		return nil, false
	}

	if time.Now().After(item.expiresAt) {
		c.mu.Lock()
		delete(c.items, key)
		c.mu.Unlock()
		return nil, false
	}

	return item.data, true
}

// Set stores JSON payload in RAM with specific TTL
func (c *FastRAMCache) Set(key string, data []byte, ttl time.Duration) {
	c.mu.Lock()
	defer c.mu.Unlock()

	// Soft limit to protect VPS RAM (evict oldest if cache exceeds 1000 items)
	if len(c.items) > 1000 {
		now := time.Now()
		for k, v := range c.items {
			if now.After(v.expiresAt) {
				delete(c.items, k)
			}
		}
	}

	c.items[key] = cacheItem{
		data:      data,
		expiresAt: time.Now().Add(ttl),
	}
}

// Invalidate removes cached item
func (c *FastRAMCache) Invalidate(key string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.items, key)
}

// Delete removes cached item (alias to Invalidate)
func (c *FastRAMCache) Delete(key string) {
	c.Invalidate(key)
}

// Clear flushes the entire in-memory cache
func (c *FastRAMCache) Clear() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.items = make(map[string]cacheItem)
}
