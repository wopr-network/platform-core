"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { usePluginRegistry } from "@/hooks/use-plugin-registry";
import type { InstanceTemplate } from "@/lib/api";
import { createInstance, listTemplates } from "@/lib/api";
import { cn } from "@/lib/utils";

export function CreateInstanceClient() {
  const { providerOptions, channelOptions, pluginOptions } = usePluginRegistry();
  const [templates, setTemplates] = useState<InstanceTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("anthropic");
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [selectedPlugins, setSelectedPlugins] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    const data = await listTemplates();
    setTemplates(data);
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  function handleTemplateSelect(templateId: string) {
    setSelectedTemplate(templateId);
    const tmpl = templates.find((t) => t.id === templateId);
    if (tmpl) {
      setSelectedPlugins(tmpl.defaultPlugins);
    }
  }

  function toggleChannel(ch: string) {
    setSelectedChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch],
    );
  }

  function togglePlugin(p: string) {
    setSelectedPlugins((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  async function handleSubmit() {
    if (!name.trim() || !selectedTemplate) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const tmpl = templates.find((t) => t.id === selectedTemplate);
      await createInstance({
        name: name.trim(),
        template: tmpl?.name ?? selectedTemplate,
        provider,
        channels: selectedChannels,
        plugins: selectedPlugins,
      });
      setCreated(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create instance");
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <h2 className="text-xl font-semibold">Instance created</h2>
        <p className="text-muted-foreground">
          Your instance &ldquo;{name}&rdquo; has been created successfully.
        </p>
        <Button asChild>
          <a href="/instances">Back to Instances</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create Instance</h1>
        <p className="text-sm text-muted-foreground">
          Choose a template and configure your new WOPR instance.
        </p>
      </div>

      {/* Step 1: Template */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium">Template</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((tmpl) => (
            <Card
              key={tmpl.id}
              className={cn(
                "cursor-pointer transition-colors hover:border-primary/50",
                selectedTemplate === tmpl.id && "border-primary bg-primary/5",
              )}
              onClick={() => handleTemplateSelect(tmpl.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleTemplateSelect(tmpl.id);
                }
              }}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{tmpl.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs">{tmpl.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Separator />

      {/* Step 2: Config */}
      <div className="space-y-4">
        <h2 className="text-sm font-medium">Configuration</h2>

        <div className="space-y-2">
          <label htmlFor="instance-name" className="text-sm text-muted-foreground">
            Instance Name
          </label>
          <Input
            id="instance-name"
            placeholder="my-instance"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="provider-select" className="text-sm text-muted-foreground">
            Provider
          </label>
          <Select value={provider} onValueChange={setProvider}>
            <SelectTrigger id="provider-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {providerOptions.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* Step 3: Channels */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium">Channels</h2>
        <div className="flex flex-wrap gap-2">
          {channelOptions.map((ch) => (
            <Button
              key={ch.value}
              variant={selectedChannels.includes(ch.value) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleChannel(ch.value)}
            >
              {ch.label}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Step 4: Plugins */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium">Plugins</h2>
        <div className="flex flex-wrap gap-2">
          {pluginOptions.map((p) => (
            <Button
              key={p.value}
              variant={selectedPlugins.includes(p.value) ? "default" : "outline"}
              size="sm"
              onClick={() => togglePlugin(p.value)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {submitError && (
        <div className="rounded-md border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-500">
          {submitError}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button variant="outline" asChild>
          <a href="/instances">Cancel</a>
        </Button>
        <Button onClick={handleSubmit} disabled={!name.trim() || !selectedTemplate || submitting}>
          {submitting ? "Creating..." : "Create Instance"}
        </Button>
      </div>
    </div>
  );
}
