"use client";

import { motion } from "framer-motion";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type OnboardingConfigField, usePluginRegistry } from "@/hooks/use-plugin-registry";
import { cn } from "@/lib/utils";

type ChannelValidationStatus = "idle" | "validating" | "valid" | "invalid";

interface StepConnectProps {
  selectedChannels: string[];
  channelKeyValues: Record<string, string>;
  channelKeyErrors: Record<string, string | null>;
  channelValidationStatus: Record<string, ChannelValidationStatus>;
  channelValidationErrors?: Record<string, string | null>;
  onChannelKeyChange: (key: string, value: string) => void;
  onValidateChannelKey: (key: string) => void;
  onVerifyChannel: (channelId: string) => void;
  stepNumber?: string;
  stepCode?: string;
}

export function StepConnect({
  selectedChannels,
  channelKeyValues,
  channelKeyErrors,
  channelValidationStatus,
  channelValidationErrors,
  onChannelKeyChange,
  onValidateChannelKey,
  onVerifyChannel,
  stepNumber = "03",
  stepCode = "CONNECT",
}: StepConnectProps) {
  const { channels: channelPlugins } = usePluginRegistry();
  const channels = channelPlugins.filter((c) => selectedChannels.includes(c.id));

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div
          className="inline-block font-mono text-xs tracking-[0.3em] text-terminal uppercase"
          aria-hidden="true"
        >
          STEP {stepNumber} {"//"} {stepCode}
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Connect your channels</h2>
        <p className="mt-2 text-muted-foreground">
          Paste the tokens or credentials for each channel.
        </p>
      </div>

      <div className="space-y-6">
        {channels.map((channel) => (
          <div key={channel.id} className="space-y-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
                style={{ backgroundColor: channel.color }}
              >
                {channel.name[0]}
              </div>
              <h3 className="text-sm font-semibold">{channel.name}</h3>
            </div>
            {channel.configFields.map((field) => (
              <ConnectField
                key={field.key}
                field={field}
                value={channelKeyValues[field.key] || ""}
                error={channelKeyErrors[field.key] ?? null}
                onChange={onChannelKeyChange}
                onValidate={onValidateChannelKey}
              />
            ))}
            {/* Verify button */}
            <div className="flex items-center gap-3 mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="font-mono text-xs"
                disabled={
                  channelValidationStatus[channel.id] === "validating" ||
                  channel.configFields.some((f) => {
                    const value = channelKeyValues[f.key] || "";
                    return !value.trim();
                  })
                }
                onClick={() => onVerifyChannel(channel.id)}
              >
                {channelValidationStatus[channel.id] === "validating"
                  ? "Verifying..."
                  : channelValidationStatus[channel.id] === "valid"
                    ? "Verified"
                    : "Verify"}
              </Button>
              {channelValidationStatus[channel.id] === "valid" && (
                <span className="text-xs text-emerald-500 font-mono">VERIFIED</span>
              )}
              {channelValidationStatus[channel.id] === "invalid" && (
                <span className="text-xs text-destructive font-mono">
                  {channelValidationErrors?.[channel.id] || "Verification failed"}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {channels.length === 0 && (
        <div className="rounded-lg border border-dashed border-terminal/20 p-8 text-center">
          <p className="font-mono text-xs tracking-wider text-terminal/40">
            NO CHANNELS DESIGNATED — RETURN TO PREVIOUS STEP
          </p>
        </div>
      )}
    </div>
  );
}

function ConnectField({
  field,
  value,
  error,
  onChange,
  onValidate,
}: {
  field: OnboardingConfigField;
  value: string;
  error: string | null;
  onChange: (key: string, value: string) => void;
  onValidate: (key: string) => void;
}) {
  const [showSecret, setShowSecret] = useState(false);

  const handleBlur = useCallback(() => {
    if (value.trim()) {
      onValidate(field.key);
    }
  }, [field.key, value, onValidate]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={field.key}>{field.label}</Label>
        {error && (
          <motion.span
            className="text-xs text-destructive"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {error}
          </motion.span>
        )}
      </div>
      <motion.div
        className="flex gap-2"
        animate={error ? { x: [0, -4, 4, -4, 0] } : undefined}
        transition={error ? { duration: 0.3 } : undefined}
      >
        <Input
          id={field.key}
          type={field.secret && !showSecret ? "password" : "text"}
          placeholder={field.placeholder}
          value={value}
          onChange={(e) => onChange(field.key, e.target.value)}
          onBlur={handleBlur}
          className={cn(
            "bg-black/50 border-terminal/30 font-mono text-sm placeholder:text-terminal/20",
            "focus-visible:border-terminal focus-visible:ring-terminal/30",
            error && "border-destructive ring-destructive/20",
          )}
          aria-invalid={!!error}
        />
        {field.secret && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 font-mono text-xs text-terminal/60 hover:text-terminal"
            onClick={() => setShowSecret(!showSecret)}
          >
            {showSecret ? "[HIDE]" : "[SHOW]"}
          </Button>
        )}
      </motion.div>
      {field.helpText && (
        <p className="text-xs text-muted-foreground">
          {field.helpText}
          {field.helpUrl && (
            <>
              {" "}
              <a
                href={field.helpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                Open portal
              </a>
            </>
          )}
        </p>
      )}
    </div>
  );
}
