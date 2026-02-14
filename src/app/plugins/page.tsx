"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatInstallCount,
  hasHostedOption,
  listMarketplacePlugins,
  type PluginManifest,
} from "@/lib/marketplace-data";

interface InstalledPlugin {
  id: string;
  pluginId: string;
  enabled: boolean;
  installedAt: string;
  instanceName: string;
}

const mockInstalled: InstalledPlugin[] = [
  {
    id: "inst-1",
    pluginId: "discord-channel",
    enabled: true,
    installedAt: "2026-02-10",
    instanceName: "Production Bot",
  },
  {
    id: "inst-2",
    pluginId: "semantic-memory",
    enabled: true,
    installedAt: "2026-02-10",
    instanceName: "Production Bot",
  },
  {
    id: "inst-3",
    pluginId: "content-moderation",
    enabled: false,
    installedAt: "2026-02-11",
    instanceName: "Production Bot",
  },
  {
    id: "inst-4",
    pluginId: "webhooks",
    enabled: true,
    installedAt: "2026-02-12",
    instanceName: "Staging Bot",
  },
];

export default function PluginsPage() {
  const [catalog, setCatalog] = useState<PluginManifest[]>([]);
  const [loading, setLoading] = useState(true);
  const [installed, setInstalled] = useState<InstalledPlugin[]>(mockInstalled);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const data = await listMarketplacePlugins();
    setCatalog(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function togglePlugin(id: string) {
    setInstalled((prev) => prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)));
  }

  const installedManifests = useMemo(() => {
    const manifestMap = new Map(catalog.map((m) => [m.id, m]));
    return installed.map((inst) => ({
      ...inst,
      manifest: manifestMap.get(inst.pluginId),
    }));
  }, [installed, catalog]);

  const installedIds = new Set(installed.map((i) => i.pluginId));

  const availablePlugins = useMemo(() => {
    let result = catalog.filter((p) => !installedIds.has(p.id));
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
  }, [catalog, installedIds, search]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="mb-8 space-y-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="mb-6 h-9 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, n) => `sk-${n}`).map((skId, i) => (
            <Card key={skId}>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-5 w-10 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Plugins</h1>
        <p className="mt-2 text-muted-foreground">
          Manage installed plugins and discover new ones for your WOPR instances.
        </p>
      </div>

      <Tabs defaultValue="installed">
        <TabsList>
          <TabsTrigger value="installed">Installed ({installed.length})</TabsTrigger>
          <TabsTrigger value="catalog">Catalog</TabsTrigger>
        </TabsList>

        <TabsContent value="installed" className="mt-6">
          {installedManifests.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              No plugins installed yet.{" "}
              <Button variant="link" className="ml-1" onClick={() => {}}>
                Browse the catalog
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {installedManifests.map((item) => {
                const manifest = item.manifest;
                if (!manifest) return null;
                return (
                  <Card key={item.id}>
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
                          style={{ backgroundColor: manifest.color }}
                        >
                          {manifest.name[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base">{manifest.name}</CardTitle>
                            <Badge
                              variant="secondary"
                              className={item.enabled ? "text-green-500" : "text-muted-foreground"}
                            >
                              {item.enabled ? "Active" : "Disabled"}
                            </Badge>
                          </div>
                          <CardDescription className="mt-1 line-clamp-2">
                            {manifest.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">
                            Instance: {item.instanceName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Installed: {item.installedAt}
                          </p>
                        </div>
                        <Switch
                          checked={item.enabled}
                          onCheckedChange={() => togglePlugin(item.id)}
                          aria-label={`Toggle ${manifest.name}`}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="catalog" className="mt-6 space-y-6">
          <Input
            placeholder="Search plugins..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />

          {availablePlugins.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              No plugins found matching your criteria.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {availablePlugins.map((plugin) => {
                const hostedAvailable = hasHostedOption(plugin.capabilities);
                return (
                  <Link key={plugin.id} href={`/marketplace/${plugin.id}`}>
                    <Card className="h-full transition-colors hover:border-primary/40">
                      <CardHeader>
                        <div className="flex items-start gap-3">
                          <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
                            style={{ backgroundColor: plugin.color }}
                          >
                            {plugin.name[0]}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-base">{plugin.name}</CardTitle>
                              <Badge variant="secondary" className="text-[10px]">
                                v{plugin.version}
                              </Badge>
                            </div>
                            <CardDescription className="mt-1 line-clamp-2">
                              {plugin.description}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-1.5">
                          {plugin.capabilities.map((cap) => (
                            <Badge key={cap} variant="outline" className="text-[10px]">
                              {cap}
                            </Badge>
                          ))}
                          {hostedAvailable && (
                            <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/25 text-[10px]">
                              WOPR Hosted Available
                            </Badge>
                          )}
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                          <span>{formatInstallCount(plugin.installCount)} installs</span>
                          <span>{plugin.author}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
