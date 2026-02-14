"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type Personality, personalities } from "@/lib/onboarding-data";
import { cn } from "@/lib/utils";

interface StepNameProps {
  name: string;
  personalityId: string;
  customPersonality: string;
  onNameChange: (name: string) => void;
  onPersonalityChange: (id: string) => void;
  onCustomPersonalityChange: (value: string) => void;
}

export function StepName({
  name,
  personalityId,
  customPersonality,
  onNameChange,
  onPersonalityChange,
  onCustomPersonalityChange,
}: StepNameProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight">Name your WOPR Bot</h2>
        <p className="mt-2 text-muted-foreground">Give it a name and a personality.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="wopr-name">Name</Label>
        <Input
          id="wopr-name"
          placeholder="e.g. jarvis, friday, hal"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          autoFocus
        />
      </div>

      <div className="space-y-3">
        <Label>Personality</Label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {personalities.map((p: Personality) => (
            <button
              key={p.id}
              type="button"
              className="text-left"
              onClick={() => onPersonalityChange(p.id)}
            >
              <Card
                className={cn(
                  "h-full cursor-pointer transition-all hover:shadow-md",
                  personalityId === p.id
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "hover:border-primary/30",
                )}
              >
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">{p.name}</CardTitle>
                </CardHeader>
                <CardContent className="py-0 pb-3">
                  <p className="text-xs text-muted-foreground">{p.description}</p>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      </div>

      {personalityId === "custom" && (
        <div className="space-y-2">
          <Label htmlFor="custom-personality">Describe your personality</Label>
          <Input
            id="custom-personality"
            placeholder="e.g. Sarcastic but brilliant..."
            value={customPersonality}
            onChange={(e) => onCustomPersonalityChange(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
