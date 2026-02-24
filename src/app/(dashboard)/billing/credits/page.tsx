"use client";

import { Clock } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AutoTopupCard } from "@/components/billing/auto-topup-card";
import { BuyCreditsPanel } from "@/components/billing/buy-credits-panel";
import { BuyCryptoCreditPanel } from "@/components/billing/buy-crypto-credits-panel";
import { CreditBalance } from "@/components/billing/credit-balance";
import { DividendBanner } from "@/components/billing/dividend-banner";
import { DividendEligibility } from "@/components/billing/dividend-eligibility";
import { DividendPoolStats } from "@/components/billing/dividend-pool-stats";
import { FirstDividendDialog } from "@/components/billing/first-dividend-dialog";
import { LowBalanceBanner } from "@/components/billing/low-balance-banner";
import { TransactionHistory } from "@/components/billing/transaction-history";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { CreditBalance as CreditBalanceData, DividendWalletStats } from "@/lib/api";
import { getCreditBalance, getDividendStats } from "@/lib/api";

export default function CreditsPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const cryptoPending = searchParams.get("crypto") === "pending";

  const [balance, setBalance] = useState<CreditBalanceData | null>(null);
  const [dividendStats, setDividendStats] = useState<DividendWalletStats | null>(null);
  const [todayDividendCents, setTodayDividendCents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cryptoPending) {
      router.replace(pathname);
    }
  }, [cryptoPending, pathname, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [balanceData, statsData] = await Promise.all([
        getCreditBalance(),
        getDividendStats().catch(() => null),
      ]);
      setBalance(balanceData);
      if (statsData) {
        setDividendStats(statsData);
        if (statsData.userEligible && statsData.perUserCents > 0) {
          setTodayDividendCents(statsData.perUserCents);
        }
      }
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
        <Skeleton className="h-20 w-full rounded-md" />
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
        <Button variant="ghost" size="sm" onClick={load}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Credits</h1>
        <p className="text-sm text-muted-foreground">
          Stay active to keep claiming your daily dividend
        </p>
      </div>

      <LowBalanceBanner balance={balance.balance} runway={balance.runway} />

      {dividendStats && (
        <DividendBanner todayAmountCents={todayDividendCents} stats={dividendStats} />
      )}

      {cryptoPending && (
        <div className="rounded-md border border-amber-500/25 bg-amber-500/5 p-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4 text-amber-500" />
            Crypto payment pending — credits will appear once confirmed on-chain.
          </p>
        </div>
      )}

      <CreditBalance data={balance} />

      {dividendStats && (
        <DividendEligibility
          windowExpiresAt={dividendStats.userWindowExpiresAt}
          eligible={dividendStats.userEligible}
        />
      )}

      {dividendStats && (
        <DividendPoolStats
          poolCents={dividendStats.poolCents}
          activeUsers={dividendStats.activeUsers}
          perUserCents={dividendStats.perUserCents}
        />
      )}

      <BuyCreditsPanel />
      <BuyCryptoCreditPanel />
      <AutoTopupCard />
      <TransactionHistory />

      {dividendStats && <FirstDividendDialog todayAmountCents={todayDividendCents} />}
    </div>
  );
}
