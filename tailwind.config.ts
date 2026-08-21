import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Julieta's Flowers Brand Colors (UX-Optimized - dorados muy oscuros, textos blancos)
        'black-soft': {
          DEFAULT: '#1a1a1a',
        },
        'beige-light': {
          DEFAULT: '#faf7f2',  // Más neutro y claro para navbar
          hover: '#f5f0e8',
        },
        'beige-medium': {
          DEFAULT: '#f0ebe5',  // Más suave para footer
          dark: '#e8e3db',
        },
        'beige-pink': {
          DEFAULT: '#f5f0e8',  // Muy sutil
        },
        'gold-elegant': {
          DEFAULT: '#c9a030',  // SOLO para acentos puntuales
          hover: '#a67f22',
        },
        'gold-dark': {
          DEFAULT: '#5a4510',  // Dorado muy oscuro para fondos (navbar/footer)
          hover: '#3a2a08',    // Dorado extremadamente oscuro para hover
        },
        'white-vintage': {
          DEFAULT: '#f5f0e8',
        },
        'white-pure': {
          DEFAULT: '#ffffff',  // Blanco puro para textos sobre dorado oscuro
        },
        'gray-dark': {
          DEFAULT: '#3d3d3d',  // Más suave
        },
        'gray-medium': {
          DEFAULT: '#5a5a5a',  // Más suave
        },
        // Temporales
        'red-wine': {
          DEFAULT: '#710419',
          dark: '#5a0314',
        },
        'yellow': {
          DEFAULT: '#ffd70e',
          dark: '#e5c400',
        },
      },
      fontFamily: {
        vonca: ['var(--font-vonca)', 'Playfair Display', 'serif'],
        'lovely-flowers': ['var(--font-lovely-flowers)', 'Great Vibes', 'cursive'],
      },
    },
  },
};

export default config;
