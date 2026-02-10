import { withSentryConfig } from '@sentry/nextjs';
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
  experimental: {
    optimizePackageImports: [],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // Redirect old board-scoped playlist routes to /my-library
      {
        source: '/:board/:layout/:size/:set/:angle/playlists',
        destination: '/my-library',
        permanent: true,
      },
      {
        source: '/:board/:layout/:size/:set/:angle/playlist/:uuid',
        destination: '/my-library/playlist/:uuid',
        permanent: true,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "boardsesh",

  project: "boardsesh",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
