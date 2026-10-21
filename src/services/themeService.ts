export type ThemeId = 'light' | 'dark' | 'midnight' | 'forest' | 'rose' | 'slate';

export interface ThemePreset {
  id: ThemeId;
  name: string;
  isDark: boolean;
  canvas: string;
  card: string;
  accent: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  { id: 'light',    name: 'Warm Light',      isDark: false, canvas: '#f6f5f2', card: '#ffffff', accent: '#4a49d8' },
  { id: 'dark',     name: 'Obsidian Dark',   isDark: true,  canvas: '#0f0f14', card: '#17171f', accent: '#6463e0' },
  { id: 'midnight', name: 'Midnight OLED',   isDark: true,  canvas: '#000000', card: '#101014', accent: '#7b7af0' },
  { id: 'forest',   name: 'Forest Emerald',  isDark: true,  canvas: '#0b130f', card: '#121d17', accent: '#10b981' },
  { id: 'rose',     name: 'Rose Quartz',     isDark: false, canvas: '#fdf7f8', card: '#ffffff', accent: '#e11d48' },
  { id: 'slate',    name: 'Corporate Slate', isDark: false, canvas: '#f8fafc', card: '#ffffff', accent: '#475569' },
];

export const RC_THEME_KEY = 'rc-theme';
const LAST_LIGHT_KEY = 'rc-theme-last-light';
const LAST_DARK_KEY = 'rc-theme-last-dark';

export function isDarkTheme(theme: ThemeId): boolean {
  return ['dark', 'midnight', 'forest'].includes(theme);
}

export function getInitialTheme(): ThemeId {
  try {
    // Migration from old keys
    const legacyMode = localStorage.getItem('resumecraft_app_theme');
    const legacyAccent = localStorage.getItem('resumecraft_app_accent');
    if (legacyMode || legacyAccent) {
      localStorage.setItem(RC_THEME_KEY, legacyMode === 'dark' ? 'dark' : 'light');
      localStorage.removeItem('resumecraft_app_theme');
      localStorage.removeItem('resumecraft_app_accent');
    }
  } catch (e) {}

  const saved = localStorage.getItem(RC_THEME_KEY) as ThemeId | null;
  if (saved && THEME_PRESETS.some((p) => p.id === saved)) {
    return saved;
  }
  if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export function applyTheme(theme: ThemeId): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.removeAttribute('data-accent');
  localStorage.setItem(RC_THEME_KEY, theme);

  if (isDarkTheme(theme)) {
    localStorage.setItem(LAST_DARK_KEY, theme);
  } else {
    localStorage.setItem(LAST_LIGHT_KEY, theme);
  }
}

export function toggleLightDarkTheme(currentTheme: ThemeId): ThemeId {
  const currentIsDark = isDarkTheme(currentTheme);
  if (currentIsDark) {
    const lastLight = (localStorage.getItem(LAST_LIGHT_KEY) as ThemeId) || 'light';
    const target = THEME_PRESETS.some((p) => p.id === lastLight && !p.isDark) ? lastLight : 'light';
    applyTheme(target);
    return target;
  } else {
    const lastDark = (localStorage.getItem(LAST_DARK_KEY) as ThemeId) || 'dark';
    const target = THEME_PRESETS.some((p) => p.id === lastDark && p.isDark) ? lastDark : 'dark';
    applyTheme(target);
    return target;
  }
}
