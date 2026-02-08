import type { IFish } from '../../server/common/models/fish';
import type { FishingResult } from '../../server/common/fishing/fishing';
import { api } from './api';

export async function getAquarium(): Promise<{ capacity: number; fish: IFish[] } | null> {
  try {
    const resp = await api.get<{ aquarium: { capacity: number; fish: IFish[] } }>(
      '/fishing/aquarium'
    );
    if (resp?.success) {
      const payload = resp.data;
      if (payload?.aquarium) {
        return payload.aquarium;
      }
    }
  } catch (error) {
    console.error('Error fetching aquarium:', error);
    throw error;
  }

  return null;
}

export async function upgradeAquarium(): Promise<boolean> {
  try {
    const resp = await api.post('/fishing/aquarium/upgrade');
    if (resp?.success) {
      return true;
    }
  } catch (error) {
    console.error('Error upgrading aquarium:', error);
    throw error;
  }

  return false;
}

export async function sellFish(fishId: string): Promise<boolean> {
  try {
    const resp = await api.post('/fishing/aquarium/sell', { fish_id: fishId });
    if (resp?.success) {
      return true;
    }
  } catch (error) {
    console.error('Error selling fish:', error);
    throw error;
  }

  return false;
}

export async function buyRod(rodId: string): Promise<boolean> {
  try {
    const resp = await api.post('/fishing/buy/rod', { rod_id: rodId });
    if (resp?.success) {
      return true;
    }
  } catch (error) {
    console.error('Error buying rod:', error);
    throw error;
  }

  return false;
}

export async function equipRod(rodId: string): Promise<boolean> {
  try {
    const resp = await api.post('/fishing/equip/rod', { rod_id: rodId });
    if (resp?.success) {
      return true;
    }
  } catch (error) {
    console.error('Error equipping rod:', error);
    throw error;
  }

  return false;
}

export async function buyBait(baitId: string, quantity: number): Promise<boolean> {
  try {
    const resp = await api.post('/fishing/buy/bait', { bait_id: baitId, quantity });
    if (resp?.success) {
      return true;
    }
  } catch (error) {
    console.error('Error buying bait:', error);
    throw error;
  }

  return false;
}

export async function equipBait(baitId: string): Promise<boolean> {
  try {
    const resp = await api.post('/fishing/equip/bait', { bait_id: baitId });
    if (resp?.success) {
      return true;
    }
  } catch (error) {
    console.error('Error equipping bait:', error);
    throw error;
  }

  return false;
}

export async function goFishing(): Promise<{
  fishingResult: FishingResult;
  fishCaught: IFish;
  addedToAquarium: boolean;
  soldFor: number;
} | null> {
  try {
    const resp = await api.post<{
      fishingResult: FishingResult;
      fishCaught: IFish;
      addedToAquarium: boolean;
      soldFor: number;
    }>('/fishing/fish');
    if (resp?.success) {
      const payload = resp.data;
      if (payload?.fishingResult && payload?.fishCaught) {
        return {
          fishingResult: payload.fishingResult,
          fishCaught: payload.fishCaught,
          addedToAquarium: payload.addedToAquarium,
          soldFor: payload.soldFor,
        };
      }
    }
  } catch (error) {
    console.error('Error going fishing:', error);
    throw error;
  }

  return null;
}
