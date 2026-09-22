const API_ORIGIN = process.env.GENIUS_API_ORIGIN || 'http://127.0.0.1:8787'

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_ORIGIN}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
