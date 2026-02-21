"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { CapabilityMode, CapabilityName, CapabilitySetting, ProviderKey } from "@/lib/api";
import {
  listCapabilities,
  listProviderKeys,
  removeProviderKey,
  saveProviderKey,
  testCapabilityKey,
  testProviderKey,
  updateCapability,
  updateProviderModel,
} from "@/lib/api";
import { cn } from "@/lib/utils";

// --- Capability metadata ---

interface CapabilityMeta {
  label: string;
  description: string;
  pricing: string;
  hostedProvider: string;
}

const CAPABILITY_META: Record<CapabilityName, CapabilityMeta> = {
  transcription: {
    label: "Transcription",
    description: "Powered by Whisper. No setup needed.",
    pricing: "$0.006/min",
    hostedProvider: "Whisper",
  },
  "image-gen": {
    label: "Image Generation",
    description: "Powered by FLUX & Stable Diffusion.",
    pricing: "$0.05/image",
    hostedProvider: "FLUX",
  },
  "text-gen": {
    label: "Text Generation",
    description: "200+ models via OpenRouter.",
    pricing: "$0.002/1K tokens",
    hostedProvider: "OpenRouter",
  },
  embeddings: {
    label: "Embeddings",
    description: "High-quality vector embeddings.",
    pricing: "$0.0001/1K tokens",
    hostedProvider: "OpenAI",
  },
};

const CAPABILITY_ORDER: CapabilityName[] = ["transcription", "image-gen", "text-gen", "embeddings"];

// --- Helpers ---

function keyStatusVariant(status: CapabilitySetting["keyStatus"]) {
  if (status === "valid") return "default" as const;
  if (status === "invalid") return "destructive" as const;
  return "secondary" as const;
}

function providerKeyStatusVariant(status: ProviderKey["status"]) {
  if (status === "valid") return "default" as const;
  if (status === "invalid") return "destructive" as const;
  return "secondary" as const;
}

