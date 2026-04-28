import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#0095d9",
        "primary-dark": "#006fa3",
        "primary-soft": "#e8f6fc",
        success: "#00a651",
        "success-dark": "#04783f",
        "success-soft": "#e8f8ef",
        warning: "#ffcb05",
        "warning-dark": "#8a6a00",
        "warning-soft": "#fff7d1",
        background: "#f8fafc",
        surface: "#ffffff",
        border: "#dbe3ea",
        text: "#102033",
        muted: "#5f6b7a",
        danger: "#dc2626",
        "danger-dark": "#991b1b",
        "danger-soft": "#fef2f2",
      },
      fontFamily: {
        sans: ["Dosis", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 12px 28px rgba(16, 32, 51, 0.08)",
      },
    },
  },
  plugins: [],
} satisfies Config;
