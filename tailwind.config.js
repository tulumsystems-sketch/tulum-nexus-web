/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        tulum: {
          ink: '#0A0E12',
          surface: '#12181F',
          elevated: '#1A222C',
          border: '#2A3542',
          bone: '#E8E4DC',
          muted: '#8B949E',
          accent: '#2A9B8F',
          'accent-hover': '#238F84',
          danger: '#D45B52',
          warning: '#C9A227',
          success: '#3D9B7A',
        },
      },
      fontFamily: {
        sans: [
          'DM Sans',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'sans-serif',
        ],
      },
      fontSize: {
        xs: ['12px', { lineHeight: '16px' }],
        sm: ['14px', { lineHeight: '20px' }],
        base: ['16px', { lineHeight: '24px' }],
        lg: ['20px', { lineHeight: '28px' }],
        xl: ['20px', { lineHeight: '28px' }],
        '2xl': ['28px', { lineHeight: '34px' }],
        '3xl': ['28px', { lineHeight: '34px' }],
      },
      borderRadius: {
        DEFAULT: '8px',
        md: '8px',
        lg: '12px',
        xl: '12px',
        '2xl': '16px',
        '3xl': '16px',
      },
    },
  },
  plugins: [],
};
