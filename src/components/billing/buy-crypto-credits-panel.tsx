"use client";

import { motion } from "framer-motion";
import { Bitcoin } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createCryptoCheckout } from "@/lib/api";
import { cn } from "@/lib/utils";
import { isAllowedRedirectUrl } from "@/lib/validate-redirect-url";

const CRYPTO_AMOUNTS = [
  { value: 10, label: "$10" },
  { value: 25, label: "$25" },
  { value: 50, label: "$50" },
  { value: 100, label: "$100" },
];

export function BuyCryptoCreditPanel() {
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    if (selected === null) return;
    setLoading(true);
    setError(null);
    try {
      const { url } = await createCryptoCheckout(selected);
      if (!isAllowedRedirectUrl(url)) {
        setError("Unexpected checkout URL. Please contact support.");
        setLoading(false);
        return;
      }
      window.location.href = url;
    } catch {
      setError("Checkout failed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bitcoin className="h-4 w-4 text-amber-500" />
            Pay with Crypto
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Pay with BTC or other cryptocurrencies. Minimum $10.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CRYPTO_AMOUNTS.map((amt) => (
              <motion.button
                key={amt.value}
                type="button"
                onClick={() => setSelected(amt.value)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 25,
                }}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-md border p-3 text-sm font-medium transition-colors hover:bg-accent",
                  selected === amt.value
                    ? "border-primary bg-primary/5 ring-1 ring-primary shadow-[0_0_15px_rgba(0,255,65,0.3)]"
                    : "border-border",
                )}
              >
                <span className="text-lg font-bold">{amt.label}</span>
              </motion.button>
            ))}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            onClick={handleCheckout}
            disabled={selected === null || loading}
            variant="outline"
            className="w-full sm:w-auto"
          >
            {loading ? "Opening checkout..." : "Pay with crypto"}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
