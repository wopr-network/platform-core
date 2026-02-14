"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CategoryFilter } from "@/components/marketplace/category-filter";
import { PluginCard } from "@/components/marketplace/plugin-card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  listMarketplacePlugins,
  type PluginCategory,
  type PluginManifest,
} from "@/lib/marketplace-data";

export default function MarketplacePage() {
  const [plugins, setPlugins] = useState<PluginManifest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<PluginCategory | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await listMarketplacePlugins();
    setPlugins(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of plugins) {
      counts[p.category] = (counts[p.category] ?? 0) + 1;
    }
    return counts;
  }, [plugins]);

  const filtered = useMemo(() => {
    let result = plugins;
    if (category) {
      result = result.filter((p) => p.category === category);
    }
    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.description.toLowerCase().includes(term) ||
          p.tags.some((t) => t.toLowerCase().includes(term)),
      );
    }
    return result;
  }, [plugins, category, search]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, n) => `sk-${n}`).map((skId) => (
            <div key={skId} className="rounded-sm border p-6 space-y-4">
              <div className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
              <div className="flex gap-1.5">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Plugin Marketplace</h1>
        <p className="text-sm text-muted-foreground">
          Browse, install, and configure plugins for your WOPR instances.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Input
          placeholder="Search plugins..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <CategoryFilter selected={category} onSelect={setCategory} counts={categoryCounts} />

      {filtered.length === 0 ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          No plugins found matching your criteria.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((plugin) => (
            <PluginCard key={plugin.id} plugin={plugin} />
          ))}
        </div>
      )}
    </div>
  );
}
