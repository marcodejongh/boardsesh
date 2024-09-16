// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/old-api/:path*', // Proxy all requests starting with /api
        destination: 'http://localhost:8000/api/:path*', // Proxy to backend at localhost:8000
      },
    ];
  },
};

export default nextConfig;
