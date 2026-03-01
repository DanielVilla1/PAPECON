/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#1B4332', light: '#2D6A4F', dark: '#081C15' },
        accent:  { DEFAULT: '#52B788', light: '#74C69D' },
        danger:  { DEFAULT: '#D62828' },
        warning: { DEFAULT: '#F4A261' },
        neutral: { 50: '#F8F9FA', 900: '#1C1C1E' },
      },
    },
  },
  plugins: [],
}

