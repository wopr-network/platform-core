"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { usePluginRegistry } from "@/hooks/use-plugin-registry";
import type { ProviderMode } from "./use-onboarding";

interface StepPluginsProps {
  selected: string[];
  onToggle: (id: string) => void;
  providerMode?: ProviderMode;
}

/** Plugin IDs whose API key requirement is covered by WOPR Hosted */
const HOSTED_INCLUDED_PLUGINS = new Set(["elevenlabs-tts", "deepgram-stt", "openai-tts"]);

export function StepPlugins({ selected, onToggle, providerMode }: StepPluginsProps) {
  const { categories: pluginCategories } = usePluginRegistry();

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight">Optional plugins</h2>
        <p className="mt-2 text-muted-foreground">
          Add capabilities to your WOPR. All plugins are optional.
        </p>
      </div>
      <div className="space-y-6">
        {pluginCategories.map((category) => (
          <div key={category.id}>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {category.name}
            </h3>
            <div className="space-y-2">
              {category.plugins.map((plugin) => {
                const isSelected = selected.includes(plugin.id);
                const isHostedIncluded =
                  providerMode === "hosted" && HOSTED_INCLUDED_PLUGINS.has(plugin.id);
                return (
                  <Card key={plugin.id} className="py-3">
                    <CardContent className="flex items-center justify-between gap-4 py-0">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                          style={{ backgroundColor: plugin.color }}
                        >
                          {plugin.name[0]}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{plugin.name}</p>
                            {isHostedIncluded && (
                              <Badge variant="secondary" className="text-xs">
                                Included with WOPR Hosted
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{plugin.description}</p>
                          {plugin.requires && plugin.requires.length > 0 && (
                            <p className="mt-0.5 text-xs text-muted-foreground/70">
                              Requires: {plugin.requires.join(", ")}
                            </p>
                          )}
                        </div>
                      </div>
                      <Switch
                        checked={isSelected}
                        onCheckedChange={() => onToggle(plugin.id)}
                        aria-label={`Toggle ${plugin.name}`}
                      />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
