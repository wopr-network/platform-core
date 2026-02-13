"use client";

import { usePathname } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import { ONBOARDING_STEPS } from "@/lib/onboarding-store";

export default function OnboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const stepIndex = ONBOARDING_STEPS.findIndex((s) => s.path === pathname);
  const progress = stepIndex >= 0 ? ((stepIndex + 1) / ONBOARDING_STEPS.length) * 100 : 0;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {stepIndex > 0 && (
        <div className="border-b px-6 py-3">
          <div className="mx-auto max-w-2xl space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Step {stepIndex + 1} of {ONBOARDING_STEPS.length}:{" "}
                {ONBOARDING_STEPS[stepIndex]?.label}
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
          </div>
        </div>
      )}
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-2xl">{children}</div>
      </main>
    </div>
  );
}
