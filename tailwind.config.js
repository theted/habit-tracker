/** @type {import('tailwindcss').Config} */
module.exports = {
  purge: ['./index.html', './src/**/*.{vue,js,ts}'],
  darkMode: true,
  theme: {
    extend: {
      fontFamily: {
        poppins: ['Poppins', 'sans-serif']
      }
    }
  },
  variants: {
    extend: {
      opacity: ['responsive', 'hover', 'focus', 'group-hover']
    }
  },
  plugins: ['@taailwindcss/typography']
}
