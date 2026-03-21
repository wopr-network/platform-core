/** BTCPay Server invoice states (Greenfield API v1). */
export type CryptoPaymentState = "New" | "Processing" | "Expired" | "Invalid" | "Settled";

/** Charge status for the UI-facing payment lifecycle. */
export type CryptoChargeStatus = "pending" | "partial" | "confirmed" | "expired" | "failed";

/** Full charge record for UI display — includes partial payment progress and confirmations. */
export interface CryptoCharge {
  id: string;
  tenantId: string;
  chain: string;
  status: CryptoChargeStatus;
  amountExpectedCents: number;
  amountReceivedCents: number;
  confirmations: number;
  confirmationsRequired: number;
  txHash?: string;
  credited: boolean;
  createdAt: Date;
}

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

/**
 * Map BTCPay webhook event type string to a CryptoPaymentState.
 *
 * Shared between the core (billing) and consumer (monetization) webhook handlers.
 * Throws on unrecognized event types to surface integration errors early.
 */
export function mapBtcPayEventToStatus(eventType: string): CryptoPaymentState {
  switch (eventType) {
    case "InvoiceCreated":
      return "New";
    case "InvoiceReceivedPayment":
    case "InvoiceProcessing":
      return "Processing";
    case "InvoiceSettled":
    case "InvoicePaymentSettled":
      return "Settled";
    case "InvoiceExpired":
      return "Expired";
    case "InvoiceInvalid":
      return "Invalid";
    default:
      throw new Error(`Unknown BTCPay event type: ${eventType}`);
  }
}
