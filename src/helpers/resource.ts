import { resources } from '../../server/common/resources';
import { api } from './api';
import { getPrices } from './market';

interface CachedResourceData {
  [resourceId: string]: {
    quantity: number;
    time: number;
  };
}

let resourceCache: CachedResourceData = {};

const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export function clearResourceCache(resource_id?: string): void {
  if (resource_id) {
    console.log(
      'Clearing cache for resource',
      resource_id,
      '. Totalling: ',
      Object.keys(resourceCache).filter(key => key === resource_id).length,
      'entries.'
    );
    delete resourceCache[resource_id];
  } else {
    resourceCache = {};
  }
}

export async function fetchAndCacheResources(): Promise<void> {
  try {
    const resp = await api.get<{ resources: { [key: string]: number } }>(`/resources/all`);
    const time = Date.now();
    if (resp?.success) {
      const payload = resp.data;
      if (payload?.resources) {
        for (const resourceId of Object.keys(payload.resources)) {
          resourceCache[resourceId] = {
            quantity: payload.resources[resourceId],
            time,
          };
        }
      }
    }
  } catch (err) {
    console.error('Error fetching resources', err);
  }
}

export async function getResourceQuantity(resourceId: string): Promise<number | null> {
  const cacheEntry = resourceCache[resourceId];
  const now = Date.now();
  if (cacheEntry && now - cacheEntry.time < CACHE_EXPIRY_MS) {
    return cacheEntry.quantity;
  }

  // Request new resource data from API
  await fetchAndCacheResources();

  const updatedEntry = resourceCache[resourceId];
  if (updatedEntry) {
    return updatedEntry.quantity;
  } else {
    return null;
  }
}

export async function getTotalResourceValue(): Promise<number> {
  let totalValue = 0;
  const allPrices = await getPrices();

  for (const resource of resources) {
    const quantity = await getResourceQuantity(resource.id);
    if (quantity && quantity > 0) {
      const price = allPrices[resource.id] ?? 0;
      totalValue += price * quantity;
    }
  }

  return Number(totalValue.toFixed(2));
}

export async function buyResource(
  resourceId: string,
  quantity: number
): Promise<{ success: boolean; message: string }> {
  try {
    const resp = await api.post<{
      message: string;
      resourceId: string;
      quantity: number;
      money: number;
    }>(`/resources/${resourceId}/buy`, {
      quantity,
    });
    if (resp?.success) {
      clearResourceCache(resourceId);
      resourceCache[resourceId] = {
        quantity: resp.data?.quantity || 0,
        time: Date.now(),
      };
      return { success: true, message: resp.data?.message || 'Purchase successful' };
    } else {
      return { success: false, message: 'Purchase failed' };
    }
  } catch {
    return { success: false, message: 'Purchase failed' };
  }
}

export async function sellResource(
  resourceId: string,
  quantity: number
): Promise<{ success: boolean; message: string }> {
  try {
    const resp = await api.post<{
      message: string;
      resourceId: string;
      quantity: number;
      money: number;
    }>(`/resources/${resourceId}/sell`, {
      quantity,
    });
    if (resp?.success) {
      clearResourceCache(resourceId);
      resourceCache[resourceId] = {
        quantity: resp.data?.quantity || 0,
        time: Date.now(),
      };
      return { success: true, message: resp.data?.message || 'Sale successful' };
    } else {
      return { success: false, message: 'Sale failed' };
    }
  } catch {
    return { success: false, message: 'Sale failed' };
  }
}
