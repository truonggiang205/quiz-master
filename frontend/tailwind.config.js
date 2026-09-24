/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        pastel: {
          lavender: {
            50: '#faf5ff',
            100: '#f3e8ff',
            200: '#e9d5ff',
            300: '#d8b4fe',
            400: '#c084fc',
            500: '#a855f7',
            DEFAULT: '#818cf8',
            soft: '#e0e7ff',
            bg: '#eef2ff',
          },
          mint: {
            50: '#f0fdf4',
            100: '#dcfce7',
            200: '#bbf7d0',
            300: '#86efac',
            DEFAULT: '#4ade80',
            text: '#15803d',
            soft: '#dcfce7',
          },
          peach: {
            50: '#fff7ed',
            100: '#ffedd5',
            200: '#fed7aa',
            300: '#fdba74',
            DEFAULT: '#fb923c',
            text: '#c2410c',
            soft: '#ffedd5',
          },
          rose: {
            50: '#fff1f2',
            100: '#ffe4e6',
            200: '#fecdd3',
            300: '#fda4af',
            DEFAULT: '#fb7185',
            text: '#be123c',
            soft: '#ffe4e6',
          },
          sky: {
            50: '#f0f9ff',
            100: '#e0f2fe',
            200: '#bae6fd',
            300: '#7dd3fc',
            DEFAULT: '#38bdf8',
            text: '#0369a1',
            soft: '#e0f2fe',
          },
          amber: {
            50: '#fffbeb',
            100: '#fef3c7',
            200: '#fde68a',
            300: '#fcd34d',
            DEFAULT: '#fbbf24',
            text: '#b45309',
            soft: '#fef3c7',
          },
          slate: {
            50: '#f8fafc',
            100: '#f1f5f9',
            200: '#e2e8f0',
            800: '#1e293b',
            900: '#0f172a',
          }
        },
        neumorph: {
          bg: '#e7ebf0',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        'instrument-serif': ['"Instrument Serif"', 'serif'],
      },
      boxShadow: {
        'pastel': '0 10px 25px -5px rgba(129, 140, 248, 0.12), 0 8px 10px -6px rgba(129, 140, 248, 0.08)',
        'pastel-mint': '0 10px 25px -5px rgba(74, 222, 128, 0.15)',
        'pastel-rose': '0 10px 25px -5px rgba(251, 113, 133, 0.15)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        'neumorph': '15px 15px 30px rgba(163,177,198,0.55), -15px -15px 30px rgba(255,255,255,0.9)',
        'neumorph-inset': 'inset 8px 8px 16px rgba(163,177,198,0.55), inset -8px -8px 16px rgba(255,255,255,0.9)',
        'neumorph-sm': '5px 5px 10px rgba(163,177,198,0.55), -5px -5px 10px rgba(255,255,255,0.9)',
      },
      borderRadius: {
        '3xl': '1.75rem',
      },
      keyframes: {
        floating: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'fade-rise': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      },
      animation: {
        floating: 'floating 6s ease-in-out infinite',
        'fade-rise': 'fade-rise 0.8s ease-out forwards',
        'fade-rise-delay': 'fade-rise 0.8s ease-out 0.2s forwards',
        'fade-rise-delay-2': 'fade-rise 0.8s ease-out 0.4s forwards',
      }
    },
  },
  plugins: [],
}
