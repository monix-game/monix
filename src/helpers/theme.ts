import { loadSettings, type IClientSettings } from './settings';

export function applyTheme(theme: IClientSettings['theme']) {
  const root = document.documentElement;

  if (theme === 'light') {
    root.dataset.theme = 'light';
  } else if (theme === 'dark') {
    root.dataset.theme = 'dark';
  } else {
    const isDarkMode = globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = isDarkMode ? 'dark' : 'light';
  }
}

export function initThemeListener() {
  globalThis.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const settings = loadSettings();
    if (settings.theme === 'system') {
      applyTheme('system');
    }
  });
}

export function currentTheme(): 'light' | 'dark' {
  const settings = loadSettings();
  if (settings.theme === 'system') {
    const isDarkMode = globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches;
    return isDarkMode ? 'dark' : 'light';
  }
  return settings.theme;
}
