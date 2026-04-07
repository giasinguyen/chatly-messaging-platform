/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,tsx}', './components/**/*.{js,ts,tsx}'],

  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        chatly: {
          bg: '#F5F5F7',
          card: '#FFFFFF',
          dark: '#1D1D1F',
          text: '#1D1D1F',
          muted: '#6E6E73',
          light: '#AEAEB2',
          cta: '#0071E3',
          'cta-hover': '#0077ED',
          'cta-light': '#E8F2FE',
          border: '#D2D2D7',
          'border-light': '#E5E5EA',
          online: '#34C759',
          offline: '#8E8E93',
          error: '#FF3B30',
          warning: '#FF9500',
          success: '#34C759',
          'bubble-sender': '#0071E3',
          'bubble-receiver': '#F0F0F5',
        },
      },
    },
  },
  plugins: [],
};
