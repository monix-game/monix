import { loadSettings, type IClientSettings } from './settings';

export function applyTheme(theme: IClientSettings['theme']) {
  const root = document.documentElement;

  if (theme === 'light') {
    root.setAttribute('data-theme', 'light');
  } else if (theme === 'dark') {
    root.setAttribute('data-theme', 'dark');
  } else {
    const isDarkMode =
      window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }
}

export function initThemeListener() {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const settings = loadSettings();
    if (settings.theme === 'system') {
      applyTheme('system');
    }
  });
}

export function currentTheme(): 'light' | 'dark' {
  const settings = loadSettings();
  if (settings.theme === 'system') {
    const isDarkMode =
      window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return isDarkMode ? 'dark' : 'light';
  }
  return settings.theme;
}
