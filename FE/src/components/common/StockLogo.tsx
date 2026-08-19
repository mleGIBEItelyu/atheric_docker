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

  // 1:1 Stockbit CDN Priority (All IDX stocks in pure 1:1 circular format)
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
    borderRadius: '50%',
    fontSize: Math.max(10, Math.floor(size * 0.36)),
    fontWeight: 700,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    letterSpacing: '-0.02em',
    textTransform: 'uppercase',
    userSelect: 'none',
    border: 'none',
    outline: 'none',
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

  // If dynamic Stockbit circular logo is available
  if (!hasError && currentSrc) {
    return (
      <div 
        className={`stock-logo-wrap ${className}`}
        style={{
          ...sizeStyle,
          background: 'transparent',
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
            borderRadius: '50%',
            display: 'block',
          }}
          onError={handleImgError}
          loading="lazy"
        />
      </div>
    )
  }

  // Graceful Monogram Fallback Badge (Circular & Borderless)
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
