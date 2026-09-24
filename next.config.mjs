const API_ORIGIN = process.env.GENIUS_API_ORIGIN || 'http://127.0.0.1:8787'
const STATIC_BUILD = process.env.GENIUS_STATIC_BUILD === '1'

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(STATIC_BUILD ? {
    output: 'export',
    trailingSlash: true,
    images: { unoptimized: true },
  } : {}),
  async rewrites() {
    if (STATIC_BUILD) return []
    return [
      {
        source: '/api/:path*',
        destination: `${API_ORIGIN}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
