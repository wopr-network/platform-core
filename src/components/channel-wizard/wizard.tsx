"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { ChannelManifest } from "@/lib/mock-manifests";
import { StepRenderer } from "./step-renderer";

interface WizardProps {
  manifest: ChannelManifest;
  onComplete: (values: Record<string, string>) => void;
  onCancel: () => void;
  submitting?: boolean;
}

export function Wizard({ manifest, onComplete, onCancel, submitting }: WizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "failure" | null>(null);

  const step = manifest.setup[currentStep];
  const totalSteps = manifest.setup.length;
  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const handleChange = useCallback((key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  function validateStep(): boolean {
    const stepErrors: Record<string, string> = {};

    for (const field of step.fields) {
      const value = values[field.key] || "";

      if (field.required && !value) {
        stepErrors[field.key] = `${field.label} is required`;
        continue;
      }

      if (value && field.validation?.pattern) {
        try {
          const regex = new RegExp(field.validation.pattern);
          if (!regex.test(value)) {
            stepErrors[field.key] = field.validation.message || "Invalid format";
          }
        } catch {
          stepErrors[field.key] = field.validation.message || "Invalid format";
        }
      }
    }

    setErrors(stepErrors);
    return Object.keys(stepErrors).length === 0;
  }

  function handleNext() {
    if (!validateStep()) return;

    if (isLastStep) {
      onComplete(values);
    } else {
      setCurrentStep((s) => s + 1);
      setTestResult(null);
    }
  }

  function handleBack() {
    if (!isFirstStep) {
      setCurrentStep((s) => s - 1);
      setErrors({});
      setTestResult(null);
    }
  }

  function handleTestConnection() {
    setTesting(true);
    setTestResult(null);
    // Mock connection test
    setTimeout(() => {
      setTesting(false);
      setTestResult("success");
    }, 1500);
  }

  return (
    <Card className="mx-auto w-full max-w-xl">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white"
            style={{ backgroundColor: manifest.color }}
          >
            {manifest.name[0]}
          </div>
          <div>
            <CardTitle>{step.title}</CardTitle>
            <CardDescription>{step.description}</CardDescription>
          </div>
        </div>
        <div className="mt-4 space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              Step {currentStep + 1} of {totalSteps}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} />
        </div>
      </CardHeader>

      <CardContent>
        <StepRenderer step={step} values={values} errors={errors} onChange={handleChange} />

        {manifest.connectionTest && isLastStep && (
          <div className="mt-6 flex flex-col items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleTestConnection}
              disabled={testing}
            >
              {testing ? "Testing..." : manifest.connectionTest.label}
            </Button>
            {testResult === "success" && (
              <p className="text-sm text-emerald-500">Connection successful</p>
            )}
            {testResult === "failure" && (
              <p className="text-sm text-destructive">Connection failed. Check your settings.</p>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between">
        <div>
          {isFirstStep ? (
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          ) : (
            <Button variant="ghost" onClick={handleBack}>
              Back
            </Button>
          )}
        </div>
        <Button onClick={handleNext} disabled={isLastStep && submitting}>
          {isLastStep && submitting ? "Connecting..." : isLastStep ? "Finish" : "Continue"}
        </Button>
      </CardFooter>
    </Card>
  );
}
