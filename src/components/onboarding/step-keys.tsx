"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OnboardingConfigField } from "@/lib/onboarding-data";
import { cn } from "@/lib/utils";

interface StepKeysProps {
  fields: OnboardingConfigField[];
  values: Record<string, string>;
  errors: Record<string, string | null>;
  validating: Record<string, boolean>;
  onChange: (key: string, value: string) => void;
  onValidate: (key: string) => void;
}

export function StepKeys({
  fields,
  values,
  errors,
  validating,
  onChange,
  onValidate,
}: StepKeysProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight">Enter your keys</h2>
        <p className="mt-2 text-muted-foreground">
          Paste the API keys and credentials needed for your configuration.
        </p>
      </div>

      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
        <p className="text-sm text-blue-200">
          Your keys connect directly to your providers. WOPR never proxies, stores centrally, or has
          access to your keys outside your instance. You pay your providers directly — we provide
          zero inference.
        </p>
      </div>

      <div className="space-y-4">
        {fields.map((field) => (
          <KeyField
            key={field.key}
            field={field}
            value={values[field.key] || ""}
            error={errors[field.key] ?? null}
            isValidating={validating[field.key] || false}
            onChange={onChange}
            onValidate={onValidate}
          />
        ))}
      </div>

      {fields.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No keys required for your current selection.
        </div>
      )}
    </div>
  );
}

function KeyField({
  field,
  value,
  error,
  isValidating,
  onChange,
  onValidate,
}: {
  field: OnboardingConfigField;
  value: string;
  error: string | null;
  isValidating: boolean;
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
  const isValid = hasValue && error === null && !isValidating;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={field.key}>{field.label}</Label>
        <div className="flex items-center gap-2 text-xs">
          {isValidating && <span className="text-muted-foreground">validating...</span>}
          {isValid && <span className="text-green-500">valid</span>}
          {error && !isValidating && <span className="text-destructive">{error}</span>}
        </div>
      </div>
      <div className="flex gap-2">
        <Input
          id={field.key}
          type={field.secret && !showSecret ? "password" : "text"}
          placeholder={field.placeholder}
          value={value}
          onChange={(e) => onChange(field.key, e.target.value)}
          onBlur={handleBlur}
          className={cn(error && !isValidating && "border-destructive")}
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
                Open portal
              </a>
            </>
          )}
        </p>
      )}
    </div>
  );
}
