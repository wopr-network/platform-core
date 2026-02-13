"use client";

import { useCallback, useEffect, useState } from "react";
import { ByokCallout } from "@/components/billing/byok-callout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import type { BillingUsage, ProviderCost, UsageDataPoint } from "@/lib/api";
import { getBillingUsage, getProviderCosts, getUsageHistory } from "@/lib/api";

export default function UsagePage() {
  const [usage, setUsage] = useState<BillingUsage | null>(null);
  const [providerCosts, setProviderCosts] = useState<ProviderCost[]>([]);
  const [history, setHistory] = useState<UsageDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCostTracker, setShowCostTracker] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [usageData, costsData, historyData] = await Promise.all([
      getBillingUsage(),
      getProviderCosts(),
      getUsageHistory(30),
    ]);
    setUsage(usageData);
    setProviderCosts(costsData);
    setHistory(historyData);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !usage) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        Loading usage...
      </div>
    );
  }

  const periodStart = new Date(usage.billingPeriodStart).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const periodEnd = new Date(usage.billingPeriodEnd).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const totalEstimatedCost = providerCosts.reduce((sum, c) => sum + c.estimatedCost, 0);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Usage</h1>
        <p className="text-sm text-muted-foreground">
          Billing period: {periodStart} - {periodEnd} ({usage.planName} plan)
        </p>
      </div>

      <ByokCallout compact />

      {/* Platform Usage Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Usage</CardTitle>
          <CardDescription>Your WOPR orchestration usage this billing period</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <UsageMeter
            label="Instances"
            current={usage.instancesRunning}
            cap={usage.instanceCap}
            unit=""
          />
          <UsageMeter
            label="Storage"
            current={usage.storageUsedGb}
            cap={usage.storageCapGb}
            unit="GB"
            decimals={1}
          />
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">API calls</span>
              <span className="font-medium">{usage.apiCalls.toLocaleString()} this month</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BYOK Cost Tracker (opt-in) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle>BYOK Cost Tracker</CardTitle>
              <CardDescription>
                Estimated spend with your AI providers (approximate, based on token counts)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="cost-tracker-toggle" className="text-sm text-muted-foreground">
                {showCostTracker ? "On" : "Off"}
              </Label>
              <Switch
                id="cost-tracker-toggle"
                checked={showCostTracker}
                onCheckedChange={setShowCostTracker}
              />
            </div>
          </div>
        </CardHeader>
        {showCostTracker && (
          <CardContent className="space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">${totalEstimatedCost.toFixed(2)}</span>
              <span className="text-sm text-muted-foreground">estimated this period</span>
            </div>
            <div className="space-y-2">
              {providerCosts.map((cost) => (
                <div key={cost.provider} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{cost.provider}</span>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span>
                      {(cost.inputTokens / 1000).toFixed(0)}k in /{" "}
                      {(cost.outputTokens / 1000).toFixed(0)}k out
                    </span>
                    <span className="font-medium text-foreground">
                      ~${cost.estimatedCost.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              These are your direct costs with your providers — WOPR does not charge for inference.
            </p>
          </CardContent>
        )}
      </Card>

      {/* Usage Over Time */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Over Time</CardTitle>
          <CardDescription>Daily API calls over the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <UsageChart data={history} />
        </CardContent>
      </Card>
    </div>
  );
}

function UsageMeter({
  label,
  current,
  cap,
  unit,
  decimals = 0,
}: {
  label: string;
  current: number;
  cap: number;
  unit: string;
  decimals?: number;
}) {
  const pct = cap === 0 ? (current > 0 ? 100 : 0) : Math.min((current / cap) * 100, 100);
  const formatted = decimals > 0 ? current.toFixed(decimals) : String(current);
  const capFormatted = decimals > 0 ? cap.toFixed(decimals) : String(cap);

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {formatted} of {capFormatted}
          {unit ? ` ${unit}` : ""}
        </span>
      </div>
      <Progress value={pct} />
    </div>
  );
}

function UsageChart({ data }: { data: UsageDataPoint[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No usage data available.</p>;
  }

  const maxCalls = Math.max(...data.map((d) => d.apiCalls), 1);

  return (
    <div className="space-y-2">
      <div className="flex h-32 items-end gap-0.5" role="img" aria-label="Usage bar chart">
        {data.map((point) => {
          const height = (point.apiCalls / maxCalls) * 100;
          return (
            <div
              key={point.date}
              className="flex-1 rounded-t bg-primary/80 transition-all hover:bg-primary"
              style={{ height: `${height}%` }}
              title={`${point.date}: ${point.apiCalls} API calls`}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{data[0].date}</span>
        <span>{data[data.length - 1].date}</span>
      </div>
    </div>
  );
}
