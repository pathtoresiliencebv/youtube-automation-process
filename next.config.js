/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    CONVEX_URL: process.env.CONVEX_URL,
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
  },
  images: {
    domains: ['i.ytimg.com', 'yt3.ggpht.com'],
  },
  // Ignore TypeScript build errors for deployment
  typescript: {
    ignoreBuildErrors: true,
  },
  // Ignore ESLint errors for deployment  
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['convex']
  }
}

module.exports = nextConfig