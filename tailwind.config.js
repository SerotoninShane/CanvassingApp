/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './lib/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        'primary-teal': '#008C99',
        'primary-teal-dark': '#006670',
        'primary-teal-light': '#E0F7F9',
      },
    },
  },
  plugins: [],
};
