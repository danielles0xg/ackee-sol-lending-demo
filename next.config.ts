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
    
    // Fix rpc-websockets module resolution issue for jito-ts compatibility
    config.resolve.alias = {
      ...config.resolve.alias,
      'rpc-websockets/dist/lib/client': 'rpc-websockets',
      'rpc-websockets/dist/lib/client/websocket': 'rpc-websockets',
    }
    
    // Ignore jito-ts and use a browser-compatible build
    config.externals = config.externals || {}
    if (!isServer) {
      config.externals.push({
        'jito-ts': 'jito-ts',
      })
    }
    
    return config
  },
  
  
  // Transpile the pyth packages
  transpilePackages: ['@pythnetwork/pyth-solana-receiver', 'jito-ts'],
}

export default nextConfig
