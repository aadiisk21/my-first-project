// import type { Config } from 'tailwindcss';

// const config: Config = {
//   content: [
//     './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
//     './src/components/**/*.{js,ts,jsx,tsx,mdx}',
//     './src/app/**/*.{js,ts,jsx,tsx,mdx}',
//   ],
//   theme: {
//     extend: {
//       colors: {
//         border: 'var(--border)',
//         input: 'var(--input)',
//         ring: 'var(--ring)',
//         background: 'var(--background)',
//         foreground: 'var(--foreground)',
//         primary: {
//           DEFAULT: 'var(--primary)',
//           foreground: 'var(--primary-foreground)',
//         },
//         secondary: {
//           DEFAULT: 'var(--secondary)',
//           foreground: 'var(--secondary-foreground)',
//         },
//         destructive: {
//           DEFAULT: 'var(--destructive)',
//           foreground: 'var(--destructive-foreground)',
//         },
//         muted: {
//           DEFAULT: 'var(--muted)',
//           foreground: 'var(--muted-foreground)',
//         },
//         accent: {
//           DEFAULT: 'var(--accent)',
//           foreground: 'var(--accent-foreground)',
//         },
//         buy: 'var(--buy)',
//         sell: 'var(--sell)',
//         hold: 'var(--hold)',
//         chart: {
//           1: 'var(--chart-1)',
//           2: 'var(--chart-2)',
//           3: 'var(--chart-3)',
//           4: 'var(--chart-4)',
//           5: 'var(--chart-5)',
//         },
//         card: 'var(--card)',
//         'card-foreground': 'var(--card-foreground)',
//       },
//       borderRadius: {
//         lg: 'var(--radius)',
//         md: 'calc(var(--radius) - 2px)',
//         sm: 'calc(var(--radius) - 4px)',
//       },
//       fontFamily: {
//         sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
//       },
//       keyframes: {
//         'accordion-down': {
//           from: { height: 0 },
//           to: { height: 'var(--radix-accordion-content-height)' },
//         },
//         'accordion-up': {
//           from: { height: 'var(--radix-accordion-content-height)' },
//           to: { height: 0 },
//         },
//       },
//       animation: {
//         'accordion-down': 'accordion-down 0.2s ease-out',
//         'accordion-up': 'accordion-up 0.2s ease-out',
//       },
//     },
//   },
//   plugins: [],
// } satisfies Config;

// export default config;

// // original code above

@type {import('tailwindcss').Config}
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        buy: "rgb(var(--buy) / <alpha-value>)",
        sell: "rgb(var(--sell) / <alpha-value>)",
        hold: "rgb(var(--hold) / <alpha-value>)",

        border: "rgb(var(--border) / <alpha-value>)",
        input: "rgb(var(--input) / <alpha-value>)",
        ring: "rgb(var(--ring) / <alpha-value>)",
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",

        primary: {
          DEFAULT: "rgb(var(--primary) / <alpha-value>)",
          foreground: "rgb(var(--primary-foreground) / <alpha-value>)",
        },

        secondary: {
          DEFAULT: "rgb(var(--secondary) / <alpha-value>)",
          foreground: "rgb(var(--secondary-foreground) / <alpha-value>)",
        },

        muted: {
          DEFAULT: "rgb(var(--muted) / <alpha-value>)",
          foreground: "rgb(var(--muted-foreground) / <alpha-value>)",
        },

        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          foreground: "rgb(var(--accent-foreground) / <alpha-value>)",
        },

        destructive: {
          DEFAULT: "rgb(var(--destructive) / <alpha-value>)",
          foreground: "rgb(var(--destructive-foreground) / <alpha-value>)",
        },
      },
    },
  },
  plugins: [],
};
