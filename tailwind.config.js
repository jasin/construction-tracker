/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: 'media', // or 'class' if you want manual dark mode toggle
  theme: {
    extend: {
      fontFamily: {
        sans: ['Public Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        // Compact, data-dense typography scale
        xs: ['0.75rem', { lineHeight: '1.25' }], // 12px
        sm: ['0.8125rem', { lineHeight: '1.375' }], // 13px
        base: ['0.875rem', { lineHeight: '1.5' }], // 14px (default)
        lg: ['0.9375rem', { lineHeight: '1.5' }], // 15px
        xl: ['1rem', { lineHeight: '1.5' }], // 16px
        '2xl': ['1.125rem', { lineHeight: '1.5' }], // 18px
        '3xl': ['1.25rem', { lineHeight: '1.4' }], // 20px
        '4xl': ['1.5rem', { lineHeight: '1.3' }], // 24px
        '5xl': ['1.875rem', { lineHeight: '1.2' }], // 30px
      },
      letterSpacing: {
        tighter: '-0.02em',
        tight: '-0.01em',
        normal: '0',
        wide: '0.01em',
        wider: '0.02em',
        widest: '0.03em',
      },
    },
  },
  plugins: [require('tailwindcss-primeui')],
};
