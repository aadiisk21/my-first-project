import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class', // This will be handled by CSS variable instead
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border) / 0.2)',
        input: 'hsl(var(--input) / 0.2)',
        ring: 'hsl(var(--ring) / 0.2)',
        background: 'hsl(var(--background) / 0.2)',
        foreground: 'hsl(var(--foreground) / 0.2)',
        primary: {
          DEFAULT: 'hsl(var(--primary) / 0.2)',
          foreground: 'hsl(var(--primary-foreground) / 0.2)',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary) / 0.2)',
          foreground: 'hsl(var(--secondary-foreground) / 0.2)',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive) / 0.2)',
          foreground: 'hsl(var(--destructive-foreground) / 0.2)',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted) / 0.2)',
          foreground: 'hsl(var(--muted-foreground) / 0.2)',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent) / 0.2)',
          foreground: 'hsl(var(--accent-foreground) / 0.2)',
        },
        buy: 'hsl(var(--buy) / 0.2)',
        sell: 'hsl(var(--sell) / 0.2)',
        hold: 'hsl(var(--hold) / 0.2)',
        chart: {
          1: 'hsl(var(--chart-1) / 0.2)',
          2: 'hsl(var(--chart-2) / 0.2)',
          3: 'hsl(var(--chart-3) / 0.2)',
          4: 'hsl(var(--chart-4) / 0.2)',
          5: 'hsl(var(--chart-5) / 0.2)',
        },
        card: 'hsl(var(--card) / 0.2)',
        'card-foreground': 'hsl(var(--card-foreground) / 0.2)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'accordion-down': {
          from: { height: 0 },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 0 },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  plugins: [],
} satisfies Config;

export default config;