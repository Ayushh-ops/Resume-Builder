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
        sans: ['Instrument Sans', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Newsreader', 'Georgia', 'serif'],
        serif: ['Newsreader', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '6px',
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '10px',
        '2xl': '10px',
        full: '9999px',
      },
      colors: {
        ink: 'rgb(var(--ink) / <alpha-value>)',
        canvas: 'rgb(var(--canvas) / <alpha-value>)',
        card: 'rgb(var(--card) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        border: 'rgb(var(--line) / <alpha-value>)',
        'on-brand': 'rgb(var(--on-brand) / <alpha-value>)',
        brand: {
          50:  'rgb(var(--brand-50) / <alpha-value>)',
          500: 'rgb(var(--brand-500) / <alpha-value>)',
          600: 'rgb(var(--brand-600) / <alpha-value>)',
          700: 'rgb(var(--brand-700) / <alpha-value>)',
        },
      },
      boxShadow: {
        soft: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        menu: '0 4px 16px -2px rgba(0, 0, 0, 0.08), 0 0 0 1px rgb(var(--line))',
        modal: '0 16px 48px -8px rgba(0, 0, 0, 0.18), 0 0 0 1px rgb(var(--line))',
        paper: '0 2px 8px -2px rgba(0, 0, 0, 0.08), 0 0 0 1px rgb(var(--line))',
      },
    },
  },
  plugins: [],
}
