"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { StepBilling } from "./step-billing";
import { StepChannels } from "./step-channels";
import { StepConnect } from "./step-connect";
import { StepLaunch } from "./step-launch";
import { StepName } from "./step-name";
import { StepPowerSource } from "./step-power-source";
import { StepSuperpowers } from "./step-superpowers";
import { useOnboarding, type WizardMode } from "./use-onboarding";

const STEP_LABELS: Record<string, string> = {
  name: "Name Your WOPR Bot",
  channels: "Channels",
  connect: "Connect",
  superpowers: "Superpowers",
  "power-source": "Power Source",
  billing: "Billing",
  launch: "Launch",
};

const STEP_META: Record<string, { number: string; code: string }> = {
  name: { number: "01", code: "DESIGNATION" },
  channels: { number: "02", code: "CHANNELS" },
  connect: { number: "03", code: "CONNECT" },
  superpowers: { number: "04", code: "SUPERPOWERS" },
  "power-source": { number: "05", code: "POWER SOURCE" },
  billing: { number: "06", code: "BILLING" },
  launch: { number: "07", code: "LAUNCH" },
};

const stepTransition = {
  initial: { opacity: 0, x: 20 },
  animate: {
    opacity: [0, 1, 0.95, 1],
    x: 0,
  },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.3, ease: "easeInOut" as const },
};

interface OnboardingWizardProps {
  mode?: WizardMode;
}

export function OnboardingWizard({ mode = "onboarding" }: OnboardingWizardProps) {
  const router = useRouter();
  const [state, actions] = useOnboarding(mode);

  function handleGoToDashboard() {
    router.push("/");
  }

  const showBackNext =
    state.step !== "launch" || (state.step === "launch" && state.deployStatus === "idle");

  const currentMeta = STEP_META[state.step];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      {/* Terminal progress bar */}
      <div className="mb-8 space-y-3">
        {/* Terminal progress header */}
        <div className="flex items-center justify-between font-mono text-xs">
          <span className="text-terminal tracking-wider uppercase">MISSION BRIEFING</span>
          <span className="text-terminal tabular-nums">[{Math.round(state.progress)}%]</span>
        </div>

        {/* Terminal progress bar */}
        <div className="relative h-2 w-full overflow-hidden rounded-none bg-black border border-terminal/20">
          <motion.div
            className="h-full bg-terminal"
            animate={{ width: `${state.progress}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </div>

        {/* Step tick marks */}
        <div className="flex justify-between">
          {Object.entries(STEP_LABELS).map(([key, label], i) => {
            const isActive = i <= state.stepIndex;
            return (
              <div key={key} className="flex flex-col items-center">
                <div
                  className={cn(
                    "h-1.5 w-1.5 rounded-full mb-1",
                    isActive ? "bg-terminal" : "bg-terminal/20",
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] font-mono tracking-wider hidden sm:block",
                    isActive ? "text-terminal/80" : "text-muted-foreground/40",
                  )}
                >
                  {label.split(" ")[0].toUpperCase()}
                </span>
              </div>
            );
          })}
        </div>
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
              mode={state.mode}
              existingBots={state.existingBots}
              cloneFromBotId={state.cloneFromBotId}
              onCloneFromBot={actions.setCloneFromBot}
              stepNumber={currentMeta.number}
              stepCode={currentMeta.code}
            />
          </motion.div>
        )}

        {state.step === "channels" && (
          <motion.div key="channels" {...stepTransition}>
            <StepChannels
              selected={state.selectedChannels}
              onToggle={actions.toggleChannel}
              stepNumber={currentMeta.number}
              stepCode={currentMeta.code}
            />
          </motion.div>
        )}

        {state.step === "connect" && (
          <motion.div key="connect" {...stepTransition}>
            <StepConnect
              selectedChannels={state.selectedChannels}
              channelKeyValues={state.channelKeyValues}
              channelKeyErrors={state.channelKeyErrors}
              channelValidationStatus={state.channelValidationStatus}
              channelValidationErrors={state.channelValidationErrors}
              onChannelKeyChange={actions.setChannelKeyValue}
              onValidateChannelKey={actions.validateChannelKey}
              onVerifyChannel={actions.verifyChannel}
              stepNumber={currentMeta.number}
              stepCode={currentMeta.code}
            />
          </motion.div>
        )}

        {state.step === "superpowers" && (
          <motion.div key="superpowers" {...stepTransition}>
            <StepSuperpowers
              selected={state.selectedSuperpowers}
              onToggle={actions.toggleSuperpower}
              mode={state.mode}
              existingBots={state.existingBots}
              stepNumber={currentMeta.number}
              stepCode={currentMeta.code}
            />
          </motion.div>
        )}

        {state.step === "power-source" && (
          <motion.div key="power-source" {...stepTransition}>
            <StepPowerSource
              selectedSuperpowers={state.selectedSuperpowers}
              providerMode={state.providerMode}
              onProviderModeChange={actions.setProviderMode}
              byokAiProvider={state.byokAiProvider}
              onByokAiProviderChange={actions.setByokAiProvider}
              creditBalance={state.creditBalance}
              byokKeyValues={state.byokKeyValues}
              byokKeyErrors={state.byokKeyErrors}
              onByokKeyChange={actions.setByokKeyValue}
              onValidateByokKey={actions.validateByokKey}
              mode={state.mode}
              stepNumber={currentMeta.number}
              stepCode={currentMeta.code}
            />
          </motion.div>
        )}

        {state.step === "billing" && (
          <motion.div key="billing" {...stepTransition}>
            <StepBilling
              onPaymentMethodReady={actions.setPaymentMethodReady}
              stepNumber={currentMeta.number}
              stepCode={currentMeta.code}
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
              mode={state.mode}
              stepNumber={currentMeta.number}
              stepCode={currentMeta.code}
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
          <Button
            variant="terminal"
            onClick={actions.next}
            disabled={!actions.canAdvance()}
            className={cn(
              actions.canAdvance() && "animate-[terminal-pulse_2s_ease-in-out_infinite]",
            )}
          >
            Continue
          </Button>
        </div>
      )}
    </div>
  );
}
