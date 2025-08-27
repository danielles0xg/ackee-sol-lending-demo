// Here we export some useful types and functions for interacting with the Anchor program.
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { Cluster, PublicKey } from '@solana/web3.js'
import LendingIDL from './idl.json'
import type { Lending } from './lending-types'

// Re-export the generated IDL and type
export { Lending, LendingIDL }

// The programId is imported from the program IDL.
export const LENDING_PROGRAM_ID = new PublicKey(LendingIDL.address)

// This is a helper function to get the Counter Anchor program.
export function getCounterProgram(provider: AnchorProvider, address?: PublicKey): Program<Lending> {
  return new Program({ ...LendingIDL, address: address ? address.toBase58() : LendingIDL.address } as Lending, provider)
}

// This is a helper function to get the program ID for the Counter program depending on the cluster.
export function getCounterProgramId(cluster: Cluster) {
  switch (cluster) {
    case 'devnet':
      return new PublicKey('FQwNs7BPQ9NW258VxGHo885VqPqHPk7yFZUFgDLJx9Hd')
    case 'testnet':
    case 'mainnet-beta':
    default:
      return LENDING_PROGRAM_ID
  }
}
