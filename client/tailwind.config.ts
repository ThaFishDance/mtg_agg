import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gold: 'var(--accent)',
        muted: 'var(--text-muted)',
        'mana-w': '#f5f0dc',
        'mana-u': '#4a90d9',
        'mana-b': '#a29cad',
        'mana-r': '#e05c3a',
        'mana-g': '#3a9e5c',
        poison: '#7c3aed',
        primary: 'var(--surface-page)',
        secondary: 'var(--surface-raised)',
        card: 'var(--surface-card)',
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
