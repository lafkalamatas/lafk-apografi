/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#faf6eb',
          100: '#f5edd5',
          200: '#e8d5a0',
          300: '#d4b76a',
          400: '#c4a94d',
          500: '#8b7d3c',
          600: '#6b5f2d',
          700: '#4a421e',
        },
        military: {
          50: '#faf8f3',
          100: '#f0ece0',
          200: '#e8e3d6',
          300: '#d4cfc2',
          400: '#8a8578',
          500: '#5a5750',
          600: '#2c2a24',
          700: '#1a1a1a',
          800: '#111111',
          900: '#0a0a0a',
        },
      },
      fontFamily: {
        serif: ['Georgia', 'Times New Roman', 'serif'],
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
