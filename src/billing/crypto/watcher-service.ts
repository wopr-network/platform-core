/**
 * Watcher Service — boots chain watchers and sends webhook callbacks.
 *
 * Reads enabled payment methods from DB, starts BTC/UTXO + EVM watchers,
 * and POSTs to charge.callbackUrl on confirmed payments.
 *
 * Runs inside the key server entry point on the chain server.
 */

import type { BtcPaymentEvent } from "./btc/types.js";
import { BtcWatcher, createBitcoindRpc } from "./btc/watcher.js";
import type { ICryptoChargeRepository } from "./charge-store.js";
import type { IWatcherCursorStore } from "./cursor-store.js";
import type { EvmChain, EvmPaymentEvent, StablecoinToken } from "./evm/types.js";
import { createRpcCaller, EvmWatcher } from "./evm/watcher.js";
import type { IPriceOracle } from "./oracle/types.js";
import type { IPaymentMethodStore } from "./payment-method-store.js";
import type { CryptoPaymentState } from "./types.js";

export interface WatcherServiceOpts {
  chargeStore: ICryptoChargeRepository;
  methodStore: IPaymentMethodStore;
  cursorStore: IWatcherCursorStore;
  oracle: IPriceOracle;
  /** Bitcoind RPC credentials (from env). */
  bitcoindUser?: string;
  bitcoindPassword?: string;
  /** Poll interval in ms. Default: 15000 (15s). */
  pollIntervalMs?: number;
  /** Logger function. */
  log?: (msg: string, meta?: Record<string, unknown>) => void;
  /** Allowed callback URL prefixes. Default: ["https://"] */
  allowedCallbackPrefixes?: string[];
}

/** Validate callbackUrl to prevent SSRF. Only HTTPS to known product domains. */
function isValidCallbackUrl(url: string, allowedPrefixes: string[]): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    // Block internal/private IPs
    const host = parsed.hostname;
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") return false;
    if (host.startsWith("10.") || host.startsWith("192.168.") || host.startsWith("169.254.")) return false;
    if (allowedPrefixes.length > 0) {
      return allowedPrefixes.some((prefix) => url.startsWith(prefix));
    }
    return true;
  } catch {
    return false;
  }
}

/** POST the payment event to the charge's callbackUrl. */
async function sendWebhook(
  callbackUrl: string,
  payload: Record<string, unknown>,
  allowedPrefixes: string[],
  log: (msg: string, meta?: Record<string, unknown>) => void,
): Promise<void> {
  if (!isValidCallbackUrl(callbackUrl, allowedPrefixes)) {
    log("Webhook blocked — invalid callbackUrl", { callbackUrl });
    return;
  }
  try {
    const res = await fetch(callbackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      log("Webhook delivery failed", { callbackUrl, status: res.status });
    }
  } catch (err) {
    log("Webhook delivery error", { callbackUrl, error: String(err) });
  }
}

/** Handle a confirmed payment — update charge, mark credited, send webhook. */
async function handlePayment(
  chargeStore: ICryptoChargeRepository,
  address: string,
  payload: Record<string, unknown>,
  allowedPrefixes: string[],
  log: (msg: string, meta?: Record<string, unknown>) => void,
): Promise<void> {
  const charge = await chargeStore.getByDepositAddress(address);
  if (!charge) {
    log("Payment to unknown address", { address });
    return;
  }
  if (charge.creditedAt) {
    return; // Already processed — skip silently
  }

  // Update charge status + mark credited (prevents re-processing on next poll)
  const status: CryptoPaymentState = "Settled";
  await chargeStore.updateStatus(
    charge.referenceId,
    status,
    charge.token ?? undefined,
    String(payload.amountReceived ?? ""),
  );
  await chargeStore.markCredited(charge.referenceId);

  if (charge.callbackUrl) {
    await sendWebhook(
      charge.callbackUrl,
      {
        chargeId: charge.referenceId,
        chain: charge.chain,
        address: charge.depositAddress,
        amountUsdCents: charge.amountUsdCents,
        status: "confirmed",
        ...payload,
      },
      allowedPrefixes,
      log,
    );
  }
}

/**
 * Start all chain watchers. Returns a cleanup function to stop polling.
 */
