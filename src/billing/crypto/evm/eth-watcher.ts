import { nativeToCents } from "../oracle/convert.js";
import type { IPriceOracle } from "../oracle/types.js";
import { getChainConfig } from "./config.js";
import type { EvmChain } from "./types.js";

type RpcCall = (method: string, params: unknown[]) => Promise<unknown>;

/** Event emitted when a native ETH deposit is detected and confirmed. */
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
}

export interface EthWatcherOpts {
  chain: EvmChain;
  rpcCall: RpcCall;
  oracle: IPriceOracle;
  fromBlock: number;
  onPayment: (event: EthPaymentEvent) => void | Promise<void>;
  watchedAddresses?: string[];
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
 * Uses the price oracle to convert wei → USD cents at detection time.
 */
export class EthWatcher {
  private _cursor: number;
  private readonly chain: EvmChain;
  private readonly rpc: RpcCall;
  private readonly oracle: IPriceOracle;
  private readonly onPayment: EthWatcherOpts["onPayment"];
  private readonly confirmations: number;
  private _watchedAddresses: Set<string>;
  private readonly processedTxids = new Set<string>();

  constructor(opts: EthWatcherOpts) {
    this.chain = opts.chain;
    this.rpc = opts.rpcCall;
    this.oracle = opts.oracle;
    this._cursor = opts.fromBlock;
    this.onPayment = opts.onPayment;
    this.confirmations = getChainConfig(opts.chain).confirmations;
    this._watchedAddresses = new Set((opts.watchedAddresses ?? []).map((a) => a.toLowerCase()));
  }

  setWatchedAddresses(addresses: string[]): void {
    this._watchedAddresses = new Set(addresses.map((a) => a.toLowerCase()));
  }

  get cursor(): number {
    return this._cursor;
  }

  /**
   * Poll for new native ETH transfers to watched addresses.
   *
   * Scans each confirmed block's transactions. Only processes txs
   * where `to` is in the watched set and `value > 0`.
   */
  async poll(): Promise<void> {
    if (this._watchedAddresses.size === 0) return;

    const latestHex = (await this.rpc("eth_blockNumber", [])) as string;
    const latest = Number.parseInt(latestHex, 16);
    const confirmed = latest - this.confirmations;

    if (confirmed < this._cursor) return;

    const { priceCents } = await this.oracle.getPrice("ETH");

    for (let blockNum = this._cursor; blockNum <= confirmed; blockNum++) {
      const block = (await this.rpc("eth_getBlockByNumber", [`0x${blockNum.toString(16)}`, true])) as {
        transactions: RpcTransaction[];
      } | null;

      if (!block) continue;

      for (const tx of block.transactions) {
        if (!tx.to) continue;
        const to = tx.to.toLowerCase();
        if (!this._watchedAddresses.has(to)) continue;

        const valueWei = BigInt(tx.value);
        if (valueWei === 0n) continue;

        if (this.processedTxids.has(tx.hash)) continue;

        const amountUsdCents = nativeToCents(valueWei, priceCents, 18);

        const event: EthPaymentEvent = {
          chain: this.chain,
          from: tx.from.toLowerCase(),
          to,
          valueWei: valueWei.toString(),
          amountUsdCents,
          txHash: tx.hash,
          blockNumber: blockNum,
        };

        await this.onPayment(event);
        // Add to processed AFTER successful onPayment to avoid skipping on failure
        this.processedTxids.add(tx.hash);
      }
    }

    this._cursor = confirmed + 1;
  }
}
