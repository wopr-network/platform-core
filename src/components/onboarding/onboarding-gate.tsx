"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isOnboardingComplete } from "@/lib/onboarding-store";

/**
 * Gate that redirects new users (who haven't completed onboarding) to /onboarding.
 * Renders nothing until the check completes to prevent flash of dashboard content.
 */
export function OnboardingGate({ children }: { readonly children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!isOnboardingComplete()) {
      router.replace("/onboarding");
    } else {
      setChecked(true);
    }
  }, [router]);

  if (!checked) return null;
  return <>{children}</>;
}
