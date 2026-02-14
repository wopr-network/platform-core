"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NuclearLaunchModal } from "./nuclear-launch-modal";
import type { DeployStatus } from "./use-onboarding";

interface StepDeployProps {
  status: DeployStatus;
  onDeploy: () => void;
}

const DEPLOY_STAGES: {
  status: DeployStatus;
  label: string;
  description: string;
  color: "amber" | "red" | "green";
}[] = [
  {
    status: "provisioning",
    label: "PROVISIONING",
    description: "Allocating instance storage...",
    color: "amber",
  },
  {
    status: "configuring",
    label: "CONFIGURING",
    description: "Applying plugin configuration...",
    color: "amber",
  },
  {
    status: "starting",
    label: "STARTING",
    description: "Launching containers...",
    color: "red",
  },
  {
    status: "health-check",
    label: "HEALTH CHECK",
    description: "Verifying instance health...",
    color: "red",
  },
  {
    status: "done",
    label: "ONLINE",
    description: "All systems operational.",
    color: "green",
  },
];

function getStageIndex(status: DeployStatus): number {
  const idx = DEPLOY_STAGES.findIndex((s) => s.status === status);
  return idx === -1 ? -1 : idx;
}

const COLOR_MAP = {
  amber: {
    text: "text-amber-500",
    bg: "bg-amber-500",
    bgDim: "bg-amber-500/20",
    border: "border-amber-500/30",
    glow: "shadow-[0_0_12px_rgba(245,158,11,0.3)]",
  },
  red: {
    text: "text-red-500",
    bg: "bg-red-500",
    bgDim: "bg-red-500/20",
    border: "border-red-500/30",
    glow: "shadow-[0_0_12px_rgba(239,68,68,0.3)]",
  },
  green: {
    text: "text-terminal",
    bg: "bg-terminal",
    bgDim: "bg-terminal/20",
    border: "border-terminal/30",
    glow: "shadow-[0_0_12px_rgba(0,255,65,0.3)]",
  },
} as const;

function getCurrentColor(status: DeployStatus) {
  const stage = DEPLOY_STAGES.find((s) => s.status === status);
  return stage ? COLOR_MAP[stage.color] : COLOR_MAP.amber;
}

export function StepDeploy({ status, onDeploy }: StepDeployProps) {
  const [showModal, setShowModal] = useState(false);
  const currentIndex = getStageIndex(status);
  const progressValue = status === "idle" ? 0 : ((currentIndex + 1) / DEPLOY_STAGES.length) * 100;
  const colors = getCurrentColor(status);

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

  return (
    <>
      <NuclearLaunchModal open={showModal} onConfirm={handleConfirm} onCancel={handleCancel} />

      <div className="space-y-6">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="text-2xl font-bold tracking-tight">
            {status === "idle"
              ? "Ready to deploy"
              : status === "done"
                ? "Deployed"
                : status === "error"
                  ? "Deployment failed"
                  : "Deploying..."}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {status === "idle"
              ? "Everything is configured. Initiate launch sequence."
              : status === "done"
                ? "All containers online. Fleet is operational."
                : status === "error"
                  ? "Something went wrong. Please try again."
                  : "Setting up your instance..."}
          </p>
        </motion.div>

        {/* Launch / Retry button */}
        {(status === "idle" || status === "error") && (
          <motion.div
            className="flex justify-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Button
              size="lg"
              variant="terminal"
              className="px-12 text-lg"
              onClick={status === "error" ? onDeploy : handleLaunchClick}
            >
              {status === "error" ? "Retry Deploy" : "Deploy Fleet"}
            </Button>
          </motion.div>
        )}

        {/* Streaming terminal */}
        {status !== "idle" && status !== "error" && (
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Main progress bar */}
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                className={cn("h-full rounded-full", colors.bg)}
                initial={{ width: "0%" }}
                animate={{ width: `${progressValue}%` }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
              />
            </div>

            {/* Terminal output */}
            <div className="overflow-hidden rounded-md border border-border bg-black/50 font-mono text-sm">
              <div className="flex items-center gap-2 border-b border-border/50 px-3 py-1.5 text-xs text-muted-foreground">
                <span className={cn("inline-block h-2 w-2 rounded-full", colors.bg)} />
                <span>WOPR DEPLOY TERMINAL</span>
              </div>
              <div className="p-3 space-y-2">
                <AnimatePresence mode="popLayout">
                  {DEPLOY_STAGES.map((stage, i) => {
                    const isCurrent = stage.status === status;
                    const isDone = currentIndex > i;
                    const isPending = currentIndex < i;
                    const stageColors = COLOR_MAP[stage.color];

                    if (isPending) return null;

                    return (
                      <motion.div
                        key={stage.status}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.05 }}
                        className="space-y-1"
                      >
                        <div className="flex items-center gap-2">
                          {/* Status indicator */}
                          <span
                            className={cn(
                              "inline-flex h-4 w-4 items-center justify-center rounded-sm text-[10px]",
                              isDone && "bg-terminal/20 text-terminal",
                              isCurrent && cn(stageColors.bgDim, stageColors.text),
                            )}
                          >
                            {isDone ? "\u2713" : isCurrent ? "\u25B6" : ""}
                          </span>
                          <span
                            className={cn(
                              "text-xs font-bold tracking-wider",
                              isDone && "text-terminal/70",
                              isCurrent && stageColors.text,
                            )}
                          >
                            {stage.label}
                          </span>
                          {isCurrent && (
                            <motion.span
                              className={cn("text-xs", stageColors.text)}
                              animate={{ opacity: [1, 0.4, 1] }}
                              transition={{
                                repeat: Number.POSITIVE_INFINITY,
                                duration: 1.5,
                              }}
                            >
                              {stage.description}
                            </motion.span>
                          )}
                          {isDone && (
                            <span className="text-xs text-muted-foreground">
                              {stage.description}
                            </span>
                          )}
                        </div>

                        {/* Per-stage progress bar */}
                        {isCurrent && (
                          <div className="ml-6 h-1 w-48 overflow-hidden rounded-full bg-muted">
                            <motion.div
                              className={cn("h-full rounded-full", stageColors.bg)}
                              animate={{ width: ["0%", "60%", "80%", "95%"] }}
                              transition={{
                                duration: 1.2,
                                ease: "easeOut",
                              }}
                            />
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </>
  );
}
