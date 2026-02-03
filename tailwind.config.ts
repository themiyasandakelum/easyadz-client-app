import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#fdf4f3",
          100: "#fce8e6",
          200: "#f9d4d0",
          300: "#f4b4ad",
          400: "#ec8a7e",
          500: "#e06655",
          600: "#cc4a3a",
          700: "#ab3c2f",
          800: "#8e352b",
          900: "#763229",
          950: "#401611",
        },
      },
    },
  },
  plugins: [],
};

export default config;
