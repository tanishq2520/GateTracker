/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg:               '#1C1917',
        surface:          '#292524',
        border:           '#44403C',
        'nav-active':     '#3C3733',
        'input-bg':       '#3C3733',
        'text-primary':   '#FAFAF9',
        'text-secondary': '#A8A29E',
        'text-muted':     '#57534E',
        // Accent / CTA — orange
        accent:           '#F97316',
        'accent-blue':    '#F97316',  // alias — existing usages turn orange
        // Semantic
        'accent-green':   '#84CC16',  // success (lime)
        'accent-red':     '#EF4444',  // danger
        'accent-orange':  '#FBBF24',  // warning (amber)
        // Event-type only (calendar dots) — not general theme colours
        'accent-purple':  '#A78BFA',
      },
      fontFamily: {
        mono: ['"DM Mono"', 'monospace'],
        sans: ['"DM Sans"', 'sans-serif'],
        data: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
