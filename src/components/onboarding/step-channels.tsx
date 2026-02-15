"use client";

import { motion } from "framer-motion";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePluginRegistry } from "@/hooks/use-plugin-registry";
import { cn } from "@/lib/utils";

interface StepChannelsProps {
  selected: string[];
  onToggle: (id: string) => void;
  stepNumber?: string;
  stepCode?: string;
}

export function StepChannels({
  selected,
  onToggle,
  stepNumber = "02",
  stepCode = "CHANNELS",
}: StepChannelsProps) {
  const { channels: channelPlugins } = usePluginRegistry();

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div
          className="inline-block font-mono text-xs tracking-[0.3em] text-terminal uppercase"
          aria-hidden="true"
        >
          STEP {stepNumber} {"//"} {stepCode}
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Pick your channels</h2>
        <p className="mt-2 text-muted-foreground">
          Select one or more messaging platforms to connect.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {channelPlugins.map((channel) => {
          const isSelected = selected.includes(channel.id);
          return (
            <button
              key={channel.id}
              type="button"
              className="text-left"
              onClick={() => onToggle(channel.id)}
            >
              <Card
                className={cn(
                  "h-full cursor-pointer transition-all relative",
                  isSelected
                    ? "border-terminal bg-terminal/5 shadow-[0_0_12px_rgba(0,255,65,0.2)]"
                    : "border-border/50 hover:border-terminal/40 hover:shadow-[0_0_8px_rgba(0,255,65,0.15)]",
                )}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
                      style={{ backgroundColor: channel.color }}
                    >
                      {channel.name[0]}
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm">{channel.name}</CardTitle>
                      <CardDescription className="line-clamp-2 text-xs">
                        {channel.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                {isSelected && (
                  <motion.div
                    className="absolute top-2 right-2"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  >
                    <div
                      className="flex h-5 w-5 items-center justify-center rounded-full bg-terminal/20 text-terminal"
                      aria-hidden="true"
                    >
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                        role="img"
                        aria-label="Selected"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </motion.div>
                )}
              </Card>
            </button>
          );
        })}
      </div>
      {selected.length === 0 && (
        <p className="text-center font-mono text-xs tracking-wider text-terminal/40 mt-4">
          AWAITING CHANNEL DESIGNATION
        </p>
      )}
    </div>
  );
}
