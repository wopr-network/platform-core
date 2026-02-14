"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { presets as presetData } from "@/lib/onboarding-data";
import { StepBilling } from "./step-billing";
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
  billing: "Payment",
  deploy: "Deploy",
  done: "Done",
};

const stepTransition = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.25, ease: "easeInOut" as const },
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

      <AnimatePresence mode="wait">
        {state.step === "presets" && (
          <motion.div key="presets" {...stepTransition}>
            <StepPresets presets={presetData} onSelect={actions.selectPreset} />
          </motion.div>
        )}

        {state.step === "channels" && (
          <motion.div key="channels" {...stepTransition}>
            <StepChannels selected={state.selectedChannels} onToggle={actions.toggleChannel} />
          </motion.div>
        )}

        {state.step === "providers" && (
          <motion.div key="providers" {...stepTransition}>
            <StepProviders
              selected={state.selectedProviders}
              onToggle={actions.toggleProvider}
              providerMode={state.providerMode}
              onProviderModeChange={actions.setProviderMode}
            />
          </motion.div>
        )}

        {state.step === "plugins" && (
          <motion.div key="plugins" {...stepTransition}>
            <StepPlugins
              selected={state.selectedPlugins}
              onToggle={actions.togglePlugin}
              providerMode={state.providerMode}
            />
          </motion.div>
        )}

        {state.step === "keys" && (
          <motion.div key="keys" {...stepTransition}>
            <StepKeys
              fields={state.configFields}
              values={state.keyValues}
              errors={state.keyErrors}
              validating={state.keyValidating}
              onChange={actions.setKeyValue}
              onValidate={actions.validateKey}
            />
          </motion.div>
        )}

        {state.step === "billing" && (
          <motion.div key="billing" {...stepTransition}>
            <StepBilling
              billingEmail={state.billingEmail}
              cardComplete={state.billingCardComplete}
              onEmailChange={actions.setBillingEmail}
              onCardCompleteChange={actions.setBillingCardComplete}
            />
          </motion.div>
        )}

        {state.step === "deploy" && (
          <motion.div key="deploy" {...stepTransition}>
            <StepDeploy status={state.deployStatus} onDeploy={actions.deploy} />
          </motion.div>
        )}

        {state.step === "done" && (
          <motion.div key="done" {...stepTransition}>
            <StepDone onGoToDashboard={handleGoToDashboard} onCreateAnother={actions.reset} />
          </motion.div>
        )}
      </AnimatePresence>

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
