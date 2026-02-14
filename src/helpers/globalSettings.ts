import { api } from './api';
import type { IGlobalSettings } from '../../server/common/models/globalSettings';

export async function getGlobalSettings(): Promise<IGlobalSettings | null> {
  try {
    const resp = await api.get<{ settings: IGlobalSettings }>('/settings/features');
    if (resp?.success) {
      return resp.data?.settings || null;
    }
    return null;
  } catch {
    return null;
  }
}

export async function updateGlobalSettings(settings: IGlobalSettings): Promise<boolean> {
  try {
    const resp = await api.post<{ settings: IGlobalSettings }>('/staff/features', { settings });
    return resp?.success ?? false;
  } catch {
    return false;
  }
}