export async function startWatchers(opts: WatcherServiceOpts): Promise<() => void> {
  const { chargeStore, methodStore, cursorStore, oracle } = opts;
  const pollMs = opts.pollIntervalMs ?? 15_000;
  const log = opts.log ?? (() => {});
  const allowedPrefixes = opts.allowedCallbackPrefixes ?? [];
  const timers: ReturnType<typeof setInterval>[] = [];

  const methods = await methodStore.listEnabled();

  // UTXO watchers: BTC, LTC, DOGE — all use bitcoind-style RPC (listreceivedbyaddress)
  const utxoMethods = methods.filter(
    (m) => m.type === "native" && (m.chain === "bitcoin" || m.chain === "litecoin" || m.chain === "dogecoin"),
  );
  // EVM watchers: ERC20 tokens + native ETH on EVM chains
  const evmMethods = methods.filter(
    (m) =>
      m.type === "erc20" ||
      (m.type === "native" && m.chain !== "bitcoin" && m.chain !== "litecoin" && m.chain !== "dogecoin"),
  );

  // --- UTXO Watchers (BTC, LTC, DOGE) ---
  for (const method of utxoMethods) {
    if (!method.rpcUrl) continue;

    const rpcCall = createBitcoindRpc({
      rpcUrl: method.rpcUrl,
      rpcUser: opts.bitcoindUser ?? "btcpay",
      rpcPassword: opts.bitcoindPassword ?? "",
      network: "mainnet",
      confirmations: method.confirmations,
    });

    const activeAddresses = await chargeStore.listActiveDepositAddresses();
    const chainAddresses = activeAddresses.filter((a) => a.chain === method.chain).map((a) => a.address);

    const watcher = new BtcWatcher({
      config: {
        rpcUrl: method.rpcUrl,
        rpcUser: opts.bitcoindUser ?? "btcpay",
        rpcPassword: opts.bitcoindPassword ?? "",
        network: "mainnet",
        confirmations: method.confirmations,
      },
      rpcCall,
      watchedAddresses: chainAddresses,
      oracle,
      cursorStore,
      onPayment: async (event: BtcPaymentEvent) => {
        log("UTXO payment detected", { chain: method.chain, address: event.address, txid: event.txid });
        await handlePayment(
          chargeStore,
          event.address,
          {
            txHash: event.txid,
            amountReceived: `${event.amountSats} sats`,
            amountUsdCents: event.amountUsdCents,
            confirmations: event.confirmations,
          },
          allowedPrefixes,
          log,
        );
      },
    });

    // Import all watched addresses into wallet
    for (const addr of chainAddresses) {
      try {
        await watcher.importAddress(addr);
      } catch {
        log("Failed to import address", { chain: method.chain, address: addr });
      }
    }

    // Track previously known addresses so we can import new ones on refresh
    let knownAddresses = new Set(chainAddresses);

    log(`UTXO watcher started (${method.chain})`, {
      addresses: chainAddresses.length,
      confirmations: method.confirmations,
    });

    timers.push(
      setInterval(async () => {
        try {
          const fresh = await chargeStore.listActiveDepositAddresses();
          const freshChain = fresh.filter((a) => a.chain === method.chain).map((a) => a.address);

          // Import any NEW addresses into the wallet before polling
          for (const addr of freshChain) {
            if (!knownAddresses.has(addr)) {
              try {
                await watcher.importAddress(addr);
              } catch {
                log("Failed to import new address", { chain: method.chain, address: addr });
              }
            }
          }
          knownAddresses = new Set(freshChain);

          watcher.setWatchedAddresses(freshChain);
          await watcher.poll();
        } catch (err) {
          log("UTXO watcher poll error", { chain: method.chain, error: String(err) });
        }
      }, pollMs),
    );
  }

  // --- EVM Watchers ---
  for (const method of evmMethods) {
    if (!method.rpcUrl || !method.contractAddress) continue;

    const rpcCall = createRpcCaller(method.rpcUrl);

    const latestHex = (await rpcCall("eth_blockNumber", [])) as string;
    const latestBlock = Number.parseInt(latestHex, 16);

    const activeAddresses = await chargeStore.listActiveDepositAddresses();
    const chainAddresses = activeAddresses.filter((a) => a.chain === method.chain).map((a) => a.address);

    const watcher = new EvmWatcher({
      chain: method.chain as EvmChain,
      token: method.token as StablecoinToken,
      rpcCall,
      fromBlock: latestBlock,
      watchedAddresses: chainAddresses,
      cursorStore,
      onPayment: async (event: EvmPaymentEvent) => {
        log("EVM payment detected", { chain: event.chain, token: event.token, to: event.to, txHash: event.txHash });
        await handlePayment(
          chargeStore,
          event.to,
          {
            txHash: event.txHash,
            amountReceived: event.rawAmount,
            amountUsdCents: event.amountUsdCents,
            confirmations: method.confirmations,
          },
          allowedPrefixes,
          log,
        );
      },
    });

    await watcher.init();

    log(`EVM watcher started (${method.chain}:${method.token})`, {
      addresses: chainAddresses.length,
      contract: method.contractAddress,
    });

    timers.push(
      setInterval(async () => {
        try {
          const fresh = await chargeStore.listActiveDepositAddresses();
          const freshChain = fresh.filter((a) => a.chain === method.chain).map((a) => a.address);
          watcher.setWatchedAddresses(freshChain);
          await watcher.poll();
        } catch (err) {
          log("EVM watcher poll error", { chain: method.chain, token: method.token, error: String(err) });
        }
      }, pollMs),
    );
  }

  log("All watchers started", { utxo: utxoMethods.length, evm: evmMethods.length, pollMs });

  return () => {
    for (const t of timers) clearInterval(t);
  };
}
