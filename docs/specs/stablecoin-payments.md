# Stablecoin Payment System

## Status: PLANNED

## Overview

Self-hosted EVM payment watcher for stablecoin credit purchases. Same architecture as BTCPay (watch blockchain → detect payment → credit ledger), but for ERC-20 tokens on Ethereum, Base, Arbitrum, and Polygon.

Zero third-party dependencies. We own the stack.

## Supported Tokens (launch)

| Token | Chains | Contract |
|-------|--------|----------|
| USDC | Ethereum, Base, Arbitrum, Polygon | Circle-issued |
| USDT | Ethereum, Arbitrum, Polygon | Tether-issued |
| DAI | Ethereum, Base, Arbitrum | MakerDAO |

## Architecture

```
User clicks "Pay with stablecoin" → UI
  ↓
Platform creates invoice → generates unique deposit address
  ↓
User sends USDC/USDT/DAI to the address
  ↓
EVM Watcher detects Transfer event (ERC-20 log) → confirms block depth
  ↓
Watcher fires internal event (same as BTCPay webhook)
  ↓
handleCryptoWebhook() → Credit.fromCents(amountUsdCents) → double-entry ledger
```

## Design Decisions

### 1. Address generation

- HD wallet (BIP-44 / EIP-2334) — derive unique address per invoice from a master xpub
- No hot wallet on the server — xpub-only derivation, funds go directly to merchant wallet
- Same model as BTCPay's on-chain wallet

### 2. Block watching

- Subscribe to ERC-20 `Transfer(from, to, value)` events filtered by our deposit addresses
- Use `eth_getLogs` with a block range, polled every ~12 seconds (1 block on Ethereum)
- L2s (Base, Arbitrum, Polygon) have faster blocks — poll accordingly
- Need an RPC endpoint per chain: self-hosted (geth/reth) or provider (Alchemy, Infura, public RPCs)

### 3. Confirmation policy

| Chain | Confirmations | Finality time |
|-------|---------------|---------------|
| Ethereum | 12 blocks | ~2.5 min |
| Base | 1 block (L1 batch posted) | ~2 sec + L1 confirmation |
| Arbitrum | 1 block (L1 batch posted) | ~250ms + L1 confirmation |
| Polygon | 32 blocks | ~1 min |

### 4. Price conversion

- Stablecoins are 1:1 USD by design — no exchange rate needed
- USDC/USDT have 6 decimals, DAI has 18 decimals
- Invoice amount in USD cents → token amount: `amountCents / 100` (USDC/USDT: × 10^6, DAI: × 10^18)
- Credit the requested USD amount, not the token amount (same as BTCPay — overpayment stays in wallet)

### 5. Integration with existing crypto module

Reuse everything from `src/billing/crypto/`:

| Component | Reuse | Change |
|-----------|-------|--------|
| `crypto_charges` table | As-is | Add `chain` and `token` columns |
| `ICryptoChargeRepository` | As-is | No change |
| `handleCryptoWebhook()` | As-is | Receives events from EVM watcher instead of BTCPay |
| `Credit.fromCents()` | As-is | Same cents → nanodollars bridge |
| `verifyCryptoWebhookSignature()` | Not needed | Internal event, not external webhook |
| Double-entry ledger | As-is | `fundingSource: "crypto"` (same as BTCPay) |

### 6. New components needed

```
src/billing/crypto/
  evm-watcher.ts          — Block polling, Transfer event parsing
  evm-address-generator.ts — HD wallet address derivation from xpub
  evm-config.ts           — Chain configs (RPC URLs, contract addresses, confirmations)
  evm-watcher.test.ts     — Mock Transfer events, confirmation counting
```

### 7. Credit invariants (UNCHANGED)

- `amountUsdCents` in charge store = USD cents (integer)
- `Credit.fromCents()` converts to nanodollars for the ledger
- Double-entry balanced journal entries
- Integer math only — no floating point in the billing path
- Idempotency via `creditedAt` flag + replay guard

## Environment Variables

```
# RPC endpoints (one per chain)
EVM_RPC_ETHEREUM=https://eth-mainnet.g.alchemy.com/v2/<key>
EVM_RPC_BASE=https://base-mainnet.g.alchemy.com/v2/<key>
EVM_RPC_ARBITRUM=https://arb-mainnet.g.alchemy.com/v2/<key>
EVM_RPC_POLYGON=https://polygon-mainnet.g.alchemy.com/v2/<key>

# Master xpub for address derivation (Ethereum-style)
EVM_XPUB=xpub...

# Or self-hosted nodes
EVM_RPC_ETHEREUM=http://geth:8545
```

## UI Changes

`BuyCryptoCreditPanel` in platform-ui-core:
- Add token/chain selector (USDC, USDT, DAI × chain)
- Show deposit address + QR code
- Poll invoice status until confirmed
- Same `createCryptoCheckout` flow — backend determines address

## NOT in scope

- Token swaps (user sends ETH, we convert to USDC) — too complex, MEV risk
- NFT payments
- Non-EVM chains (Solana, etc.) — future if demand exists
- Custodial wallets — we never hold keys, xpub-only derivation

## Dependencies

- `ethers` or `viem` — EVM library for ABI encoding, address derivation, log parsing
- HD wallet library — `@scure/bip32` or similar for xpub derivation
- No vendor SDK — same philosophy as BTCPay integration (plain RPC calls)

## Phases

1. **Phase 1**: USDC on Base (lowest fees, fastest finality, single chain)
2. **Phase 2**: Add USDT + DAI on Base
3. **Phase 3**: Multi-chain (Ethereum, Arbitrum, Polygon)
4. **Phase 4**: Self-hosted RPC nodes (eliminate Alchemy/Infura dependency)
