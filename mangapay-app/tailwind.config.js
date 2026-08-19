/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      colors: {
        milky: {
          bg: '#FDFBF7',
          surface: '#FFFFFF',
          elevated: '#F9F6F1',
          border: '#EDE8E0',
          primary: '#1C1917',
          secondary: '#78716C',
          tertiary: '#A8A29E',
          accent: '#0F766E',
          'accent-soft': '#CCFBF1',
          success: '#15803D',
          warning: '#B45309',
          error: '#B91C1C',
        },
      },
      boxShadow: {
        soft: '0 4px 20px rgba(28, 25, 23, 0.06)',
        card: '0 8px 30px rgba(28, 25, 23, 0.08)',
        sheet: '0 -10px 40px rgba(28, 25, 23, 0.12)',
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
};
