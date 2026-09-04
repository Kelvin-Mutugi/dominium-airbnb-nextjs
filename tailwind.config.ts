import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-poppins)", "sans-serif"],
        display: ["var(--font-anton)", "sans-serif"],
      },
      keyframes: {
        "sk-hero-fade": {
          "0%, 100%": { opacity: "0" },
          "8%, 25%": { opacity: "1" },
          "33%": { opacity: "0" },
        },
      },
      animation: {
        "sk-hero-fade": "sk-hero-fade 18s infinite",
      },
    },
  },
  plugins: [],
};

export default config;