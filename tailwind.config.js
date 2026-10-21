/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
        serif: ['Merriweather', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        ink: '#16161d',
        canvas: '#f6f5f2',
        brand: {
          50:  '#eeeefd',
          500: '#6463e0',
          600: '#4a49d8',
          700: '#3b3ab8',
        },
      },
      boxShadow: {
        soft:  '0 2px 8px 0 rgba(22,22,29,0.06), 0 0 0 1px rgba(22,22,29,0.04)',
        paper: '0 8px 32px 0 rgba(22,22,29,0.12), 0 2px 8px 0 rgba(22,22,29,0.06)',
      },
    },
  },
  plugins: [],
}
