// Market price simulation helper functions

interface PriceData {
  [resourceId: string]: {
    basePrice: number
    volatility: number
    trend: number
    lastPrice: number
  }
}

// Initialize price data for resources
const priceData: PriceData = {
  avocado: { basePrice: 2.5, volatility: 0.3, trend: 0.01, lastPrice: 2.5 },
  bacon: { basePrice: 8.0, volatility: 0.25, trend: 0.005, lastPrice: 8.0 },
  bagel: { basePrice: 1.5, volatility: 0.15, trend: 0.002, lastPrice: 1.5 },
  banana: { basePrice: 0.8, volatility: 0.2, trend: 0.001, lastPrice: 0.8 },
  bread: { basePrice: 2.0, volatility: 0.1, trend: 0, lastPrice: 2.0 },
  cake: { basePrice: 15.0, volatility: 0.4, trend: 0.015, lastPrice: 15.0 },
  corn: { basePrice: 3.5, volatility: 0.25, trend: 0.008, lastPrice: 3.5 },
  diamond: { basePrice: 5000.0, volatility: 0.5, trend: 0.02, lastPrice: 5000.0 },
  gas: { basePrice: 4.2, volatility: 0.35, trend: 0.01, lastPrice: 4.2 },
  gold: { basePrice: 1800.0, volatility: 0.4, trend: 0.012, lastPrice: 1800.0 },
  lemon: { basePrice: 1.2, volatility: 0.2, trend: 0.003, lastPrice: 1.2 },
  oil: { basePrice: 85.0, volatility: 0.3, trend: 0.008, lastPrice: 85.0 },
  silver: { basePrice: 25.0, volatility: 0.35, trend: 0.01, lastPrice: 25.0 },
}

/**
 * Get the current price of a resource
 * Uses a pseudo-random algorithm based on time for consistent prices within the same second
 */
export function getCurrentPrice(resourceId: string): number {
  const data = priceData[resourceId] || { basePrice: 10, volatility: 0.3, trend: 0, lastPrice: 10 }
  
  // Use current timestamp for consistent pricing within same second
  const now = Math.floor(Date.now() / 1000)
  const seed = hashCode(resourceId + now)
  
  // Generate price with trend and volatility
  const random = Math.sin(seed) * 10000 - Math.floor(Math.sin(seed) * 10000)
  const priceChange = (random - 0.5) * data.volatility * data.basePrice
  const price = data.basePrice + priceChange + (data.trend * data.basePrice)
  
  // Ensure price doesn't go negative and add some realism
  return Math.max(data.basePrice * 0.5, price)
}

/**
 * Generate price history for the last 60 time periods
 */
export function generatePriceHistory(resourceId: string): Array<{ time: number; price: number }> {
  const history: Array<{ time: number; price: number }> = []
  const data = priceData[resourceId] || { basePrice: 10, volatility: 0.3, trend: 0, lastPrice: 10 }
  
  // Generate last 60 data points (60 seconds of history)
  for (let i = 59; i >= 0; i--) {
    const timestamp = Math.floor(Date.now() / 1000) - i
    const seed = hashCode(resourceId + timestamp)
    const random = Math.sin(seed) * 10000 - Math.floor(Math.sin(seed) * 10000)
    const priceChange = (random - 0.5) * data.volatility * data.basePrice
    const price = data.basePrice + priceChange + (data.trend * data.basePrice * (i / 60))
    
    history.push({
      time: timestamp * 1000,
      price: Math.max(data.basePrice * 0.5, price),
    })
  }
  
  return history
}

/**
 * Get price history for a resource (for charts)
 */
export function getPriceHistory(resourceId: string, hoursBack: number = 24): Array<{ time: number; price: number }> {
  const history: Array<{ time: number; price: number }> = []
  const data = priceData[resourceId] || { basePrice: 10, volatility: 0.3, trend: 0, lastPrice: 10 }
  
  const now = Math.floor(Date.now() / 1000)
  const interval = 300 // 5 minute intervals
  const points = (hoursBack * 60 * 60) / interval
  
  for (let i = points - 1; i >= 0; i--) {
    const timestamp = now - i * interval
    const seed = hashCode(resourceId + timestamp)
    const random = Math.sin(seed) * 10000 - Math.floor(Math.sin(seed) * 10000)
    const priceChange = (random - 0.5) * data.volatility * data.basePrice
    const price = data.basePrice + priceChange + (data.trend * data.basePrice * (i / points))
    
    history.push({
      time: timestamp * 1000,
      price: Math.max(data.basePrice * 0.5, price),
    })
  }
  
  return history
}

/**
 * Get price statistics for a resource
 */
export function getPriceStats(resourceId: string, hoursBack: number = 24) {
  const history = getPriceHistory(resourceId, hoursBack)
  const prices = history.map(h => h.price)
  
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length
  const current = getCurrentPrice(resourceId)
  const change = current - prices[0]
  const changePercent = (change / prices[0]) * 100
  
  return { min, max, avg, current, change, changePercent }
}

/**
 * Simple hash function for consistent pseudo-random numbers
 */
function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}
