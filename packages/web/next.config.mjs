// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // ignoreBuildErrors: true,
  },
  // Transpile shared-schema package since we import TypeScript source directly
  transpilePackages: ['@boardsesh/shared-schema'],
};

export default nextConfig;
