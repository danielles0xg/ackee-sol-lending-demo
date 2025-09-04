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
      'rpc-websockets/dist/lib/client': require.resolve('rpc-websockets'),
      'rpc-websockets/dist/lib/client/websocket': require.resolve('rpc-websockets'),
    }
    
    // Handle jito-ts module resolution
    config.module.rules.push({
      test: /node_modules\/jito-ts/,
      resolve: {
        fullySpecified: false,
      },
    })
    
    return config
  },
  
  // Transpile the pyth packages
  transpilePackages: [
    '@pythnetwork/pyth-solana-receiver',
    '@pythnetwork/solana-utils',
    'jito-ts'
  ],
}

export default nextConfig
