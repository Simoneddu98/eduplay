import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // EduPlay brand colors
        primary: {
          DEFAULT: "#1E3A5F",
          50: "#EBF4F8",
          100: "#C5DFF0",
          200: "#9FCAE8",
          300: "#79B5E0",
          400: "#539FD8",
          500: "#2E86AB",
          600: "#1E3A5F",
          700: "#162C4A",
          800: "#0F1F34",
          900: "#07111E",
        },
        accent: {
          DEFAULT: "#2E86AB",
          light: "#EBF4F8",
        },
        gamification: {
          xp: "#F4A261",       // Orange - XP/coins
          success: "#2D9B5A",  // Green - success/badges
          streak: "#E63946",   // Red - streak/urgency
          level: "#7B2FBE",    // Purple - levels
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "bounce-slow": "bounce 3s linear infinite",
        "pulse-glow": "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "level-up": "levelUp 0.5s ease-out",
        "xp-gain": "xpGain 0.3s ease-out",
      },
      keyframes: {
        levelUp: {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.2)" },
          "100%": { transform: "scale(1)" },
        },
        xpGain: {
          "0%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(-20px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
