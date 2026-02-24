"use client";

import { ArrowLeft } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { HealthOverview } from "@/components/observability/health-overview";
import { LogsViewer } from "@/components/observability/logs-viewer";
import { MetricsDashboard } from "@/components/observability/metrics-dashboard";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { InstanceDetail, InstanceStatus, Snapshot } from "@/lib/api";
import {
  controlInstance,
  createSnapshot,
  deleteSnapshot,
  getInstance,
  listSnapshots,
  restoreSnapshot,
  updateInstanceConfig,
} from "@/lib/api";
import { cn } from "@/lib/utils";

export function InstanceDetailClient({ instanceId }: { instanceId: string }) {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") ?? "overview";
  const [instance, setInstance] = useState<InstanceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configText, setConfigText] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [configStatus, setConfigStatus] = useState<"idle" | "saved" | "invalid">("idle");
  const [saving, setSaving] = useState(false);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  const [snapshotsError, setSnapshotsError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState<Snapshot | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Snapshot | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const snapshotsLoaded = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getInstance(instanceId);
      setInstance(data);
      setConfigText(JSON.stringify(data.config, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load instance");
    } finally {
      setLoading(false);
    }
  }, [instanceId]);

  const loadSnapshots = useCallback(async () => {
    setSnapshotsLoading(true);
    setSnapshotsError(null);
    try {
      const data = await listSnapshots(instanceId);
      setSnapshots(data);
    } catch (err) {
      setSnapshotsError(err instanceof Error ? err.message : "Failed to load snapshots");
    } finally {
      setSnapshotsLoading(false);
    }
  }, [instanceId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (activeTab === "snapshots" && !snapshotsLoaded.current) {
      snapshotsLoaded.current = true;
      loadSnapshots();
    }
  }, [activeTab, loadSnapshots]);

  async function handleAction(action: "start" | "stop" | "restart" | "destroy") {
    setActionError(null);
    try {
      await controlInstance(instanceId, action);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : `Failed to ${action} instance`);
    }
  }

  async function handleCreateSnapshot() {
    setSnapshotsError(null);
    setCreating(true);
    try {
      await createSnapshot(instanceId);
      await loadSnapshots();
    } catch (err) {
      setSnapshotsError(err instanceof Error ? err.message : "Failed to create snapshot");
    } finally {
      setCreating(false);
    }
  }

  async function handleRestore(snapshot: Snapshot) {
    setRestoring(true);
    try {
      await restoreSnapshot(instanceId, snapshot.id);
      setConfirmRestore(null);
      await load();
      await loadSnapshots();
    } catch (err) {
      setSnapshotsError(err instanceof Error ? err.message : "Failed to restore snapshot");
      setConfirmRestore(null);
    } finally {
      setRestoring(false);
    }
  }

  async function handleDelete(snapshot: Snapshot) {
    setSnapshotsError(null);
    setDeleting(true);
    try {
      await deleteSnapshot(instanceId, snapshot.id);
      setConfirmDelete(null);
      await loadSnapshots();
    } catch (err) {
      setSnapshotsError(err instanceof Error ? err.message : "Failed to delete snapshot");
      setConfirmDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-7 w-48" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
        <Skeleton className="h-px w-full" />
        <Skeleton className="h-9 w-96" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, n) => `sk-${n}`).map((skId) => (
            <div key={skId} className="rounded-sm border p-4 space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !instance) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">{error ?? "Instance not found"}</p>
        <Button variant="outline" asChild>
          <a href="/instances">Back to Instances</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <a href="/instances" className="inline-flex items-center gap-1">
                <ArrowLeft className="size-4" />
                Instances
              </a>
            </Button>
          </div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            {instance.name}
            <span
              className={cn("size-2 rounded-full", {
                "bg-emerald-500 animate-[pulse-dot_2s_ease-in-out_infinite]":
                  instance.status === "running",
                "bg-zinc-400": instance.status === "stopped",
                "bg-yellow-500": instance.status === "degraded",
                "bg-red-500 animate-[pulse-dot_0.8s_ease-in-out_infinite]":
                  instance.status === "error",
              })}
            />
          </h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <StatusBadge status={instance.status} />
            <span>{instance.template}</span>
            <span>{instance.provider}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {instance.status === "stopped" && (
            <Button size="sm" variant="terminal" onClick={() => handleAction("start")}>
              Start
            </Button>
          )}
          {(instance.status === "running" || instance.status === "degraded") && (
            <>
              <Button size="sm" variant="outline" onClick={() => handleAction("stop")}>
                Stop
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleAction("restart")}>
                Restart
              </Button>
            </>
          )}
          <Button size="sm" variant="destructive" onClick={() => handleAction("destroy")}>
            Destroy
          </Button>
        </div>
      </div>

      {actionError && (
        <div className="rounded-md border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-500">
          {actionError}
        </div>
      )}

      <Separator />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-transparent border-b border-border rounded-none p-0 h-auto gap-0">
          {[
            "overview",
            "health",
            "metrics",
            "logs",
            "plugins",
            "channels",
            "sessions",
            "snapshots",
            "config",
          ].map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="rounded-none border-b-2 border-transparent px-4 py-2 text-sm capitalize text-muted-foreground data-[state=active]:border-b-terminal data-[state=active]:text-terminal data-[state=active]:shadow-none data-[state=active]:bg-transparent"
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="Status" value={instance.status} status={instance.status} />
            <MetricCard title="Uptime" value={formatUptime(instance.uptime)} />
            <MetricCard
              title="Memory"
              value={`${instance.resourceUsage.memoryMb} MB`}
              progress={instance.resourceUsage.memoryMb / 10.24}
            />
            <MetricCard
              title="CPU"
              value={`${instance.resourceUsage.cpuPercent}%`}
              progress={instance.resourceUsage.cpuPercent}
            />
            <MetricCard title="Plugins" value={String(instance.plugins.length)} />
            <MetricCard title="Channels" value={String(instance.channelDetails.length)} />
            <MetricCard title="Active Sessions" value={String(instance.sessions.length)} />
            <MetricCard title="Created" value={new Date(instance.createdAt).toLocaleDateString()} />
          </div>
        </TabsContent>

        {/* Health Tab */}
        <TabsContent value="health" className="mt-4">
          <HealthOverview instanceId={instanceId} />
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="mt-4">
          <MetricsDashboard instanceId={instanceId} />
        </TabsContent>

        {/* Logs Tab (enhanced) */}
        <TabsContent value="logs" className="mt-4">
          <LogsViewer instanceId={instanceId} />
        </TabsContent>

        {/* Plugins Tab */}
        <TabsContent value="plugins" className="mt-4">
          {instance.plugins.length === 0 ? (
            <p className="text-muted-foreground">No plugins installed.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plugin</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead className="w-[100px]">Enabled</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {instance.plugins.map((plugin) => (
                    <TableRow
                      key={plugin.id}
                      className="transition-colors hover:bg-muted/50 even:bg-muted/20"
                    >
                      <TableCell className="font-medium">{plugin.name}</TableCell>
                      <TableCell className="text-muted-foreground">{plugin.version}</TableCell>
                      <TableCell>
                        <Switch
                          checked={plugin.enabled}
                          disabled
                          aria-label={`Toggle ${plugin.name}`}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Channels Tab */}
        <TabsContent value="channels" className="mt-4">
          {instance.channelDetails.length === 0 ? (
            <p className="text-muted-foreground">No channels connected.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Channel</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {instance.channelDetails.map((ch) => (
                    <TableRow
                      key={ch.id}
                      className="transition-colors hover:bg-muted/50 even:bg-muted/20"
                    >
                      <TableCell className="font-medium">{ch.name}</TableCell>
                      <TableCell className="text-muted-foreground">{ch.type}</TableCell>
                      <TableCell>
                        <ChannelStatusBadge status={ch.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="mt-4">
          {instance.sessions.length === 0 ? (
            <p className="text-muted-foreground">No active sessions.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session ID</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Messages</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Last Activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {instance.sessions.map((sess) => (
                    <TableRow
                      key={sess.id}
                      className="transition-colors hover:bg-muted/50 even:bg-muted/20"
                    >
                      <TableCell className="font-mono text-sm">{sess.id}</TableCell>
                      <TableCell>{sess.userId}</TableCell>
                      <TableCell>{sess.messageCount}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(sess.startedAt).toLocaleTimeString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(sess.lastActivityAt).toLocaleTimeString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Snapshots Tab */}
        <TabsContent value="snapshots" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">
              {snapshots.length} snapshot{snapshots.length !== 1 ? "s" : ""}
            </h3>
            <Button size="sm" onClick={handleCreateSnapshot} disabled={creating}>
              {creating ? "Creating..." : "Create Snapshot"}
            </Button>
          </div>

          {snapshotsError && (
            <div className="rounded-md border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-500">
              {snapshotsError}
            </div>
          )}

          {snapshotsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }, (_, i) => `snap-sk-${i}`).map((skId) => (
                <Skeleton key={skId} className="h-12 w-full" />
              ))}
            </div>
          ) : snapshots.length === 0 ? (
            <p className="text-muted-foreground">No snapshots yet.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshots.map((snap) => (
                    <TableRow
                      key={snap.id}
                      className="transition-colors hover:bg-muted/50 even:bg-muted/20"
                    >
                      <TableCell className="font-medium">
                        {snap.name ?? <span className="text-muted-foreground italic">unnamed</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{snap.type}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{snap.trigger}</TableCell>
                      <TableCell className="text-muted-foreground">{snap.sizeMb} MB</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(snap.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setConfirmRestore(snap)}
                          >
                            Restore
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setConfirmDelete(snap)}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Restore confirmation dialog */}
          <Dialog open={!!confirmRestore} onOpenChange={(open) => !open && setConfirmRestore(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Restore Snapshot</DialogTitle>
                <DialogDescription>This will restart your bot from this snapshot</DialogDescription>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Restoring from snapshot <span className="font-mono">{confirmRestore?.id}</span>
                {confirmRestore?.name ? ` (${confirmRestore.name})` : ""} created on{" "}
                {confirmRestore ? new Date(confirmRestore.createdAt).toLocaleString() : ""}.
              </p>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setConfirmRestore(null)}
                  disabled={restoring}
                >
                  Cancel
                </Button>
                <Button
                  variant="terminal"
                  onClick={() => confirmRestore && handleRestore(confirmRestore)}
                  disabled={restoring}
                >
                  {restoring ? "Restoring..." : "Confirm Restore"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete confirmation dialog */}
          <Dialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Snapshot</DialogTitle>
                <DialogDescription>
                  This will permanently delete this snapshot. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setConfirmDelete(null)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => confirmDelete && handleDelete(confirmDelete)}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Delete Snapshot"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Config Tab */}
        <TabsContent value="config" className="mt-4 space-y-4">
          <div className="space-y-2">
            <label htmlFor="config-editor" className="text-sm font-medium">
              Instance Configuration (JSON)
            </label>
            <div className="relative rounded-md border border-border bg-black/80 overflow-hidden">
              <div className="flex items-center gap-2 border-b border-border/50 px-3 py-1.5 text-xs text-muted-foreground">
                <span className="inline-block h-2 w-2 rounded-full bg-terminal" />
                <span>CONFIG EDITOR</span>
              </div>
              <Textarea
                id="config-editor"
                className="min-h-[300px] font-mono text-sm bg-transparent border-0 rounded-none focus-visible:ring-0 text-terminal/90 resize-y"
                value={configText}
                onChange={(e) => setConfigText(e.target.value)}
                spellCheck={false}
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            {configStatus === "saved" && (
              <span className="text-sm text-emerald-500">Config saved successfully</span>
            )}
            {configStatus === "invalid" && (
              <span className="text-sm text-red-500">Invalid JSON</span>
            )}
            <Button
              onClick={async () => {
                try {
                  const parsed = JSON.parse(configText);
                  setSaving(true);
                  setConfigStatus("idle");
                  await updateInstanceConfig(instanceId, parsed);
                  setConfigStatus("saved");
                  await load();
                } catch (err) {
                  if (err instanceof SyntaxError) {
                    setConfigStatus("invalid");
                  } else {
                    setActionError(err instanceof Error ? err.message : "Failed to save config");
                  }
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
            >
              Save Config
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({
  title,
  value,
  status,
  progress,
}: {
  title: string;
  value: string;
  status?: InstanceStatus;
  progress?: number;
}) {
  return (
    <Card className="py-4">
      <CardHeader className="pb-1">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2">
          {status && (
            <span
              className={cn("size-2 rounded-full", {
                "bg-emerald-500 animate-[pulse-dot_2s_ease-in-out_infinite]": status === "running",
                "bg-zinc-400": status === "stopped",
                "bg-yellow-500": status === "degraded",
                "bg-red-500 animate-[pulse-dot_0.8s_ease-in-out_infinite]": status === "error",
              })}
            />
          )}
          <p className="text-2xl font-bold tracking-tight">{value}</p>
        </div>
        {progress !== undefined && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full transition-all", {
                "bg-terminal": progress < 70,
                "bg-yellow-500": progress >= 70 && progress < 90,
                "bg-red-500": progress >= 90,
              })}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ChannelStatusBadge({ status }: { status: "connected" | "disconnected" | "error" }) {
  const config = {
    connected: {
      label: "Connected",
      className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/25",
    },
    disconnected: {
      label: "Disconnected",
      className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/25",
    },
    error: { label: "Error", className: "bg-red-500/15 text-red-500 border-red-500/25" },
  };
  const c = config[status];
  return (
    <Badge variant="outline" className={c.className}>
      {c.label}
    </Badge>
  );
}

function formatUptime(seconds: number | null): string {
  if (seconds === null) return "--";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  if (d > 0) return `${d}d ${h}h`;
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
