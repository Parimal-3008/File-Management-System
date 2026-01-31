import type { Config } from "tailwindcss";

export default {
  prefix: "tw-",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
