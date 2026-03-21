import type Stripe from "stripe";
import { logger } from "../../config/logger.js";
import type { IStripeUsageReportRepository, StripeUsageReportRow } from "./usage-report-repository.js";

export interface StripeUsageReconciliationConfig {
  stripe: Stripe;
  usageReportRepo: IStripeUsageReportRepository;
  /** Date to reconcile, as YYYY-MM-DD. */
  targetDate: string;
  /** Drift threshold in cents before flagging a tenant. Default: 10. */
  flagThresholdCents?: number;
  /**
   * Lookup function: (tenant, eventName) -> Stripe Meter ID | null.
   * Used to look up the meter for listEventSummaries.
   */
  meterLookup?: (tenant: string, eventName: string) => Promise<string | null>;
}

export interface UsageReconciliationResult {
  date: string;
  tenantsChecked: number;
  discrepancies: Array<{
    tenant: string;
    capability: string;
    localValueCents: number;
    stripeQuantity: number;
    driftCents: number;
  }>;
  flagged: string[];
}

export async function runStripeUsageReconciliation(
  cfg: StripeUsageReconciliationConfig,
): Promise<UsageReconciliationResult> {
  const threshold = cfg.flagThresholdCents ?? 10;
  const dayStart = new Date(`${cfg.targetDate}T00:00:00Z`).getTime();
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;

  const result: UsageReconciliationResult = {
    date: cfg.targetDate,
    tenantsChecked: 0,
    discrepancies: [],
    flagged: [],
  };

  // Get all local reports for this day (by reportedAt — when we submitted to Stripe)
  const localReports = await cfg.usageReportRepo.listAll({ since: dayStart, until: dayEnd });

  if (localReports.length === 0) return result;

  // Group by tenant+capability
  const grouped = new Map<string, StripeUsageReportRow[]>();
  for (const report of localReports) {
    const key = `${report.tenant}:${report.capability}`;
    const arr = grouped.get(key) ?? [];
    arr.push(report);
    grouped.set(key, arr);
  }

  const checkedTenants = new Set<string>();

  for (const [key, reports] of grouped) {
    const colonIdx = key.indexOf(":");
    const tenant = key.slice(0, colonIdx);
    const capability = key.slice(colonIdx + 1);
    checkedTenants.add(tenant);

    const localTotal = reports.reduce((sum, r) => sum + r.valueCents, 0);

    // Need a customer ID and meter lookup to reconcile against Stripe
    if (!cfg.meterLookup) continue;

    const eventName = reports[0]?.eventName;
    if (!eventName) continue;

    const meterId = await cfg.meterLookup(tenant, eventName);
    if (!meterId) {
      logger.warn("Cannot reconcile: no meter ID for tenant+capability", { tenant, capability });
      continue;
    }

    // We need the Stripe customer ID — derived from the first report's tenant
    // The meterLookup doubles as our customer resolution; for reconciliation we use
    // the subscriptionItemLookup pattern but adapted to meters API.
    // Use a separate customer lookup if provided via the meterLookup convention:
    // meterLookup returns `${meterId}:${customerId}` as a combined value.
    // For simplicity, split on colon if composite value returned.
    const [resolvedMeterId, customerId] = meterId.includes(":") ? meterId.split(":") : [meterId, undefined];

    if (!customerId) {
      logger.warn("Cannot reconcile: no customer ID", { tenant, capability });
      continue;
    }

    try {
      const startSec = Math.floor(dayStart / 1000);
      const endSec = Math.floor(dayEnd / 1000);

      const summaries = await cfg.stripe.billing.meters.listEventSummaries(resolvedMeterId, {
        customer: customerId,
        start_time: startSec,
        end_time: endSec,
        limit: 1,
      });

      const stripeTotal = summaries.data[0]?.aggregated_value ?? 0;
      const drift = Math.abs(localTotal - stripeTotal);

      if (drift > 0) {
        result.discrepancies.push({
          tenant,
          capability,
          localValueCents: localTotal,
          stripeQuantity: stripeTotal,
          driftCents: drift,
        });

        if (drift >= threshold) {
          if (!result.flagged.includes(tenant)) {
            result.flagged.push(tenant);
          }
          logger.warn("Stripe usage reconciliation: drift exceeds threshold", {
            tenant,
            capability,
            localTotal,
            stripeTotal,
            drift,
            threshold,
          });
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error("Failed to reconcile Stripe usage", { tenant, capability, error: msg });
    }
  }

  result.tenantsChecked = checkedTenants.size;
  return result;
}
