import { PublicKey } from '@solana/web3.js'

// Mock Oracle Implementation for Vercel Deployment
// This provides consistent mock price feed data without external dependencies

export const SOL_PRICE_FEED_ID = "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a"

// Mock price feed account - returns a deterministic PublicKey
export async function getSolPriceFeedAccount() {
  try {
    // Return a mock but valid Solana PublicKey for the oracle
    // This is the Pyth program ID on devnet, used as a placeholder
    const mockOracleAccount = new PublicKey('7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE')
    
    console.log('Mock price feed account for SOL:', mockOracleAccount.toString())
    console.log('Using feed ID:', SOL_PRICE_FEED_ID)
    
    return mockOracleAccount
  } catch (error) {
    console.error('Error creating mock price feed account:', error)
    // Fallback to a default PublicKey
    return new PublicKey('11111111111111111111111111111111')
  }
}

// Mock price data getter for UI components
export function getMockPriceData() {
  return {
    sol: {
      price: 150.00,
      change24h: 2.5,
      lastUpdate: new Date().toISOString()
    },
    usdc: {
      price: 1.00,
      change24h: 0,
      lastUpdate: new Date().toISOString()
    }
  }
}