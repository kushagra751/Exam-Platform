/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        background: "#050505",
        surface: "#111111",
        panel: "#171717",
        border: "#262626",
        foreground: "#f5f5f5",
        muted: "#a3a3a3",
        accent: "#ffffff",
        success: "#d4d4d4",
        danger: "#737373"
      },
      boxShadow: {
        panel: "0 26px 80px rgba(0, 0, 0, 0.42), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
        soft: "0 10px 30px rgba(0, 0, 0, 0.22)"
      },
      backgroundImage: {
        grid: "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)"
      }
    }
  },
  plugins: []
};
