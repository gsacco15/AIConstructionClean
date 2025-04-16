/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  trailingSlash: true,
  output: 'standalone',
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig 