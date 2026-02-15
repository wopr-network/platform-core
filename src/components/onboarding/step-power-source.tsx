"use client";

import { useCallback, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type OnboardingConfigField, usePluginRegistry } from "@/hooks/use-plugin-registry";
import {
  AI_CAPABILITY_DESCRIPTIONS,
  type ByokAiProvider,
  getAiKeyField,
  getAiKeySuperpowers,
} from "@/lib/onboarding-data";
import { cn } from "@/lib/utils";
import type { ProviderMode, WizardMode } from "./use-onboarding";

interface StepPowerSourceProps {
  selectedSuperpowers: string[];
  providerMode: ProviderMode;
  onProviderModeChange: (mode: ProviderMode) => void;
  byokAiProvider: ByokAiProvider;
  onByokAiProviderChange: (provider: ByokAiProvider) => void;
  creditBalance: string;
  byokKeyValues: Record<string, string>;
  byokKeyErrors: Record<string, string | null>;
  onByokKeyChange: (key: string, value: string) => void;
  onValidateByokKey: (key: string) => void;
  mode?: WizardMode;
}

export function StepPowerSource({
  selectedSuperpowers,
  providerMode,
  onProviderModeChange,
  byokAiProvider,
  onByokAiProviderChange,
  creditBalance,
  byokKeyValues,
  byokKeyErrors,
  onByokKeyChange,
  onValidateByokKey,
  mode = "onboarding",
}: StepPowerSourceProps) {
  const { superpowers } = usePluginRegistry();
  const isFleetAdd = mode === "fleet-add";
  const keySuperpowers = superpowers.filter(
    (sp) => selectedSuperpowers.includes(sp.id) && sp.requiresKey,
  );

  // Separate AI-key superpowers from other key superpowers
  const aiKeySuperpowers = getAiKeySuperpowers(selectedSuperpowers);
  const hasAiKeySuperpowers = aiKeySuperpowers.length > 0;
  const nonAiKeySuperpowers = keySuperpowers.filter((sp) => !sp.usesAiKey);

  // Get the active AI key field based on selected provider
  const aiKeyField = useMemo(() => getAiKeyField(byokAiProvider), [byokAiProvider]);

  // Check if the AI key is currently valid (has value, no error)
  const aiKeyValue = byokKeyValues[aiKeyField.key] || "";
  const aiKeyError = byokKeyErrors[aiKeyField.key] ?? null;
  const aiKeyValid = aiKeyValue.trim().length > 0 && aiKeyError === null;

  // Deduplicated non-AI config fields
  const nonAiConfigFields = useMemo(() => {
    const fields: OnboardingConfigField[] = [];
    const seen = new Set<string>();
    for (const sp of nonAiKeySuperpowers) {
      for (const field of sp.configFields) {
        if (!seen.has(field.key)) {
          seen.add(field.key);
          fields.push(field);
        }
      }
    }
    return fields;
  }, [nonAiKeySuperpowers]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight">How do you want to power them?</h2>
        <p className="mt-2 text-muted-foreground">
          {isFleetAdd
            ? "This WOPR shares your credit pool. No extra payment needed."
            : "Use your signup credits or bring your own API keys."}
        </p>
      </div>

      {isFleetAdd && (
        <div className="rounded-lg border border-terminal/20 bg-terminal/5 p-4 text-center">
          <p className="text-sm font-medium">
            You have <span className="font-bold text-terminal">{creditBalance}</span> in credits
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            New bots share your existing credit pool. No extra payment required.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Hosted option */}
        <button type="button" className="text-left" onClick={() => onProviderModeChange("hosted")}>
          <Card
            className={cn(
              "h-full cursor-pointer transition-all hover:shadow-md",
              providerMode === "hosted"
                ? "border-primary bg-primary/5 shadow-sm"
                : "hover:border-primary/30",
            )}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">WOPR Hosted</CardTitle>
                <Badge variant="terminal">Recommended</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Uses your credits. Everything just works. No keys needed.
              </p>
              <div className="rounded-md border border-terminal/20 bg-terminal/5 p-3">
                <p className="text-sm font-medium text-terminal">You have {creditBalance} credit</p>
                <p className="text-xs text-muted-foreground">~100 images or ~250 min voice</p>
              </div>
              {providerMode === "hosted" && (
                <p className="text-xs font-medium text-primary">Selected</p>
              )}
            </CardContent>
          </Card>
        </button>

        {/* BYOK option */}
        <button type="button" className="text-left" onClick={() => onProviderModeChange("byok")}>
          <Card
            className={cn(
              "h-full cursor-pointer transition-all hover:shadow-md",
              providerMode === "byok"
                ? "border-primary bg-primary/5 shadow-sm"
                : "hover:border-primary/30",
            )}
          >
            <CardHeader>
              <CardTitle className="text-base">Your Keys</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Use your own API keys. You pay providers directly.
              </p>
              {keySuperpowers.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium">You'll need keys for:</p>
                  <ul className="mt-1 list-inside list-disc">
                    {keySuperpowers.map((sp) => (
                      <li key={sp.id}>{sp.name}</li>
                    ))}
                  </ul>
                </div>
              )}
              {providerMode === "byok" && (
                <p className="text-xs font-medium text-primary">Selected</p>
              )}
            </CardContent>
          </Card>
        </button>
      </div>

      {/* BYOK key entry */}
      {providerMode === "byok" && keySuperpowers.length > 0 && (
        <div className="space-y-4">
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
            <p className="text-sm text-muted-foreground">
              Your keys connect directly to providers. We never proxy or store them.
            </p>
          </div>

          {/* AI Provider toggle (OpenAI vs OpenRouter) */}
          {hasAiKeySuperpowers && (
            <div className="space-y-4">
              <p className="text-sm font-medium">Choose your AI provider</p>
              <div
                className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                role="radiogroup"
                aria-label="AI Provider"
              >
                <button
                  type="button"
                  className="text-left"
                  aria-pressed={byokAiProvider === "openai"}
                  onClick={() => onByokAiProviderChange("openai")}
                >
                  <Card
                    className={cn(
                      "h-full cursor-pointer transition-all hover:shadow-md",
                      byokAiProvider === "openai"
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "hover:border-primary/30",
                    )}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#10A37F] text-sm font-bold text-white">
                          O
                        </div>
                        <CardTitle className="text-sm">OpenAI</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-xs text-muted-foreground">GPT-4o, o3, embeddings</p>
                      {byokAiProvider === "openai" && (
                        <p className="mt-2 text-xs font-medium text-primary">Selected</p>
                      )}
                    </CardContent>
                  </Card>
                </button>

                <button
                  type="button"
                  className="text-left"
                  aria-pressed={byokAiProvider === "openrouter"}
                  onClick={() => onByokAiProviderChange("openrouter")}
                >
                  <Card
                    className={cn(
                      "h-full cursor-pointer transition-all hover:shadow-md",
                      byokAiProvider === "openrouter"
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "hover:border-primary/30",
                    )}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#6366F1] text-sm font-bold text-white">
                            R
                          </div>
                          <CardTitle className="text-sm">OpenRouter</CardTitle>
                        </div>
                        <Badge variant="terminal">Recommended</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-xs text-muted-foreground">200+ models, one key</p>
                      {byokAiProvider === "openrouter" && (
                        <p className="mt-2 text-xs font-medium text-primary">Selected</p>
                      )}
                    </CardContent>
                  </Card>
                </button>
              </div>

              {/* AI key input */}
              <ByokField
                field={aiKeyField}
                value={aiKeyValue}
                error={aiKeyError}
                onChange={onByokKeyChange}
                onValidate={onValidateByokKey}
              />

              {/* Capability unlock confirmation */}
              {aiKeyValid && (
                <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4">
                  <p className="mb-3 text-sm font-medium text-green-500">
                    Key validated -- capabilities unlocked:
                  </p>
                  <ul className="space-y-2">
                    {aiKeySuperpowers.map((sp) => {
                      const desc = AI_CAPABILITY_DESCRIPTIONS[sp.id];
                      return (
                        <li key={sp.id} className="flex items-center gap-3">
                          <div
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold text-white"
                            style={{ backgroundColor: sp.color }}
                          >
                            {sp.name[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{desc?.label ?? sp.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {desc
                                ? byokAiProvider === "openrouter"
                                  ? desc.openrouter
                                  : desc.openai
                                : sp.tagline}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Non-AI key fields (e.g., ElevenLabs) */}
          {nonAiConfigFields.map((field) => (
            <ByokField
              key={field.key}
              field={field}
              value={byokKeyValues[field.key] || ""}
              error={byokKeyErrors[field.key] ?? null}
              onChange={onByokKeyChange}
              onValidate={onValidateByokKey}
            />
          ))}

          {/* Switch to Hosted escape hatch */}
          <div className="rounded-lg border border-dashed p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have a key? Switch to WOPR Hosted for zero-config AI access.
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => onProviderModeChange("hosted")}
            >
              Switch to Hosted
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ByokField({
  field,
  value,
  error,
  onChange,
  onValidate,
}: {
  field: OnboardingConfigField;
  value: string;
  error: string | null;
  onChange: (key: string, value: string) => void;
  onValidate: (key: string) => void;
}) {
  const [showSecret, setShowSecret] = useState(false);

  const handleBlur = useCallback(() => {
    if (value.trim()) {
      onValidate(field.key);
    }
  }, [field.key, value, onValidate]);

  const hasValue = value.trim().length > 0;
  const isValid = hasValue && error === null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={`byok-${field.key}`}>{field.label}</Label>
        <div className="flex items-center gap-2 text-xs">
          {isValid && <span className="text-green-500">valid</span>}
          {error && <span className="text-destructive">{error}</span>}
        </div>
      </div>
      <div className="flex gap-2">
        <Input
          id={`byok-${field.key}`}
          type={field.secret && !showSecret ? "password" : "text"}
          placeholder={field.placeholder}
          value={value}
          onChange={(e) => onChange(field.key, e.target.value)}
          onBlur={handleBlur}
          className={cn(error && "border-destructive")}
          aria-invalid={!!error}
        />
        {field.secret && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => setShowSecret(!showSecret)}
          >
            {showSecret ? "Hide" : "Show"}
          </Button>
        )}
      </div>
      {field.helpText && (
        <p className="text-xs text-muted-foreground">
          {field.helpText}
          {field.helpUrl && (
            <>
              {" "}
              <a
                href={field.helpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                Get your key
              </a>
            </>
          )}
        </p>
      )}
    </div>
  );
}
