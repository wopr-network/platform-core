"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { buildCostComparison } from "@/lib/cost-comparison-data";
import { cn } from "@/lib/utils";

interface StepCostCompareProps {
  selectedChannels: string[];
  selectedSuperpowers: string[];
  stepNumber?: string;
  stepCode?: string;
}

export function StepCostCompare({
  selectedChannels,
  selectedSuperpowers,
  stepNumber = "05",
  stepCode = "COST COMPARE",
}: StepCostCompareProps) {
  const comparison = useMemo(
    () => buildCostComparison(selectedChannels, selectedSuperpowers),
    [selectedChannels, selectedSuperpowers],
  );

  return (
    <div className="space-y-6">
      {/* Step header */}
      <div className="text-center space-y-2">
        <div
          className="inline-block font-mono text-xs tracking-[0.3em] text-terminal uppercase"
          aria-hidden="true"
        >
          STEP {stepNumber} {"// "}
          {stepCode}
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Why not do it yourself?</h2>
        <p className="text-muted-foreground">
          Here&apos;s what it takes to build this setup on your own.
        </p>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-2 font-mono text-xs tracking-wider text-muted-foreground uppercase">
        <span>Capability</span>
        <span className="text-right text-red-400/60">DIY</span>
        <span className="text-right text-terminal/60">WOPR</span>
      </div>

      {/* Cost rows */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {comparison.items.map((item, index) => (
            <motion.div
              key={item.capabilityId}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, height: 0, overflow: "hidden" }}
              transition={{ duration: 0.25, ease: "easeOut", delay: index * 0.06 }}
            >
              <Card
                className={cn("py-2 border-border/50", "hover:border-terminal/30 transition-all")}
              >
                <CardContent className="grid grid-cols-[1fr_auto_auto] gap-4 items-center py-0">
                  <div>
                    <p className="text-sm font-medium">{item.diyLabel}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.accounts.join(", ")}
                      {item.hardware ? ` + ${item.hardware}` : ""}
                    </p>
                  </div>
                  <p className="text-sm font-mono text-red-400 text-right whitespace-nowrap">
                    {item.diyCostPerMonth}
                  </p>
                  <p className="text-sm font-mono text-terminal text-right">Included</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {comparison.items.length === 0 && (
          <Card className="py-3 border-border/50">
            <CardContent className="py-0 text-center text-sm text-muted-foreground">
              Select channels or superpowers to see the comparison
            </CardContent>
          </Card>
        )}
      </div>

      {/* Summary card */}
      <motion.div
        key={comparison.totalDiyMonthly}
        initial={{ opacity: 0.8, scale: 0.99 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="py-3 border-terminal/30 bg-terminal/5">
          <CardContent className="py-0 space-y-3">
            <div className="grid grid-cols-[1fr_auto_auto] gap-4 items-center">
              <p className="text-sm font-bold">Total estimated monthly cost</p>
              <p className="text-lg font-mono font-bold text-red-400 text-right">
                {comparison.totalDiyMonthly}
              </p>
              <p className="text-lg font-mono font-bold text-terminal text-right">
                {comparison.totalWoprMonthly}
              </p>
            </div>

            {comparison.accountsRequired > 0 && (
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-2 border-t border-terminal/10">
                <span>
                  DIY requires{" "}
                  <span className="text-red-400 font-medium">
                    {comparison.accountsRequired} provider accounts
                  </span>
                </span>
                <span>
                  <span className="text-red-400 font-medium">
                    {comparison.apiKeysRequired} API keys
                  </span>{" "}
                  to manage
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Footer tagline */}
      <p className="text-center font-mono text-xs tracking-wider text-terminal/40">
        WOPR HANDLES HOSTING, SCALING, AND API KEY MANAGEMENT
      </p>
    </div>
  );
}
