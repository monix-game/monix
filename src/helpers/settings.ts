import { type ISettings } from '../../server/common/models/settings';
import { api } from './api';
import { localStorageKey } from './constants';

export interface IClientSettings {
  theme: 'light' | 'dark' | 'system';
  motionReduction: boolean;
}

export const defaultSettings: IClientSettings = {
  theme: 'light',
  motionReduction: false,
};

export function loadSettings(): IClientSettings {
  const settingsStr = localStorage.getItem(localStorageKey('settings'));
  if (settingsStr) {
    try {
      const settings: IClientSettings = JSON.parse(settingsStr) as IClientSettings;
      const computedSettings: IClientSettings = { ...defaultSettings, ...settings };
      setRootSettingsAttributes(computedSettings);
      return computedSettings;
    } catch {
      return defaultSettings;
    }
  }
  return defaultSettings;
}

export function saveSettings(settings: IClientSettings) {
  localStorage.setItem(localStorageKey('settings'), JSON.stringify(settings));
}

export async function saveServerSettings(settings: ISettings): Promise<boolean> {
  try {
    const resp = await api.post('/settings', { settings });
    return resp.success;
  } catch (e) {
    console.error('Failed to save server settings:', e);
    return false;
  }
}

export async function updateServerSetting<K extends keyof ISettings>(
  key: K,
  value: ISettings[K]
): Promise<boolean> {
  try {
    const resp = await api.post('/settings/set', { key, value });
    return resp.success;
  } catch (e) {
    console.error('Failed to update server setting:', e);
    return false;
  }
}

export function setRootSettingsAttributes(settings: IClientSettings) {
  for (const key in settings) {
    const value = settings[key as keyof IClientSettings];
    const root = document.documentElement;
    root.setAttribute(`data-setting-${key}`, String(value));
  }
}

export function updateSetting<K extends keyof IClientSettings>(key: K, value: IClientSettings[K]) {
  const settings = loadSettings();
  settings[key] = value;
  saveSettings(settings);

  const root = document.documentElement;
  root.setAttribute(`data-setting-${key}`, String(value));
}
