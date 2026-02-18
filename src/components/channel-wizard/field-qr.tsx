"use client";

import { Label } from "@/components/ui/label";
import type { ConfigField } from "@/lib/mock-manifests";

interface FieldQRProps {
  field: ConfigField;
  value: string;
  onChange: (key: string, value: string) => void;
  error?: string;
}

export function FieldQR({ field, value, onChange, error }: FieldQRProps) {
  function handleSimulateScan() {
    onChange(field.key, `qr-scanned-${Date.now()}`);
  }

  return (
    <div className="space-y-2">
      <Label>{field.label}</Label>
      {field.description && <p className="text-sm text-muted-foreground">{field.description}</p>}
      <div className="flex flex-col items-center gap-4 rounded-sm border border-dashed p-8">
        <div className="flex h-32 w-32 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
          QR Code Placeholder
        </div>
        <p className="text-sm text-muted-foreground">Scan this code with your mobile device</p>
        <button
          type="button"
          onClick={handleSimulateScan}
          className="text-sm text-primary underline underline-offset-4 hover:text-primary/80"
        >
          {value ? "Scanned" : "Simulate Scan"}
        </button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
