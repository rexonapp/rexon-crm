import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "var(--border)",
        input: "var(--border)",
        ring: "var(--border)",
        background: "var(--bg)",
        foreground: "var(--text)",
        primary: {
          DEFAULT: "var(--text)",
          foreground: "var(--bg)",
        },
        secondary: {
          DEFAULT: "var(--surface-2)",
          foreground: "var(--text)",
        },
        muted: {
          DEFAULT: "var(--bg-muted)",
          foreground: "var(--text-muted)",
        },
        accent: {
          DEFAULT: "var(--gold)",
          foreground: "var(--text)",
        },
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        info: "var(--info)",
        gold: {
          DEFAULT: "var(--gold)",
          muted: "var(--gold-muted)",
          dim: "var(--gold-dim)",
        },
      },
      borderRadius: {
        lg: "var(--r-lg)",
        md: "var(--r)",
        sm: "var(--r-sm)",
        xs: "var(--r-xs)",
        xl: "var(--r-xl)",
        "2xl": "var(--r-2xl)",
        full: "var(--r-full)",
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        gold: "var(--shadow-gold)",
      },
      fontFamily: {
        display: "var(--font-display)",
        body: "var(--font-body)",
        sans: "var(--font-body)",
      },
      spacing: {
        sidebar: "var(--sidebar-w)",
        nav: "var(--nav-h)",
      },
      transitionDuration: {
        DEFAULT: "150ms",
      },
    },
  },
  plugins: [],
};

export default config;
