import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "rgb(var(--c-primary) / <alpha-value>)",
        "primary-dark": "rgb(var(--c-primary-dark) / <alpha-value>)",
        "primary-soft": "rgb(var(--c-primary-soft) / <alpha-value>)",
        success: "rgb(var(--c-success) / <alpha-value>)",
        "success-dark": "rgb(var(--c-success-dark) / <alpha-value>)",
        "success-soft": "rgb(var(--c-success-soft) / <alpha-value>)",
        warning: "rgb(var(--c-warning) / <alpha-value>)",
        "warning-dark": "rgb(var(--c-warning-dark) / <alpha-value>)",
        "warning-soft": "rgb(var(--c-warning-soft) / <alpha-value>)",
        background: "rgb(var(--c-background) / <alpha-value>)",
        surface: "rgb(var(--c-surface) / <alpha-value>)",
        border: "rgb(var(--c-border) / <alpha-value>)",
        text: "rgb(var(--c-text) / <alpha-value>)",
        muted: "rgb(var(--c-muted) / <alpha-value>)",
        danger: "rgb(var(--c-danger) / <alpha-value>)",
        "danger-dark": "rgb(var(--c-danger-dark) / <alpha-value>)",
        "danger-soft": "rgb(var(--c-danger-soft) / <alpha-value>)",
        accent: "rgb(var(--c-accent) / <alpha-value>)",
        "accent-dark": "rgb(var(--c-accent-dark) / <alpha-value>)",
        "accent-soft": "rgb(var(--c-accent-soft) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["Montserrat Variable", "system-ui", "sans-serif"],
        display: ["Dosis Variable", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 12px 28px rgba(16, 32, 51, 0.08)",
      },
    },
  },
  plugins: [],
} satisfies Config;
