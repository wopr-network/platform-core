"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  ENHANCEMENT_PLUGINS,
  loadOnboardingState,
  saveOnboardingState,
} from "@/lib/onboarding-store";

export default function OnboardPluginsPage() {
  const router = useRouter();
  const [enabled, setEnabled] = useState<Set<string>>(new Set(["memory"]));

  useEffect(() => {
    const state = loadOnboardingState();
    if (state.plugins.length > 0) {
      setEnabled(new Set(state.plugins));
    }
  }, []);

  function toggle(id: string) {
    setEnabled((prev) => {
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
    state.currentStep = 6;
    state.plugins = Array.from(enabled);
    saveOnboardingState(state);
    router.push("/onboard/review");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pick Plugins</CardTitle>
        <p className="text-sm text-muted-foreground">
          Optional enhancement plugins to extend your WOPR agent&apos;s capabilities.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {ENHANCEMENT_PLUGINS.map((plugin) => {
            const isEnabled = enabled.has(plugin.id);
            return (
              <div
                key={plugin.id}
                className={`flex items-center justify-between rounded-lg border p-4 transition-colors ${
                  isEnabled ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{plugin.name}</span>
                    {plugin.recommended && (
                      <Badge variant="secondary" className="text-xs">
                        Recommended
                      </Badge>
                    )}
                    {plugin.requiresKey && (
                      <Badge variant="outline" className="text-xs">
                        Needs API Key
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{plugin.description}</p>
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={() => toggle(plugin.id)}
                  aria-label={`Toggle ${plugin.name}`}
                />
              </div>
            );
          })}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="ghost" asChild>
          <Link href="/onboard/channels/setup">Back</Link>
        </Button>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              const state = loadOnboardingState();
              state.currentStep = 6;
              state.plugins = [];
              saveOnboardingState(state);
              router.push("/onboard/review");
            }}
          >
            Skip
          </Button>
          <Button onClick={handleContinue}>Continue</Button>
        </div>
      </CardFooter>
    </Card>
  );
}
