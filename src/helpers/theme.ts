import { loadSettings, type IClientSettings } from './settings';
import defaultLogoLight from '../assets/logo.svg';
import defaultLogoDark from '../assets/logo-dark.svg';
import halloweenLogo from '../assets/halloween monix.svg';

/**
 * Resolved light/dark mode. Kept separate from the palette so that components
 * which need to know whether they are on a light or dark surface (logo
 * swapping, native form controls) keep working regardless of palette.
 */
export type ResolvedTheme = 'light' | 'dark';

/**
 * Selectable colour schemes. Every palette declares a light/dark variant, so
 * `system` still resolves to a real light or dark background.
 */
export const themePalettes = [
  { id: 'monix', name: 'Monix', description: 'The original green' },
  { id: 'ocean', name: 'Ocean', description: 'Cool blues' },
  { id: 'sunset', name: 'Sunset', description: 'Warm oranges' },
  { id: 'forest', name: 'Forest', description: 'Deep greens' },
  { id: 'candy', name: 'Candy', description: 'Pastel pinks' },
  { id: 'mono', name: 'Mono', description: 'Neutral greys' },
] as const;

export type ThemePalette = (typeof themePalettes)[number]['id'];

export const defaultThemePalette: ThemePalette = 'monix';

/**
 * Seasonal themes. Only one is active at a time and it replaces the standard
 * palette selection while switched on.
 */
export const seasonalThemes = [
  {
    id: 'halloween',
    name: 'Halloween',
    description: 'Spooky orange accents',
    logo: halloweenLogo,
  },
] as const;

export type SeasonalTheme = (typeof seasonalThemes)[number]['id'];

export function isThemePalette(value: unknown): value is ThemePalette {
  return themePalettes.some(theme => theme.id === value);
}

function systemPrefersDark(): boolean {
  return Boolean(globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches);
}

/** The light/dark mode actually in effect, resolving `system` against the OS. */
export function resolveTheme(theme: IClientSettings['theme']): ResolvedTheme {
  if (theme === 'light' || theme === 'dark') return theme;
  return systemPrefersDark() ? 'dark' : 'light';
}

function currentPalette(): ThemePalette {
  const stored = loadSettings().palette;
  return isThemePalette(stored) ? stored : defaultThemePalette;
}

/** Whether a seasonal theme is currently switched on. */
export function isSeasonalThemeActive(): boolean {
  return Boolean(loadSettings().seasonalTheme);
}

/**
 * The logo to show for the active theme. Seasonal themes supply their own
 * logo, otherwise the light/dark Monix logo is used.
 */
export function themeLogo(resolved: ResolvedTheme): string {
  if (isSeasonalThemeActive()) {
    const seasonal = seasonalThemes[0];
    return seasonal.logo;
  }
  return resolved === 'dark' ? defaultLogoDark : defaultLogoLight;
}

export function applyTheme(theme: IClientSettings['theme']) {
  const root = document.documentElement;
  const resolved = resolveTheme(theme);
  const seasonal = isSeasonalThemeActive();
  const palette = currentPalette();

  // `data-theme` stays light/dark so existing light/dark-only styles (logo
  // swapping, form controls) keep working; the palette carries the hue.
  root.dataset.theme = resolved;
  // Seasonal themes take precedence over the palette so that only light/dark
  // remains selectable while one is active.
  root.dataset.palette = seasonal ? seasonalThemes[0].id : palette;
  root.dataset.seasonal = seasonal ? 'true' : 'false';

  // Keep native widgets (scrollbars, date pickers, autofill) in step.
  root.style.colorScheme = resolved;
}

export function initThemeListener() {
  globalThis.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const settings = loadSettings();
    if (settings.theme === 'system') {
      applyTheme('system');
    }
  });
}

/** The light/dark mode in effect; palettes do not affect this. */
export function currentTheme(): ResolvedTheme {
  return resolveTheme(loadSettings().theme);
}

export function currentPaletteId(): ThemePalette {
  return currentPalette();
}
