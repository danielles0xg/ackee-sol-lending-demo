'use client'

import { PublicKey } from '@solana/web3.js'
import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { ExplorerLink } from '../cluster/cluster-ui'
import { useLendingProgram, useLendingUserAccount } from './lending-data-access'
import { ellipsify } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { getSolPriceFeedAccount } from '../../utils/pyth'

// USDC mint address on devnet (matches test file)
const USDC_MINT = new PublicKey('U7UQ54N4ChCwJN1y112y99LV62qvGJgPGm687yhr1up')
// SOL mint (matches test file)
const SOL_MINT = new PublicKey('8zCxcaK8Cr21hJgUYLqa76UtZqNfAHV7ae3YD1Bdd5bH')

export function LendingMintTokens() {
  const { mintTokens } = useLendingProgram()
  const { publicKey } = useWallet()
  const [amount, setAmount] = useState('5')
  const [selectedMint, setSelectedMint] = useState<'SOL' | 'USDC'>('USDC')
  
  if (!publicKey) return null

  const handleMint = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }
    
    const mint = selectedMint === 'USDC' ? USDC_MINT : SOL_MINT
    // Convert to smallest unit (considering 6 decimals for USDC, 9 for SOL)
    const decimals = selectedMint === 'USDC' ? 6 : 9
    const amountInSmallestUnit = Math.floor(parseFloat(amount) * Math.pow(10, decimals))
    
    try {
      await mintTokens.mutateAsync({ 
        mint, 
        amount: amountInSmallestUnit 
      })
      toast.success(`Successfully minted ${amount} ${selectedMint}`)
    } catch (error) {
      console.error('Mint error:', error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mint Test Tokens</CardTitle>
        <CardDescription>
          Mint test tokens for development and testing (Devnet only)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="mint-token">Select Token</Label>
          <div className="flex gap-2 mt-2">
            <Button
              variant={selectedMint === 'USDC' ? 'default' : 'outline'}
              onClick={() => setSelectedMint('USDC')}
              size="sm"
            >
              USDC
            </Button>
            <Button
              variant={selectedMint === 'SOL' ? 'default' : 'outline'}
              onClick={() => setSelectedMint('SOL')}
              size="sm"
            >
              wSOL
            </Button>
          </div>
        </div>
        
        <div>
          <Label htmlFor="mint-amount">Amount</Label>
          <Input
            id="mint-amount"
            type="number"
            placeholder={`Enter ${selectedMint} amount`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.000001"
            min="0"
          />
        </div>
        
        <Button 
          onClick={handleMint} 
          disabled={mintTokens.isPending || !amount}
          className="w-full"
        >
          {mintTokens.isPending ? 'Minting...' : `Mint ${amount} ${selectedMint} Tokens`}
        </Button>
        
        <div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted rounded">
          <p className="font-semibold">Token Mint Addresses:</p>
          <p>USDC: {ellipsify(USDC_MINT.toString())}</p>
          <p>wSOL: {ellipsify(SOL_MINT.toString())}</p>
          <p className="mt-2 text-green-600">
            Admin wallet will mint and transfer tokens to your account
          </p>
          <p className="mt-2 text-blue-600 text-xs">
            Note: USDC for deposits/collateral, wSOL for borrowing
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export function LendingInitUser() {
  const { initUser } = useLendingProgram()
  const { publicKey } = useWallet()
  
  if (!publicKey) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Initialize User Account</CardTitle>
        <CardDescription>
          Create your lending account to start depositing and borrowing
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={() => initUser.mutateAsync({ usdcAddress: USDC_MINT })} 
          disabled={initUser.isPending}
          className="w-full"
        >
          {initUser.isPending ? 'Initializing...' : 'Initialize Account'}
        </Button>
      </CardContent>
    </Card>
  )
}

export function LendingDeposit() {
  const { deposit } = useLendingProgram()
  const { publicKey } = useWallet()
  const [amount, setAmount] = useState('')
  const [selectedMint, setSelectedMint] = useState<'SOL' | 'USDC'>('USDC')
  
  if (!publicKey) return null

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }
    
    const mint = selectedMint === 'USDC' ? USDC_MINT : SOL_MINT
    // Convert to smallest unit (considering 6 decimals for USDC, 9 for SOL)
    const decimals = selectedMint === 'USDC' ? 6 : 9
    const amountInSmallestUnit = Math.floor(parseFloat(amount) * Math.pow(10, decimals))
    
    try {
      await deposit.mutateAsync({ 
        mint, 
        amount: amountInSmallestUnit 
      })
      setAmount('')
      toast.success(`Successfully deposited ${amount} ${selectedMint}`)
    } catch (error) {
      console.error('Deposit error:', error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deposit Funds</CardTitle>
        <CardDescription>
          Deposit tokens to start earning yield
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="deposit-token">Select Token</Label>
          <div className="flex gap-2 mt-2">
            <Button
              variant={selectedMint === 'USDC' ? 'default' : 'outline'}
              onClick={() => setSelectedMint('USDC')}
              size="sm"
            >
              USDC
            </Button>
            <Button
              variant={selectedMint === 'SOL' ? 'default' : 'outline'}
              onClick={() => setSelectedMint('SOL')}
              size="sm"
            >
              SOL
            </Button>
          </div>
        </div>
        
        <div>
          <Label htmlFor="deposit-amount">Amount</Label>
          <Input
            id="deposit-amount"
            type="number"
            placeholder={`Enter ${selectedMint} amount`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.000001"
            min="0"
          />
        </div>
        
        <Button 
          onClick={handleDeposit} 
          disabled={deposit.isPending || !amount}
          className="w-full"
        >
          {deposit.isPending ? 'Depositing...' : `Deposit ${selectedMint}`}
        </Button>
      </CardContent>
    </Card>
  )
}

export function LendingBorrow() {
  const { borrow } = useLendingProgram()
  const { publicKey } = useWallet()
  const [amount, setAmount] = useState('')
  
  if (!publicKey) return null

  const handleBorrow = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }
    
    // Only wSOL borrowing is supported - always use SOL_MINT
    const mint = SOL_MINT
    // Convert to smallest unit (9 decimals for SOL)
    const decimals = 9
    const amountInSmallestUnit = Math.floor(parseFloat(amount) * Math.pow(10, decimals))
    
    try {
      // Get the SOL/USD oracle account for wSOL borrowing
      const priceUpdate = await getSolPriceFeedAccount()
      
      await borrow.mutateAsync({ 
        mint, 
        amount: amountInSmallestUnit,
        priceUpdate
      })
      setAmount('')
      toast.success(`Successfully borrowed ${amount} wSOL`)
    } catch (error) {
      console.error('Borrow error:', error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Borrow wSOL</CardTitle>
        <CardDescription>
          Borrow wSOL against your USDC collateral
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-muted rounded text-sm">
          <p className="font-medium mb-1">Available for borrowing:</p>
          <p>wSOL (Wrapped Solana) only</p>
          <p className="text-xs text-muted-foreground mt-1">
            Oracle: SOL/USD price feed
          </p>
        </div>
        
        <div>
          <Label htmlFor="borrow-amount">wSOL Amount</Label>
          <Input
            id="borrow-amount"
            type="number"
            placeholder="Enter wSOL amount to borrow"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.000001"
            min="0"
          />
        </div>
        
        <Button 
          onClick={handleBorrow} 
          disabled={borrow.isPending || !amount}
          className="w-full"
        >
          {borrow.isPending ? 'Borrowing...' : `Borrow ${amount} wSOL`}
        </Button>
        
        <div className="text-xs text-muted-foreground">
          <p>Mint: {ellipsify(SOL_MINT.toString())}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export function LendingUserAccount() {
  const { publicKey } = useWallet()
  const { programId } = useLendingProgram()
  
  if (!publicKey) return null

  const [userAccount] = PublicKey.findProgramAddressSync(
    [publicKey.toBuffer()],
    programId
  )
  
  return <LendingUserAccountInner userAccount={userAccount} />
}

function LendingUserAccountInner({ userAccount }: { userAccount: PublicKey }) {
  const { userQuery } = useLendingUserAccount({ account: userAccount })
  
  if (userQuery.isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-center">
            <span>Loading user account...</span>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  if (!userQuery.data) {
    return null
  }
  
  const userData = userQuery.data
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Account</CardTitle>
        <CardDescription>
          <ExplorerLink path={`account/${userAccount}`} label={ellipsify(userAccount.toString())} />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Deposited SOL</p>
              <p className="text-lg font-semibold">
                {(Number(userData.depositedSol) / 1e9).toFixed(6)} SOL
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Borrowed SOL</p>
              <p className="text-lg font-semibold">
                {(Number(userData.borrowedSol) / 1e9).toFixed(6)} SOL
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Deposited USDC</p>
              <p className="text-lg font-semibold">
                {(Number(userData.depositedUsdc) / 1e6).toFixed(2)} USDC
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Borrowed USDC</p>
              <p className="text-lg font-semibold">
                {(Number(userData.borrowedUsdc) / 1e6).toFixed(2)} USDC
              </p>
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Health Factor</span>
              <span className={`font-semibold ${Number(userData.healthFactor) > 1 ? 'text-green-600' : 'text-red-600'}`}>
                {Number(userData.healthFactor).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function LendingInitBank() {
  const { initBank } = useLendingProgram()
  const { publicKey } = useWallet()
  const [showAdmin, setShowAdmin] = useState(false)
  
  if (!publicKey) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin: Initialize Banks</CardTitle>
        <CardDescription>
          Initialize bank accounts for tokens (Admin only)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          variant="outline"
          onClick={() => setShowAdmin(!showAdmin)}
          className="w-full"
        >
          {showAdmin ? 'Hide Admin Controls' : 'Show Admin Controls'}
        </Button>
        
        {showAdmin && (
          <div className="space-y-3 pt-4 border-t">
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={async () => {
                  try {
                    await initBank.mutateAsync({
                      mint: USDC_MINT,
                      liquidationThreshold: 80,
                      maxLtv: 75
                    })
                    toast.success('USDC bank initialized')
                  } catch (error: unknown) {
                    const errorMessage = error instanceof Error ? error.message : String(error)
                    if (errorMessage.includes('already in use')) {
                      toast.info('USDC bank already initialized')
                    }
                  }
                }}
                disabled={initBank.isPending}
                variant="secondary"
                size="sm"
              >
                Init USDC Bank
              </Button>
              
              <Button
                onClick={async () => {
                  try {
                    await initBank.mutateAsync({
                      mint: SOL_MINT,
                      liquidationThreshold: 80,
                      maxLtv: 75
                    })
                    toast.success('SOL bank initialized')
                  } catch (error: unknown) {
                    const errorMessage = error instanceof Error ? error.message : String(error)
                    if (errorMessage.includes('already in use')) {
                      toast.info('SOL bank already initialized')
                    }
                  }
                }}
                disabled={initBank.isPending}
                variant="secondary"
                size="sm"
              >
                Init SOL Bank
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground">
              Note: Banks are automatically initialized when you first deposit to them.
              Use these buttons only if manual initialization is needed.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function LendingList() {
  const { banks, getProgramAccount } = useLendingProgram()
  
  if (getProgramAccount.isLoading) {
    return (
      <div className="flex justify-center p-8">
        <span>Loading program...</span>
      </div>
    )
  }
  
  if (!getProgramAccount.data?.value) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">
          Program account not found. Make sure you have deployed the program and are on the correct cluster (devnet).
        </p>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Banks</h3>
        {banks.isLoading ? (
          <span>Loading banks...</span>
        ) : banks.data?.length ? (
          <div className="grid md:grid-cols-2 gap-4">
            {banks.data.map((bank) => (
              <Card key={bank.publicKey.toString()}>
                <CardHeader>
                  <CardTitle className="text-base">
                    Bank: {ellipsify(bank.publicKey.toString())}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Total Deposits:</span>
                      <span>{Number(bank.account.totalDeposits).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Borrowed:</span>
                      <span>{Number(bank.account.totalBorrowed).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Max LTV:</span>
                      <span>{Number(bank.account.maxLtv)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No banks found.</p>
        )}
      </div>
    </div>
  )
}