"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type Personality, personalities } from "@/lib/onboarding-data";
import { cn } from "@/lib/utils";
import type { ExistingBot, WizardMode } from "./use-onboarding";

interface StepNameProps {
  name: string;
  personalityId: string;
  customPersonality: string;
  onNameChange: (name: string) => void;
  onPersonalityChange: (id: string) => void;
  onCustomPersonalityChange: (value: string) => void;
  mode?: WizardMode;
  existingBots?: ExistingBot[];
  cloneFromBotId?: string;
  onCloneFromBot?: (botId: string) => void;
  stepNumber?: string;
  stepCode?: string;
}

export function StepName({
  name,
  personalityId,
  customPersonality,
  onNameChange,
  onPersonalityChange,
  onCustomPersonalityChange,
  mode = "onboarding",
  existingBots = [],
  cloneFromBotId = "",
  onCloneFromBot,
  stepNumber = "01",
  stepCode = "DESIGNATION",
}: StepNameProps) {
  const isFleetAdd = mode === "fleet-add";

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div
          className="inline-block font-mono text-xs tracking-[0.3em] text-terminal uppercase"
          aria-hidden="true"
        >
          STEP {stepNumber} {"//"} {stepCode}
        </div>
        <h2 className="text-2xl font-bold tracking-tight">
          {isFleetAdd ? "Name your new WOPR" : "Name your WOPR Bot"}
        </h2>
        <p className="mt-2 text-muted-foreground">
          {isFleetAdd ? "What should this one be called?" : "Give it a name and a personality."}
        </p>
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

      {isFleetAdd && existingBots.length > 0 && (
        <div className="space-y-2">
          <Label>Clone personality from existing bot</Label>
          <Select
            value={cloneFromBotId}
            onValueChange={(value) => onCloneFromBot?.(value === "__none__" ? "" : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Start fresh" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Start fresh</SelectItem>
              {existingBots.map((bot) => (
                <SelectItem key={bot.id} value={bot.id}>
                  Same as {bot.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-3">
        <Label>Personality</Label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {personalities.map((p: Personality) => {
            const isSelected = personalityId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                className="text-left"
                onClick={() => onPersonalityChange(p.id)}
              >
                <Card
                  className={cn(
                    "h-full cursor-pointer transition-all relative",
                    isSelected
                      ? "border-terminal bg-terminal/5 shadow-[0_0_12px_rgba(0,255,65,0.2)]"
                      : "border-border/50 hover:border-terminal/40 hover:shadow-[0_0_8px_rgba(0,255,65,0.15)]",
                  )}
                >
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">{p.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="py-0 pb-3">
                    <p className="text-xs text-muted-foreground">{p.description}</p>
                  </CardContent>
                  {isSelected && (
                    <motion.div
                      className="absolute top-2 right-2"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    >
                      <div
                        className="flex h-5 w-5 items-center justify-center rounded-full bg-terminal/20 text-terminal"
                        aria-hidden="true"
                      >
                        <svg
                          className="h-3 w-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                          role="img"
                          aria-label="Selected"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </motion.div>
                  )}
                </Card>
              </button>
            );
          })}
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
