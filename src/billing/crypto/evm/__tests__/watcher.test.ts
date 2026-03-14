import { describe, expect, it, vi } from "vitest";
import { EvmWatcher } from "../watcher.js";

const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

function mockTransferLog(to: string, amount: bigint, blockNumber: number) {
  return {
    address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
    topics: [
      TRANSFER_TOPIC,
      `0x${"00".repeat(12)}${"ab".repeat(20)}`, // from (padded)
      `0x${"00".repeat(12)}${to.slice(2).toLowerCase()}`, // to (padded)
    ],
    data: `0x${amount.toString(16).padStart(64, "0")}`,
    blockNumber: `0x${blockNumber.toString(16)}`,
    transactionHash: `0x${"ff".repeat(32)}`,
    logIndex: "0x0",
  };
}

describe("EvmWatcher", () => {
  it("parses Transfer log into EvmPaymentEvent", async () => {
    const events: { amountUsdCents: number; to: string }[] = [];
    const mockRpc = vi
      .fn()
      .mockResolvedValueOnce(`0x${(102).toString(16)}`) // eth_blockNumber: block 102
      .mockResolvedValueOnce([mockTransferLog(`0x${"cc".repeat(20)}`, 10_000_000n, 99)]); // eth_getLogs

    const watcher = new EvmWatcher({
      chain: "base",
      token: "USDC",
      rpcCall: mockRpc,
      fromBlock: 99,
      onPayment: (evt) => {
        events.push(evt);
      },
    });

    await watcher.poll();

    expect(events).toHaveLength(1);
    expect(events[0].amountUsdCents).toBe(1000); // 10 USDC = $10 = 1000 cents
    expect(events[0].to).toMatch(/^0x/);
  });

  it("advances cursor after processing", async () => {
    const mockRpc = vi
      .fn()
      .mockResolvedValueOnce(`0x${(200).toString(16)}`) // block 200
      .mockResolvedValueOnce([]); // no logs

    const watcher = new EvmWatcher({
      chain: "base",
      token: "USDC",
      rpcCall: mockRpc,
      fromBlock: 100,
      onPayment: vi.fn(),
    });

    await watcher.poll();
    expect(watcher.cursor).toBeGreaterThan(100);
  });

  it("skips blocks not yet confirmed", async () => {
    const events: unknown[] = [];
    const mockRpc = vi.fn().mockResolvedValueOnce(`0x${(50).toString(16)}`); // current block: 50

    // Base needs 1 confirmation, so confirmed = 50 - 1 = 49
    // cursor starts at 50, so confirmed (49) < cursor (50) → no poll
    const watcher = new EvmWatcher({
      chain: "base",
      token: "USDC",
      rpcCall: mockRpc,
      fromBlock: 50,
      onPayment: (evt) => {
        events.push(evt);
      },
    });

    await watcher.poll();
    expect(events).toHaveLength(0);
    // eth_getLogs should not even be called
    expect(mockRpc).toHaveBeenCalledTimes(1);
  });

  it("processes multiple logs in one poll", async () => {
    const events: { amountUsdCents: number }[] = [];
    const mockRpc = vi
      .fn()
      .mockResolvedValueOnce(`0x${(110).toString(16)}`) // block 110
      .mockResolvedValueOnce([
        mockTransferLog(`0x${"aa".repeat(20)}`, 5_000_000n, 105), // $5
        mockTransferLog(`0x${"bb".repeat(20)}`, 20_000_000n, 107), // $20
      ]);

    const watcher = new EvmWatcher({
      chain: "base",
      token: "USDC",
      rpcCall: mockRpc,
      fromBlock: 100,
      onPayment: (evt) => {
        events.push(evt);
      },
    });

    await watcher.poll();

    expect(events).toHaveLength(2);
    expect(events[0].amountUsdCents).toBe(500);
    expect(events[1].amountUsdCents).toBe(2000);
  });

  it("does nothing when no new blocks", async () => {
    const mockRpc = vi.fn().mockResolvedValueOnce(`0x${(99).toString(16)}`); // block 99, confirmed = 98

    const watcher = new EvmWatcher({
      chain: "base",
      token: "USDC",
      rpcCall: mockRpc,
      fromBlock: 100,
      onPayment: vi.fn(),
    });

    await watcher.poll();
    expect(watcher.cursor).toBe(100); // unchanged
    expect(mockRpc).toHaveBeenCalledTimes(1); // only eth_blockNumber
  });
});