function formatLastChecked(lastChecked: string | null): string {
  if (!lastChecked) return "Never";
  const diff = Date.now() - new Date(lastChecked).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ago`;
}

// --- Main page ---

export default function ProvidersPage() {
  const [capabilities, setCapabilities] = useState<CapabilitySetting[]>([]);
  const [providers, setProviders] = useState<ProviderKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, "success" | "fail" | null>>({});
  const [testingCap, setTestingCap] = useState<CapabilityName | null>(null);
  const [testCapResult, setTestCapResult] = useState<
    Partial<Record<CapabilityName, "success" | "fail" | null>>
  >({});
  const [savingCap, setSavingCap] = useState<CapabilityName | null>(null);
  const [saveCapSuccess, setSaveCapSuccess] = useState<Partial<Record<CapabilityName, boolean>>>(
    {},
  );
  const [byokKeys, setByokKeys] = useState<Partial<Record<CapabilityName, string>>>({});
  const [billingGate, setBillingGate] = useState<CapabilityName | null>(null);
  const saveCapSuccessTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const testCapResultTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const testResultTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (saveCapSuccessTimer.current) clearTimeout(saveCapSuccessTimer.current);
      if (testCapResultTimer.current) clearTimeout(testCapResultTimer.current);
      if (testResultTimer.current) clearTimeout(testResultTimer.current);
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const [caps, provs] = await Promise.all([listCapabilities(), listProviderKeys()]);
    setCapabilities(caps);
    setProviders(provs);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleModeChange(capability: CapabilityName, mode: CapabilityMode) {
    if (mode === "hosted") {
      setBillingGate(capability);
      return;
    }
    setSavingCap(capability);
    const updated = await updateCapability(capability, { mode });
    setCapabilities((prev) => prev.map((c) => (c.capability === capability ? updated : c)));
    setSavingCap(null);
  }

  async function handleHostedConfirm(capability: CapabilityName) {
    setSavingCap(capability);
    setBillingGate(null);
    const updated = await updateCapability(capability, { mode: "hosted" });
    setCapabilities((prev) => prev.map((c) => (c.capability === capability ? updated : c)));
    setSavingCap(null);
  }

  async function handleSaveByokKey(capability: CapabilityName) {
    const key = byokKeys[capability];
    if (!key) return;
    setSavingCap(capability);
    const updated = await updateCapability(capability, { mode: "byok", key });
    setCapabilities((prev) => prev.map((c) => (c.capability === capability ? updated : c)));
    setByokKeys((prev) => ({ ...prev, [capability]: "" }));
    setSavingCap(null);
    setSaveCapSuccess((prev) => ({ ...prev, [capability]: true }));
    saveCapSuccessTimer.current = setTimeout(
      () => setSaveCapSuccess((prev) => ({ ...prev, [capability]: false })),
      2000,
    );
  }

  async function handleTestCapability(capability: CapabilityName) {
    setTestingCap(capability);
    setTestCapResult((prev) => ({ ...prev, [capability]: null }));
    try {
      await testCapabilityKey(capability);
      const caps = await listCapabilities();
      setCapabilities(caps);
      const updatedCap = caps.find((c) => c.capability === capability);
      setTestCapResult((prev) => ({
        ...prev,
        [capability]: updatedCap?.keyStatus === "valid" ? "success" : "fail",
      }));
    } catch {
      setTestCapResult((prev) => ({ ...prev, [capability]: "fail" }));
    }
    setTestingCap(null);
    testCapResultTimer.current = setTimeout(
      () => setTestCapResult((prev) => ({ ...prev, [capability]: null })),
      2000,
    );
  }

  async function handleTest(id: string) {
    setTesting(id);
    setTestResult((prev) => ({ ...prev, [id]: null }));
    try {
      const result = await testProviderKey(id);
      setTestResult((prev) => ({
        ...prev,
        [id]: result.valid ? "success" : "fail",
      }));
    } catch {
      setTestResult((prev) => ({ ...prev, [id]: "fail" }));
    }
    const provs = await listProviderKeys();
    setProviders(provs);
    setTesting(null);
    testResultTimer.current = setTimeout(
      () => setTestResult((prev) => ({ ...prev, [id]: null })),
      2000,
    );
  }

  async function handleRemove(id: string, providerName: string) {
    await removeProviderKey(id, providerName);
    setProviders((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleModelChange(id: string, model: string) {
    await updateProviderModel(id, model);
    setProviders((prev) => prev.map((p) => (p.id === id ? { ...p, defaultModel: model } : p)));
  }

  if (loading) {
    return (
      <div className="max-w-2xl space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-80" />
        </div>
        {Array.from({ length: 4 }, (_, n) => `sk-${n}`).map((skId) => (
          <div key={skId} className="rounded-sm border p-6 space-y-4">
            <Skeleton className="h-5 w-32" />
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      {/* Capability routing section */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Provider Settings</h1>
        <p className="text-sm text-muted-foreground">
          Choose WOPR Hosted or Bring Your Own Key for each capability. Changes take effect
          immediately.
        </p>
      </div>

      {CAPABILITY_ORDER.map((capName) => {
        const cap = capabilities.find((c) => c.capability === capName);
        const meta = CAPABILITY_META[capName];
        const mode = cap?.mode ?? "hosted";
        const isSaving = savingCap === capName;
        const isTesting = testingCap === capName;
        const byokKey = byokKeys[capName] ?? "";
        const capTestResult = testCapResult[capName];
        const isCapSaveSuccess = saveCapSuccess[capName] ?? false;

        return (
          <Card key={capName} data-testid={`capability-${capName}`}>
            <CardHeader>
              <CardTitle>{meta.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Hosted option */}
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-sm border p-3 transition-colors hover:bg-accent/50",
                  mode === "hosted" && "border-terminal/30 bg-terminal/5",
                )}
              >
                <input
                  type="radio"
                  name={`mode-${capName}`}
                  value="hosted"
                  checked={mode === "hosted"}
                  onChange={() => handleModeChange(capName, "hosted")}
                  disabled={isSaving}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">WOPR Hosted</span>
                    <Badge variant="outline">{meta.pricing}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{meta.description}</p>
                </div>
              </label>

              {/* BYOK option */}
              <label
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-sm border p-3 transition-colors hover:bg-accent/50",
                  mode === "byok" && "border-primary/30 bg-primary/5",
                )}
              >
                <input
                  type="radio"
                  name={`mode-${capName}`}
                  value="byok"
                  checked={mode === "byok"}
                  onChange={() => handleModeChange(capName, "byok")}
                  disabled={isSaving}
                  className="mt-1"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium">Bring Your Own Key</span>
                  {cap?.provider && (
                    <span className="ml-2 text-xs text-muted-foreground">({cap.provider})</span>
                  )}
                </div>
              </label>

              {/* BYOK key input with progressive disclosure */}
              {mode === "byok" && (
                <Collapsible defaultOpen={!!cap?.maskedKey}>
                  <CollapsibleTrigger className="ml-8 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                    <ChevronDownIcon className="size-3" />
                    {cap?.maskedKey ? "Manage key" : "Add your API key"}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-8 space-y-3 pt-2">
                      {cap?.maskedKey && (
                        <div className="flex items-center gap-2">
                          <code className="text-xs text-muted-foreground">{cap.maskedKey}</code>
                          {cap.keyStatus && (
                            <Badge variant={keyStatusVariant(cap.keyStatus)}>{cap.keyStatus}</Badge>
                          )}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Input
                          type="password"
                          placeholder={
                            cap?.maskedKey ? "Enter new key to replace" : "Enter your API key"
                          }
                          value={byokKey}
                          onChange={(e) =>
                            setByokKeys((prev) => ({ ...prev, [capName]: e.target.value }))
                          }
                          className="flex-1"
                          aria-label={`${meta.label} API key`}
                        />
                        <Button
                          variant="terminal"
                          size="sm"
                          onClick={() => handleSaveByokKey(capName)}
                          disabled={!byokKey || isSaving}
                        >
                          <AnimatePresence mode="wait">
                            {isCapSaveSuccess ? (
                              <motion.span
                                key="success"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="flex items-center gap-1"
                              >
                                <CheckIcon className="size-3" />
                                Saved
                              </motion.span>
                            ) : (
                              <motion.span
                                key="default"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                              >
                                {isSaving ? "Saving..." : "Save"}
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </Button>
                      </div>
                      {cap?.maskedKey && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTestCapability(capName)}
                          disabled={isTesting}
                        >
                          <AnimatePresence mode="wait">
                            {isTesting ? (
                              <motion.span
                                key="testing"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                              >
                                Testing...
                              </motion.span>
                            ) : capTestResult === "success" ? (
                              <motion.span
                                key="success"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex items-center gap-1 text-terminal"
                              >
                                <CheckIcon className="size-3" />
                                Valid
                              </motion.span>
                            ) : capTestResult === "fail" ? (
                              <motion.span
                                key="fail"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex items-center gap-1 text-destructive"
                              >
                                <XIcon className="size-3" />
                                Failed
                              </motion.span>
                            ) : (
                              <motion.span
                                key="idle"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                              >
                                Test Key
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </Button>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Billing gate dialog */}
      {billingGate && (
        <BillingGateDialog
          meta={CAPABILITY_META[billingGate]}
          onConfirm={() => handleHostedConfirm(billingGate)}
          onCancel={() => setBillingGate(null)}
        />
      )}

      {/* Existing provider keys section */}
      <div className="border-t pt-8">
        <h2 className="text-xl font-bold tracking-tight">Provider Keys</h2>
        <p className="text-sm text-muted-foreground">
          Manage your BYOK API keys directly. Keys are stored securely and never leave your
          environment.
        </p>
      </div>

      {providers.map((provider) => (
        <Card key={provider.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "size-2 rounded-full",
                    provider.status === "valid" && "bg-terminal",
                    provider.status === "invalid" && "bg-destructive",
                    provider.status === "unchecked" && provider.maskedKey && "bg-amber-500",
                    provider.status === "unchecked" && !provider.maskedKey && "bg-muted-foreground",
                  )}
                />
                <CardTitle>{provider.provider}</CardTitle>
              </div>
              <Badge variant={providerKeyStatusVariant(provider.status)}>
                {provider.status === "unchecked" && !provider.maskedKey
                  ? "Not configured"
                  : provider.status}
              </Badge>
            </div>
            {provider.maskedKey && (
              <CardDescription>
                Key: <code className="text-xs">{provider.maskedKey}</code> -- Last checked:{" "}
                {formatLastChecked(provider.lastChecked)}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {provider.maskedKey ? (
              <>
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`model-${provider.id}`}>Default model</Label>
                  <Select
                    value={provider.defaultModel ?? ""}
                    onValueChange={(v) => handleModelChange(provider.id, v)}
                  >
                    <SelectTrigger id={`model-${provider.id}`} className="w-full">
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      {provider.models.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTest(provider.id)}
                    disabled={testing === provider.id}
                  >
                    <AnimatePresence mode="wait">
                      {testing === provider.id ? (
                        <motion.span
                          key="testing"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          Testing...
                        </motion.span>
                      ) : testResult[provider.id] === "success" ? (
                        <motion.span
                          key="success"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex items-center gap-1 text-terminal"
                        >
                          <CheckIcon className="size-3" />
                          Valid
                        </motion.span>
                      ) : testResult[provider.id] === "fail" ? (
                        <motion.span
                          key="fail"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex items-center gap-1 text-destructive"
                        >
                          <XIcon className="size-3" />
                          Failed
                        </motion.span>
                      ) : (
                        <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                          Test connection
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Button>
                  <RotateKeyDialog provider={provider} onSaved={load} />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleRemove(provider.id, provider.provider)}
                  >
                    Remove
                  </Button>
                </div>
              </>
            ) : (
              <AddKeyDialog provider={provider} onSaved={load} />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// --- Billing gate dialog ---

function BillingGateDialog({
  meta,
  onConfirm,
  onCancel,
}: {
  meta: CapabilityMeta;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enable WOPR Hosted for {meta.label}?</DialogTitle>
          <DialogDescription>
            WOPR Hosted for {meta.label.toLowerCase()} costs {meta.pricing}. This will be billed to
            your payment method on file. If you don&apos;t have a payment method, you&apos;ll need
            to add one in billing settings first.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>Enable Hosted</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Existing dialogs (preserved from WOP-293) ---

function AddKeyDialog({ provider, onSaved }: { provider: ProviderKey; onSaved: () => void }) {
  const [key, setKey] = useState("");
  const [open, setOpen] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await saveProviderKey(provider.provider, key);
    setKey("");
    setOpen(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add key</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add {provider.provider} API Key</DialogTitle>
          <DialogDescription>
            Paste your {provider.provider} API key below. It will be validated before saving.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-provider-key">API Key</Label>
            <Input
              id="new-provider-key"
              type="password"
              placeholder="Enter your API key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit">Save key</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RotateKeyDialog({ provider, onSaved }: { provider: ProviderKey; onSaved: () => void }) {
  const [key, setKey] = useState("");
  const [open, setOpen] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await saveProviderKey(provider.provider, key);
    setKey("");
    setOpen(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Rotate key
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rotate {provider.provider} Key</DialogTitle>
          <DialogDescription>
            Paste your new API key. The old key will be replaced after validation.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="rotate-provider-key">New API Key</Label>
            <Input
              id="rotate-provider-key"
              type="password"
              placeholder="Enter your new API key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit">Replace key</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
