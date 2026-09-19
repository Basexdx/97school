/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/97school',
  assetPrefix: '/97school/',
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
