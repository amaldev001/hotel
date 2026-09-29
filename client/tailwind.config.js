/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class', // Controlled light theme focus
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#faf4f0',
          100: '#f4e5da',
          200: '#e8caab',
          300: '#dba980',
          400: '#d18455',
          500: '#c85a32', // Warm terracotta primary
          600: '#b44a24',
          700: '#943a1a',
          800: '#773017',
          900: '#612916',
          950: '#35130a',
        },
        accent: {
          50:  '#f2f7f4',
          100: '#deebe3',
          500: '#2d6a4f', // Sage green
          600: '#23533e',
          700: '#1b4130',
        },
        darkbg: {
          DEFAULT: '#0e0d0c',
          card: '#191715',
          hover: '#24211e',
          border: '#2a2724',
        },
      },
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          '"Noto Sans"',
          'sans-serif',
        ],
      },
      minHeight: {
        touch: '44px',
        screen: '100dvh',
      },
      minWidth: {
        touch: '44px',
      },
      animation: {
        'fade-in':  'fadeIn 200ms ease',
        'slide-up': 'slideUp 220ms ease',
        'scale-in': 'scaleIn 150ms ease',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' },                        to: { opacity: '1' } },
        slideUp: { from: { transform: 'translateY(8px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        scaleIn: { from: { transform: 'scale(0.95)', opacity: '0' }, to: { transform: 'scale(1)', opacity: '1' } },
      },
      boxShadow: {
        'card':     '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)',
        'card-lg':  '0 4px 24px rgba(0,0,0,0.10)',
        'floating': '0 8px 32px rgba(0,0,0,0.14)',
      },
    },
  },
  plugins: [],
};
