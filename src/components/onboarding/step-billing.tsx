"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { AnimatePresence, motion } from "framer-motion";
import { CreditCardIcon, LockIcon, ShieldCheckIcon } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { createSetupIntent } from "@/lib/api";

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
if (!stripePublishableKey) {
  console.error(
    "[StepBilling] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set. Stripe Elements will not load.",
  );
}
const stripePromise = loadStripe(stripePublishableKey ?? "");

interface StepBillingProps {
  onPaymentMethodReady: (ready: boolean) => void;
  stepNumber?: string;
  stepCode?: string;
}

export function StepBilling({
  onPaymentMethodReady,
  stepNumber = "06",
  stepCode = "BILLING",
}: StepBillingProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSetupIntent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { clientSecret: cs } = await createSetupIntent();
      setClientSecret(cs);
    } catch {
      setError("Failed to initialize payment form. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSetupIntent();
  }, [fetchSetupIntent]);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div
          className="inline-block font-mono text-xs tracking-[0.3em] text-terminal uppercase"
          aria-hidden="true"
        >
          STEP {stepNumber} {"//"} {stepCode}
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Add payment method</h2>
        <p className="mt-2 text-muted-foreground">
          Add a card to enable WOPR Hosted. You'll only be charged for what you use.
        </p>
      </div>

      {/* Trust badges */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <LockIcon className="size-3" />
          256-bit SSL
        </span>
        <span className="flex items-center gap-1">
          <ShieldCheckIcon className="size-3" />
          PCI compliant
        </span>
        <span className="flex items-center gap-1">
          <CreditCardIcon className="size-3" />
          Powered by Stripe
        </span>
      </div>

      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
        <p className="text-sm text-blue-200">
          No minimum, no commitment. Pay-as-you-go pricing for all AI capabilities. Cancel anytime.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {loading && (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="space-y-3"
          >
            <Skeleton className="h-10 w-full rounded-sm" />
            <div className="flex gap-3">
              <Skeleton className="h-10 w-1/2 rounded-sm" />
              <Skeleton className="h-10 w-1/2 rounded-sm" />
            </div>
            <Skeleton className="h-10 w-full rounded-sm" />
          </motion.div>
        )}

        {error && !loading && !clientSecret && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-3 py-4"
          >
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchSetupIntent}>
              Try again
            </Button>
          </motion.div>
        )}

        {clientSecret && !loading && (
          <motion.div
            key="elements"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: "night",
                  variables: {
                    colorPrimary: "#00ff41",
                    colorBackground: "#0a0a0a",
                    colorText: "#ffffff",
                    colorTextSecondary: "#a0a0a0",
                    colorDanger: "#ff3333",
                    borderRadius: "4px",
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSizeBase: "14px",
                  },
                  rules: {
                    ".Input:focus": {
                      borderColor: "#00ff41",
                      boxShadow: "0 0 8px 0 rgba(0, 255, 65, 0.2)",
                    },
                  },
                },
              }}
            >
              <BillingSetupForm onPaymentMethodReady={onPaymentMethodReady} />
            </Elements>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BillingSetupForm({
  onPaymentMethodReady,
}: {
  onPaymentMethodReady: (ready: boolean) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError(null);

    const result = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/onboarding`,
      },
      redirect: "if_required",
    });

    if (result.error) {
      setError(result.error.message ?? "Something went wrong.");
      setSubmitting(false);
    } else {
      setConfirmed(true);
      onPaymentMethodReady(true);
    }
  }

  if (confirmed) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-3 py-6"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-terminal bg-terminal/10">
          <svg
            className="h-6 w-6 text-terminal"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            role="img"
            aria-label="Payment method saved"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm font-medium text-terminal">Payment method saved</p>
        <p className="text-xs text-muted-foreground">Click Continue to launch your WOPR Bot.</p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <PaymentElement />

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="text-sm text-destructive"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <Button type="submit" variant="terminal" disabled={!stripe || submitting} className="w-full">
        {submitting && (
          <span className="size-3.5 animate-spin rounded-full border-2 border-terminal border-t-transparent" />
        )}
        {submitting ? "Saving..." : "Save card"}
      </Button>
    </form>
  );
}
