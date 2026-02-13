"use client";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { DeployStatus } from "./use-onboarding";

interface StepDeployProps {
  status: DeployStatus;
  onDeploy: () => void;
}

const DEPLOY_STAGES: { status: DeployStatus; label: string; description: string }[] = [
  { status: "provisioning", label: "Provisioning", description: "Creating instance storage..." },
  { status: "configuring", label: "Configuring", description: "Applying plugin configuration..." },
  { status: "starting", label: "Starting", description: "Launching WOPR instance..." },
  { status: "health-check", label: "Health Check", description: "Verifying instance health..." },
  { status: "done", label: "Complete", description: "Your WOPR is running." },
];

function getStageIndex(status: DeployStatus): number {
  const idx = DEPLOY_STAGES.findIndex((s) => s.status === status);
  return idx === -1 ? -1 : idx;
}

export function StepDeploy({ status, onDeploy }: StepDeployProps) {
  const currentIndex = getStageIndex(status);
  const progressValue = status === "idle" ? 0 : ((currentIndex + 1) / DEPLOY_STAGES.length) * 100;

  return (
    <div className="space-y-6">
      <div className="text-center">
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
            ? "Everything is configured. Launch your WOPR instance."
            : status === "done"
              ? "Your WOPR instance is up and running."
              : status === "error"
                ? "Something went wrong. Please try again."
                : "Setting up your instance..."}
        </p>
      </div>

      {(status === "idle" || status === "error") && (
        <div className="flex justify-center">
          <Button size="lg" className="px-12 text-lg" onClick={onDeploy}>
            {status === "error" ? "Retry Deploy" : "Launch Your WOPR"}
          </Button>
        </div>
      )}

      {status !== "idle" && status !== "error" && (
        <div className="space-y-4">
          <Progress value={progressValue} />
          <div className="space-y-2">
            {DEPLOY_STAGES.map((stage, i) => {
              const isCurrent = stage.status === status;
              const isDone = currentIndex > i;
              const isPending = currentIndex < i;
              return (
                <div
                  key={stage.status}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm",
                    isCurrent && "bg-primary/10 font-medium",
                    isDone && "text-muted-foreground",
                    isPending && "text-muted-foreground/50",
                  )}
                >
                  <span className="w-5 text-center">{isDone ? "+" : isCurrent ? ">" : "-"}</span>
                  <span>{stage.label}</span>
                  {isCurrent && (
                    <span className="text-xs text-muted-foreground">{stage.description}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
