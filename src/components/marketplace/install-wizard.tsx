"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import type {
  BotSummary,
  ConfigSchemaField,
  HostedAdapter,
  PluginManifest,
  SetupStep,
} from "@/lib/marketplace-data";
import { getHostedAdaptersForCapabilities, listBots } from "@/lib/marketplace-data";
import { cn } from "@/lib/utils";

// --- Step types for the wizard flow ---
type WizardPhase = "bot-select" | "requirements" | "providers" | "setup" | "complete";

interface InstallWizardProps {
  plugin: PluginManifest;
  onComplete: (botId: string, config: Record<string, unknown>) => void;
  onCancel: () => void;
}

export function InstallWizard({ plugin, onComplete, onCancel }: InstallWizardProps) {
  const hostedAdapters = getHostedAdaptersForCapabilities(plugin.capabilities);
  const hasRequirements = plugin.requires.length > 0;
  const hasHosted = hostedAdapters.length > 0;

  // Determine phases — bot-select is always first
  const phases: WizardPhase[] = ["bot-select"];
  if (hasRequirements) phases.push("requirements");
  if (hasHosted) phases.push("providers");
  phases.push("setup");
  phases.push("complete");

  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [setupStepIndex, setSetupStepIndex] = useState(0);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [providerChoices, setProviderChoices] = useState<Record<string, "byok" | "hosted">>({});
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [bots, setBots] = useState<BotSummary[]>([]);
  const [botsLoading, setBotsLoading] = useState(true);
  const [botsError, setBotsError] = useState<string | null>(null);

  useEffect(() => {
    listBots()
      .then((data) => {
        setBots(data);
        setBotsLoading(false);
      })
      .catch((err: unknown) => {
        setBotsError(err instanceof Error ? err.message : "Failed to load bots");
        setBotsLoading(false);
      });
  }, []);

  const currentPhase = phases[currentPhaseIndex];
  const setupSteps = plugin.setup;
  const currentSetupStep = setupSteps[setupStepIndex] as SetupStep | undefined;

  // Progress: count requirements + providers as 1 step each, then setup steps, then complete
  const stepsBeforeSetup = phases.filter(
    (p) => p !== "setup" && p !== "complete" && phases.indexOf(p) < currentPhaseIndex,
  ).length;
  const totalSteps =
    phases.filter((p) => p !== "setup" && p !== "complete").length + setupSteps.length + 1;
  const currentStepNumber =
    currentPhase === "setup"
      ? stepsBeforeSetup + setupStepIndex + 1
      : currentPhase === "complete"
        ? totalSteps
        : stepsBeforeSetup + 1;
  const progress = (currentStepNumber / totalSteps) * 100;

  const handleChange = useCallback((key: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  function validateFields(fields: ConfigSchemaField[]): boolean {
    const stepErrors: Record<string, string> = {};
    for (const field of fields) {
      const val = values[field.key];
      if (field.required && (val === undefined || val === "")) {
        stepErrors[field.key] = `${field.label} is required`;
        continue;
      }
      if (typeof val === "string" && val && field.validation?.pattern) {
        try {
          const regex = new RegExp(field.validation.pattern);
          if (!regex.test(val)) {
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
    if (currentPhase === "bot-select") {
      if (!selectedBotId) {
        setErrors({ _botId: "Please select a bot to install on" });
        return;
      }
      setCurrentPhaseIndex((i) => i + 1);
      setErrors({});
      return;
    }

    if (currentPhase === "setup" && currentSetupStep) {
      if (!validateFields(currentSetupStep.fields)) return;
      if (setupStepIndex < setupSteps.length - 1) {
        setSetupStepIndex((s) => s + 1);
        return;
      }
    }

    if (currentPhase === "complete") {
      if (selectedBotId) {
        onComplete(selectedBotId, { ...values, _providerChoices: providerChoices });
      }
      return;
    }

    setCurrentPhaseIndex((i) => i + 1);
    setErrors({});
  }

  function handleBack() {
    if (currentPhase === "setup" && setupStepIndex > 0) {
      setSetupStepIndex((s) => s - 1);
      setErrors({});
      return;
    }
    if (currentPhaseIndex > 0) {
      setCurrentPhaseIndex((i) => i - 1);
      setErrors({});
    }
  }

  const isFirstStep = currentPhaseIndex === 0 && (currentPhase !== "setup" || setupStepIndex === 0);
  const isContinueDisabled = currentPhase === "bot-select" && !selectedBotId;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white"
            style={{ backgroundColor: plugin.color }}
          >
            {plugin.name[0]}
          </div>
          <div>
            <CardTitle>Install {plugin.name}</CardTitle>
            <CardDescription>
              {currentPhase === "bot-select" && "Select which bot to install this plugin on"}
              {currentPhase === "requirements" && "Check plugin requirements"}
              {currentPhase === "providers" && "Choose provider for each capability"}
              {currentPhase === "setup" && currentSetupStep?.description}
              {currentPhase === "complete" && "Installation complete"}
            </CardDescription>
          </div>
        </div>
        <div className="mt-4 space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              Step {currentStepNumber} of {totalSteps}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} />
        </div>
      </CardHeader>

      <CardContent>
        {currentPhase === "bot-select" && (
          <BotSelector
            bots={bots}
            loading={botsLoading}
            selectedBotId={selectedBotId}
            onSelect={setSelectedBotId}
            loadError={botsError}
            error={errors._botId}
          />
        )}
        {currentPhase === "requirements" && <RequirementsCheck plugin={plugin} />}
        {currentPhase === "providers" && (
          <ProviderSelector
            adapters={hostedAdapters}
            choices={providerChoices}
            onChoose={(cap, choice) => setProviderChoices((prev) => ({ ...prev, [cap]: choice }))}
          />
        )}
        {currentPhase === "setup" && currentSetupStep && (
          <SetupStepForm
            step={currentSetupStep}
            values={values}
            errors={errors}
            onChange={handleChange}
          />
        )}
        {currentPhase === "complete" && (
          <div className="py-4 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15">
              <span className="text-2xl text-emerald-500">&#10003;</span>
            </div>
            <p className="font-medium">Plugin installed successfully</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {plugin.name} is now active on your instance.
            </p>
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
        <Button onClick={handleNext} disabled={isContinueDisabled}>
          {currentPhase === "complete" ? "Done" : "Continue"}
        </Button>
      </CardFooter>
    </Card>
  );
}

// --- Sub-components ---

function BotSelector({
  bots,
  loading,
  selectedBotId,
  onSelect,
  loadError,
  error,
}: {
  bots: BotSummary[];
  loading: boolean;
  selectedBotId: string | null;
  onSelect: (id: string) => void;
  loadError?: string | null;
  error?: string;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="py-4 text-center">
        <p className="text-sm text-destructive">{loadError}</p>
      </div>
    );
  }

  if (bots.length === 0) {
    return (
      <div className="py-4 text-center">
        <p className="text-sm text-muted-foreground">
          No bots found. Create a bot instance first before installing plugins.
        </p>
        <Button variant="outline" className="mt-3" asChild>
          <a href="/instances/new">Create a Bot</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Select which bot to install this plugin on:</p>
      {bots.map((bot) => (
        <button
          key={bot.id}
          type="button"
          onClick={() => onSelect(bot.id)}
          className={cn(
            "w-full rounded-lg border p-3 text-left transition-colors",
            selectedBotId === bot.id
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50",
          )}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{bot.name}</p>
            <Badge variant="outline" className="text-[10px]">
              {bot.state}
            </Badge>
          </div>
        </button>
      ))}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function RequirementsCheck({ plugin }: { plugin: PluginManifest }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        This plugin requires the following dependencies:
      </p>
      {plugin.requires.length === 0 ? (
        <p className="text-sm text-emerald-500">No additional dependencies required.</p>
      ) : (
        <ul className="space-y-2">
          {plugin.requires.map((req) => (
            <li key={req.id} className="flex items-center gap-2 text-sm">
              <span className="text-emerald-500">&#10003;</span>
              <span>{req.label}</span>
              <Badge variant="outline" className="text-[10px]">
                {req.id}
              </Badge>
            </li>
          ))}
        </ul>
      )}
      {plugin.install.length > 0 && (
        <div className="mt-4 rounded-sm border border-dashed p-3">
          <p className="text-xs text-muted-foreground">
            The following will be auto-installed: {plugin.install.join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}

function ProviderSelector({
  adapters,
  choices,
  onChoose,
}: {
  adapters: HostedAdapter[];
  choices: Record<string, "byok" | "hosted">;
  onChoose: (capability: string, choice: "byok" | "hosted") => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Some capabilities can be provided by WOPR Hosted services. Choose for each:
      </p>
      {adapters.map((adapter) => {
        const choice = choices[adapter.capability] ?? "hosted";
        return (
          <div key={adapter.capability} className="rounded-sm border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{adapter.label}</p>
                <p className="text-xs text-muted-foreground">{adapter.description}</p>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {adapter.pricing}
              </Badge>
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                variant={choice === "hosted" ? "default" : "outline"}
                size="sm"
                onClick={() => onChoose(adapter.capability, "hosted")}
              >
                WOPR Hosted
              </Button>
              <Button
                variant={choice === "byok" ? "default" : "outline"}
                size="sm"
                onClick={() => onChoose(adapter.capability, "byok")}
              >
                Use your key
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SetupStepForm({
  step,
  values,
  errors,
  onChange,
}: {
  step: SetupStep;
  values: Record<string, unknown>;
  errors: Record<string, string>;
  onChange: (key: string, value: unknown) => void;
}) {
  if (step.fields.length === 0) {
    return (
      <div className="space-y-3">
        {step.instruction && <p className="text-sm text-muted-foreground">{step.instruction}</p>}
        {step.externalUrl && (
          <a
            href={step.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm text-primary underline underline-offset-4"
          >
            Open external link
          </a>
        )}
        {!step.instruction && !step.externalUrl && (
          <p className="text-sm text-muted-foreground">{step.description}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {step.instruction && <p className="text-sm text-muted-foreground">{step.instruction}</p>}
      {step.externalUrl && (
        <a
          href={step.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-sm text-primary underline underline-offset-4"
        >
          Open external link
        </a>
      )}
      {step.fields.map((field) => (
        <ConfigFieldInput
          key={field.key}
          field={field}
          value={values[field.key]}
          error={errors[field.key]}
          onChange={(v) => onChange(field.key, v)}
        />
      ))}
    </div>
  );
}

function ConfigFieldInput({
  field,
  value,
  error,
  onChange,
}: {
  field: ConfigSchemaField;
  value: unknown;
  error?: string;
  onChange: (value: unknown) => void;
}) {
  if (field.type === "boolean") {
    return (
      <div className="flex items-center justify-between">
        <div>
          <Label>{field.label}</Label>
          {field.description && (
            <p className="text-xs text-muted-foreground">{field.description}</p>
          )}
        </div>
        <Switch
          checked={value === true || value === "true"}
          onCheckedChange={(checked) => onChange(checked)}
          aria-label={field.label}
        />
      </div>
    );
  }

  if (field.type === "select" && field.options) {
    return (
      <div className="flex flex-col gap-2">
        <Label htmlFor={`field-${field.key}`}>{field.label}</Label>
        {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
        <Select value={(value as string) ?? ""} onValueChange={(v) => onChange(v)}>
          <SelectTrigger id={`field-${field.key}`}>
            <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={`field-${field.key}`}>{field.label}</Label>
      {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
      <Input
        id={`field-${field.key}`}
        type={field.secret ? "password" : field.type === "number" ? "number" : "text"}
        placeholder={field.placeholder}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
