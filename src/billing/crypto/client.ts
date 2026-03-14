import type { CryptoBillingConfig } from "./types.js";

export type { CryptoBillingConfig as CryptoConfig };

/**
 * Lightweight BTCPay Server Greenfield API client.
 *
 * Uses plain fetch — zero vendor dependencies.
 * Auth header format: "token <apiKey>" (NOT "Bearer").
 */
export class BTCPayClient {
  constructor(private readonly config: CryptoBillingConfig) {}

  private headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `token ${this.config.apiKey}`,
    };
  }

  /**
   * Create an invoice on the BTCPay store.
   *
   * Returns the invoice ID and checkout link (URL to redirect the user).
   */
  async createInvoice(opts: {
    amountUsd: number;
    orderId: string;
    buyerEmail?: string;
    redirectURL?: string;
  }): Promise<{ id: string; checkoutLink: string }> {
    const url = `${this.config.baseUrl}/api/v1/stores/${this.config.storeId}/invoices`;
    const body = {
      amount: String(opts.amountUsd),
      currency: "USD",
      metadata: {
        orderId: opts.orderId,
        buyerEmail: opts.buyerEmail,
      },
      checkout: {
        speedPolicy: "MediumSpeed",
        expirationMinutes: 30,
        ...(opts.redirectURL ? { redirectURL: opts.redirectURL } : {}),
      },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`BTCPay createInvoice failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as { id: string; checkoutLink: string };
    return { id: data.id, checkoutLink: data.checkoutLink };
  }

  /** Get invoice status by ID. */
  async getInvoice(invoiceId: string): Promise<{ id: string; status: string; amount: string; currency: string }> {
    const url = `${this.config.baseUrl}/api/v1/stores/${this.config.storeId}/invoices/${invoiceId}`;
    const res = await fetch(url, { headers: this.headers() });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`BTCPay getInvoice failed (${res.status}): ${text}`);
    }

    return (await res.json()) as { id: string; status: string; amount: string; currency: string };
  }
}

/**
 * Load BTCPay config from environment variables.
 * Returns null if any required var is missing.
 */
export function loadCryptoConfig(): CryptoBillingConfig | null {
  const apiKey = process.env.BTCPAY_API_KEY;
  const baseUrl = process.env.BTCPAY_BASE_URL;
  const storeId = process.env.BTCPAY_STORE_ID;
  if (!apiKey || !baseUrl || !storeId) return null;
  return { apiKey, baseUrl, storeId };
}
