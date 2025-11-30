import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Use JS/CSS compilation fallback and avoid SWC native/minify issues in dev
  swcMinify: false,
  // Turn off the experimental Turbopack dev bundler to avoid wasm-binding limitations
  experimental: {
    turbo: false,
  },
};

export default nextConfig;
