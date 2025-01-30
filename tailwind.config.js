/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './libs/js/**/*.js'],
  mode: 'jit',
  theme: {
    boxShadow: {
      sm: '0 1px 1px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.08)',
      md: '0 4px 8px rgba(0, 0, 0, 0.18), 0 6px 12px rgba(0, 0, 0, 0.10)',
      lg: '0 8px 16px rgba(0, 0, 0, 0.20), 0 10px 24px rgba(0, 0, 0, 0.12)',
    },
    extend: {
      animation: {
        start_absolute: 'startAbsolute 500ms forwards',
        end_absolute: 'endAbsolute 1s forwards',
      },
      keyframes: {
        startAbsolute: {
          '0%': { position: 'absolute' },
          '100%': { position: 'relative' },
        },
        endAbsolute: {
          '0%': { position: 'relative' },
          '100%': { position: 'absolute' },
        },
      },

      fontFamily: {
        sans: ['Lato', 'Arial', 'sans-serif'],
        title: ['Montserrat', 'Arial', 'sans-serif'],
      },
      screens: {
        xs: '424px',
        sm: '640px',
        md: '1024px',
        lg: '1280px',
        xl: '1920px',
      },
      colors: {
        white: {
          50: '#F9FBFC', // very light white
          100: '#F2F4F8', // lighter white
          200: '#E3E7EC', // light grayish white
          300: '#D1D6E1', // soft white
          400: '#BEC4D0', // muted white
          500: '#A3A9B6', // regular white
          600: '#8E96A3', // light gray with a hint of blue
          700: '#747C8C', // subdued white
          800: '#5A6275', // darker shade of white
          900: '#3D4758', // darker white
        },
        blue: {
          50: '#E6F0FF', // very light blue
          100: '#B3D4FF', // light blue
          200: '#80B8FF', // soft blue
          300: '#4D9CFF', // moderate blue
          400: '#1A80FF', // bright blue
          500: '#0065D1', // main blue
          600: '#0050A4', // deep blue
          700: '#003D77', // dark blue
          800: '#002A4A', // very dark blue
          900: '#00151D', // almost black blue
        },
        dm_white: {
          50: '#1A1F26', // very dark white
          100: '#2A313C', // darker white (lighter gray)
          200: '#3C4754', // deep grayish white
          300: '#4E5A6B', // dark white with subtle blue tint
          400: '#63707E', // muted dark gray
          500: '#788493', // regular gray for dark mode
          600: '#8C9BAA', // bluish dark gray
          700: '#A0AEB9', // medium grayish white
          800: '#B4BCC6', // lighter gray for dark mode
          900: '#C8D1D9', // very light gray (off-white)
        },
        dm_blue: {
          50: '#192735', // very dark blue
          100: '#2C4759', // dark bluish shade
          200: '#40647C', // muted blue
          300: '#55738F', // soft blue
          400: '#68829F', // moderate blue
          500: '#7B91B2', // regular blue
          600: '#8F9EC6', // bluish-gray shade
          700: '#A3ADDA', // lighter blue
          800: '#B7BCED', // pale blue
          900: '#CADDFF', // very light blue
        },
      },
    },
  },
  plugins: [],
};
