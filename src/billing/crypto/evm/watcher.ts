import { centsFromTokenAmount, getChainConfig, getTokenConfig } from "./config.js";
import type { EvmChain, EvmPaymentEvent, StablecoinToken } from "./types.js";

const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

type RpcCall = (method: string, params: unknown[]) => Promise<unknown>;

export interface EvmWatcherOpts {
  chain: EvmChain;
  token: StablecoinToken;
  rpcCall: RpcCall;
  fromBlock: number;
  onPayment: (event: EvmPaymentEvent) => void | Promise<void>;
}

interface RpcLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: string;
  transactionHash: string;
  logIndex: string;
}

export class EvmWatcher {
  private _cursor: number;
  private readonly chain: EvmChain;
  private readonly token: StablecoinToken;
  private readonly rpc: RpcCall;
  private readonly onPayment: EvmWatcherOpts["onPayment"];
  private readonly confirmations: number;
  private readonly contractAddress: string;
  private readonly decimals: number;

  constructor(opts: EvmWatcherOpts) {
    this.chain = opts.chain;
    this.token = opts.token;
    this.rpc = opts.rpcCall;
    this._cursor = opts.fromBlock;
    this.onPayment = opts.onPayment;

    const chainCfg = getChainConfig(opts.chain);
    const tokenCfg = getTokenConfig(opts.token, opts.chain);
    this.confirmations = chainCfg.confirmations;
    this.contractAddress = tokenCfg.contractAddress.toLowerCase();
    this.decimals = tokenCfg.decimals;
  }

  get cursor(): number {
    return this._cursor;
  }

  /** Poll for new Transfer events. Call on an interval. */
  async poll(): Promise<void> {
    const latestHex = (await this.rpc("eth_blockNumber", [])) as string;
    const latest = Number.parseInt(latestHex, 16);
    const confirmed = latest - this.confirmations;

    if (confirmed < this._cursor) return;

    const logs = (await this.rpc("eth_getLogs", [
      {
        address: this.contractAddress,
        topics: [TRANSFER_TOPIC],
        fromBlock: `0x${this._cursor.toString(16)}`,
        toBlock: `0x${confirmed.toString(16)}`,
      },
    ])) as RpcLog[];

    for (const log of logs) {
      const to = `0x${log.topics[2].slice(26)}`;
      const from = `0x${log.topics[1].slice(26)}`;
      const rawAmount = BigInt(log.data);
      const amountUsdCents = centsFromTokenAmount(rawAmount, this.decimals);

      const event: EvmPaymentEvent = {
        chain: this.chain,
        token: this.token,
        from,
        to,
        rawAmount: rawAmount.toString(),
        amountUsdCents,
        txHash: log.transactionHash,
        blockNumber: Number.parseInt(log.blockNumber, 16),
        logIndex: Number.parseInt(log.logIndex, 16),
      };

      await this.onPayment(event);
    }

    this._cursor = confirmed + 1;
  }
}

/** Create an RPC caller for a given URL (plain JSON-RPC over fetch). */
export function createRpcCaller(rpcUrl: string): RpcCall {
  let id = 0;
  return async (method: string, params: unknown[]): Promise<unknown> => {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method, params }),
    });
    if (!res.ok) throw new Error(`RPC ${method} failed: ${res.status}`);
    const data = (await res.json()) as { result?: unknown; error?: { message: string } };
    if (data.error) throw new Error(`RPC ${method} error: ${data.error.message}`);
    return data.result;
  };
}
