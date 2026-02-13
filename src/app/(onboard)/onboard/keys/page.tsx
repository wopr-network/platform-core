"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AI_PROVIDERS,
  loadOnboardingState,
  type ProviderConfig,
  saveOnboardingState,
} from "@/lib/onboarding-store";

export default function OnboardKeysPage() {
  const router = useRouter();
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [validating, setValidating] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const state = loadOnboardingState();
    setProviders(state.providers);
  }, []);

  function updateKey(id: string, key: string) {
    setProviders((prev) => prev.map((p) => (p.id === id ? { ...p, key, validated: false } : p)));
  }

  function toggleVisibility(id: string) {
    setVisible((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function validateKey(id: string) {
    setValidating((prev) => ({ ...prev, [id]: true }));
    // Mock validation - in production, this would call the provider API
    setTimeout(() => {
      setProviders((prev) =>
        prev.map((p) => (p.id === id ? { ...p, validated: p.key.length > 0 } : p)),
      );
      setValidating((prev) => ({ ...prev, [id]: false }));
    }, 1000);
  }

  function handleContinue() {
    const state = loadOnboardingState();
    state.currentStep = 3;
    state.providers = providers;
    saveOnboardingState(state);
    router.push("/onboard/channels");
  }

  const allValid = providers.every((p) => p.validated);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paste Your API Keys</CardTitle>
        <p className="text-sm text-muted-foreground">
          Enter the API key for each provider you selected. Keys are validated live.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {providers.map((provider) => {
          const meta = AI_PROVIDERS.find((p) => p.id === provider.id);
          if (!meta) return null;
          return (
            <div key={provider.id} className="space-y-2 rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <div
                  className="flex h-6 w-6 items-center justify-center rounded text-xs font-bold text-white"
                  style={{ backgroundColor: meta.color }}
                >
                  {meta.name[0]}
                </div>
                <Label className="font-medium">{meta.name} API Key</Label>
                {provider.validated && (
                  <Badge variant="secondary" className="text-green-500">
                    Validated
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  type={visible[provider.id] ? "text" : "password"}
                  placeholder={meta.keyPlaceholder}
                  value={provider.key}
                  onChange={(e) => updateKey(provider.id, e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleVisibility(provider.id)}
                >
                  {visible[provider.id] ? "Hide" : "Show"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!provider.key || validating[provider.id]}
                  onClick={() => validateKey(provider.id)}
                >
                  {validating[provider.id] ? "Checking..." : "Validate"}
                </Button>
              </div>
              <a
                href={meta.keyHelpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                Where do I find this?
              </a>
            </div>
          );
        })}

        <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3 text-sm text-green-400">
          Your keys are stored locally in your instance. We never see or proxy your API calls.
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="ghost" asChild>
          <Link href="/onboard/provider">Back</Link>
        </Button>
        <Button disabled={!allValid} onClick={handleContinue}>
          Continue
        </Button>
      </CardFooter>
    </Card>
  );
}
