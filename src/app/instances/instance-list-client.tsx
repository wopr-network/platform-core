"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
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
import type { Instance, InstanceStatus } from "@/lib/api";
import { controlInstance, listInstances } from "@/lib/api";

export function InstanceListClient() {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InstanceStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);

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
        <Button asChild>
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
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          {instances.length === 0 ? "No instances yet." : "No instances match your filters."}
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
                <TableRow key={inst.id}>
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-xs">
                          <span className="sr-only">Actions</span>
                          <MoreHorizontalIcon />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <a href={`/instances/${inst.id}`}>View details</a>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {inst.status === "stopped" && (
                          <DropdownMenuItem onClick={() => handleAction(inst.id, "start")}>
                            Start
                          </DropdownMenuItem>
                        )}
                        {(inst.status === "running" || inst.status === "degraded") && (
                          <>
                            <DropdownMenuItem onClick={() => handleAction(inst.id, "stop")}>
                              Stop
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAction(inst.id, "restart")}>
                              Restart
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleAction(inst.id, "destroy")}
                        >
                          Destroy
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function MoreHorizontalIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="More actions"
    >
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </svg>
  );
}
