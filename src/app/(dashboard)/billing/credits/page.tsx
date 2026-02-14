"use client";

import { useCallback, useEffect, useState } from "react";
import { BuyCreditsPanel } from "@/components/billing/buy-credits-panel";
import { CreditBalance } from "@/components/billing/credit-balance";
import { LowBalanceBanner } from "@/components/billing/low-balance-banner";
import { TransactionHistory } from "@/components/billing/transaction-history";
import { Skeleton } from "@/components/ui/skeleton";
import type { CreditBalance as CreditBalanceData } from "@/lib/api";
import { getCreditBalance } from "@/lib/api";

export default function CreditsPage() {
  const [balance, setBalance] = useState<CreditBalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCreditBalance();
      setBalance(data);
    } catch {
      setError("Failed to load credit balance.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="max-w-3xl space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="rounded-sm border p-6 space-y-3">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="rounded-sm border p-6 space-y-3">
          <Skeleton className="h-5 w-28" />
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }, (_, n) => `sk-${n}`).map((skId) => (
              <Skeleton key={skId} className="h-16 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !balance) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
        <p>{error ?? "Unable to load credits."}</p>
        <button type="button" onClick={load} className="text-sm underline hover:text-foreground">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Credits</h1>
        <p className="text-sm text-muted-foreground">
          Manage your credit balance and purchase history
        </p>
      </div>

      <LowBalanceBanner balance={balance.balance} runway={balance.runway} />

      <CreditBalance data={balance} />
      <BuyCreditsPanel />
      <TransactionHistory />
    </div>
  );
}
