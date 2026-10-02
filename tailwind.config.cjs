const { fontFamily } = require("tailwindcss/defaultTheme");
const colors = require("tailwindcss/colors");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{astro,html,js,jsx,json,md,mdx,svelte,ts,tsx,vue}"],
  darkMode: "class",
  theme: {
    extend: {
      lineHeight: {
        11: "2.75rem",
        12: "3rem",
        13: "3.25rem",
        14: "3.5rem",
      },
      fontFamily: {
        sans: ["Lato", ...fontFamily.sans],
      },
      colors: {
        primary: colors.orange,
        gray: colors.gray,
      },
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            "h1,h2,h3,h4,h5,h6": {
              color: theme("colors.gray.900"),
              fontWeight: "700",
              letterSpacing: theme("letterSpacing.tight"),
            },
            p: {
              marginTop: "1.25em",
              marginBottom: "1.25em",
              paddingBottom: "0.5em",
              color: theme("colors.gray.700"),
            },
            a: {
              color: theme("colors.primary.500"),
              "&:hover": {
                color: theme("colors.primary.600"),
              },
              textDecoration: "none",
            },
            "ul,ol": {
              paddingLeft: "1.625em",
            },
            code: {
              color: theme("colors.indigo.500"),
              backgroundColor: theme("colors.gray.100"),
              paddingLeft: "4px",
              paddingRight: "4px",
              paddingTop: "2px",
              paddingBottom: "2px",
              borderRadius: "0.25rem",
            },
          },
        },
        invert: {
          css: {
            "h1,h2,h3,h4,h5,h6": {
              color: theme("colors.gray.100"),
            },
            p: {
              color: theme("colors.gray.300"),
            },
            a: {
              color: theme("colors.primary.500"),
              "&:hover": {
                color: theme("colors.primary.400"),
              },
            },
            code: {
              backgroundColor: theme("colors.gray.800"),
            },
          },
        },
      }),
    },
  },
  plugins: [require("@tailwindcss/forms"), require("@tailwindcss/typography")],
};
