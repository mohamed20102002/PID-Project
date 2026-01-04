/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'pid-primary': '#1e40af',
        'pid-secondary': '#64748b',
        'pid-accent': '#0ea5e9',
        'pid-background': '#f8fafc',
        'pid-surface': '#ffffff',
        'pid-border': '#e2e8f0',
      },
    },
  },
  plugins: [],
}
