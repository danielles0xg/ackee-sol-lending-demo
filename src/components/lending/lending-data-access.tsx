'use client'

import { getCounterProgram, getCounterProgramId } from './anchor/anchor-program'
import { useConnection } from '@solana/wallet-adapter-react'
import { Cluster, PublicKey, SystemProgram, SendTransactionError } from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../use-transaction-toast'
import { toast } from 'sonner'
import { BN } from '@coral-xyz/anchor'
import { 
  TOKEN_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID, 
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  createTransferInstruction
} from '@solana/spl-token'
import { Transaction, Keypair } from '@solana/web3.js'
import bs58 from 'bs58'

export function useLendingProgram() {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const programId = useMemo(() => getCounterProgramId(cluster.network as Cluster), [cluster])
  const program = useMemo(() => getCounterProgram(provider, programId), [provider, programId])

  const banks = useQuery({
    queryKey: ['lending', 'banks', { cluster }],
    queryFn: () => program.account.bank.all(),
  })

  const users = useQuery({
    queryKey: ['lending', 'users', { cluster }],
    queryFn: () => program.account.user.all(),
  })

  const getProgramAccount = useQuery({
    queryKey: ['get-program-account', { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  })

  const initBank = useMutation({
    mutationKey: ['lending', 'initBank', { cluster }],
    mutationFn: async ({ mint, liquidationThreshold, maxLtv }: { mint: PublicKey; liquidationThreshold: number; maxLtv: number }) => {
      const [bank] = PublicKey.findProgramAddressSync(
        [mint.toBuffer()],
        programId
      )
      const [bankTokenAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('treasury'), mint.toBuffer()],
        programId
      )
      
      return program.methods
        .initBank(new BN(liquidationThreshold), new BN(maxLtv))
        .accountsPartial({
          signer: provider.wallet.publicKey,
          mint,
          bank,
          bankTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc()
    },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await banks.refetch()
    },
    onError: (error) => {
      toast.error(`Failed to initialize bank: ${error}`)
    },
  })

  const initUser = useMutation({
    mutationKey: ['lending', 'initUser', { cluster }],
    mutationFn: async ({ usdcAddress }: { usdcAddress: PublicKey }) => {
      const [userAccount] = PublicKey.findProgramAddressSync(
        [provider.wallet.publicKey.toBuffer()],
        programId
      )
      
      // Check if user account already exists
      try {
        await program.account.user.fetch(userAccount)
        // User already exists, return early
        throw new Error('User account already exists')
      } catch (fetchError) {
        // User doesn't exist, proceed with initialization
        if (fetchError instanceof Error && fetchError.message === 'User account already exists') {
          throw fetchError
        }
      }
      
      return program.methods
        .initUser(usdcAddress)
        .accountsPartial({
          signer: provider.wallet.publicKey,
          userAccount,
          systemProgram: SystemProgram.programId,
        })
        .rpc()
    },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await users.refetch()
    },
    onError: (error) => {
      if (error instanceof SendTransactionError) {
        const logs = error.logs
        console.error('Transaction logs:', logs)
        if (logs && logs.some((log: string) => log.includes('already in use'))) {
          toast.info('User account already exists')
          return
        }
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('User account already exists') || errorMessage.includes('already in use')) {
        toast.info('User account already exists')
      } else {
        toast.error(`Failed to initialize user: ${errorMessage}`)
      }
    },
  })

  const deposit = useMutation({
    mutationKey: ['lending', 'deposit', { cluster }],
    mutationFn: async ({ mint, amount }: { mint: PublicKey; amount: number }) => {
      const [bank] = PublicKey.findProgramAddressSync(
        [mint.toBuffer()],
        programId
      )
      const [bankTokenAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('treasury'), mint.toBuffer()],
        programId
      )
      const [userAccount] = PublicKey.findProgramAddressSync(
        [provider.wallet.publicKey.toBuffer()],
        programId
      )
      const userTokenAccount = getAssociatedTokenAddressSync(
        mint,
        provider.wallet.publicKey
      )
      
      // Check if bank exists, if not initialize it
      try {
        await program.account.bank.fetch(bank)
      } catch {
        // Bank doesn't exist, initialize it first
        const liquidationThreshold = 80 // 80%
        const maxLtv = 75 // 75%
        
        try {
          await program.methods
            .initBank(new BN(liquidationThreshold), new BN(maxLtv))
            .accountsPartial({
              signer: provider.wallet.publicKey,
              mint,
              bank,
              bankTokenAccount,
              tokenProgram: TOKEN_PROGRAM_ID,
              systemProgram: SystemProgram.programId,
            })
            .rpc()
          
          toast.success('Bank initialized successfully')
        } catch (bankError) {
          if (bankError instanceof SendTransactionError) {
            const logs = bankError.logs
            console.error('Bank init transaction logs:', logs)
          }
          throw bankError
        }
      }
      
      // Check if user account exists, if not try to initialize it
      try {
        await program.account.user.fetch(userAccount)
      } catch {
        // User doesn't exist, initialize it
        try {
          await program.methods
            .initUser(mint) // Use the deposit mint as the USDC address
            .accountsPartial({
              signer: provider.wallet.publicKey,
              userAccount,
              systemProgram: SystemProgram.programId,
            })
            .rpc()
          
          toast.success('User account initialized')
        } catch (userError) {
          if (userError instanceof SendTransactionError) {
            const logs = userError.logs
            console.error('User init transaction logs:', logs)
            if (logs && logs.some((log: string) => log.includes('already in use'))) {
              // User account already exists, continue
              console.log('User account already exists, continuing...')
            } else {
              throw userError
            }
          } else {
            const errorMessage = userError instanceof Error ? userError.message : String(userError)
            if (!errorMessage.includes('already in use')) {
              throw userError
            }
          }
        }
      }
      
      return program.methods
        .deposit(new BN(amount))
        .accountsPartial({
          signer: provider.wallet.publicKey,
          mint,
          bank,
          bankTokenAccount,
          userAccount,
          userTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc()
    },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await banks.refetch()
      await users.refetch()
    },
    onError: (error) => {
      if (error instanceof SendTransactionError) {
        const logs = error.logs
        console.error('Deposit transaction logs:', logs)
      }
      toast.error(`Failed to deposit: ${error}`)
    },
  })

  const borrow = useMutation({
    mutationKey: ['lending', 'borrow', { cluster }],
    mutationFn: async ({ mint, amount, priceUpdate }: { mint: PublicKey; amount: number; priceUpdate: PublicKey }) => {
      const [bank] = PublicKey.findProgramAddressSync(
        [mint.toBuffer()],
        programId
      )
      const [bankTokenAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from('treasury'), mint.toBuffer()],
        programId
      )
      const [userAccount] = PublicKey.findProgramAddressSync(
        [provider.wallet.publicKey.toBuffer()],
        programId
      )
      
      // Check if bank exists, if not initialize it
      try {
        await program.account.bank.fetch(bank)
      } catch {
        // Bank doesn't exist, initialize it first
        const liquidationThreshold = 80 // 80%
        const maxLtv = 75 // 75%
        
        try {
          await program.methods
            .initBank(new BN(liquidationThreshold), new BN(maxLtv))
            .accountsPartial({
              signer: provider.wallet.publicKey,
              mint,
              bank,
              bankTokenAccount,
              tokenProgram: TOKEN_PROGRAM_ID,
              systemProgram: SystemProgram.programId,
            })
            .rpc()
          
          toast.success('Bank initialized successfully')
        } catch (bankError) {
          if (bankError instanceof SendTransactionError) {
            const logs = bankError.logs
            console.error('Bank init transaction logs:', logs)
          }
          throw bankError
        }
      }
      
      // Check if user account exists, if not try to initialize it
      try {
        await program.account.user.fetch(userAccount)
      } catch {
        // User doesn't exist, initialize it
        try {
          await program.methods
            .initUser(mint) // Use the borrow mint as the USDC address
            .accountsPartial({
              signer: provider.wallet.publicKey,
              userAccount,
              systemProgram: SystemProgram.programId,
            })
            .rpc()
          
          toast.success('User account initialized')
        } catch (userError) {
          if (userError instanceof SendTransactionError) {
            const logs = userError.logs
            console.error('User init transaction logs:', logs)
            if (logs && logs.some((log: string) => log.includes('already in use'))) {
              // User account already exists, continue
              console.log('User account already exists, continuing...')
            } else {
              throw userError
            }
          } else {
            const errorMessage = userError instanceof Error ? userError.message : String(userError)
            if (!errorMessage.includes('already in use')) {
              throw userError
            }
          }
        }
      }
      
      return program.methods
        .borrow(new BN(amount))
        .accounts({
          signer: provider.wallet.publicKey,
          mint,
          tokenProgram: TOKEN_PROGRAM_ID,
          priceUpdate,
        })
        .rpc()
    },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await banks.refetch()
      await users.refetch()
    },
    onError: (error) => {
      if (error instanceof SendTransactionError) {
        const logs = error.logs
        console.error('Borrow transaction logs:', logs)
      }
      toast.error(`Failed to borrow: ${error}`)
    },
  })

  const mintTokens = useMutation({
    mutationKey: ['lending', 'mintTokens', { cluster }],
    mutationFn: async ({ mint, amount }: { mint: PublicKey; amount: number }) => {
      // Admin wallet that has mint authority
      const adminKeypair = Keypair.fromSecretKey(
        bs58.decode("5sHFWnAr8xVLXjLsLdbgNkCT6Dpg1tL35mWLTtTKq2Thouj1VC7tTHL9x6pHVKFyMA686CefaGNQTa1VfqM7wAoJ")
      )
      
      // Get user's token account
      const userTokenAccount = getAssociatedTokenAddressSync(
        mint,
        provider.wallet.publicKey
      )
      
      // Get admin's token account (mint authority)
      const adminTokenAccount = getAssociatedTokenAddressSync(
        mint,
        adminKeypair.publicKey
      )
      
      const transaction = new Transaction()
      
      // Check if user's associated token account exists
      const userAccountInfo = await connection.getAccountInfo(userTokenAccount)
      if (!userAccountInfo) {
        // Create user's associated token account
        transaction.add(
          createAssociatedTokenAccountInstruction(
            provider.wallet.publicKey, // payer
            userTokenAccount, // ata
            provider.wallet.publicKey, // owner
            mint // mint
          )
        )
      }
      
      // Check if admin's associated token account exists
      const adminAccountInfo = await connection.getAccountInfo(adminTokenAccount)
      if (!adminAccountInfo) {
        // Create admin's associated token account
        transaction.add(
          createAssociatedTokenAccountInstruction(
            adminKeypair.publicKey, // payer
            adminTokenAccount, // ata
            adminKeypair.publicKey, // owner
            mint // mint
          )
        )
      }
      
      // Mint tokens to admin's account first (admin is mint authority)
      transaction.add(
        createMintToInstruction(
          mint, // mint
          adminTokenAccount, // destination
          adminKeypair.publicKey, // mint authority
          amount // amount
        )
      )
      
      // Transfer tokens from admin to user
      transaction.add(
        createTransferInstruction(
          adminTokenAccount, // source
          userTokenAccount, // destination
          adminKeypair.publicKey, // owner
          amount // amount
        )
      )
      
      // Set recent blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.lastValidBlockHeight = lastValidBlockHeight
      
      // Set fee payer to user's wallet
      transaction.feePayer = provider.wallet.publicKey
      
      // Sign with both admin and user wallets
      transaction.partialSign(adminKeypair)
      
      // Send transaction
      const signature = await provider.sendAndConfirm(transaction)
      
      return signature
    },
    onSuccess: async (signature) => {
      transactionToast(signature)
      toast.success('Tokens minted successfully!')
    },
    onError: (error) => {
      console.error('Mint error:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      if (errorMessage.includes('mint authority')) {
        toast.error('Admin wallet does not have mint authority for this token')
      } else if (errorMessage.includes('insufficient funds')) {
        toast.error('Insufficient SOL for transaction fees')
      } else {
        toast.error(`Failed to mint tokens: ${errorMessage}`)
      }
    },
  })

  return {
    program,
    programId,
    banks,
    users,
    getProgramAccount,
    initBank,
    initUser,
    deposit,
    borrow,
    mintTokens,
  }
}

export function useLendingBankAccount({ account }: { account: PublicKey }) {
  const { cluster } = useCluster()
  const { program, banks } = useLendingProgram()

  const bankQuery = useQuery({
    queryKey: ['lending', 'bank', { cluster, account }],
    queryFn: () => program.account.bank.fetch(account),
  })

  return {
    bankQuery,
    refetch: banks.refetch,
  }
}

export function useLendingUserAccount({ account }: { account: PublicKey }) {
  const { cluster } = useCluster()
  const { program, users } = useLendingProgram()

  const userQuery = useQuery({
    queryKey: ['lending', 'user', { cluster, account }],
    queryFn: () => program.account.user.fetch(account),
  })

  return {
    userQuery,
    refetch: users.refetch,
  }
}
