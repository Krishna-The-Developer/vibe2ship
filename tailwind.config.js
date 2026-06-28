/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary-blue': '#3b82f6',
        'alert-orange': '#f97316',
        'success-green': '#22c55e',
        'motivational-purple': '#a855f7',
      },
    },
  },
  plugins: [],
}
