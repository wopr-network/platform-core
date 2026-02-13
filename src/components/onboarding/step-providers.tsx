"use client";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { providerPlugins } from "@/lib/onboarding-data";
import { cn } from "@/lib/utils";

interface StepProvidersProps {
  selected: string[];
  onToggle: (id: string) => void;
}

export function StepProviders({ selected, onToggle }: StepProvidersProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight">Pick your AI provider(s)</h2>
        <p className="mt-2 text-muted-foreground">
          Select one or more AI providers to power your WOPR.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {providerPlugins.map((provider) => {
          const isSelected = selected.includes(provider.id);
          return (
            <button
              key={provider.id}
              type="button"
              className="text-left"
              onClick={() => onToggle(provider.id)}
            >
              <Card
                className={cn(
                  "h-full cursor-pointer transition-all hover:shadow-md",
                  isSelected ? "border-primary bg-primary/5 shadow-sm" : "hover:border-primary/30",
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
                  {isSelected && <p className="mt-2 text-xs font-medium text-primary">Selected</p>}
                </CardHeader>
              </Card>
            </button>
          );
        })}
      </div>
    </div>
  );
}
