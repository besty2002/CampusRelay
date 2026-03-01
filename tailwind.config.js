/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#e8f5e9',
          DEFAULT: '#81c784',
          dark: '#66bb6a',
        },
        secondary: {
          light: '#e1f5fe',
          DEFAULT: '#4fc3f7',
          dark: '#29b6f6',
        },
        accent: {
          pastel: '#fff9c4',
        },
        status: {
          available: '#81c784',
          reserved: '#ffb74d',
          given: '#bdbdbd',
        }
      },
      borderRadius: {
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        'soft': '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
}
