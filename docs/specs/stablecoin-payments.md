# Stablecoin Payment System

## Status: PLANNED

## Overview

Self-hosted EVM payment watcher for stablecoin credit purchases. Same architecture as BTCPay (watch blockchain → detect payment → credit ledger), but for ERC-20 tokens on Ethereum L2s.

Zero third-party dependencies. We own the stack. That means self-hosted nodes from day one — no Alchemy, no Infura, no API keys, no rate limits, no vendor to rip out later.

## Supported Tokens (launch)

| Token | Chains | Contract |
|-------|--------|----------|
| USDC | Base | Circle-issued |
| USDT | Base | Tether-issued |
| DAI | Base | MakerDAO |

## Architecture

```
User clicks "Pay with stablecoin" → UI
  ↓
Platform creates invoice → generates unique deposit address (HD derivation)
  ↓
User sends USDC/USDT/DAI to the address
  ↓
EVM Watcher (polling self-hosted op-geth) detects Transfer event → confirms block depth
  ↓
Watcher fires internal event (same shape as BTCPay webhook)
  ↓
handleCryptoWebhook() → Credit.fromCents(amountUsdCents) → double-entry ledger
```

## Self-Hosted Node

### Why self-hosted from day one

- **We own the stack** — same reason we run BTCPay instead of Coinbase Commerce
- **No API keys** — one fewer secret to manage, rotate, and leak
- **No rate limits** — poll as fast as we want
- **No vendor lock-in** — nothing to rip out in Phase 4
- **Cost** — a Base node is ~50GB disk, <1GB RAM. Cheaper than an Alchemy Growth plan
- **Latency** — localhost RPC is sub-millisecond vs 50-200ms to a provider

### Base node stack (docker-compose)

```yaml
op-geth:
  image: us-docker.pkg.dev/oplabs-tools-artifacts/images/op-geth:latest
  volumes:
    - base-geth-data:/data
  ports:
    - "8545:8545"   # JSON-RPC
    - "8546:8546"   # WebSocket
  command: >
    --datadir=/data
    --http --http.addr=0.0.0.0 --http.port=8545
    --http.api=eth,net,web3
    --ws --ws.addr=0.0.0.0 --ws.port=8546
    --ws.api=eth,net,web3
    --rollup.sequencerhttp=https://mainnet-sequencer.base.org
    --rollup.historicalrpc=https://mainnet.base.org
    --syncmode=snap

op-node:
  image: us-docker.pkg.dev/oplabs-tools-artifacts/images/op-node:latest
  depends_on: [op-geth]
  command: >
    --l1=ws://geth:8546
    --l2=http://op-geth:8551
    --network=base-mainnet
    --rpc.addr=0.0.0.0 --rpc.port=9545
```

Initial sync takes a few hours. After that, stays current within seconds.

For local dev / CI, use a Hardhat or Anvil fork — no real node needed.

## Design Decisions

### 1. Address generation

- HD wallet (BIP-44) — derive unique address per invoice from a master xpub
- No hot wallet on the server — xpub-only derivation, funds go directly to merchant wallet
- Same model as BTCPay's on-chain wallet

### 2. Block watching

- Subscribe to ERC-20 `Transfer(from, to, value)` events filtered by our deposit addresses
- Use `eth_getLogs` with a block range, polled every ~2 seconds (Base block time)
- Connect to local `op-geth` at `http://op-geth:8545` — no external calls
- Persistent cursor: store last-processed block in DB to resume after restart

### 3. Confirmation policy

| Chain | Confirmations | Finality time |
|-------|---------------|---------------|
| Base | 1 block + L1 batch posted | ~2 sec + L1 confirmation |

When we add more chains later:

| Chain | Confirmations | Finality time |
|-------|---------------|---------------|
| Ethereum | 12 blocks | ~2.5 min |
| Arbitrum | 1 block + L1 batch posted | ~250ms + L1 confirmation |
| Polygon | 32 blocks | ~1 min |

### 4. Price conversion

- Stablecoins are 1:1 USD by design — no exchange rate needed
- USDC/USDT have 6 decimals, DAI has 18 decimals
- Invoice amount in USD cents → token amount: `amountCents / 100` (USDC/USDT: multiply by 10^6, DAI: multiply by 10^18)
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
# Self-hosted Base node (docker-compose service)
EVM_RPC_BASE=http://op-geth:8545

# Master xpub for address derivation (Ethereum-style)
EVM_XPUB=xpub...
```

That's it. No API keys. No vendor accounts.

When multi-chain is added, one env var per self-hosted node:

```
EVM_RPC_ETHEREUM=http://geth:8545
EVM_RPC_ARBITRUM=http://nitro:8547
EVM_RPC_POLYGON=http://bor:8545
```

## UI Changes

`BuyCryptoCreditPanel` in platform-ui-core:
- Add token selector (USDC, USDT, DAI)
- Show deposit address + QR code
- Poll invoice status until confirmed
- Same `createCryptoCheckout` flow — backend determines address
- Chain selector added later when multi-chain ships

## NOT in scope

- Token swaps (user sends ETH, we convert to USDC) — too complex, MEV risk
- NFT payments
- Non-EVM chains (Solana, etc.) — future if demand exists
- Custodial wallets — we never hold keys, xpub-only derivation
- Third-party RPC providers — we run our own nodes

## Dependencies

- `viem` — EVM library for ABI encoding, address derivation, log parsing (lighter than ethers, tree-shakeable)
- `@scure/bip32` — HD wallet xpub derivation (audited, no dependencies)
- No vendor SDK — plain JSON-RPC to our own node

## Phases

1. **Phase 1**: Self-hosted Base node + USDC on Base (single chain, single token, lowest fees, fastest finality)
2. **Phase 2**: Add USDT + DAI on Base (same node, just more contract addresses)
3. **Phase 3**: Multi-chain — add self-hosted nodes for Ethereum, Arbitrum, Polygon
4. **Phase 4**: Sweep service — consolidate received funds from HD-derived addresses to treasury wallet
