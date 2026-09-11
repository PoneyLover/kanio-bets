import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        kanio: {
          bg: "#0b0f1a",
          surface: "#131a2a",
          surface2: "#1b2338",
          border: "#263048",
          accent: "#22d3ee",
          accent2: "#a855f7",
          win: "#34d399",
          loss: "#f87171",
          text: "#e5e9f5",
          muted: "#8891ab",
        },
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
