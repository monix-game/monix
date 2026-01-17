import { localStorageKey } from './constants';

export interface ISettings {
  theme: 'light' | 'dark' | 'system';
  motionReduction: boolean;
}

export const defaultSettings: ISettings = {
  theme: 'light',
  motionReduction: false,
};

export function loadSettings(): ISettings {
  const settingsStr = localStorage.getItem(localStorageKey('settings'));
  if (settingsStr) {
    try {
      const settings: ISettings = JSON.parse(settingsStr) as ISettings;
      const computedSettings: ISettings = { ...defaultSettings, ...settings };
      setRootSettingsAttributes(computedSettings);
      return computedSettings;
    } catch {
      return defaultSettings;
    }
  }
  return defaultSettings;
}

export function saveSettings(settings: ISettings) {
  localStorage.setItem(localStorageKey('settings'), JSON.stringify(settings));
}

export function setRootSettingsAttributes(settings: ISettings) {
  for (const key in settings) {
    const value = settings[key as keyof ISettings];
    const root = document.documentElement;
    root.setAttribute(`data-setting-${key}`, String(value));
  }
}

export function updateSetting<K extends keyof ISettings>(key: K, value: ISettings[K]) {
  const settings = loadSettings();
  settings[key] = value;
  saveSettings(settings);

  const root = document.documentElement;
  root.setAttribute(`data-setting-${key}`, String(value));
}
