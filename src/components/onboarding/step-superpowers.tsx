"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { superpowers } from "@/lib/onboarding-data";

interface StepSuperpowersProps {
  selected: string[];
  onToggle: (id: string) => void;
}

export function StepSuperpowers({ selected, onToggle }: StepSuperpowersProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight">Give your WOPR Bot superpowers</h2>
        <p className="mt-2 text-muted-foreground">Pick as many as you want. All optional.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {superpowers.map((sp) => {
          const isSelected = selected.includes(sp.id);
          return (
            <Card key={sp.id} className="py-3">
              <CardContent className="flex items-center justify-between gap-4 py-0">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
                    style={{ backgroundColor: sp.color }}
                  >
                    {sp.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{sp.name}</p>
                    <p className="text-xs text-muted-foreground">{sp.tagline}</p>
                  </div>
                </div>
                <Switch
                  checked={isSelected}
                  onCheckedChange={() => onToggle(sp.id)}
                  aria-label={`Toggle ${sp.name}`}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
