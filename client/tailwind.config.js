/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0A0A0A', // Negro profundo — fondo principal (60%)
        surface: '#121212', // Negro carbón — fondo secundario (30%)
        card: '#1A1A1A', // Gris oscuro — tarjetas, sidebar
        line: '#2A2A2A', // Gris medio — bordes, inputs
        gold: {
          DEFAULT: '#D4AF37', // Dorado principal — CTA, acentos (10%)
          bright: '#FFD700', // Dorado brillante — hover, badges
          dark: '#B8860B', // Dorado oscuro — estados activos secundarios
        },
        success: '#10B981',
        danger: '#EF4444',
        warning: '#F59E0B',
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #FFD700 0%, #D4AF37 100%)',
      },
      boxShadow: {
        'gold-glow': '0 0 20px rgba(212, 175, 55, 0.35)',
        'gold-glow-strong': '0 0 30px rgba(255, 215, 0, 0.5)',
      },
    },
  },
  plugins: [],
};
