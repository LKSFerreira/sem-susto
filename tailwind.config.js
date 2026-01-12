/** @type {import('tailwindcss').Config} */
export default {
  // Define quais arquivos o Tailwind deve analisar para gerar apenas as classes usadas
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Cores customizadas do projeto (migradas do CDN)
      colors: {
        verde: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
      },
    },
  },
  plugins: [],
}
