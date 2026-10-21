export type ThemeMode = 'light' | 'dark';
export type ThemeAccent = 'indigo' | 'emerald' | 'rose' | 'slate';

const THEME_MODE_KEY = 'resumecraft_app_theme';
const THEME_ACCENT_KEY = 'resumecraft_app_accent';

export function getInitialThemeMode(): ThemeMode {
  const saved = localStorage.getItem(THEME_MODE_KEY);
  if (saved === 'dark' || saved === 'light') return saved;
  if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export function getInitialThemeAccent(): ThemeAccent {
  const saved = localStorage.getItem(THEME_ACCENT_KEY);
  if (saved && ['indigo', 'emerald', 'rose', 'slate'].includes(saved)) {
    return saved as ThemeAccent;
  }
  return 'indigo';
}

export function applyAppTheme(mode: ThemeMode, accent: ThemeAccent): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', mode);
  document.documentElement.setAttribute('data-accent', accent);
  localStorage.setItem(THEME_MODE_KEY, mode);
  localStorage.setItem(THEME_ACCENT_KEY, accent);
}
