"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Preset } from "@/lib/onboarding-data";
import { cn } from "@/lib/utils";

interface StepPresetsProps {
  presets: Preset[];
  onSelect: (preset: Preset) => void;
}

export function StepPresets({ presets, onSelect }: StepPresetsProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight">Get started with WOPR</h2>
        <p className="mt-2 text-muted-foreground">
          Choose a preset for quick setup, or build a custom configuration.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className="text-left"
            onClick={() => onSelect(preset)}
          >
            <Card
              className={cn(
                "h-full cursor-pointer transition-all hover:border-primary/50 hover:shadow-md",
                preset.id === "custom" && "border-dashed",
              )}
            >
              <CardHeader>
                <CardTitle className="text-base">{preset.name}</CardTitle>
                <CardDescription>{preset.description}</CardDescription>
              </CardHeader>
              {preset.id !== "custom" && (
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {preset.keyCount} key{preset.keyCount !== 1 ? "s" : ""} needed
                  </p>
                </CardContent>
              )}
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
}
