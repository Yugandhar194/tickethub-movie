/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: '#09090B',
        raised: '#111114',
        ink: '#FAFAFA',
        mute: '#A1A1AA',
        faint: '#71717A',
        crimson: { DEFAULT: '#E11D48', soft: '#FB7185', deep: '#9F1239' },
        gold: { DEFAULT: '#F59E0B', soft: '#FCD34D' },
        seat: { classic: '#3F3F46', executive: '#52525B', recliner: '#78350F' },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: { poster: '14px', panel: '20px' },
      boxShadow: {
        lift: '0 18px 40px -12px rgba(0,0,0,0.7)',
        crimson: '0 10px 30px -8px rgba(225,29,72,0.55)',
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        marquee: { '100%': { transform: 'translateX(-50%)' } },
      },
      animation: { shimmer: 'shimmer 1.6s infinite' },
    },
  },
  plugins: [],
};
