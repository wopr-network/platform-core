"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StepChannels } from "./step-channels";
import { StepConnect } from "./step-connect";
import { StepLaunch } from "./step-launch";
import { StepName } from "./step-name";
import { StepPowerSource } from "./step-power-source";
import { StepSuperpowers } from "./step-superpowers";
import { useOnboarding } from "./use-onboarding";

const STEP_LABELS: Record<string, string> = {
  name: "Name Your WOPR Bot",
  channels: "Channels",
  connect: "Connect",
  superpowers: "Superpowers",
  "power-source": "Power Source",
  launch: "Launch",
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

  const showBackNext =
    state.step !== "launch" || (state.step === "launch" && state.deployStatus === "idle");

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      {/* Progress bar */}
      <div className="mb-8 space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {STEP_LABELS[state.step]} -- Step {state.stepIndex + 1} of {state.totalSteps}
          </span>
          <span>{Math.round(state.progress)}%</span>
        </div>
        <Progress value={state.progress} />
      </div>

      <AnimatePresence mode="wait">
        {state.step === "name" && (
          <motion.div key="name" {...stepTransition}>
            <StepName
              name={state.woprName}
              personalityId={state.personalityId}
              customPersonality={state.customPersonality}
              onNameChange={actions.setWoprName}
              onPersonalityChange={actions.setPersonalityId}
              onCustomPersonalityChange={actions.setCustomPersonality}
            />
          </motion.div>
        )}

        {state.step === "channels" && (
          <motion.div key="channels" {...stepTransition}>
            <StepChannels selected={state.selectedChannels} onToggle={actions.toggleChannel} />
          </motion.div>
        )}

        {state.step === "connect" && (
          <motion.div key="connect" {...stepTransition}>
            <StepConnect
              selectedChannels={state.selectedChannels}
              channelKeyValues={state.channelKeyValues}
              channelKeyErrors={state.channelKeyErrors}
              onChannelKeyChange={actions.setChannelKeyValue}
              onValidateChannelKey={actions.validateChannelKey}
            />
          </motion.div>
        )}

        {state.step === "superpowers" && (
          <motion.div key="superpowers" {...stepTransition}>
            <StepSuperpowers
              selected={state.selectedSuperpowers}
              onToggle={actions.toggleSuperpower}
            />
          </motion.div>
        )}

        {state.step === "power-source" && (
          <motion.div key="power-source" {...stepTransition}>
            <StepPowerSource
              selectedSuperpowers={state.selectedSuperpowers}
              providerMode={state.providerMode}
              onProviderModeChange={actions.setProviderMode}
              creditBalance={state.creditBalance}
              byokKeyValues={state.byokKeyValues}
              byokKeyErrors={state.byokKeyErrors}
              onByokKeyChange={actions.setByokKeyValue}
              onValidateByokKey={actions.validateByokKey}
            />
          </motion.div>
        )}

        {state.step === "launch" && (
          <motion.div key="launch" {...stepTransition}>
            <StepLaunch
              woprName={state.woprName}
              selectedChannels={state.selectedChannels}
              selectedSuperpowers={state.selectedSuperpowers}
              providerMode={state.providerMode}
              creditBalance={state.creditBalance}
              deployStatus={state.deployStatus}
              onDeploy={actions.deploy}
              onGoToDashboard={handleGoToDashboard}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      {showBackNext && state.step !== "launch" && (
        <div className="mt-8 flex justify-between">
          <Button variant="ghost" onClick={actions.back} disabled={state.step === "name"}>
            Back
          </Button>
          <Button onClick={actions.next} disabled={!actions.canAdvance()}>
            Continue
          </Button>
        </div>
      )}
    </div>
  );
}
