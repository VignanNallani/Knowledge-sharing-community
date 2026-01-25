module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f7ff',
          100: '#eef2ff',
          200: '#e0e7ff',
          300: '#c7d2fe',
          400: '#a5b4fc',
          500: '#6478f1',
          600: '#4f63d9',
          700: '#3443b3',
          800: '#24307f',
          900: '#111235'
        },
        boxShadow: {
  card: "0 2px 12px -4px rgba(0,0,0,0.08)",
},

        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#0f172a',
          900: '#0b1220'
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      maxWidth: {
        'app': '1100px'
      }
    ,
    container: {
      center: true,
      padding: '1rem',
    }
    },
  },
  plugins: [],
};
