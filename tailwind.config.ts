import type { Config } from 'tailwindcss'

export default {
  content: ['./pages/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#030710', 900: '#080E1D', 800: '#0C1628',
          700: '#111E32', 600: '#162641', 500: '#1D3255',
        },
        brand: {
          900: '#061430', 800: '#0D2460', 700: '#1A3D8F',
          600: '#2563EB', 500: '#3B82F6', 400: '#60A5FA', 300: '#93C5FD',
        },
        success: '#22C55E',
        danger:  '#F43F5E',
        warning: '#F59E0B',
        amber:   { 400: '#FBBF24', 900: '#451A03' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
} satisfies Config
