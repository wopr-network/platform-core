"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { channelPlugins, superpowers } from "@/lib/onboarding-data";
import { cn } from "@/lib/utils";
import { NuclearLaunchModal } from "./nuclear-launch-modal";
import type { DeployStatus, ProviderMode } from "./use-onboarding";

interface StepLaunchProps {
  woprName: string;
  selectedChannels: string[];
  selectedSuperpowers: string[];
  providerMode: ProviderMode;
  creditBalance: string;
  deployStatus: DeployStatus;
  onDeploy: () => void;
  onGoToDashboard: () => void;
}

const DEPLOY_STAGES: {
  status: DeployStatus;
  label: string;
  description: string;
}[] = [
  { status: "provisioning", label: "PROVISIONING", description: "Allocating instance..." },
  { status: "configuring", label: "CONFIGURING", description: "Applying configuration..." },
  { status: "starting", label: "STARTING", description: "Launching your WOPR Bot..." },
  { status: "health-check", label: "HEALTH CHECK", description: "Verifying systems..." },
  { status: "done", label: "ONLINE", description: "All systems operational." },
];

function getStageIndex(status: DeployStatus): number {
  return DEPLOY_STAGES.findIndex((s) => s.status === status);
}

export function StepLaunch({
  woprName,
  selectedChannels,
  selectedSuperpowers,
  providerMode,
  creditBalance,
  deployStatus,
  onDeploy,
  onGoToDashboard,
}: StepLaunchProps) {
  const [showModal, setShowModal] = useState(false);
  const currentIndex = getStageIndex(deployStatus);
  const progressValue =
    deployStatus === "idle" || deployStatus === "error"
      ? 0
      : ((currentIndex + 1) / DEPLOY_STAGES.length) * 100;

  const handleLaunchClick = useCallback(() => {
    setShowModal(true);
  }, []);

  const handleConfirm = useCallback(() => {
    setShowModal(false);
    onDeploy();
  }, [onDeploy]);

  const handleCancel = useCallback(() => {
    setShowModal(false);
  }, []);

  const isDone = deployStatus === "done";
  const isDeploying =
    deployStatus !== "idle" && deployStatus !== "done" && deployStatus !== "error";

  return (
    <>
      <NuclearLaunchModal open={showModal} onConfirm={handleConfirm} onCancel={handleCancel} />

      <div className="space-y-6">
        {/* Pre-deploy / deploying header */}
        {!isDone && (
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight">
              {deployStatus === "idle"
                ? "Ready to launch"
                : deployStatus === "error"
                  ? "Launch failed"
                  : "Launching..."}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {deployStatus === "idle"
                ? `"${woprName}" is configured and ready to go.`
                : deployStatus === "error"
                  ? "Something went wrong. Try again."
                  : "Setting up your WOPR Bot..."}
            </p>
          </div>
        )}

        {/* Launch button */}
        {(deployStatus === "idle" || deployStatus === "error") && (
          <div className="flex justify-center">
            <Button
              size="lg"
              variant="terminal"
              className="px-12 text-lg"
              onClick={deployStatus === "error" ? onDeploy : handleLaunchClick}
            >
              {deployStatus === "error" ? "Retry Launch" : "Launch WOPR Bot"}
            </Button>
          </div>
        )}

        {/* Deploy terminal */}
        {isDeploying && (
          <div className="space-y-4">
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-terminal"
                initial={{ width: "0%" }}
                animate={{ width: `${progressValue}%` }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
              />
            </div>
            <div className="overflow-hidden rounded-md border border-border bg-black/50 font-mono text-sm">
              <div className="flex items-center gap-2 border-b border-border/50 px-3 py-1.5 text-xs text-muted-foreground">
                <span className="inline-block h-2 w-2 rounded-full bg-terminal" />
                <span>WOPR LAUNCH TERMINAL</span>
              </div>
              <div className="space-y-2 p-3">
                <AnimatePresence mode="popLayout">
                  {DEPLOY_STAGES.map((stage, i) => {
                    const isCurrent = stage.status === deployStatus;
                    const isDoneStage = currentIndex > i;
                    const isPending = currentIndex < i;
                    if (isPending) return null;
                    return (
                      <motion.div
                        key={stage.status}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.05 }}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex h-4 w-4 items-center justify-center rounded-sm text-[10px]",
                              isDoneStage && "bg-terminal/20 text-terminal",
                              isCurrent && "bg-amber-500/20 text-amber-500",
                            )}
                          >
                            {isDoneStage ? "\u2713" : isCurrent ? "\u25B6" : ""}
                          </span>
                          <span
                            className={cn(
                              "text-xs font-bold tracking-wider",
                              isDoneStage && "text-terminal/70",
                              isCurrent && "text-amber-500",
                            )}
                          >
                            {stage.label}
                          </span>
                          <span
                            className={cn(
                              "text-xs",
                              isDoneStage ? "text-muted-foreground" : "text-amber-500",
                            )}
                          >
                            {stage.description}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}

        {/* Success screen */}
        {isDone && (
          <LaunchSuccess
            woprName={woprName}
            selectedChannels={selectedChannels}
            selectedSuperpowers={selectedSuperpowers}
            providerMode={providerMode}
            creditBalance={creditBalance}
            onGoToDashboard={onGoToDashboard}
          />
        )}
      </div>
    </>
  );
}

function LaunchSuccess({
  woprName,
  selectedChannels,
  selectedSuperpowers,
  providerMode,
  creditBalance,
  onGoToDashboard,
}: {
  woprName: string;
  selectedChannels: string[];
  selectedSuperpowers: string[];
  providerMode: ProviderMode;
  creditBalance: string;
  onGoToDashboard: () => void;
}) {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 600);
    return () => clearTimeout(timer);
  }, []);

  const channels = channelPlugins.filter((c) => selectedChannels.includes(c.id));
  const powers = superpowers.filter((sp) => selectedSuperpowers.includes(sp.id));

  return (
    <div className="space-y-6 text-center">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, type: "spring", bounce: 0.4 }}
        className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-terminal bg-terminal/10"
      >
        <svg
          className="h-10 w-10 text-terminal"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          role="img"
          aria-label="Launch complete"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </motion.div>

      <div>
        <div className="mb-2 inline-block rounded-sm border border-terminal/30 bg-terminal/10 px-3 py-1 text-xs font-bold tracking-widest text-terminal">
          LIVE
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Your WOPR Bot is live!</h2>
        <p className="mt-1 text-muted-foreground">"{woprName}" is running.</p>
      </div>

      {showContent && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mx-auto max-w-sm space-y-3 text-left"
        >
          {channels.length > 0 && (
            <div className="rounded-lg border p-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Channels
              </p>
              {channels.map((c) => (
                <p key={c.id} className="text-sm">
                  {c.name} <span className="text-xs text-terminal">(connected)</span>
                </p>
              ))}
            </div>
          )}
          {powers.length > 0 && (
            <div className="rounded-lg border p-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Superpowers
              </p>
              {powers.map((sp) => (
                <p key={sp.id} className="text-sm">
                  {sp.name}{" "}
                  <span className="text-xs text-muted-foreground">
                    ({providerMode === "hosted" ? "hosted" : "your key"})
                  </span>
                </p>
              ))}
            </div>
          )}
          <div className="rounded-lg border border-terminal/20 bg-terminal/5 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Credit balance</span>
              <span className="text-sm font-bold text-terminal">{creditBalance}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Estimated runway: ~30 days</p>
          </div>
        </motion.div>
      )}

      {showContent && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="flex flex-col items-center gap-3"
        >
          <Button size="lg" variant="terminal" onClick={onGoToDashboard}>
            Open Dashboard
          </Button>
        </motion.div>
      )}
    </div>
  );
}
