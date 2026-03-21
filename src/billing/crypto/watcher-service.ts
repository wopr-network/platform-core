/**
 * Watcher Service — boots chain watchers and sends webhook callbacks.
 *
 * Reads enabled payment methods from DB, starts BTC + EVM watchers,
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
}

/** POST the payment event to the charge's callbackUrl. */
async function sendWebhook(
  callbackUrl: string,
  payload: Record<string, unknown>,
  log: (msg: string, meta?: Record<string, unknown>) => void,
): Promise<void> {
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

/** Handle a confirmed payment — update charge, send webhook. */
async function handlePayment(
  chargeStore: ICryptoChargeRepository,
  address: string,
  payload: Record<string, unknown>,
  log: (msg: string, meta?: Record<string, unknown>) => void,
): Promise<void> {
  const charge = await chargeStore.getByDepositAddress(address);
  if (!charge) {
    log("Payment to unknown address", { address });
    return;
  }
  if (charge.creditedAt) {
    log("Payment already credited", { address, chargeId: charge.referenceId });
    return;
  }

  // Update charge status
  await chargeStore.updateStatus(
    charge.referenceId,
    "Settled" as never,
    charge.token ?? undefined,
    String(payload.amountReceived ?? ""),
  );

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
  const timers: ReturnType<typeof setInterval>[] = [];
  const evmWatchers: EvmWatcher[] = [];

  const methods = await methodStore.listEnabled();

  // Group methods by type for watcher creation
  const btcMethods = methods.filter((m) => m.type === "native" && (m.chain === "bitcoin" || m.chain === "litecoin"));
  const evmMethods = methods.filter(
    (m) =>
      m.type === "erc20" ||
      (m.type === "native" && m.chain !== "bitcoin" && m.chain !== "litecoin" && m.chain !== "dogecoin"),
  );

  // --- BTC Watcher ---
  for (const method of btcMethods) {
    if (!method.rpcUrl) continue;

    const rpcCall = createBitcoindRpc({
      rpcUrl: method.rpcUrl,
      rpcUser: opts.bitcoindUser ?? "btcpay",
      rpcPassword: opts.bitcoindPassword ?? "",
      network: "mainnet",
      confirmations: method.confirmations,
    });

    // Load active deposit addresses for this chain
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
        log("BTC payment detected", { address: event.address, txid: event.txid, sats: event.amountSats });
        await handlePayment(
          chargeStore,
          event.address,
          {
            txHash: event.txid,
            amountReceived: `${event.amountSats} sats`,
            amountUsdCents: event.amountUsdCents,
            confirmations: event.confirmations,
          },
          log,
        );
      },
    });

    // Import all watched addresses into bitcoind wallet
    for (const addr of chainAddresses) {
      try {
        await watcher.importAddress(addr);
      } catch {
        log("Failed to import address into bitcoind", { address: addr });
      }
    }

    log(`BTC watcher started (${method.chain})`, {
      addresses: chainAddresses.length,
      confirmations: method.confirmations,
    });

    timers.push(
      setInterval(async () => {
        try {
          // Refresh watched addresses (new charges may have been created)
          const fresh = await chargeStore.listActiveDepositAddresses();
          const freshChain = fresh.filter((a) => a.chain === method.chain).map((a) => a.address);
          watcher.setWatchedAddresses(freshChain);
          await watcher.poll();
        } catch (err) {
          log("BTC watcher poll error", { error: String(err) });
        }
      }, pollMs),
    );
  }

  // --- EVM Watchers ---
  for (const method of evmMethods) {
    if (!method.rpcUrl || !method.contractAddress) continue;

    const rpcCall = createRpcCaller(method.rpcUrl);

    // Get current block for starting cursor
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
          log,
        );
      },
    });

    await watcher.init();
    evmWatchers.push(watcher);

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

  log("All watchers started", { btc: btcMethods.length, evm: evmMethods.length, pollMs });

  return () => {
    for (const t of timers) clearInterval(t);
  };
}
