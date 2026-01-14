import { localStorageKey } from './constants';

export interface ISettings {
  theme: 'light' | 'dark' | 'system';
}

export const defaultSettings: ISettings = {
  theme: 'system',
};

export function loadSettings(): ISettings {
  const settingsStr = localStorage.getItem(localStorageKey('settings'));
  if (settingsStr) {
    try {
      const settings: ISettings = JSON.parse(settingsStr) as ISettings;
      return { ...defaultSettings, ...settings };
    } catch {
      return defaultSettings;
    }
  }
  return defaultSettings;
}

export function saveSettings(settings: ISettings) {
  localStorage.setItem(localStorageKey('settings'), JSON.stringify(settings));
}
