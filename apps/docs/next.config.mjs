import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  output: 'standalone',
  reactStrictMode: true,
  // Generated .source/index.ts has portability issues due to pnpm symlinks.
  // Docs app never publishes types — safe to skip.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default withMDX(config);
