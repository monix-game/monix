import type { IFish } from '../../server/common/models/fish';
import type { FishingResult } from '../../server/common/fishing/fishing';
import type { UpcomingFishingEvent } from '../../server/common/fishing/fishingEvents';
import { api } from './api';

export interface FishingFrenzyStatus {
  active: boolean;
  endsAt: number;
  cooldownRemainingMs: number;
}

export async function getFrenzyStatus(): Promise<FishingFrenzyStatus | null> {
  try {
    const resp = await api.get<FishingFrenzyStatus>('/fishing/frenzy');
    if (resp?.success && resp.data) {
      return resp.data;
    }
  } catch (error) {
    console.error('Error fetching fishing frenzy status:', error);
  }
  return null;
}

export async function activateFrenzy(
  paymentType: 'gems' | 'money'
): Promise<{ ok: boolean; error?: string; status?: FishingFrenzyStatus }> {
  try {
    const resp = await api.post<{ error?: string; status?: 'activated' } & FishingFrenzyStatus>(
      '/fishing/frenzy/activate',
      { payment_type: paymentType }
    );
    if (resp?.success && resp.data) {
      return { ok: true, status: resp.data };
    }
    return { ok: false, error: resp?.data?.error };
  } catch (error) {
    console.error('Error activating fishing frenzy:', error);
    return { ok: false, error: 'Failed to activate fishing frenzy' };
  }
}

export interface EventPreviewResult {
  unlocked: boolean;
  events: UpcomingFishingEvent[] | null;
  gems?: number;
}

export async function getEventPreview(): Promise<EventPreviewResult | null> {
  try {
    const resp = await api.get<EventPreviewResult>('/fishing/events-preview');
    if (resp?.success && resp.data) {
      return resp.data;
    }
  } catch (error) {
    console.error('Error fetching fishing event preview:', error);
  }
  return null;
}

export async function unlockEventPreview(): Promise<EventPreviewResult | null> {
  try {
    const resp = await api.post<EventPreviewResult>('/fishing/events-preview/unlock');
    if (resp?.success && resp.data) {
      return resp.data;
    }
  } catch (error) {
    console.error('Error unlocking fishing event preview:', error);
  }
  return null;
}

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

export async function sellAllFish(): Promise<boolean> {
  try {
    const resp = await api.post('/fishing/aquarium/sell/all');
    if (resp?.success) {
      return true;
    }
  } catch (error) {
    console.error('Error selling all fish:', error);
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

export async function sellRod(rodId: string): Promise<boolean> {
  try {
    const resp = await api.post('/fishing/sell/rod', { rod_id: rodId });
    if (resp?.success) {
      return true;
    }
  } catch (error) {
    console.error('Error selling rod:', error);
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

export async function unequipBait(): Promise<boolean> {
  try {
    const resp = await api.post('/fishing/unequip/bait', {});
    if (resp?.success) {
      return true;
    }
  } catch (error) {
    console.error('Error unequipping bait:', error);
    throw error;
  }

  return false;
}

export async function goFishing(autoSell: boolean = false): Promise<{
  fishingResult: FishingResult;
  fishCaught: IFish;
  success: boolean;
} | null> {
  try {
    const resp = await api.post<{
      fishingResult: FishingResult;
      fishCaught: IFish;
      success: boolean;
    }>('/fishing/fish', { auto_sell: autoSell });
    if (resp?.success) {
      const payload = resp.data;
      if (payload) {
        return {
          fishingResult: payload.fishingResult,
          fishCaught: payload.fishCaught,
          success: payload.success,
        };
      }
    }
  } catch (error) {
    console.error('Error going fishing:', error);
    throw error;
  }

  return null;
}

export interface SailorFleet {
  levels: number[];
  last_collected_at?: number;
  pending_coins?: number;
}

export async function collectSailorEarnings(): Promise<{
  success: boolean;
  earned?: number;
  money?: number;
  sailors?: SailorFleet;
  message?: string;
}> {
  try {
    const resp = await api.post<{
      message?: string;
      earned?: number;
      money?: number;
      sailors?: SailorFleet;
    }>('/fishing/sailors/collect');
    if (resp?.success) {
      return {
        success: true,
        earned: resp.data?.earned,
        money: resp.data?.money,
        sailors: resp.data?.sailors,
        message: resp.data?.message,
      };
    }
    return { success: false, message: resp?.data?.message };
  } catch (error) {
    console.error('Error collecting sailor earnings:', error);
    throw error;
  }
}

export async function hireSailor(): Promise<{
  success: boolean;
  money?: number;
  sailors?: SailorFleet;
  message?: string;
}> {
  try {
    const resp = await api.post<{
      message?: string;
      money?: number;
      sailors?: SailorFleet;
    }>('/fishing/sailors/hire');
    if (resp?.success) {
      return {
        success: true,
        money: resp.data?.money,
        sailors: resp.data?.sailors,
        message: resp.data?.message,
      };
    }
    return { success: false, message: resp?.data?.message };
  } catch (error) {
    console.error('Error hiring sailor:', error);
    throw error;
  }
}

export async function levelUpSailor(sailorIndex: number): Promise<{
  success: boolean;
  money?: number;
  sailor_level?: number;
  sailors?: SailorFleet;
  message?: string;
}> {
  try {
    const resp = await api.post<{
      message?: string;
      money?: number;
      sailor_level?: number;
      sailors?: SailorFleet;
    }>('/fishing/sailors/levelup', { sailor_index: sailorIndex });
    if (resp?.success) {
      return {
        success: true,
        money: resp.data?.money,
        sailor_level: resp.data?.sailor_level,
        sailors: resp.data?.sailors,
        message: resp.data?.message,
      };
    }
    return { success: false, message: resp?.data?.message };
  } catch (error) {
    console.error('Error leveling up sailor:', error);
    throw error;
  }
}
