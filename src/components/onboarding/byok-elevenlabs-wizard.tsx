"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validateElevenLabsKey } from "@/lib/api";
import { cn } from "@/lib/utils";

type WizardStep = "enter-key" | "confirmed";

interface ByokElevenLabsWizardProps {
  onComplete: (key: string) => void;
  onSwitchToHosted?: () => void;
  onCancel?: () => void;
}

export function ByokElevenLabsWizard({
  onComplete,
  onSwitchToHosted,
  onCancel,
}: ByokElevenLabsWizardProps) {
  const [step, setStep] = useState<WizardStep>("enter-key");
  const [apiKey, setApiKey] = useState("");
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validated, setValidated] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === "enter-key" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [step]);

  const handleKeyChange = useCallback(
    (value: string) => {
      setApiKey(value);
      if (error) setError(null);
      if (validated) setValidated(false);
    },
    [error, validated],
  );

  const handleValidate = useCallback(async () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setError("API key is required");
      return;
    }

    setValidating(true);
    setError(null);

    try {
      const result = await validateElevenLabsKey(trimmed);
      if (result.valid) {
        setValidated(true);
        setError(null);
      } else {
        setError(result.message ?? "Invalid API key. Please check and try again.");
        setValidated(false);
      }
    } catch {
      setError("Could not reach ElevenLabs. Please try again.");
      setValidated(false);
    } finally {
      setValidating(false);
    }
  }, [apiKey]);

  const handleContinue = useCallback(() => {
    if (validated) {
      const trimmed = apiKey.trim();
      // Key was already stored by validateElevenLabsKey; no need to store again
      setStep("confirmed");
      onComplete(trimmed);
    }
  }, [validated, apiKey, onComplete]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && apiKey.trim() && !validating) {
        e.preventDefault();
        if (validated) {
          handleContinue();
        } else {
          handleValidate();
        }
      }
    },
    [apiKey, validating, validated, handleContinue, handleValidate],
  );

  return (
    <div className="mx-auto w-full max-w-lg space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        <StepDot active={step === "enter-key"} completed={step === "confirmed"} label="1" />
        <div className="h-px flex-1 bg-border" />
        <StepDot active={step === "confirmed"} completed={false} label="2" />
      </div>

      {step === "enter-key" && (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-bold tracking-tight">Connect ElevenLabs</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              ElevenLabs provides high-quality text-to-speech for your WOPR.
            </p>
          </div>

          {/* Step 1: Get your key */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Step 1: Get your API key</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Go to your ElevenLabs profile and copy your API key.
              </p>
              <Button variant="outline" size="sm" asChild>
                <a
                  href="https://elevenlabs.io/app/settings/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open ElevenLabs API Keys
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* Step 2: Paste your key */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Step 2: Paste your key</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="elevenlabs-key" className="flex items-center gap-1.5">
                    <LockIcon />
                    ElevenLabs API Key
                  </Label>
                  <div className="flex items-center gap-2 text-xs">
                    {validating && (
                      <span className="text-muted-foreground">
                        <SpinnerIcon /> Validating...
                      </span>
                    )}
                    {validated && !validating && (
                      <span className="text-emerald-500">
                        <CheckIcon /> Valid
                      </span>
                    )}
                    {error && !validating && <span className="text-amber-500">{error}</span>}
                  </div>
                </div>
                <Input
                  ref={inputRef}
                  id="elevenlabs-key"
                  type="password"
                  placeholder="Paste your ElevenLabs API key"
                  value={apiKey}
                  onChange={(e) => handleKeyChange(e.target.value)}
                  onBlur={() => {
                    if (apiKey.trim()) handleValidate();
                  }}
                  onKeyDown={handleKeyDown}
                  className={cn(
                    error && !validating && "border-amber-500/50",
                    validated && !validating && "border-emerald-500/50",
                  )}
                  aria-invalid={!!error}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Your key is encrypted at rest and only used for TTS synthesis. WOPR never proxies or
                stores your audio.
              </p>

              <div className="flex items-center justify-between pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleValidate}
                  disabled={!apiKey.trim() || validating}
                >
                  {validating ? "Checking..." : "Validate Key"}
                </Button>
                <Button size="sm" onClick={handleContinue} disabled={!validated || validating}>
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Switch to Hosted escape hatch */}
          {onSwitchToHosted && (
            <div className="text-center">
              <button
                type="button"
                onClick={onSwitchToHosted}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Prefer zero setup? <span className="underline">Switch to Hosted</span>
              </button>
            </div>
          )}

          {onCancel && (
            <div className="flex justify-start">
              <Button variant="ghost" size="sm" onClick={onCancel}>
                Back
              </Button>
            </div>
          )}
        </div>
      )}

      {step === "confirmed" && (
        <div className="space-y-6">
          <div className="text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircleIcon />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Voice (TTS) is ready</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                ElevenLabs text-to-speech is connected. Your WOPR can now speak in any channel.
              </p>
            </div>
          </div>

          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-black text-sm font-bold text-white">
                  E
                </div>
                <div>
                  <p className="text-sm font-medium">ElevenLabs TTS</p>
                  <p className="text-xs text-muted-foreground">
                    Text-to-speech active -- key encrypted at rest
                  </p>
                </div>
                <span className="ml-auto text-xs font-medium text-emerald-500">Connected</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// --- Inline icons (small, no heavy icon library needed) ---

function LockIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-muted-foreground"
      aria-hidden="true"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="inline animate-spin"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-emerald-500"
      aria-hidden="true"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function StepDot({
  active,
  completed,
  label,
}: {
  active: boolean;
  completed: boolean;
  label: string;
}) {
  return (
    <div
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors",
        completed
          ? "bg-emerald-500 text-white"
          : active
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground",
      )}
    >
      {completed ? <CheckIcon /> : label}
    </div>
  );
}
