/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    CONVEX_URL: process.env.CONVEX_URL,
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
  },
  images: {
    domains: ['i.ytimg.com', 'yt3.ggpht.com'],
  },
}

module.exports = nextConfig