/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
        serif: ['Merriweather', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        ink: 'rgb(var(--ink-rgb) / <alpha-value>)',
        canvas: 'rgb(var(--canvas-rgb) / <alpha-value>)',
        card: 'rgb(var(--card-rgb) / <alpha-value>)',
        muted: 'rgb(var(--muted-rgb) / <alpha-value>)',
        line: 'var(--line)',
        border: 'var(--line)',
        brand: {
          50:  'var(--brand-50)',
          500: 'var(--brand-500)',
          600: 'var(--brand-600)',
          700: 'var(--brand-700)',
        },
      },
      boxShadow: {
        soft:  '0 2px 8px 0 rgba(22,22,29,0.06), 0 0 0 1px var(--border)',
        paper: '0 8px 32px 0 rgba(22,22,29,0.12), 0 2px 8px 0 rgba(22,22,29,0.06)',
      },
    },
  },
  plugins: [],
}
