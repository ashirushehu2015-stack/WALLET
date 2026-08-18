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
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        dark: {
          900: '#070a11',
          800: '#0b0f19',
          700: '#111827',
          600: '#1f2937',
          500: '#374151',
        },
        brand: {
          cyan: '#06b6d4',
          emerald: '#10b981',
          indigo: '#6366f1',
          purple: '#8b5cf6',
        }
      },
    },
  },
  plugins: [],
};
