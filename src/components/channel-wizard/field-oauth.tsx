"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { ConfigField } from "@/lib/mock-manifests";

interface FieldOAuthProps {
  field: ConfigField;
  value: string;
  onChange: (key: string, value: string) => void;
  error?: string;
}

export function FieldOAuth({ field, value, onChange, error }: FieldOAuthProps) {
  const [status, setStatus] = useState<"idle" | "authorizing" | "authorized">(
    value ? "authorized" : "idle",
  );

  function handleAuthorize() {
    setStatus("authorizing");
    // Mock OAuth flow: simulate a popup + callback
    setTimeout(() => {
      const mockToken = `xoxb-mock-oauth-token-${Date.now()}`;
      onChange(field.key, mockToken);
      setStatus("authorized");
    }, 1500);
  }

  return (
    <div className="space-y-2">
      <Label>{field.label}</Label>
      {field.description && <p className="text-sm text-muted-foreground">{field.description}</p>}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant={status === "authorized" ? "secondary" : "default"}
          onClick={handleAuthorize}
          disabled={status === "authorizing"}
        >
          {status === "idle" && "Authorize"}
          {status === "authorizing" && "Authorizing..."}
          {status === "authorized" && "Re-authorize"}
        </Button>
        {status === "authorized" && <span className="text-sm text-emerald-500">Connected</span>}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
