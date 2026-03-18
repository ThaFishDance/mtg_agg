/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gold: '#c9a84c',
        'mana-white': '#f5f0dc',
        'mana-blue': '#4a90d9',
        'mana-black': '#a29cad',
        'mana-red': '#e05c3a',
        'mana-green': '#3a9e5c',
        primary: '#0d1117',
        secondary: '#161b22',
        card: '#1c2230',
      },
      fontFamily: {
        cinzel: ['Cinzel', 'serif'],
        inter: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
