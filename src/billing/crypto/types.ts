/** BTCPay Server invoice states (Greenfield API v1). */
export type CryptoPaymentState = "New" | "Processing" | "Expired" | "Invalid" | "Settled";

/** Options for creating a crypto payment session. */
export interface CryptoCheckoutOpts {
  /** Internal tenant ID. */
  tenant: string;
  /** Amount in USD (minimum $10). */
  amountUsd: number;
}

/** Webhook payload received from BTCPay Server (InvoiceSettled event). */
export interface CryptoWebhookPayload {
  /** BTCPay delivery ID (for deduplication). */
  deliveryId: string;
  /** Webhook ID. */
  webhookId: string;
  /** Original delivery ID (same as deliveryId on first delivery). */
  originalDeliveryId: string;
  /** Whether this is a redelivery. */
  isRedelivery: boolean;
  /** Event type (e.g. "InvoiceSettled", "InvoiceProcessing", "InvoiceExpired"). */
  type: string;
  /** Unix timestamp. */
  timestamp: number;
  /** BTCPay store ID. */
  storeId: string;
  /** BTCPay invoice ID. */
  invoiceId: string;
  /** Invoice metadata (echoed from creation). */
  metadata: Record<string, unknown>;
  /** Whether admin manually marked as settled (InvoiceSettled only). */
  manuallyMarked?: boolean;
  /** Whether customer overpaid (InvoiceSettled only). */
  overPaid?: boolean;
  /** Whether invoice was partially paid (InvoiceExpired only). */
  partiallyPaid?: boolean;
}

/** Configuration for BTCPay Server integration. */
export interface CryptoBillingConfig {
  /** BTCPay API key (from Account > API keys). */
  apiKey: string;
  /** BTCPay Server base URL. */
  baseUrl: string;
  /** BTCPay store ID. */
  storeId: string;
}

/** Result of processing a crypto webhook event. */
export interface CryptoWebhookResult {
  handled: boolean;
  status: string;
  tenant?: string;
  creditedCents?: number;
  reactivatedBots?: string[];
  duplicate?: boolean;
}
