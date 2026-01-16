import { resources } from '../../server/common/resources';
import { api } from './api';

interface CachedPriceData {
  [resourceId: string]: Array<{ time: number; price: number }>;
}

const priceHistory: CachedPriceData = {};

export async function getCurrentPrice(resourceId: string, timestamp?: number): Promise<number> {
  let time = Math.floor(Date.now() / 1000);
  if (timestamp) {
    const tsNum = Number(timestamp);
    if (!isNaN(tsNum)) {
      time = tsNum;
    }
  }

  // Check if we have a price cached for the time
  if (priceHistory[resourceId]) {
    const cachedEntry = priceHistory[resourceId].find(
      entry => Math.round(entry.time) === Math.round(time)
    );
    if (cachedEntry) {
      return cachedEntry.price;
    }
  }

  // Request price from API
  try {
    const resp = await api.get<{ resource_id: string; price: number }>(
      `/market/price/${resourceId}?timestamp=${time}`
    );
    if (resp && resp.success) {
      const payload = resp.data;
      if (payload && typeof payload.price === 'number') {
        // Cache the price
        if (!priceHistory[resourceId]) {
          priceHistory[resourceId] = [];
        }
        priceHistory[resourceId].push({ time, price: payload.price });
        return payload.price;
      }
    }
  } catch (err) {
    console.error('Error fetching current price for', resourceId, err);
  }

  throw new Error(`Failed to fetch current price for resource ${resourceId}`);
}

export async function getPrices(timestamp?: number): Promise<{ [resourceId: string]: number }> {
  let time = Math.floor(Date.now() / 1000);
  if (timestamp) {
    const tsNum = Number(timestamp);
    if (!isNaN(tsNum)) {
      time = tsNum;
    }
  }

  // Check if we have all of the prices cached for the time
  let prices: { [resourceId: string]: number } = {};
  let allCached = true;
  for (const resource of resources) {
    if (!priceHistory[resource.id]) {
      allCached = false;
      break;
    }

    const cachedEntry = priceHistory[resource.id].find(
      entry => Math.round(entry.time) === Math.round(time)
    );
    if (cachedEntry) {
      prices[resource.id] = cachedEntry.price;
    } else {
      allCached = false;
    }
  }
  if (allCached) {
    return prices;
  }

  prices = {};

  // Request prices from API
  try {
    const resp = await api.get<{ data: Array<{ resource_id: string; price: number }> }>(
      `/market/prices?timestamp=${time}`
    );
    if (resp && resp.success) {
      const payload = resp.data;
      if (payload && Array.isArray(payload.data)) {
        for (const entry of payload.data) {
          prices[entry.resource_id] = entry.price;

          // Cache the price
          if (!priceHistory[entry.resource_id]) {
            priceHistory[entry.resource_id] = [];
          }
          priceHistory[entry.resource_id].push({ time, price: entry.price });
        }
        return prices;
      }
    }
  } catch (err) {
    console.error('Error fetching prices', err);
  }

  throw new Error('Failed to fetch prices from market API');
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
