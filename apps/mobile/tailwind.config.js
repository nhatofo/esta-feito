/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Matches web design tokens exactly
        brand: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        earth: {
          50:  '#fdf8f0',
          100: '#faebd7',
          500: '#a0714f',
          700: '#6b4c33',
          900: '#2d1f0e',
        },
        surface: '#fdf8f0',
        ink:     '#1c1309',
        muted:   '#78716c',
      },
      fontFamily: {
        display: ['PlayfairDisplay_700Bold'],
        body:    ['PlusJakartaSans_400Regular'],
        'body-semi': ['PlusJakartaSans_600SemiBold'],
        'body-bold': ['PlusJakartaSans_700Bold'],
      },
      borderRadius: {
        card: '16px',
        btn:  '10px',
      },
    },
  },
  plugins: [],
};
