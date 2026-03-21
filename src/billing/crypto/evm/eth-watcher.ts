import type { IWatcherCursorStore } from "../cursor-store.js";
import { nativeToCents } from "../oracle/convert.js";
import type { IPriceOracle } from "../oracle/types.js";
import { getChainConfig } from "./config.js";
import type { EvmChain } from "./types.js";

type RpcCall = (method: string, params: unknown[]) => Promise<unknown>;

/** Event emitted on each confirmation increment for a native ETH deposit. */
export interface EthPaymentEvent {
  readonly chain: EvmChain;
  readonly from: string;
  readonly to: string;
  /** Raw value in wei (BigInt as string for serialization). */
  readonly valueWei: string;
  /** USD cents equivalent at detection time (integer). */
  readonly amountUsdCents: number;
  readonly txHash: string;
  readonly blockNumber: number;
  /** Current confirmation count (latest block - tx block). */
  readonly confirmations: number;
  /** Required confirmations for this chain. */
  readonly confirmationsRequired: number;
}

export interface EthWatcherOpts {
  chain: EvmChain;
  rpcCall: RpcCall;
  oracle: IPriceOracle;
  fromBlock: number;
  onPayment: (event: EthPaymentEvent) => void | Promise<void>;
  watchedAddresses?: string[];
  cursorStore?: IWatcherCursorStore;
}

interface RpcTransaction {
  hash: string;
  from: string;
  to: string | null;
  value: string;
  blockNumber: string;
}

/**
 * Native ETH transfer watcher.
 *
 * Unlike the ERC-20 EvmWatcher which uses eth_getLogs for Transfer events,
 * this scans blocks for transactions where `to` matches a watched deposit
 * address and `value > 0`.
 *
 * Scans up to latest block (not just confirmed) to detect pending txs.
 * Emits events on each confirmation increment. Only advances cursor
 * past fully-confirmed blocks.
 */
export class EthWatcher {
  private _cursor: number;
  private readonly chain: EvmChain;
  private readonly rpc: RpcCall;
  private readonly oracle: IPriceOracle;
  private readonly onPayment: EthWatcherOpts["onPayment"];
  private readonly confirmations: number;
  private readonly cursorStore?: IWatcherCursorStore;
  private readonly watcherId: string;
  private _watchedAddresses: Set<string>;

  constructor(opts: EthWatcherOpts) {
    this.chain = opts.chain;
    this.rpc = opts.rpcCall;
    this.oracle = opts.oracle;
    this._cursor = opts.fromBlock;
    this.onPayment = opts.onPayment;
    this.confirmations = getChainConfig(opts.chain).confirmations;
    this.cursorStore = opts.cursorStore;
    this.watcherId = `eth:${opts.chain}`;
    this._watchedAddresses = new Set((opts.watchedAddresses ?? []).map((a) => a.toLowerCase()));
  }

  /** Load cursor from DB. Call once at startup before first poll. */
  async init(): Promise<void> {
    if (!this.cursorStore) return;
    const saved = await this.cursorStore.get(this.watcherId);
    if (saved !== null) this._cursor = saved;
  }

  setWatchedAddresses(addresses: string[]): void {
    this._watchedAddresses = new Set(addresses.map((a) => a.toLowerCase()));
  }

  get cursor(): number {
    return this._cursor;
  }

  /**
   * Poll for native ETH transfers to watched addresses, including unconfirmed blocks.
   *
   * Scans from cursor to latest block. Emits events with current confirmation count.
   * Re-emits on each confirmation increment. Only advances cursor past fully-confirmed blocks.
   */
  async poll(): Promise<void> {
    if (this._watchedAddresses.size === 0) return;

    const latestHex = (await this.rpc("eth_blockNumber", [])) as string;
    const latest = Number.parseInt(latestHex, 16);
    const confirmed = latest - this.confirmations;

    if (latest < this._cursor) return;

    const { priceCents } = await this.oracle.getPrice("ETH");

    // Scan up to latest (not just confirmed) to detect pending txs
    for (let blockNum = this._cursor; blockNum <= latest; blockNum++) {
      const block = (await this.rpc("eth_getBlockByNumber", [`0x${blockNum.toString(16)}`, true])) as {
        transactions: RpcTransaction[];
      } | null;

      if (!block) continue;

      const confs = latest - blockNum;

      for (const tx of block.transactions) {
        if (!tx.to) continue;
        const to = tx.to.toLowerCase();
        if (!this._watchedAddresses.has(to)) continue;

        const valueWei = BigInt(tx.value);
        if (valueWei === 0n) continue;

        // Skip if we already emitted at this confirmation count
        if (this.cursorStore) {
          const lastConf = await this.cursorStore.getConfirmationCount(this.watcherId, tx.hash);
          if (lastConf !== null && confs <= lastConf) continue;
        }

        const amountUsdCents = nativeToCents(valueWei, priceCents, 18);

        const event: EthPaymentEvent = {
          chain: this.chain,
          from: tx.from.toLowerCase(),
          to,
          valueWei: valueWei.toString(),
          amountUsdCents,
          txHash: tx.hash,
          blockNumber: blockNum,
          confirmations: confs,
          confirmationsRequired: this.confirmations,
        };

        await this.onPayment(event);

        if (this.cursorStore) {
          await this.cursorStore.saveConfirmationCount(this.watcherId, tx.hash, confs);
        }
      }

      // Only advance cursor past fully-confirmed blocks
      if (blockNum <= confirmed) {
        this._cursor = blockNum + 1;
        if (this.cursorStore) {
          await this.cursorStore.save(this.watcherId, this._cursor);
        }
      }
    }
  }
}
