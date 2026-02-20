"use client";

import { AlertTriangle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { use, useState } from "react";
import { Wizard } from "@/components/channel-wizard";
import { Button } from "@/components/ui/button";
import { connectChannel } from "@/lib/api";
import { getManifest } from "@/lib/mock-manifests";

export default function ChannelSetupPage({ params }: { params: Promise<{ plugin: string }> }) {
  const { plugin } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const botId = searchParams.get("botId");
  const manifest = getManifest(plugin);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!manifest) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Channel Not Found</h1>
          <p className="mt-2 text-muted-foreground">
            No manifest found for &ldquo;{plugin}&rdquo;.
          </p>
        </div>
      </div>
    );
  }

  if (!botId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="mx-auto w-full max-w-xl text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
            <AlertTriangle className="size-6 text-amber-500" />
          </div>
          <h1 className="text-lg font-semibold uppercase tracking-wider">NO INSTANCE CONTEXT</h1>
          <p className="text-sm text-muted-foreground">
            Channel setup requires a bot instance. Navigate to your instance and connect a channel
            from the Channels tab.
          </p>
          <Button variant="terminal" asChild>
            <a href="/instances">VIEW INSTANCES</a>
          </Button>
        </div>
      </div>
    );
  }

  async function handleComplete(values: Record<string, string>) {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await connectChannel(botId as string, plugin, values);
      router.push(`/instances/${botId}?tab=channels`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to connect channel");
    } finally {
      setSubmitting(false);
    }
  }

  function handleCancel() {
    router.push(`/instances/${botId}?tab=channels`);
  }

  return (
    <div className="flex min-h-full items-center justify-center p-8">
      <div className="w-full max-w-xl space-y-4">
        {submitError && (
          <div className="rounded-sm border border-red-500/25 bg-red-500/10 px-4 py-3 font-mono text-sm text-red-500">
            &gt; ERROR: {submitError}
          </div>
        )}
        <Wizard
          manifest={manifest}
          onComplete={handleComplete}
          onCancel={handleCancel}
          submitting={submitting}
        />
      </div>
    </div>
  );
}
