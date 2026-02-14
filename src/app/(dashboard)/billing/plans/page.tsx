"use client";

import { useCallback, useEffect, useState } from "react";
import { ByokCallout } from "@/components/billing/byok-callout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { InferenceMode, Plan, PlanTier } from "@/lib/api";
import { changePlan, getCurrentPlan, getInferenceMode, getPlans } from "@/lib/api";
import { cn } from "@/lib/utils";

const HOSTED_CREDITS: Record<string, string> = {
  free: "$5 hosted credit/mo",
  pro: "$50 hosted credit/mo",
  team: "$200 hosted credit/mo",
  enterprise: "Custom hosted credit",
};

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentTier, setCurrentTier] = useState<PlanTier | null>(null);
  const [inferenceMode, setInferenceMode] = useState<InferenceMode | null>(null);
  const [loading, setLoading] = useState(true);
  const [changingTo, setChangingTo] = useState<PlanTier | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [plansData, tier, mode] = await Promise.all([
      getPlans(),
      getCurrentPlan(),
      getInferenceMode().catch(() => "byok" as const),
    ]);
    setPlans(plansData);
    setCurrentTier(tier);
    setInferenceMode(mode);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleChangePlan(tier: PlanTier) {
    setChangingTo(tier);
    try {
      await changePlan(tier);
      setCurrentTier(tier);
    } catch {
      // revert UI on failure
    } finally {
      setChangingTo(null);
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, n) => `sk-${n}`).map((skId) => (
            <div key={skId} className="flex flex-col rounded-sm border p-6 space-y-4">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-5 w-24" />
              <div className="flex-1 space-y-2">
                {Array.from({ length: 4 }, (_, n) => `skf-${n}`).map((fId) => (
                  <Skeleton key={fId} className="h-4 w-full" />
                ))}
              </div>
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const isHosted = inferenceMode === "hosted";

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Plans</h1>
        <p className="text-sm text-muted-foreground">
          Choose the plan that fits your needs. Upgrade or downgrade anytime.
        </p>
      </div>

      <ByokCallout />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const isCurrent = plan.tier === currentTier;
          const isChanging = changingTo === plan.tier;

          return (
            <Card
              key={plan.id}
              className={cn(
                "flex flex-col",
                isCurrent && "border-primary ring-1 ring-primary",
                plan.recommended && !isCurrent && "border-emerald-500/50",
              )}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{plan.name}</CardTitle>
                  {isCurrent && <Badge>Current</Badge>}
                  {plan.recommended && !isCurrent && (
                    <Badge
                      variant="outline"
                      className="border-emerald-500/25 bg-emerald-500/10 text-emerald-500"
                    >
                      Recommended
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-lg font-semibold text-foreground">
                  {plan.priceLabel}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                <div className="space-y-2 text-sm">
                  <FeatureRow
                    label="Instances"
                    value={
                      plan.features.instanceCap === null
                        ? "Unlimited"
                        : String(plan.features.instanceCap)
                    }
                  />
                  <FeatureRow label="Channels" value={plan.features.channels} />
                  <FeatureRow label="Plugins" value={plan.features.plugins} />
                  <FeatureRow label="Support" value={plan.features.support} />
                  {isHosted && HOSTED_CREDITS[plan.tier] && (
                    <FeatureRow label="Hosted AI" value={HOSTED_CREDITS[plan.tier]} />
                  )}
                </div>
                {plan.features.extras.length > 0 && (
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {plan.features.extras.map((extra) => (
                      <li key={extra}>- {extra}</li>
                    ))}
                  </ul>
                )}
                {isHosted && plan.tier !== "enterprise" && plan.tier !== "free" && (
                  <p className="text-xs text-muted-foreground">
                    Usage beyond included credit is metered at per-capability rates.
                  </p>
                )}
              </CardContent>
              <CardFooter>
                {isCurrent ? (
                  <Button variant="outline" className="w-full" disabled>
                    Current plan
                  </Button>
                ) : plan.price === null ? (
                  <Button variant="outline" className="w-full" asChild>
                    <a href="mailto:sales@wopr.bot">Contact sales</a>
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant={plan.recommended ? "default" : "outline"}
                    disabled={isChanging}
                    onClick={() => handleChangePlan(plan.tier)}
                  >
                    {isChanging
                      ? "Changing..."
                      : currentTier &&
                          plans.findIndex((p) => p.tier === plan.tier) <
                            plans.findIndex((p) => p.tier === currentTier)
                        ? "Downgrade"
                        : "Upgrade"}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <ByokCallout compact />
    </div>
  );
}

function FeatureRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
