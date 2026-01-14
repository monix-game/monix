import { api } from './api';

interface CachedResourceData {
  [resourceId: string]: {
    quantity: number;
    time: number;
  };
}

let resourceCache: CachedResourceData = {};

export function clearResourceCache() {
  resourceCache = {};
}

export async function fetchAndCacheResources(): Promise<void> {
  try {
    const resp = await api.get<{ resources: Array<{ resource_id: string; quantity: number }> }>(`/resources/all`);
    const time = Date.now();
    if (resp && resp.success) {
      const payload = resp.data;
      if (payload && Array.isArray(payload.resources)) {
        for (const entry of payload.resources) {
          if (entry.resource_id && typeof entry.quantity === 'number') {
            resourceCache[entry.resource_id] = {
              quantity: entry.quantity,
              time: time,
            };
          }
        }
      }
    }
  } catch (err) {
    console.error('Error fetching resources', err);
  }
}

export async function getResourceQuantity(resourceId: string): Promise<number | null> {
  const entry = resourceCache[resourceId];
  if (entry) {
    return entry.quantity;
  }

  // Fetch the latest data from the API
  await fetchAndCacheResources();
  const updatedEntry = resourceCache[resourceId];
  return updatedEntry ? updatedEntry.quantity : null;
}
