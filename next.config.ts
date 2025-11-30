import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV !== 'production';

// Build the config object dynamically and cast to NextConfig to avoid
// TypeScript rejecting unknown experimental keys (some Next versions
// don't include `turbo` in their type definitions).
const rawConfig = isDev
  ? {
      swcMinify: false,
      experimental: {
        // This disables Turbopack in development where some Windows/native
        // SWC bindings caused issues. It's safe to include at runtime,
        // but older Next.js type definitions may not declare it.
        turbo: false,
      },
    }
  : {};

const nextConfig = rawConfig as unknown as NextConfig;

export default nextConfig;
