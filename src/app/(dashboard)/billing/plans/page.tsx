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
import type { Plan, PlanTier } from "@/lib/api";
import { changePlan, getCurrentPlan, getPlans } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentTier, setCurrentTier] = useState<PlanTier | null>(null);
  const [loading, setLoading] = useState(true);
  const [changingTo, setChangingTo] = useState<PlanTier | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [plansData, tier] = await Promise.all([getPlans(), getCurrentPlan()]);
    setPlans(plansData);
    setCurrentTier(tier);
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
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        Loading plans...
      </div>
    );
  }

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
                </div>
                {plan.features.extras.length > 0 && (
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {plan.features.extras.map((extra) => (
                      <li key={extra}>- {extra}</li>
                    ))}
                  </ul>
                )}
              </CardContent>
              <CardFooter>
                {isCurrent ? (
                  <Button variant="outline" className="w-full" disabled>
                    Current plan
                  </Button>
                ) : plan.price === null ? (
                  <Button variant="outline" className="w-full" asChild>
                    <a href="mailto:sales@wopr.network">Contact sales</a>
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
