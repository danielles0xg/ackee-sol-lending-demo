# Project Description

**Deployed Frontend URL:** https://ackee-sol-lending-demo-6x9v.vercel.app/

**Solana Program ID:** FQwNs7BPQ9NW258VxGHo885VqPqHPk7yFZUFgDLJx9Hd

## Project Overview

### Description

The protocol handles SOL and USDC deposits, WSOL borrows with real-time price feeds from Pyth oracles.

Users can deposit their tokens to earn yield and borrow against their collateral to go long or short. 

### Key Features

- **Deposit & Earn**: Park your SOL and USDC to start earning that passive income - compound 
- **Borrow Against Collateral**: Got collateral to borrow more tokens and leverage up
- **Real-Time Oracle Pricing**: Pyth network integration ensures you're getting fair prices, no sandwich attacks here
- **Health Factor Monitoring**: Keep track of your liquidation risk so you don't get absolutely rekt
- **Multi-Asset Support**: DEMO Start with SOL/USDC but architected to add more tokens

### How to Use the dApp

1. **Connect Wallet** - Hook up your phantom/solflare 
2. **Initialize Account** - First time, Hit that init button to set up your lending account
3. **Mint Test Tokens** - DEMO on devnet so we got you covered with free test tokens
4. **Deposit Funds** - Choose your asset (SOL or USDC) and deposit to start earning yield
5. **Borrow** - Use your deposited collateral to borrow other assets 
6. **Monitor Positions** - Keep an eye on your deposits, borrows, and health factor in the dashboard

## Program Architecture

The lending protocol uses a vault-based architecture where each asset gets its own bank that manages deposits, borrows, and interest accrual. Users have individual accounts that track their positions across all supported assets. Everything runs through PDAs for security and the Pyth oracle integration provides real-time pricing for collateral calculations.

### PDA Usage

PDAs are used extensively for deterministic account generation and program security. Each PDA serves a specific purpose in the lending ecosystem.

**PDAs Used:**
- **Bank PDA**: Derived from `[mint_address]` - stores all bank state for each supported asset (deposits, borrows, interest rates, LTV ratios)
- **Treasury PDA**: Derived from `[b"treasury", mint_address]` - holds the actual tokens deposited in each bank, acts as the vault
- **User Account PDA**: Derived from `[user_wallet_pubkey]` - tracks individual user positions across all assets (deposits, borrows, health factor)

### Program Instructions

Only two main functions are exposed for this demo but the architecture supports expansion.

**Instructions Implemented:**
- **Initialize Bank**: Sets up a new asset bank with LTV ratios, liquidation thresholds, and creates the treasury vault
- **Initialize User**: Creates user lending account with initial state for tracking positions
- **Deposit**: Transfers user tokens to bank treasury, calculates shares, updates user and bank state
- **Borrow**: Validates collateral via Pyth oracle, transfers tokens from treasury to user, updates borrowed positions

### Account Structure

```rust
#[account]
pub struct Bank {
    pub authority: Pubkey,           // Bank admin authority
    pub mint_address: Pubkey,        // Asset mint address  
    pub total_deposits: u64,         // Total tokens deposited
    pub total_deposit_shares: u64,   // Total deposit shares for yield calculation
    pub total_borrowed: u64,         // Total tokens borrowed
    pub total_borrowed_shares: u64,  // Total borrow shares for interest
    pub liquidation_threshold: u64,  // LTV threshold for liquidation
    pub liquidation_bonus: u64,      // Bonus for liquidators
    pub liquidation_close_factor: u64, // Max % that can be liquidated
    pub max_ltv: u64,               // Maximum loan-to-value ratio
    pub last_updated: i64,          // Timestamp for interest calculations
    pub interest_rate: u64,         // Current interest rate
}

#[account] 
pub struct User {
    pub owner: Pubkey,              // User wallet address
    pub deposited_sol: u64,         // SOL deposited amount
    pub deposited_sol_shares: u64,  // SOL deposit shares
    pub borrowed_sol: u64,          // SOL borrowed amount  
    pub borrowed_sol_shares: u64,   // SOL borrow shares
    pub deposited_usdc: u64,        // USDC deposited amount
    pub deposited_usdc_shares: u64, // USDC deposit shares
    pub borrowed_usdc: u64,         // USDC borrowed amount
    pub borrowed_usdc_shares: u64,  // USDC borrow shares
    pub usdc_address: Pubkey,       // USDC mint reference
    pub health_factor: u64,         // Liquidation risk metric
    pub last_updated: i64,          // Last interaction timestamp
}
```

## Testing

### Test Coverage

Comprehensive testing covers the full lending lifecycle with both positive and negative scenarios to ensure the protocol can't be exploited.

**Happy Path Tests:**
- **Bank Initialization**: Successfully creates bank with proper LTV ratios and treasury setup
- **User Account Creation**: Initializes user lending account with correct state 
- **Deposit Flow**: Validates token transfer, share calculation, and state updates
- **Borrow Flow**: Confirms collateral validation, oracle price checks, and position updates

**Unhappy Path Tests:**
- **Over-Borrowing Protection**: Prevents borrowing beyond collateral limits based on oracle prices
- **Insufficient Collateral**: Blocks borrow attempts when health factor would drop too low
- **Oracle Price Validation**: Ensures stale or invalid price data is rejected
- **Account Ownership**: Validates only account owners can modify their positions

### Running Tests
```bash
cd anchor_project/lending
anchor test     # runs full test suite with local validator
```

###  Learning Notes

This was a fun build getting into Solana DeFi primitives! The trickiest part was definitely integrating the Pyth oracle correctly - had to make sure the price feeds were being validated properly and not accepting stale data.

Future improvements would add liquidation functionality, more asset support, and dynamic interest rates. The current version focuses on core deposit/borrow mechanics as a solid foundation.
