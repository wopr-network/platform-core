"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { channelManifests } from "@/lib/mock-manifests";
import { loadOnboardingState, saveOnboardingState } from "@/lib/onboarding-store";

export default function OnboardChannelsPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    const state = loadOnboardingState();
    if (state.channels.length > 0) {
      setSelected(new Set(state.channels));
    }
  }, []);

  function toggle(id: string) {
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
    state.currentStep = 4;
    state.channels = Array.from(selected);
    saveOnboardingState(state);
    router.push("/onboard/channels/setup");
  }

  function handleSkip() {
    const state = loadOnboardingState();
    state.currentStep = 5;
    state.channels = [];
    state.channelsConfigured = [];
    saveOnboardingState(state);
    router.push("/onboard/plugins");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pick Your Channels</CardTitle>
        <p className="text-sm text-muted-foreground">
          Connect messaging platforms to WOPR. Each channel is driven by a plugin manifest.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {channelManifests.map((manifest) => {
            const isSelected = selected.has(manifest.id);
            return (
              <button
                key={manifest.id}
                type="button"
                onClick={() => toggle(manifest.id)}
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
                      style={{ backgroundColor: manifest.color }}
                    >
                      {manifest.name[0]}
                    </div>
                    <span className="font-medium">{manifest.name}</span>
                  </div>
                  {isSelected && (
                    <Badge className="text-xs text-emerald-500" variant="secondary">
                      Selected
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{manifest.description}</p>
              </button>
            );
          })}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="ghost" asChild>
          <Link href="/onboard/keys">Back</Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={handleSkip}>
            Skip for now
          </Button>
          <Button disabled={selected.size === 0} onClick={handleContinue}>
            Continue
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
