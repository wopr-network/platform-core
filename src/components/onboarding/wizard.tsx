"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { presets as presetData } from "@/lib/onboarding-data";
import { StepChannels } from "./step-channels";
import { StepDeploy } from "./step-deploy";
import { StepDone } from "./step-done";
import { StepKeys } from "./step-keys";
import { StepPlugins } from "./step-plugins";
import { StepPresets } from "./step-presets";
import { StepProviders } from "./step-providers";
import { useOnboarding } from "./use-onboarding";

const STEP_LABELS: Record<string, string> = {
  presets: "Getting Started",
  channels: "Channels",
  providers: "Providers",
  plugins: "Plugins",
  keys: "Configuration",
  deploy: "Deploy",
  done: "Done",
};

export function OnboardingWizard() {
  const router = useRouter();
  const [state, actions] = useOnboarding();

  function handleGoToDashboard() {
    router.push("/");
  }

  const showNav = state.step !== "presets" && state.step !== "done";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      {showNav && (
        <div className="mb-8 space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {STEP_LABELS[state.step]} — Step {state.stepIndex + 1} of {state.totalSteps}
            </span>
            <span>{Math.round(state.progress)}%</span>
          </div>
          <Progress value={state.progress} />
        </div>
      )}

      {state.step === "presets" && (
        <StepPresets presets={presetData} onSelect={actions.selectPreset} />
      )}

      {state.step === "channels" && (
        <StepChannels selected={state.selectedChannels} onToggle={actions.toggleChannel} />
      )}

      {state.step === "providers" && (
        <StepProviders selected={state.selectedProviders} onToggle={actions.toggleProvider} />
      )}

      {state.step === "plugins" && (
        <StepPlugins selected={state.selectedPlugins} onToggle={actions.togglePlugin} />
      )}

      {state.step === "keys" && (
        <StepKeys
          fields={state.configFields}
          values={state.keyValues}
          errors={state.keyErrors}
          validating={state.keyValidating}
          onChange={actions.setKeyValue}
          onValidate={actions.validateKey}
        />
      )}

      {state.step === "deploy" && (
        <StepDeploy status={state.deployStatus} onDeploy={actions.deploy} />
      )}

      {state.step === "done" && (
        <StepDone onGoToDashboard={handleGoToDashboard} onCreateAnother={actions.reset} />
      )}

      {showNav && state.step !== "deploy" && state.step !== "done" && (
        <div className="mt-8 flex justify-between">
          <Button variant="ghost" onClick={actions.back}>
            Back
          </Button>
          <Button onClick={actions.next} disabled={!actions.canAdvance()}>
            {state.step === "keys" ? "Review & Deploy" : "Continue"}
          </Button>
        </div>
      )}

      {state.step === "deploy" && state.deployStatus === "done" && (
        <div className="mt-8 flex justify-center">
          <Button onClick={actions.next}>Continue</Button>
        </div>
      )}
    </div>
  );
}
