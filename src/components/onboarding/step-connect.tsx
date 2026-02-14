"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type OnboardingConfigField, usePluginRegistry } from "@/hooks/use-plugin-registry";
import { cn } from "@/lib/utils";

interface StepConnectProps {
  selectedChannels: string[];
  channelKeyValues: Record<string, string>;
  channelKeyErrors: Record<string, string | null>;
  onChannelKeyChange: (key: string, value: string) => void;
  onValidateChannelKey: (key: string) => void;
}

export function StepConnect({
  selectedChannels,
  channelKeyValues,
  channelKeyErrors,
  onChannelKeyChange,
  onValidateChannelKey,
}: StepConnectProps) {
  const { channels: channelPlugins } = usePluginRegistry();
  const channels = channelPlugins.filter((c) => selectedChannels.includes(c.id));

  return (
    <div className="space-y-6">
      <div className="text-center">
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
          </div>
        ))}
      </div>

      {channels.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No channels selected. Go back to add one.
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
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>
      <div className="flex gap-2">
        <Input
          id={field.key}
          type={field.secret && !showSecret ? "password" : "text"}
          placeholder={field.placeholder}
          value={value}
          onChange={(e) => onChange(field.key, e.target.value)}
          onBlur={handleBlur}
          className={cn(error && "border-destructive")}
          aria-invalid={!!error}
        />
        {field.secret && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => setShowSecret(!showSecret)}
          >
            {showSecret ? "Hide" : "Show"}
          </Button>
        )}
      </div>
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
