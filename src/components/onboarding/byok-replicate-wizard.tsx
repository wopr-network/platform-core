"use client";

import { useCallback, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type ValidationState = "idle" | "validating" | "valid" | "invalid";

interface ByokReplicateWizardProps {
  /** Which superpowers the user selected that use Replicate */
  unlockedCapabilities: ("image-gen" | "video-gen")[];
  onComplete: (token: string) => void;
  onSwitchToHosted: () => void;
}

const CAPABILITY_LABELS: Record<string, { name: string; command: string }> = {
  "image-gen": { name: "ImageGen", command: "/imagine in any channel" },
  "video-gen": { name: "VideoGen", command: "/video in any channel" },
};

export function ByokReplicateWizard({
  unlockedCapabilities,
  onComplete,
  onSwitchToHosted,
}: ByokReplicateWizardProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [token, setToken] = useState("");
  const [validationState, setValidationState] = useState<ValidationState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [accountUsername, setAccountUsername] = useState<string | null>(null);
  const latestTokenRef = useRef("");

  const validate = useCallback(async (value: string) => {
    if (!value.trim()) return;

    // Client-side format check
    if (!value.startsWith("r8_")) {
      setValidationState("invalid");
      setErrorMessage("Token must start with r8_");
      return;
    }

    latestTokenRef.current = value;
    setValidationState("validating");
    setErrorMessage(null);

    try {
      const res = await fetch("https://api.replicate.com/v1/account", {
        headers: { Authorization: `Bearer ${value}` },
      });

      // Discard stale response if user changed token while fetch was in-flight
      if (latestTokenRef.current !== value) return;

      if (res.ok) {
        const data = (await res.json()) as { username?: string };
        setValidationState("valid");
        setAccountUsername(data.username ?? null);
        setErrorMessage(null);
      } else if (res.status === 401) {
        setValidationState("invalid");
        setErrorMessage("Invalid token -- check that you copied the full token.");
        setAccountUsername(null);
      } else {
        setValidationState("invalid");
        setErrorMessage(`Replicate returned ${res.status}. Try again in a moment.`);
        setAccountUsername(null);
      }
    } catch {
      if (latestTokenRef.current !== value) return;
      setValidationState("invalid");
      setErrorMessage("Could not reach Replicate. Check your connection.");
      setAccountUsername(null);
    }
  }, []);

  const handleBlur = useCallback(() => {
    if (token.trim()) {
      validate(token);
    }
  }, [token, validate]);

  const handleContinue = useCallback(() => {
    if (validationState === "valid") {
      setStep(2);
    }
  }, [validationState]);

  const handleDone = useCallback(() => {
    onComplete(token);
  }, [token, onComplete]);

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <span
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
            step === 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          1
        </span>
        <span className="h-px w-8 bg-border" />
        <span
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
            step === 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          2
        </span>
      </div>

      {step === 1 && (
        <div className="space-y-6">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <LockIcon />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Connect Replicate</h2>
            <p className="mt-2 text-muted-foreground">
              One key powers{" "}
              {unlockedCapabilities.length === 2
                ? "both ImageGen and VideoGen"
                : unlockedCapabilities.map((c) => CAPABILITY_LABELS[c].name).join(" and ")}
              .
            </p>
          </div>

          {/* Trust callout */}
          <Banner variant="info">
            Your token connects directly to Replicate. WOPR never proxies, stores centrally, or has
            access to your token outside your instance.
          </Banner>

          {/* Token input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="replicate-token">Replicate API Token</Label>
              <div className="flex items-center gap-2 text-xs">
                {validationState === "validating" && (
                  <span className="text-muted-foreground">
                    <Spinner /> validating...
                  </span>
                )}
                {validationState === "valid" && (
                  <span className="text-emerald-500">
                    <CheckIcon /> valid
                    {accountUsername && <> -- {accountUsername}</>}
                  </span>
                )}
                {validationState === "invalid" && errorMessage && (
                  <span className="text-amber-500">{errorMessage}</span>
                )}
              </div>
            </div>
            <Input
              id="replicate-token"
              type="password"
              placeholder="r8_..."
              value={token}
              onChange={(e) => {
                setToken(e.target.value);
                if (validationState !== "idle") {
                  setValidationState("idle");
                  setErrorMessage(null);
                }
              }}
              onBlur={handleBlur}
              className={cn(
                validationState === "invalid" && "border-amber-500",
                validationState === "valid" && "border-emerald-500",
              )}
              aria-invalid={validationState === "invalid"}
            />
            <p className="text-xs text-muted-foreground">
              Get your token from{" "}
              <a
                href="https://replicate.com/account/api-tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                replicate.com/account/api-tokens
              </a>
            </p>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              className="text-sm text-muted-foreground underline hover:text-foreground"
              onClick={onSwitchToHosted}
            >
              Switch to Hosted
            </button>
            <Button onClick={handleContinue} disabled={validationState !== "valid"}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckIcon className="h-6 w-6 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Replicate connected</h2>
            <p className="mt-2 text-muted-foreground">
              {accountUsername
                ? `Signed in as ${accountUsername}. Here's what you unlocked:`
                : "Here's what you unlocked:"}
            </p>
          </div>

          {/* Unlocked capabilities */}
          <div className="space-y-3">
            {unlockedCapabilities.map((capId) => {
              const cap = CAPABILITY_LABELS[capId];
              if (!cap) return null;
              return (
                <Card key={capId}>
                  <CardContent className="flex items-center gap-3 py-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                      <CheckIcon className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{cap.name}</p>
                      <p className="text-xs text-muted-foreground">{cap.command}</p>
                    </div>
                    <Badge variant="default" className="ml-auto">
                      Unlocked
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Encryption callout */}
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="flex items-center gap-2">
              <LockIcon className="h-4 w-4 text-emerald-500" />
              <p className="text-sm text-emerald-400">Token encrypted at rest</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              className="text-sm text-muted-foreground underline hover:text-foreground"
              onClick={onSwitchToHosted}
            >
              Switch to Hosted
            </button>
            <Button onClick={handleDone}>Done</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Inline SVG icons (no external dependency) ---

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-5 w-5", className)}
      aria-hidden="true"
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-4 w-4", className)}
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      className="inline h-3 w-3 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
