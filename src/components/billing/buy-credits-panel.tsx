"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CreditOption } from "@/lib/api";
import { createCreditCheckout, getCreditOptions } from "@/lib/api";
import { cn } from "@/lib/utils";

export function BuyCreditsPanel() {
  const [tiers, setTiers] = useState<CreditOption[]>([]);
  const [tiersLoading, setTiersLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCreditOptions()
      .then((options) => {
        setTiers(options);
        setTiersLoading(false);
      })
      .catch(() => {
        setError("Failed to load credit options.");
        setTiersLoading(false);
      });
  }, []);

  async function handleCheckout() {
    if (selected === null) return;
    setLoading(true);
    setError(null);
    try {
      const { checkoutUrl } = await createCreditCheckout(selected);
      window.location.href = checkoutUrl;
    } catch {
      setError("Checkout failed. Please try again.");
      setLoading(false);
    }
  }

  if (tiersLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Buy Credits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
            {Array.from({ length: 5 }, (_, i) => `tier-sk-${i}`).map((id) => (
              <Skeleton key={id} className="h-16 w-full rounded-md" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (tiers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Buy Credits</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Credit purchases are not available at this time.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Buy Credits</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
          {tiers.map((tier) => (
            <motion.button
              key={tier.priceId}
              type="button"
              onClick={() => setSelected(tier.priceId)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className={cn(
                "relative flex flex-col items-center gap-1 rounded-md border p-3 text-sm font-medium transition-colors hover:bg-accent",
                selected === tier.priceId
                  ? "border-primary bg-primary/5 ring-1 ring-primary shadow-[0_0_15px_rgba(0,255,65,0.3)]"
                  : "border-border",
              )}
            >
              <span className="text-lg font-bold">{tier.label}</span>
              {tier.bonusPercent > 0 && (
                <Badge className="bg-primary/15 text-primary border-primary/25 text-xs">
                  +{tier.bonusPercent}%
                </Badge>
              )}
            </motion.button>
          ))}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          onClick={handleCheckout}
          disabled={selected === null || loading}
          className="w-full sm:w-auto"
        >
          {loading ? "Redirecting..." : "Buy credits"}
        </Button>
      </CardContent>
    </Card>
  );
}
