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
        riseIn: {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        sunRise: {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.14", transform: "scale(1)" },
          "50%": { opacity: "0.26", transform: "scale(1.08)" },
        },
        dotPulse: {
          "0%, 80%, 100%": { opacity: "0.25" },
          "40%": { opacity: "1" },
        },
      },
      animation: {
        "sk-hero-fade": "sk-hero-fade 18s infinite",
        "rise-in": "riseIn 0.6s cubic-bezier(0.16,1,0.3,1) both",
        "sun-rise": "sunRise 1.1s cubic-bezier(0.16,1,0.3,1) both",
        "pulse-glow": "pulseGlow 4s ease-in-out infinite",
        "dot-pulse": "dotPulse 1.1s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;