/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          900: '#1e1b4b',
        },
        surface: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          950: '#090b10',
          900: '#0e121b',
          850: '#121723',
          800: '#161b27',
          750: '#1b2231',
          700: '#222b3e',
          600: '#2b364d',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Consolas', 'monospace'],
      },
      boxShadow: {
        // Dark Neumorphism (Soft & Comfortable)
        'neu-dark-flat': '6px 6px 14px #0a0d14, -6px -6px 14px #22293a',
        'neu-dark-flat-sm': '3px 3px 8px #0a0d14, -3px -3px 8px #22293a',
        'neu-dark-pressed': 'inset 4px 4px 8px #0a0d14, inset -4px -4px 8px #22293a',
        'neu-dark-glow': '6px 6px 14px #0a0d14, -6px -6px 14px #22293a, 0 0 15px rgba(99, 102, 241, 0.35)',

        // Light Neumorphism (Soft & Crisp)
        'neu-light-flat': '6px 6px 14px #c3cbd7, -6px -6px 14px #ffffff',
        'neu-light-flat-sm': '3px 3px 8px #c3cbd7, -3px -3px 8px #ffffff',
        'neu-light-pressed': 'inset 4px 4px 8px #c3cbd7, inset -4px -4px 8px #ffffff',
        'neu-light-glow': '6px 6px 14px #c3cbd7, -6px -6px 14px #ffffff, 0 0 15px rgba(99, 102, 241, 0.25)',
      },
    },
  },
  plugins: [],
};
