import { api } from './api';

export async function prestige(): Promise<{ shards: number } | null> {
  const response = await api.post<{ ok: boolean; shards?: number }>('/user/prestige');
  return response.success && response.data?.ok && typeof response.data.shards === 'number'
    ? { shards: response.data.shards }
    : null;
}

export async function buyPermanentUpgrade(upgradeId: string): Promise<boolean> {
  const response = await api.post<{ ok: boolean }>('/user/permanent-upgrade', {
    upgrade_id: upgradeId,
  });
  return response.success && response.data?.ok === true;
}
