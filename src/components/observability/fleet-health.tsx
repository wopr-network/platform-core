"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { FleetInstance, HealthStatus } from "@/lib/api";
import { getFleetHealth } from "@/lib/api";
import { cn } from "@/lib/utils";

const healthBadgeStyles: Record<HealthStatus, string> = {
  healthy: "bg-emerald-500/15 text-emerald-500 border-emerald-500/25",
  degraded: "bg-yellow-500/15 text-yellow-500 border-yellow-500/25",
  unhealthy: "bg-red-500/15 text-red-500 border-red-500/25",
};

const healthDotStyles: Record<HealthStatus, string> = {
  healthy: "bg-emerald-500",
  degraded: "bg-yellow-500",
  unhealthy: "bg-red-500",
};

type SortBy = "status" | "name" | "uptime";

function sortInstances(instances: FleetInstance[], sortBy: SortBy): FleetInstance[] {
  return [...instances].sort((a, b) => {
    switch (sortBy) {
      case "status": {
        const order: Record<HealthStatus, number> = { unhealthy: 0, degraded: 1, healthy: 2 };
        return order[a.health] - order[b.health];
      }
      case "name":
        return a.name.localeCompare(b.name);
      case "uptime":
        return (b.uptime ?? 0) - (a.uptime ?? 0);
      default:
        return 0;
    }
  });
}

function formatUptime(seconds: number | null): string {
  if (seconds === null) return "--";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  if (d > 0) return `${d}d ${h}h`;
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function FleetHealth() {
  const [instances, setInstances] = useState<FleetInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortBy>("status");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getFleetHealth();
      setInstances(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  const sorted = sortInstances(instances, sortBy);
  const degradedCount = instances.filter(
    (i) => i.health === "degraded" || i.health === "unhealthy",
  ).length;

  if (loading && instances.length === 0) {
    return (
      <div className="space-y-6 p-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, n) => `sk-${n}`).map((skId, i) => (
            <div key={skId} className="rounded-sm border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-4 w-20" />
              <div className="space-y-1">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Fleet Health</h1>
          <p className="text-sm text-muted-foreground">
            {instances.length} instance{instances.length !== 1 ? "s" : ""}{" "}
            {degradedCount > 0 && (
              <span className="text-yellow-500">
                ({degradedCount} need{degradedCount === 1 ? "s" : ""} attention)
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="status">By Status</SelectItem>
              <SelectItem value="name">By Name</SelectItem>
              <SelectItem value="uptime">By Uptime</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={load}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Instance Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((inst) => (
          <Link key={inst.id} href={`/instances/${inst.id}`} className="block">
            <Card className="transition-colors hover:border-foreground/25">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-medium">{inst.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{inst.provider}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn("gap-1.5 capitalize", healthBadgeStyles[inst.health])}
                  >
                    <span className={cn("size-1.5 rounded-full", healthDotStyles[inst.health])} />
                    {inst.health}
                  </Badge>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <p className="text-muted-foreground">Uptime</p>
                    <p className="font-medium">{formatUptime(inst.uptime)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Plugins</p>
                    <p className="font-medium">{inst.pluginCount}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Sessions</p>
                    <p className="font-medium">{inst.sessionCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
