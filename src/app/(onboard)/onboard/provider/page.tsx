"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AI_PROVIDERS,
  type AIProviderId,
  loadOnboardingState,
  saveOnboardingState,
} from "@/lib/onboarding-store";

export default function OnboardProviderPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<AIProviderId>>(new Set());

  useEffect(() => {
    const state = loadOnboardingState();
    if (state.providers.length > 0) {
      setSelected(new Set(state.providers.map((p) => p.id as AIProviderId)));
    }
  }, []);

  function toggle(id: AIProviderId) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleContinue() {
    const state = loadOnboardingState();
    const existing = new Map(state.providers.map((p) => [p.id, p]));
    state.currentStep = 2;
    state.providers = Array.from(selected).map((id) => {
      const prev = existing.get(id);
      const meta = AI_PROVIDERS.find((p) => p.id === id);
      return prev ?? { id, name: meta?.name ?? id, key: "", validated: false };
    });
    saveOnboardingState(state);
    router.push("/onboard/keys");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose Your AI Provider</CardTitle>
        <p className="text-sm text-muted-foreground">
          Select one or more providers. You&apos;ll enter your own API keys next.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {AI_PROVIDERS.map((provider) => {
            const isSelected = selected.has(provider.id);
            return (
              <button
                key={provider.id}
                type="button"
                onClick={() => toggle(provider.id)}
                className={`flex flex-col items-start gap-2 rounded-sm border p-4 text-left transition-colors ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/50"
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white"
                      style={{ backgroundColor: provider.color }}
                    >
                      {provider.name[0]}
                    </div>
                    <span className="font-medium">{provider.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {provider.recommended && (
                      <Badge variant="secondary" className="text-xs">
                        Recommended
                      </Badge>
                    )}
                    {isSelected && (
                      <Badge className="text-xs text-emerald-500" variant="secondary">
                        Selected
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{provider.description}</p>
                <p className="text-xs text-muted-foreground">Models: {provider.models}</p>
              </button>
            );
          })}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="ghost" asChild>
          <Link href="/onboard">Back</Link>
        </Button>
        <Button disabled={selected.size === 0} onClick={handleContinue}>
          Continue
        </Button>
      </CardFooter>
    </Card>
  );
}
