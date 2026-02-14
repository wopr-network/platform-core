"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { channelPlugins, superpowers } from "@/lib/onboarding-data";

const STORAGE_KEY = "wopr:setup-checklist-dismissed";

// Mock data — replace with real API when available
const MOCK_SELECTED_CHANNELS = ["discord", "web-ui"];
const MOCK_SELECTED_SUPERPOWERS = ["image-gen", "memory"];
const MOCK_CREDIT_BALANCE = "$10.00";

// Channels that are always ready (no external setup required)
const ALWAYS_READY_CHANNELS = new Set(["web-ui"]);

interface ChannelStatus {
  id: string;
  name: string;
  color: string;
  ready: boolean;
}

interface SuperpowerStatus {
  id: string;
  name: string;
  color: string;
  ready: boolean;
  requiresKey: boolean;
}

function resolveChannelStatuses(selectedIds: string[]): ChannelStatus[] {
  return selectedIds.map((id) => {
    // web-ui is in pluginCategories, not channelPlugins
    if (id === "web-ui") {
      return { id, name: "Web UI", color: "#3B82F6", ready: true };
    }
    const plugin = channelPlugins.find((c) => c.id === id);
    return {
      id,
      name: plugin?.name ?? id,
      color: plugin?.color ?? "#71717A",
      ready: ALWAYS_READY_CHANNELS.has(id),
    };
  });
}

function resolveSuperpowerStatuses(selectedIds: string[]): SuperpowerStatus[] {
  return selectedIds.map((id) => {
    const sp = superpowers.find((s) => s.id === id);
    return {
      id,
      name: sp?.name ?? id,
      color: sp?.color ?? "#71717A",
      ready: !sp?.requiresKey,
      requiresKey: sp?.requiresKey ?? false,
    };
  });
}

export function SetupChecklist() {
  const [dismissed, setDismissed] = useState(true); // default true to avoid flash

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setDismissed(stored === "true");
  }, []);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
    setDismissed(true);
  }, []);

  if (dismissed) return null;

  const channels = resolveChannelStatuses(MOCK_SELECTED_CHANNELS);
  const powers = resolveSuperpowerStatuses(MOCK_SELECTED_SUPERPOWERS);
  const allComplete = channels.every((c) => c.ready) && powers.every((p) => p.ready);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Let&apos;s get your WOPR running</CardTitle>
          <Button variant="ghost" size="xs" onClick={handleDismiss}>
            Dismiss
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Channels */}
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Channels
          </h3>
          <div className="space-y-1.5">
            {channels.map((ch) => (
              <div
                key={ch.id}
                className="flex items-center justify-between rounded-sm px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block size-2 rounded-full"
                    style={{ backgroundColor: ch.color }}
                  />
                  <span className="font-medium">{ch.name}</span>
                </div>
                {ch.ready ? (
                  <Badge variant="terminal">Ready</Badge>
                ) : (
                  <Button asChild variant="link" size="xs" className="h-auto p-0">
                    <Link href="/settings/providers">Set up &rarr;</Link>
                  </Button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Superpowers */}
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Superpowers
          </h3>
          <div className="space-y-1.5">
            {powers.map((sp) => (
              <div
                key={sp.id}
                className="flex items-center justify-between rounded-sm px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block size-2 rounded-full"
                    style={{ backgroundColor: sp.color }}
                  />
                  <span className="font-medium">{sp.name}</span>
                </div>
                {sp.ready ? (
                  <Badge variant="terminal">Ready (Hosted)</Badge>
                ) : (
                  <Button asChild variant="link" size="xs" className="h-auto p-0">
                    <Link href="/settings/providers">Configure key &rarr;</Link>
                  </Button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Credits */}
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Credits
          </h3>
          <div className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm">
            <span className="font-medium">Balance</span>
            <Badge variant="secondary">{MOCK_CREDIT_BALANCE}</Badge>
          </div>
        </section>

        {/* Footer hint */}
        {!allComplete && (
          <p className="text-xs text-muted-foreground">
            Complete the channel setup to start using your WOPR.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
