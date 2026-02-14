"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { InstallWizard } from "@/components/marketplace/install-wizard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatInstallCount,
  getHostedAdaptersForCapabilities,
  getMarketplacePlugin,
  hasHostedOption,
  installPlugin,
  type PluginManifest,
} from "@/lib/marketplace-data";

export default function PluginDetailPage() {
  const params = useParams();
  const router = useRouter();
  const pluginId = params.plugin as string;

  const [plugin, setPlugin] = useState<PluginManifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getMarketplacePlugin(pluginId);
    setPlugin(data);
    setLoading(false);
  }, [pluginId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleInstallComplete(config: Record<string, unknown>) {
    if (!plugin) return;
    await installPlugin(plugin.id, config);
    setInstalling(false);
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-36" />
        <div className="flex items-start gap-4">
          <Skeleton className="h-14 w-14 rounded-xl" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-full max-w-md" />
            <div className="flex gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Skeleton className="h-9 w-20" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 3 }, (_, n) => `sk-${n}`).map((skId, i) => (
            <Skeleton key={skId} className="h-5 w-20" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!plugin) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Plugin not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/marketplace")}>
          Back to Marketplace
        </Button>
      </div>
    );
  }

  if (installing) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <InstallWizard
          plugin={plugin}
          onComplete={handleInstallComplete}
          onCancel={() => setInstalling(false)}
        />
      </div>
    );
  }

  const hostedAvailable = hasHostedOption(plugin.capabilities);
  const hostedAdapters = getHostedAdaptersForCapabilities(plugin.capabilities);

  return (
    <div className="p-6 space-y-6">
      <Button variant="ghost" onClick={() => router.push("/marketplace")} className="mb-2">
        &larr; Back to Marketplace
      </Button>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white"
          style={{ backgroundColor: plugin.color }}
        >
          {plugin.name[0]}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{plugin.name}</h1>
            <Badge variant="secondary">v{plugin.version}</Badge>
          </div>
          <p className="mt-1 text-muted-foreground">{plugin.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{formatInstallCount(plugin.installCount)} installs</span>
            <span>|</span>
            <span>by {plugin.author}</span>
            <span>|</span>
            <Badge variant="outline">{plugin.category}</Badge>
          </div>
        </div>
        <Button onClick={() => setInstalling(true)}>Install</Button>
      </div>

      {/* Capability badges */}
      <div className="flex flex-wrap gap-2">
        {plugin.capabilities.map((cap) => (
          <Badge key={cap} variant="outline">
            {cap}
          </Badge>
        ))}
        {hostedAvailable && (
          <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/25">
            WOPR Hosted Available
          </Badge>
        )}
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="changelog">Changelog</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 pt-4">
          {/* Requirements */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Requirements</CardTitle>
              <CardDescription>Dependencies needed for this plugin.</CardDescription>
            </CardHeader>
            <CardContent>
              {plugin.requires.length === 0 ? (
                <p className="text-sm text-emerald-500">No additional dependencies required.</p>
              ) : (
                <ul className="space-y-2">
                  {plugin.requires.map((req) => (
                    <li key={req.id} className="flex items-center gap-2 text-sm">
                      <span className="text-emerald-500">&#10003;</span>
                      <span>{req.label}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {req.id}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Hosted adapters */}
          {hostedAdapters.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">WOPR Hosted Options</CardTitle>
                <CardDescription>
                  Capabilities available as managed services -- no keys needed.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {hostedAdapters.map((adapter) => (
                    <li
                      key={adapter.capability}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{adapter.label}</p>
                        <p className="text-xs text-muted-foreground">{adapter.description}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {adapter.pricing}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Setup steps */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Setup Steps</CardTitle>
              <CardDescription>What happens during installation.</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2">
                {plugin.setup.map((step, i) => (
                  <li key={step.id} className="flex gap-3 text-sm">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-medium">{step.title}</p>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configuration Schema</CardTitle>
              <CardDescription>
                Fields auto-generated from the plugin manifest. These will be filled during
                installation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {plugin.configSchema.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  This plugin has no configuration fields.
                </p>
              ) : (
                <div className="space-y-3">
                  {plugin.configSchema.map((field) => (
                    <div key={field.key} className="rounded-lg border p-3">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{field.label}</p>
                        <Badge variant="outline" className="text-[10px]">
                          {field.type}
                        </Badge>
                        {field.required && (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-red-500/25 text-red-500"
                          >
                            required
                          </Badge>
                        )}
                        {field.secret && (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-yellow-500/25 text-yellow-500"
                          >
                            secret
                          </Badge>
                        )}
                      </div>
                      {field.description && (
                        <p className="mt-1 text-xs text-muted-foreground">{field.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="changelog" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Version History</CardTitle>
            </CardHeader>
            <CardContent>
              {plugin.changelog.length === 0 ? (
                <p className="text-sm text-muted-foreground">No changelog entries.</p>
              ) : (
                <div className="space-y-4">
                  {plugin.changelog.map((entry) => (
                    <div key={entry.version} className="flex gap-3">
                      <Badge variant="secondary" className="shrink-0">
                        v{entry.version}
                      </Badge>
                      <div>
                        <p className="text-sm">{entry.notes}</p>
                        <p className="text-xs text-muted-foreground">{entry.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
