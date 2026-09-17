import type { Config } from 'tailwindcss';

// Paleta y tipografia extraidas del diseño en Claude Design:
// "InstantMovies Landing.dc.html" (proyecto 7df68c9f-9f8d-4cf9-903b-1c26de39b8ca).
// Tono: cine nocturno / blueprint tecnico — fondo casi negro, acento ambar,
// texto marfil calido, bordes finos sin redondear.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0d0e11',
        surface: '#14161b',
        'surface-raised': '#181a20',
        ink: '#efe8d8',
        muted: 'color-mix(in srgb, #efe8d8 60%, transparent)',
        divider: 'color-mix(in srgb, #efe8d8 18%, transparent)',
        accent: {
          DEFAULT: '#e0a458',
          dark: '#c9803a',
          light: '#f2c98a',
          ink: '#1a1208',
          muted: 'color-mix(in srgb, #e0a458 15%, #14161b)',
        },
        // tonos decorativos para los posters-placeholder de la Landing (sin poster real de TMDB)
        poster: {
          rust: '#8b3d2a',
          bronze: '#c88a44',
          clay: '#a26236',
        },
      },
      fontFamily: {
        display: ['"Barlow Condensed"', 'system-ui', 'sans-serif'],
        sans: ['"Barlow"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0,0,0,.5)',
        DEFAULT: '0 6px 18px rgba(0,0,0,.55)',
        lg: '0 20px 48px rgba(0,0,0,.65)',
      },
      keyframes: {
        rise: {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'none' },
        },
        flicker: {
          '0%, 100%': { opacity: '.55' },
          '45%': { opacity: '.4' },
          '55%': { opacity: '.7' },
        },
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        blink: {
          '0%, 80%, 100%': { opacity: '.25' },
          '40%': { opacity: '1' },
        },
        'like-bounce': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.3)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        rise: 'rise .9s cubic-bezier(.2,.7,.2,1) both',
        flicker: 'flicker 6s ease-in-out infinite',
        marquee: 'marquee 40s linear infinite',
        blink: 'blink 1.2s infinite',
        'like-bounce': 'like-bounce .4s ease-out',
      },
    },
  },
} satisfies Config;
