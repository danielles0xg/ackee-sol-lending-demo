'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletButton } from '../solana/solana-provider'
import { ExplorerLink } from '../cluster/cluster-ui'
import { useLendingProgram } from './lending-data-access'
import { 
  LendingInitUser, 
  LendingDeposit, 
  LendingBorrow, 
  LendingUserAccount,
  LendingInitBank,
  LendingList,
  LendingMintTokens 
} from './lending-ui'
import { AppHero } from '../app-hero'
import { ellipsify } from '@/lib/utils'

export default function LendingFeature() {
  const { publicKey } = useWallet()
  const { programId } = useLendingProgram()

  return publicKey ? (
    <div>
      <AppHero
        title="Lending Protocol"
        subtitle="Deposit collateral, borrow assets, and earn yield on your deposits."
      >
        <p className="mb-6">
          <ExplorerLink path={`account/${programId}`} label={ellipsify(programId.toString())} />
        </p>
      </AppHero>
      
      <div className="max-w-6xl mx-auto space-y-8">
        {/* User Account Section */}
        <div className="grid md:grid-cols-2 gap-6">
          <LendingUserAccount />
          <LendingInitUser />
        </div>
        
        {/* Mint Tokens Section */}
        <div className="grid md:grid-cols-1 gap-6">
          <LendingMintTokens />
        </div>
        
        {/* Actions Section */}
        <div className="grid md:grid-cols-2 gap-6">
          <LendingDeposit />
          <LendingBorrow />
        </div>
        
        {/* Admin Section */}
        <LendingInitBank />
        
        {/* Banks List */}
        <LendingList />
      </div>
    </div>
  ) : (
    <div className="max-w-4xl mx-auto">
      <div className="hero py-[64px]">
        <div className="hero-content text-center">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold">Lending Protocol</h1>
            <p className="text-lg text-muted-foreground">
              Connect your wallet to start using the lending protocol
            </p>
            <WalletButton />
          </div>
        </div>
      </div>
    </div>
  )
}