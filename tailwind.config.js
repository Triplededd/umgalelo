/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        circle: {
          bg: "#F4F0E6",
          panel: "#FFFFFF",
          ink: "#1C2733",
          line: "#DCD4C2",
          navy: "#1B3A5C",
          navyDark: "#122A44",
          gold: "#A6812E",
          green: "#1F5C4E",
          rust: "#8C3A2B",
        },
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
}

