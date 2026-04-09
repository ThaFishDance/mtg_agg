import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gold: '#c9a84c',
        'mana-w': '#f5f0dc',
        'mana-u': '#4a90d9',
        'mana-b': '#a29cad',
        'mana-r': '#e05c3a',
        'mana-g': '#3a9e5c',
        poison: '#7c3aed',
        primary: '#0d1117',
        secondary: '#161b22',
        card: '#1c2230',
      },
      fontFamily: {
        cinzel: ['var(--font-cinzel)', 'Cinzel', 'serif'],
        inter: ['var(--font-inter)', 'Inter', 'sans-serif'],
        sans: ['var(--font-inter)', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
