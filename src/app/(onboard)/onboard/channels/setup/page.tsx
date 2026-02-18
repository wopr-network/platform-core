"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Wizard } from "@/components/channel-wizard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getManifest } from "@/lib/mock-manifests";
import { loadOnboardingState, saveOnboardingState } from "@/lib/onboarding-store";

export default function OnboardChannelSetupPage() {
  const router = useRouter();
  const [channels, setChannels] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [configured, setConfigured] = useState<Set<string>>(new Set());

  useEffect(() => {
    const state = loadOnboardingState();
    setChannels(state.channels);
    if (state.channelsConfigured.length > 0) {
      setConfigured(new Set(state.channelsConfigured));
    }
  }, []);

  const currentChannel = channels[currentIndex];
  const manifest = currentChannel ? getManifest(currentChannel) : undefined;
  const allDone = channels.length > 0 && configured.size >= channels.length;

  function handleComplete(values: Record<string, string>) {
    const next = new Set(configured);
    next.add(currentChannel);
    setConfigured(next);

    // Persist channel config values to localStorage
    const state = loadOnboardingState();
    state.channelConfigs = state.channelConfigs ?? {};
    state.channelConfigs[currentChannel] = values;
    state.channelsConfigured = Array.from(next);
    saveOnboardingState(state);

    if (currentIndex < channels.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  }

  function handleSkipChannel() {
    if (currentIndex < channels.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  }

  function handleContinue() {
    const state = loadOnboardingState();
    state.currentStep = 5;
    state.channelsConfigured = Array.from(configured);
    saveOnboardingState(state);
    router.push("/onboard/plugins");
  }

  if (channels.length === 0) {
    return (
      <Card className="text-center">
        <CardContent className="py-8">
          <p className="text-muted-foreground">No channels selected.</p>
          <Button variant="ghost" className="mt-4" asChild>
            <Link href="/onboard/channels">Go back</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (allDone) {
    return (
      <Card className="text-center">
        <CardHeader>
          <CardTitle>Channels Configured</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
              <span className="text-lg text-emerald-500">&#10003;</span>
            </div>
            <p className="text-sm text-muted-foreground">
              All {channels.length} channel{channels.length > 1 ? "s" : ""} configured.
            </p>
          </div>
          <Button onClick={handleContinue}>Continue to Plugins</Button>
        </CardContent>
      </Card>
    );
  }

  if (!manifest) {
    return (
      <Card className="text-center">
        <CardContent className="py-8">
          <p className="text-muted-foreground">Channel &ldquo;{currentChannel}&rdquo; not found.</p>
          <Button
            variant="ghost"
            className="mt-4"
            onClick={() => {
              if (currentIndex < channels.length - 1) setCurrentIndex((i) => i + 1);
            }}
          >
            Skip
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Configuring channel {currentIndex + 1} of {channels.length}: {manifest.name}
        </span>
        {channels.length > 1 && (
          <Button variant="ghost" size="sm" onClick={handleSkipChannel}>
            Skip this channel
          </Button>
        )}
      </div>
      <Wizard manifest={manifest} onComplete={handleComplete} onCancel={handleSkipChannel} />
    </div>
  );
}
