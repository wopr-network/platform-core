import type { IWatcherCursorStore } from "../cursor-store.js";
import type { IPriceOracle } from "../oracle/types.js";
import type { BitcoindConfig, BtcPaymentEvent } from "./types.js";

type RpcCall = (method: string, params: unknown[]) => Promise<unknown>;

export interface BtcWatcherOpts {
  config: BitcoindConfig;
  rpcCall: RpcCall;
  /** Addresses to watch (must be imported into bitcoind wallet first). */
  watchedAddresses: string[];
  onPayment: (event: BtcPaymentEvent) => void | Promise<void>;
  /** Price oracle for BTC/USD conversion. */
  oracle: IPriceOracle;
  cursorStore?: IWatcherCursorStore;
}

interface ReceivedByAddress {
  address: string;
  amount: number;
  confirmations: number;
  txids: string[];
}

export class BtcWatcher {
  private readonly rpc: RpcCall;
  private readonly addresses: Set<string>;
  private readonly onPayment: BtcWatcherOpts["onPayment"];
  private readonly minConfirmations: number;
  private readonly oracle: IPriceOracle;
  private readonly cursorStore?: IWatcherCursorStore;
  private readonly watcherId: string;

  constructor(opts: BtcWatcherOpts) {
    this.rpc = opts.rpcCall;
    this.addresses = new Set(opts.watchedAddresses);
    this.onPayment = opts.onPayment;
    this.minConfirmations = opts.config.confirmations;
    this.oracle = opts.oracle;
    this.cursorStore = opts.cursorStore;
    this.watcherId = `btc:${opts.config.network}`;
  }

  /** Update the set of watched addresses. */
  setWatchedAddresses(addresses: string[]): void {
    this.addresses.clear();
    for (const a of addresses) this.addresses.add(a);
  }

  /** Import an address into bitcoind's wallet (watch-only, no rescan). */
  async importAddress(address: string): Promise<void> {
    await this.rpc("importaddress", [address, "", false]);
    this.addresses.add(address);
  }

  /** Poll for confirmed payments to watched addresses. */
  async poll(): Promise<void> {
    if (this.addresses.size === 0) return;

    const received = (await this.rpc("listreceivedbyaddress", [
      this.minConfirmations,
      false, // include_empty
      true, // include_watchonly
    ])) as ReceivedByAddress[];

    const { priceCents } = await this.oracle.getPrice("BTC");

    for (const entry of received) {
      if (!this.addresses.has(entry.address)) continue;

      for (const txid of entry.txids) {
        // Skip already-processed txids (persisted to DB, survives restart)
        if (this.cursorStore && (await this.cursorStore.hasProcessedTx(this.watcherId, txid))) continue;

        // Get transaction details for the exact amount sent to this address
        const tx = (await this.rpc("gettransaction", [txid, true])) as {
          details: Array<{ address: string; amount: number; category: string }>;
          confirmations: number;
        };

        const detail = tx.details.find((d) => d.address === entry.address && d.category === "receive");
        if (!detail) continue;

        const amountSats = Math.round(detail.amount * 100_000_000);
        // priceCents is cents per 1 BTC. detail.amount is in BTC.
        const amountUsdCents = Math.round((amountSats * priceCents) / 100_000_000);

        const event: BtcPaymentEvent = {
          address: entry.address,
          txid,
          amountSats,
          amountUsdCents,
          confirmations: tx.confirmations,
        };

        await this.onPayment(event);
        // Persist AFTER successful onPayment — survives restart, no unbounded memory
        if (this.cursorStore) await this.cursorStore.markProcessedTx(this.watcherId, txid);
      }
    }
  }
}

/** Create a bitcoind JSON-RPC caller with basic auth. */
export function createBitcoindRpc(config: BitcoindConfig): RpcCall {
  let id = 0;
  const auth = btoa(`${config.rpcUser}:${config.rpcPassword}`);
  return async (method: string, params: unknown[]): Promise<unknown> => {
    const res = await fetch(config.rpcUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({ jsonrpc: "1.0", id: ++id, method, params }),
    });
    if (!res.ok) throw new Error(`bitcoind ${method} failed: ${res.status}`);
    const data = (await res.json()) as { result?: unknown; error?: { message: string } };
    if (data.error) throw new Error(`bitcoind ${method}: ${data.error.message}`);
    return data.result;
  };
}
