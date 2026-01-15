import { api } from './api';

interface CachedPriceData {
  [resourceId: string]: Array<{ time: number; price: number }>;
}

const priceHistory: CachedPriceData = {};

export async function getCurrentPrice(resourceId: string): Promise<number> {
  // Check if we have cached price data recently
  if (priceHistory[resourceId] && priceHistory[resourceId].length > 0) {
    const latestEntry = priceHistory[resourceId][priceHistory[resourceId].length - 1];
    const age = Date.now() - latestEntry.time;

    // If the latest entry is less than 5 seconds old, return it
    if (age < 5000) {
      return latestEntry.price;
    }
  }

  // Request new price data from API
  try {
    const resp = await api.get<{ data: { price: number } }>(`/market/price/${resourceId}`);
    if (resp && resp.success) {
      const payload = resp.data;

      let price: number | undefined;
      if (payload && payload.data && typeof payload.data.price === 'number')
        price = payload.data.price;

      if (typeof price === 'number') {
        if (!priceHistory[resourceId]) {
          priceHistory[resourceId] = [];
        }
        priceHistory[resourceId].push({ time: Date.now(), price });
        return price;
      }
    }
  } catch (err) {
    console.error('Error fetching current price for', resourceId, err);
  }

  // Fallback
  if (priceHistory[resourceId] && priceHistory[resourceId].length > 0) {
    return priceHistory[resourceId][priceHistory[resourceId].length - 1].price;
  } else {
    throw new Error('Failed to fetch current price and no cached data available.');
  }
}

export async function getPrices(): Promise<{ [resourceId: string]: number }> {
  try {
    const resp = await api.get<{ data: Array<{ resource_id: string; price: number }> }>(
      `/market/prices`
    );
    if (resp && resp.success) {
      const payload = resp.data;
      const prices: { [key: string]: number } = {};
      if (payload && Array.isArray(payload.data)) {
        for (const entry of payload.data) {
          if (entry.resource_id && typeof entry.price === 'number') {
            prices[entry.resource_id] = entry.price;
            // Update cache
            if (!priceHistory[entry.resource_id]) {
              priceHistory[entry.resource_id] = [];
            }
            priceHistory[entry.resource_id].push({ time: Date.now(), price: entry.price });
          }
        }
        return prices;
      }
    }
  } catch (err) {
    console.error('Error fetching prices', err);
  }
  throw new Error('Failed to fetch prices.');
}

export async function getPriceHistory(
  resourceId: string,
  hoursBack: number = 2
): Promise<Array<{ time: number; price: number }>> {
  const now = Date.now();
  const cutoff = now - hoursBack * 60 * 60 * 1000;

  // Check if we have cached data that covers the requested time range
  if (priceHistory[resourceId]) {
    const cachedData = priceHistory[resourceId].filter(entry => entry.time >= cutoff);
    if (cachedData.length > 0 && cachedData[0].time <= cutoff) {
      return cachedData;
    }
  }

  // Request new price history data from API
  try {
    const resp = await api.get<{
      data: Array<{ time?: number; timestamp?: number; price?: number; value?: number }>;
    }>(`/market/history/${resourceId}?hoursBack=${hoursBack}`);
    if (resp && resp.success) {
      const payload = resp.data;

      let entries: Array<{ time?: number; timestamp?: number; price?: number; value?: number }> =
        [];
      if (payload && Array.isArray(payload.data)) entries = payload.data;

      if (entries.length > 0) {
        const history = entries.map(entry => ({
          time: entry.time ?? entry.timestamp ?? Date.now(),
          price: entry.price ?? entry.value ?? 0,
        }));

        // Cache the new price history data
        priceHistory[resourceId] = history;

        return history;
      }
    }
  } catch (err) {
    console.error('Error fetching price history for', resourceId, err);
  }

  console.error('Failed to fetch price history for', resourceId);
  return [];
}

export async function getPriceStats(
  resourceId: string,
  hoursBack: number = 24
): Promise<{
  min: number;
  max: number;
  avg: number;
  current: number | null;
  change: number;
  changePercent: number;
}> {
  const history = await getPriceHistory(resourceId, hoursBack);
  const prices = history.map(h => h.price);

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
  const current = await getCurrentPrice(resourceId);
  const change = current - prices[0];
  const changePercent = (change / prices[0]) * 100;

  return { min, max, avg, current, change, changePercent };
}
