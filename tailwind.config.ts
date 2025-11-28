import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',

        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },

        // ✅ Buy/Sell/Hold with fixed opacity classes
        buy: {
          50: 'rgb(var(--buy) / 0.05)',
          100: 'rgb(var(--buy) / 0.1)',
          200: 'rgb(var(--buy) / 0.2)',
          300: 'rgb(var(--buy) / 0.3)',
          400: 'rgb(var(--buy) / 0.4)',
          500: 'rgb(var(--buy) / 0.5)',
          600: 'rgb(var(--buy) / 0.6)',
          700: 'rgb(var(--buy) / 0.7)',
          800: 'rgb(var(--buy) / 0.8)',
          900: 'rgb(var(--buy) / 0.9)',
        },
        sell: {
          50: 'rgb(var(--sell) / 0.05)',
          100: 'rgb(var(--sell) / 0.1)',
          200: 'rgb(var(--sell) / 0.2)',
          300: 'rgb(var(--sell) / 0.3)',
          400: 'rgb(var(--sell) / 0.4)',
          500: 'rgb(var(--sell) / 0.5)',
          600: 'rgb(var(--sell) / 0.6)',
          700: 'rgb(var(--sell) / 0.7)',
          800: 'rgb(var(--sell) / 0.8)',
          900: 'rgb(var(--sell) / 0.9)',
        },
        hold: {
          50: 'rgb(var(--hold) / 0.05)',
          100: 'rgb(var(--hold) / 0.1)',
          200: 'rgb(var(--hold) / 0.2)',
          300: 'rgb(var(--hold) / 0.3)',
          400: 'rgb(var(--hold) / 0.4)',
          500: 'rgb(var(--hold) / 0.5)',
          600: 'rgb(var(--hold) / 0.6)',
          700: 'rgb(var(--hold) / 0.7)',
          800: 'rgb(var(--hold) / 0.8)',
          900: 'rgb(var(--hold) / 0.9)',
        },

        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))',
        },

        card: 'hsl(var(--card))',
        'card-foreground': 'hsl(var(--card-foreground))',
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
  },
  plugins: [],
} satisfies Config;

export default config;
