/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#1a1a1a",
        surface: "#2d2d2d",
        primary: "#34d399", // Emerald 400
        destructive: "#f87171", // Red 400
        "chart-1": "#fa8f8e",
        "chart-2": "#869668",
        "chart-3": "#897ccc",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
