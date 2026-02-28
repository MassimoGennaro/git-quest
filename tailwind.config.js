/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Warm-tinted grays (slight warm shift)
        panel: {
          950: '#0c0d11',
          900: '#12131a',
          850: '#181a23',
          800: '#1e2030',
          750: '#262838',
          700: '#2e3145',
          600: '#3d4059',
          500: '#555873',
          400: '#8b8ea5',
        },
        // Primary accent: warm amber/orange
        accent: {
          50: '#fff9eb',
          100: '#ffefc6',
          200: '#ffdc88',
          300: '#ffc94a',
          400: '#f59e0b',
          500: '#d97706',
          600: '#b45309',
          700: '#92400e',
          800: '#78350f',
          900: '#451a03',
        },
        // Terminal green (warm-shifted)
        term: {
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        'glow-sm': '0 0 8px 0 rgba(245, 158, 11, 0.15)',
        'glow-md': '0 0 16px 2px rgba(245, 158, 11, 0.2)',
        'glow-lg': '0 0 24px 4px rgba(245, 158, 11, 0.25)',
        'glow-amber': '0 0 12px 0 rgba(245, 158, 11, 0.3)',
      },
      animation: {
        'cursor-blink': 'cursor-blink 1.2s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.3s ease-out',
      },
      keyframes: {
        'cursor-blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.7' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
