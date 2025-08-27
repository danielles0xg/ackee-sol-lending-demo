import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Add fallbacks for node modules not available in browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      }
    }
    
    // Ensure proper handling of ESM modules
    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts', '.tsx'],
      '.mjs': ['.mjs'],
    }
    
    return config
  },
  
  
  // Transpile the pyth packages
  transpilePackages: ['@pythnetwork/pyth-solana-receiver'],
}

export default nextConfig
