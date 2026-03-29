import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    domains: ['cards.scryfall.io', 'c1.scryfall.com'],
  },
}

export default nextConfig
