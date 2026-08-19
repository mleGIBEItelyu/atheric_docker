import React, { useState } from 'react'

interface StockLogoProps {
  ticker: string
  name?: string
  size?: number
  className?: string
}

// Generate consistent high-contrast colors for fallback monogram badges
function getFallbackStyle(ticker: string) {
  const clean = ticker.replace('.JK', '').toUpperCase()
  let hash = 0
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hues = [215, 150, 260, 330, 25, 45, 195, 280]
  const hue = hues[Math.abs(hash) % hues.length]
  return {
    background: `linear-gradient(135deg, hsl(${hue}, 75%, 28%) 0%, hsl(${hue}, 85%, 15%) 100%)`,
    color: '#FFFFFF',
    border: `1px solid hsla(${hue}, 85%, 60%, 0.35)`,
  }
}

export function StockLogo({ 
  ticker, 
  name, 
  size = 36, 
  className = '' 
}: StockLogoProps) {
  const clean = (ticker || '').replace('.JK', '').toUpperCase()
  const [srcIndex, setSrcIndex] = useState(0)
  const [hasError, setHasError] = useState(false)

  // 1:1 Stockbit CDN Priority (All IDX stocks in pure 1:1 square app-icon format)
  const logoSources = [
    `https://assets.stockbit.com/logos/companies/${clean}.png`,
    `https://assets.parqet.com/logos/symbol/${clean}.JK`,
    `https://financialmodelingprep.com/image-stock/${clean}.JK.png`,
  ]

  const currentSrc = logoSources[srcIndex]
  const label = clean.slice(0, 3)
  const fallback = getFallbackStyle(clean)

  const sizeStyle: React.CSSProperties = {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
    borderRadius: Math.max(8, Math.floor(size / 3.2)),
    fontSize: Math.max(10, Math.floor(size * 0.36)),
    fontWeight: 700,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    letterSpacing: '-0.02em',
    textTransform: 'uppercase',
    userSelect: 'none',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
    position: 'relative',
    overflow: 'hidden',
    flexShrink: 0,
  }

  function handleImgError() {
    if (srcIndex < logoSources.length - 1) {
      setSrcIndex(prev => prev + 1)
    } else {
      setHasError(true)
    }
  }

  // If dynamic Stockbit 1:1 logo is available
  if (!hasError && currentSrc) {
    return (
      <div 
        className={`stock-logo-wrap ${className}`}
        style={{
          ...sizeStyle,
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
        title={`${clean} - ${name || clean}`}
      >
        <img
          src={currentSrc}
          alt={`${clean} logo`}
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover', 
            borderRadius: 'inherit' 
          }}
          onError={handleImgError}
          loading="lazy"
        />
      </div>
    )
  }

  // Graceful Monogram Fallback Badge
  return (
    <div 
      className={`stock-logo-badge ${className}`} 
      style={{ ...sizeStyle, ...fallback }} 
      title={`${clean} - ${name || clean}`}
    >
      <span>{label}</span>
    </div>
  )
}
