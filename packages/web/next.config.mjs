// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // ignoreBuildErrors: true,
  },
  // Transpile internal monorepo packages from TypeScript source
  // This eliminates the need to pre-build packages before running the web app
  transpilePackages: [
    '@boardsesh/shared-schema',
    '@boardsesh/db',
    '@boardsesh/crypto',
    '@boardsesh/moonboard-ocr',
  ],
  // Empty turbopack config to silence warning about webpack config
  turbopack: {},
};

export default nextConfig;
