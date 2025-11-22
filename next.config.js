/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/seoul/:path*',
        destination: 'http://openapi.seoul.go.kr:8088/:path*',
      },
    ];
  },
};

module.exports = nextConfig;

