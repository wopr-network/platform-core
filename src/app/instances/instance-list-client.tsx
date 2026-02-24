"use client";

import { ArrowDownToLine, Loader2, MoreHorizontal } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useImageStatus } from "@/hooks/use-image-status";
import type { Instance, InstanceStatus } from "@/lib/api";
import { controlInstance, listInstances, pullImageUpdate } from "@/lib/api";
import { cn } from "@/lib/utils";

export function InstanceListClient() {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InstanceStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [destroyTarget, setDestroyTarget] = useState<Instance | null>(null);
  const [destroyConfirmText, setDestroyConfirmText] = useState("");
  const [destroying, setDestroying] = useState(false);

  const loadInstances = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listInstances();
      setInstances(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInstances();
  }, [loadInstances]);

  const filtered = useMemo(() => {
    return instances.filter((inst) => {
      const matchesSearch =
        !search ||
        inst.name.toLowerCase().includes(search.toLowerCase()) ||
        inst.template.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || inst.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [instances, search, statusFilter]);

  async function handleAction(id: string, action: "start" | "stop" | "restart" | "destroy") {
    setActionError(null);
    try {
      await controlInstance(id, action);
      await loadInstances();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : `Failed to ${action} instance`);
    }
  }

  function formatUptime(seconds: number | null): string {
    if (seconds === null) return "--";
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    if (d > 0) return `${d}d ${h}h`;
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Instances</h1>
          <p className="text-sm text-muted-foreground">Manage your WOPR instances</p>
        </div>
        <Button variant="terminal" asChild>
          <a href="/instances/new">New Instance</a>
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Input
          placeholder="Search by name or template..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as InstanceStatus | "all")}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="stopped">Stopped</SelectItem>
            <SelectItem value="degraded">Degraded</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {actionError && (
        <div className="rounded-md border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-500">
          {actionError}
        </div>
      )}

      {loading ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Uptime</TableHead>
                <TableHead>Plugins</TableHead>
                <TableHead className="w-[70px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 4 }, (_, n) => `sk-${n}`).map((skId) => (
                <TableRow key={skId}>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-14" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-8" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-6" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center gap-4">
          {instances.length === 0 ? (
            <>
              <p className="font-mono text-sm text-terminal">
                {">"} NO WOPR BOT INSTANCES DEPLOYED. AWAITING LAUNCH ORDERS.
              </p>
              <Button variant="terminal" size="sm" asChild>
                <a href="/instances/new">Deploy Instance</a>
              </Button>
            </>
          ) : (
            <p className="text-muted-foreground">No instances match your filters.</p>
          )}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Uptime</TableHead>
                <TableHead>Plugins</TableHead>
                <TableHead className="w-[70px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((inst) => (
                <TableRow
                  key={inst.id}
                  className={cn(
                    "border-l-2 border-transparent transition-colors",
                    "hover:bg-muted/50",
                    {
                      "border-l-emerald-500/30 hover:border-l-emerald-500":
                        inst.status === "running",
                      "hover:border-l-zinc-500": inst.status === "stopped",
                      "hover:border-l-yellow-500": inst.status === "degraded",
                      "hover:border-l-red-500": inst.status === "error",
                    },
                  )}
                >
                  <TableCell>
                    <a href={`/instances/${inst.id}`} className="font-medium hover:underline">
                      {inst.name}
                    </a>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{inst.template}</TableCell>
                  <TableCell>
                    <StatusBadge status={inst.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{inst.provider}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatUptime(inst.uptime)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{inst.plugins.length}</TableCell>
                  <TableCell>
                    <InstanceRowActions
                      inst={inst}
                      onAction={handleAction}
                      onDestroy={setDestroyTarget}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Destroy confirmation dialog */}
      <Dialog
        open={destroyTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDestroyTarget(null);
            setDestroyConfirmText("");
            setActionError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Destroy {destroyTarget?.name} permanently?</DialogTitle>
            <DialogDescription>
              This action is permanent and cannot be undone. The instance and all its data will be
              destroyed. Type <strong className="text-foreground">{destroyTarget?.name}</strong> to
              confirm.
            </DialogDescription>
          </DialogHeader>

          {actionError && <p className="text-sm text-destructive">{actionError}</p>}

          <Input
            autoFocus
            placeholder={`Type "${destroyTarget?.name}" to confirm`}
            value={destroyConfirmText}
            onChange={(e) => setDestroyConfirmText(e.target.value)}
          />

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDestroyTarget(null);
                setDestroyConfirmText("");
                setActionError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={destroying || destroyConfirmText !== destroyTarget?.name}
              onClick={async () => {
                if (!destroyTarget) return;
                setDestroying(true);
                setActionError(null);
                try {
                  await controlInstance(destroyTarget.id, "destroy");
                  setDestroyTarget(null);
                  setDestroyConfirmText("");
                  await loadInstances();
                } catch (err) {
                  setActionError(err instanceof Error ? err.message : "Failed to destroy instance");
                } finally {
                  setDestroying(false);
                }
              }}
            >
              {destroying ? "Destroying..." : "Destroy permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InstanceRowActions({
  inst,
  onAction,
  onDestroy,
}: {
  inst: Instance;
  onAction: (id: string, action: "start" | "stop" | "restart") => void;
  onDestroy: (inst: Instance) => void;
}) {
  const [open, setOpen] = useState(false);
  const { updateAvailable } = useImageStatus(open ? inst.id : null);
  const [pulling, setPulling] = useState(false);

  async function handlePull() {
    if (!window.confirm("This will pull the latest image and restart the bot. Continue?")) return;
    setPulling(true);
    try {
      await pullImageUpdate(inst.id);
    } catch {
      // Error swallowed — user sees the bot restarting
    } finally {
      setPulling(false);
      setOpen(false);
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-xs">
          <span className="sr-only">Actions</span>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <a href={`/instances/${inst.id}`}>View details</a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {updateAvailable && (
          <DropdownMenuItem className="text-amber-500" onClick={handlePull} disabled={pulling}>
            {pulling ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <ArrowDownToLine className="mr-2 size-4" />
            )}
            {pulling ? "Pulling..." : "Pull Update"}
          </DropdownMenuItem>
        )}
        {inst.status === "stopped" && (
          <DropdownMenuItem onClick={() => onAction(inst.id, "start")}>Start</DropdownMenuItem>
        )}
        {(inst.status === "running" || inst.status === "degraded") && (
          <>
            <DropdownMenuItem onClick={() => onAction(inst.id, "stop")}>Stop</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction(inst.id, "restart")}>
              Restart
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
          onClick={() => onDestroy(inst)}
        >
          Destroy
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
