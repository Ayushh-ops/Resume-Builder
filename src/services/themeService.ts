export type ThemeId = 'light' | 'navy' | 'inkblue' | 'dark' | 'midnight' | 'forest' | 'rose' | 'slate';

export interface ThemePreset {
  id: ThemeId;
  name: string;
  isDark: boolean;
  canvas: string;
  card: string;
  accent: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  { id: 'light',    name: 'Paper',     isDark: false, canvas: '#f7f6f2', card: '#ffffff', accent: '#b4451f' },
  { id: 'navy',     name: 'Navy',      isDark: true,  canvas: '#0a0e1a', card: '#111728', accent: '#6366f1' },
  { id: 'inkblue',  name: 'Ink blue',  isDark: true,  canvas: '#070912', card: '#0d111f', accent: '#38bdf8' },
  { id: 'dark',     name: 'Dark',      isDark: true,  canvas: '#121212', card: '#1a1a1a', accent: '#e07a4f' },
  { id: 'midnight', name: 'Midnight',  isDark: true,  canvas: '#000000', card: '#0b0b0b', accent: '#e07a4f' },
  { id: 'forest',   name: 'Forest',    isDark: true,  canvas: '#141715', card: '#1b201d', accent: '#3d8b68' },
  { id: 'rose',     name: 'Rose',      isDark: false, canvas: '#f7f4f4', card: '#ffffff', accent: '#ab485c' },
  { id: 'slate',    name: 'Slate',     isDark: false, canvas: '#f5f6f7', card: '#ffffff', accent: '#445163' },
];

export const RC_THEME_KEY = 'rc-theme';
const LAST_LIGHT_KEY = 'rc-theme-last-light';
const LAST_DARK_KEY = 'rc-theme-last-dark';

export function isDarkTheme(theme: ThemeId): boolean {
  return ['navy', 'inkblue', 'dark', 'midnight', 'forest'].includes(theme);
}

export function getInitialTheme(): ThemeId {
  try {
    // Migration from old keys
    const legacyMode = localStorage.getItem('resumecraft_app_theme');
    const legacyAccent = localStorage.getItem('resumecraft_app_accent');
    if (legacyMode || legacyAccent) {
      localStorage.setItem(RC_THEME_KEY, legacyMode === 'dark' ? 'navy' : 'light');
      localStorage.removeItem('resumecraft_app_theme');
      localStorage.removeItem('resumecraft_app_accent');
    }
  } catch (e) {}

  const saved = localStorage.getItem(RC_THEME_KEY) as ThemeId | null;
  if (saved && THEME_PRESETS.some((p) => p.id === saved)) {
    return saved;
  }
  if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'navy';
  }
  return 'light';
}

export function applyTheme(theme: ThemeId): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.removeAttribute('data-accent');
  localStorage.setItem(RC_THEME_KEY, theme);

  const preset = THEME_PRESETS.find((p) => p.id === theme);
  if (preset) {
    localStorage.setItem('rc-accent', preset.accent);
    document.documentElement.style.setProperty('--app-accent', preset.accent);
  }

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
    const lastDark = (localStorage.getItem(LAST_DARK_KEY) as ThemeId) || 'navy';
    const target = THEME_PRESETS.some((p) => p.id === lastDark && p.isDark) ? lastDark : 'navy';
    applyTheme(target);
    return target;
  }
}
