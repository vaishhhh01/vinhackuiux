/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        abyss: 'var(--abyss)',
        'abyss-2': 'var(--abyss-2)',
        cyan: 'var(--glow-cyan)',
        amber: 'var(--glow-amber)',
        red: 'var(--glow-red)',
        gold: 'var(--warden-gold)',
        locked: 'var(--locked-gray)',
        ink: 'var(--text)',
        'ink-70': 'var(--text-70)',
      },
      fontFamily: { sans: ['Nunito', 'Quicksand', 'ui-rounded', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
}
