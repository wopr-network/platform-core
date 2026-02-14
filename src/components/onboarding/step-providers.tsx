"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePluginRegistry } from "@/hooks/use-plugin-registry";
import { cn } from "@/lib/utils";
import type { ProviderMode } from "./use-onboarding";

interface StepProvidersProps {
  selected: string[];
  onToggle: (id: string) => void;
  providerMode: ProviderMode;
  onProviderModeChange: (mode: ProviderMode) => void;
}

const HOSTED_CAPABILITIES = [
  { name: "Text Generation", detail: "Claude, GPT-4o, Gemini" },
  { name: "Image Generation", detail: "DALL-E, Stable Diffusion" },
  { name: "Transcription", detail: "Whisper, Deepgram" },
  { name: "Embeddings", detail: "For semantic memory" },
];

export function StepProviders({
  selected,
  onToggle,
  providerMode,
  onProviderModeChange,
}: StepProvidersProps) {
  const { providers: providerPlugins } = usePluginRegistry();
  const [byokExpanded, setByokExpanded] = useState(providerMode === "byok");

  useEffect(() => {
    setByokExpanded(providerMode === "byok");
  }, [providerMode]);

  function selectHosted() {
    onProviderModeChange("hosted");
    setByokExpanded(false);
  }

  function selectByok() {
    onProviderModeChange("byok");
    setByokExpanded(true);
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight">How should WOPR access AI?</h2>
        <p className="mt-2 text-muted-foreground">
          Use our hosted service for zero setup, or bring your own API keys.
        </p>
      </div>

      {/* Lane A: WOPR Hosted */}
      <button type="button" className="w-full text-left" onClick={selectHosted}>
        <Card
          className={cn(
            "relative transition-all hover:shadow-md",
            providerMode === "hosted"
              ? "border-primary bg-primary/5 shadow-sm"
              : "hover:border-primary/30",
          )}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground">
                  W
                </div>
                <div>
                  <CardTitle className="text-lg">WOPR Hosted</CardTitle>
                  <CardDescription>
                    Just works. We handle the AI -- you get billed per use.
                  </CardDescription>
                </div>
              </div>
              <Badge variant="terminal">Recommended</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {HOSTED_CAPABILITIES.map((cap) => (
                <div key={cap.name} className="rounded-md border border-border/50 px-3 py-2">
                  <p className="text-sm font-medium">{cap.name}</p>
                  <p className="text-xs text-muted-foreground">{cap.detail}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Pay only for what you use. No minimum, no commitment.
            </p>
            {providerMode === "hosted" && (
              <p className="text-xs font-medium text-primary">Selected -- no setup needed</p>
            )}
          </CardContent>
        </Card>
      </button>

      {/* Lane B: BYOK */}
      <div className="space-y-3">
        <button
          type="button"
          className="flex w-full items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          onClick={() => {
            if (byokExpanded && providerMode === "byok") {
              // Already in BYOK mode, just toggle collapse
              setByokExpanded(false);
            } else {
              selectByok();
            }
          }}
        >
          <span className="text-xs">{byokExpanded ? "v" : ">"}</span>
          <span>Already have API keys? Bring your own.</span>
        </button>

        {byokExpanded && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {providerPlugins.map((provider) => {
              const isSelected = selected.includes(provider.id);
              return (
                <button
                  key={provider.id}
                  type="button"
                  className="text-left"
                  onClick={() => {
                    if (providerMode !== "byok") selectByok();
                    onToggle(provider.id);
                  }}
                >
                  <Card
                    className={cn(
                      "h-full cursor-pointer transition-all hover:shadow-md",
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "hover:border-primary/30",
                    )}
                  >
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
                          style={{ backgroundColor: provider.color }}
                        >
                          {provider.name[0]}
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-sm">{provider.name}</CardTitle>
                          <CardDescription className="line-clamp-2 text-xs">
                            {provider.description}
                          </CardDescription>
                        </div>
                      </div>
                      {isSelected && (
                        <p className="mt-2 text-xs font-medium text-primary">Selected</p>
                      )}
                    </CardHeader>
                  </Card>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
