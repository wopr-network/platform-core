"use client";

import { motion } from "framer-motion";
import { useCallback, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Banner } from "@/components/ui/banner";
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
  byokKeyValidationStatus: Record<string, "idle" | "validating" | "valid" | "invalid">;
  byokKeyValidationErrors: Record<string, string | null>;
  onValidateByokKeyAsync: (key: string) => Promise<void>;
  mode?: WizardMode;
  stepNumber?: string;
  stepCode?: string;
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
  byokKeyValidationStatus,
  byokKeyValidationErrors,
  onValidateByokKeyAsync,
  mode = "onboarding",
  stepNumber = "05",
  stepCode = "POWER SOURCE",
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

  // Check if the AI key is server-validated
  const aiKeyValue = byokKeyValues[aiKeyField.key] || "";
  const aiKeyError = byokKeyErrors[aiKeyField.key] ?? null;
  const aiKeyValid = byokKeyValidationStatus[aiKeyField.key] === "valid";

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
      <div className="text-center space-y-2">
        <div
          className="inline-block font-mono text-xs tracking-[0.3em] text-terminal uppercase"
          aria-hidden="true"
        >
          STEP {stepNumber} {"//"} {stepCode}
        </div>
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
        <motion.button
          data-onboarding-id="onboarding.provider.hosted"
          type="button"
          className="text-left"
          onClick={() => onProviderModeChange("hosted")}
          whileHover={{ scale: 1.02, x: -4 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <Card
            className={cn(
              "h-full cursor-pointer transition-all",
              providerMode === "hosted"
                ? "border-terminal bg-terminal/5 shadow-[0_0_16px_rgba(0,255,65,0.25)]"
                : "border-border/50 hover:border-terminal/40 hover:shadow-[0_0_8px_rgba(0,255,65,0.15)]",
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
            </CardContent>
          </Card>
        </motion.button>

        {/* BYOK option */}
        <motion.button
          data-onboarding-id="onboarding.provider.byok"
          type="button"
          className="text-left"
          onClick={() => onProviderModeChange("byok")}
          whileHover={{ scale: 1.02, x: 4 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <Card
            className={cn(
              "h-full cursor-pointer transition-all",
              providerMode === "byok"
                ? "border-terminal bg-terminal/5 shadow-[0_0_16px_rgba(0,255,65,0.25)]"
                : "border-border/50 hover:border-terminal/40 hover:shadow-[0_0_8px_rgba(0,255,65,0.15)]",
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
            </CardContent>
          </Card>
        </motion.button>
      </div>

      {/* BYOK key entry */}
      {providerMode === "byok" && keySuperpowers.length > 0 && (
        <div className="space-y-4">
          <Banner variant="info">
            Your keys connect directly to providers. We never proxy or store them.
          </Banner>

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
                  data-onboarding-id="onboarding.provider.byok.openai"
                  type="button"
                  className="text-left"
                  aria-pressed={byokAiProvider === "openai"}
                  onClick={() => onByokAiProviderChange("openai")}
                >
                  <Card
                    className={cn(
                      "h-full cursor-pointer transition-all",
                      byokAiProvider === "openai"
                        ? "border-terminal bg-terminal/5 shadow-[0_0_12px_rgba(0,255,65,0.2)]"
                        : "border-border/50 hover:border-terminal/40 hover:shadow-[0_0_8px_rgba(0,255,65,0.15)]",
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
                    </CardContent>
                  </Card>
                </button>

                <button
                  data-onboarding-id="onboarding.provider.byok.openrouter"
                  type="button"
                  className="text-left"
                  aria-pressed={byokAiProvider === "openrouter"}
                  onClick={() => onByokAiProviderChange("openrouter")}
                >
                  <Card
                    className={cn(
                      "h-full cursor-pointer transition-all",
                      byokAiProvider === "openrouter"
                        ? "border-terminal bg-terminal/5 shadow-[0_0_12px_rgba(0,255,65,0.2)]"
                        : "border-border/50 hover:border-terminal/40 hover:shadow-[0_0_8px_rgba(0,255,65,0.15)]",
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
                validationStatus={byokKeyValidationStatus[aiKeyField.key] ?? "idle"}
                validationError={byokKeyValidationErrors[aiKeyField.key] ?? null}
                onValidateAsync={onValidateByokKeyAsync}
              />

              {/* Capability unlock confirmation — gated on server validation */}
              {aiKeyValid && (
                <motion.div
                  className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <p className="mb-3 text-sm font-medium text-emerald-500">
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
                </motion.div>
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
              validationStatus={byokKeyValidationStatus[field.key] ?? "idle"}
              validationError={byokKeyValidationErrors[field.key] ?? null}
              onValidateAsync={onValidateByokKeyAsync}
            />
          ))}

          {/* Switch to Hosted escape hatch */}
          <div className="rounded-lg border border-dashed p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have a key? Switch to WOPR Hosted for zero-config AI access.
            </p>
            <Button
              data-onboarding-id="onboarding.provider.switch-to-hosted"
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
  validationStatus = "idle",
  validationError,
  onValidateAsync,
}: {
  field: OnboardingConfigField;
  value: string;
  error: string | null;
  onChange: (key: string, value: string) => void;
  onValidate: (key: string) => void;
  validationStatus?: "idle" | "validating" | "valid" | "invalid";
  validationError?: string | null;
  onValidateAsync?: (key: string) => Promise<void>;
}) {
  const [showSecret, setShowSecret] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  const handleBlur = useCallback(() => {
    if (value.trim()) {
      onValidate(field.key);
    }
  }, [field.key, value, onValidate]);

  const handleValidateClick = useCallback(() => {
    if (onValidateAsync) {
      onValidateAsync(field.key).then(undefined, () => {
        // Error is already handled inside validateByokKeyAsync
      });
    }
  }, [field.key, onValidateAsync]);

  // Trigger shake on transition to invalid
  const handleShake = useCallback(() => {
    setShakeKey((k) => k + 1);
  }, []);

  const prevStatusRef = useRef<string>("idle");
  if (validationStatus === "invalid" && prevStatusRef.current !== "invalid") {
    handleShake();
  }
  prevStatusRef.current = validationStatus;

  const hasValue = value.trim().length > 0;
  const isFormatOk = hasValue && error === null;

  const validationButtonLabel =
    validationStatus === "validating"
      ? "[CHECKING...]"
      : validationStatus === "valid"
        ? "[VALIDATED]"
        : "[VALIDATE]";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={`byok-${field.key}`}>{field.label}</Label>
        <div className="flex items-center gap-2 font-mono text-xs">
          {validationStatus === "valid" && <span className="text-emerald-500">validated</span>}
          {validationStatus === "validating" && (
            <span className="text-terminal animate-pulse">validating...</span>
          )}
          {validationStatus === "invalid" && validationError && (
            <motion.span
              className="text-destructive"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              {validationError}
            </motion.span>
          )}
          {validationStatus === "idle" && isFormatOk && (
            <span className="text-muted-foreground">format ok</span>
          )}
          {validationStatus === "idle" && error && (
            <motion.span
              className="text-destructive"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {error}
            </motion.span>
          )}
        </div>
      </div>
      <motion.div
        key={shakeKey}
        className="flex gap-2"
        animate={
          error || (validationStatus === "invalid" && shakeKey > 0)
            ? { x: [0, -4, 4, -4, 0] }
            : undefined
        }
        transition={
          error || (validationStatus === "invalid" && shakeKey > 0) ? { duration: 0.3 } : undefined
        }
      >
        <Input
          id={`byok-${field.key}`}
          type={field.secret && !showSecret ? "password" : "text"}
          placeholder={field.placeholder}
          value={value}
          onChange={(e) => onChange(field.key, e.target.value)}
          onBlur={handleBlur}
          className={cn(
            "bg-black/50 border-terminal/30 font-mono text-sm placeholder:text-terminal/20",
            "focus-visible:border-terminal focus-visible:ring-terminal/30",
            validationStatus === "validating" && "border-terminal/50",
            validationStatus === "valid" && "border-emerald-500/40",
            (error || validationStatus === "invalid") && "border-destructive ring-destructive/20",
          )}
          aria-invalid={!!error || validationStatus === "invalid"}
        />
        {field.secret && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 font-mono text-xs text-terminal/60 hover:text-terminal"
            onClick={() => setShowSecret(!showSecret)}
          >
            {showSecret ? "[HIDE]" : "[SHOW]"}
          </Button>
        )}
        {onValidateAsync && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "shrink-0 font-mono text-xs",
              validationStatus === "valid"
                ? "text-emerald-500/60 hover:text-emerald-500"
                : "text-terminal/60 hover:text-terminal",
              validationStatus === "validating" && "animate-pulse",
            )}
            disabled={!hasValue || !!error || validationStatus === "validating"}
            onClick={handleValidateClick}
          >
            {validationButtonLabel}
          </Button>
        )}
      </motion.div>
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
