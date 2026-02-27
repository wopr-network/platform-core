"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditDetailed } from "@/components/ui/credit-detailed";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type {
  ActiveSuperpower,
  AvailableSuperpower,
  BotSettings,
  DiscoverPlugin,
  InstalledPlugin,
} from "@/lib/bot-settings-data";
import {
  activateSuperpower,
  controlBot,
  disconnectChannel,
  getBotSettings,
  installPlugin,
  PERSONALITY_TEMPLATES,
  togglePlugin,
  updateBotBrain,
  updateBotIdentity,
} from "@/lib/bot-settings-data";
import { formatCreditDetailed, formatCreditStandard } from "@/lib/format-credit";
import { DEFAULT_STATUS_STYLE, PLUGIN_STATUS_STYLES } from "@/lib/status-colors";
import { ResourcesTab } from "./resources-tab";
import { StorageTab } from "./storage-tab";
import { VpsInfoPanel } from "./vps-info-panel";
import { VpsUpgradeCard } from "./vps-upgrade-card";

export function BotSettingsClient({ botId }: { botId: string }) {
  const [settings, setSettings] = useState<BotSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getBotSettings(botId);
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bot settings");
    } finally {
      setLoading(false);
    }
  }, [botId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-muted-foreground">
        Loading bot settings...
      </div>
    );
  }

  if (error || !settings) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">{error ?? "Bot not found"}</p>
        <Button variant="outline" asChild>
          <a href="/dashboard">Back to Dashboard</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <a href="/dashboard">&larr; Back to Fleet</a>
        </Button>
        <StatusDot status={settings.status} />
        <h1 className="text-2xl font-bold tracking-tight">{settings.identity.name}</h1>
      </div>

      <Separator />

      {/* Tabs */}
      <Tabs defaultValue="identity">
        <TabsList className="flex-wrap">
          <TabsTrigger value="identity">Identity</TabsTrigger>
          <TabsTrigger value="brain">Brain</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="superpowers">Superpowers</TabsTrigger>
          <TabsTrigger value="plugins">Plugins</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="vps">VPS</TabsTrigger>
          <TabsTrigger value="danger">Danger Zone</TabsTrigger>
        </TabsList>

        <TabsContent value="identity" className="mt-4">
          <IdentityTab settings={settings} botId={botId} onUpdate={setSettings} />
        </TabsContent>

        <TabsContent value="brain" className="mt-4">
          <BrainTab settings={settings} botId={botId} onUpdate={setSettings} />
        </TabsContent>

        <TabsContent value="channels" className="mt-4">
          <ChannelsTab settings={settings} botId={botId} onUpdate={load} />
        </TabsContent>

        <TabsContent value="superpowers" className="mt-4">
          <SuperpowersTab settings={settings} botId={botId} onUpdate={load} />
        </TabsContent>

        <TabsContent value="plugins" className="mt-4">
          <PluginsTab settings={settings} botId={botId} onUpdate={load} />
        </TabsContent>

        <TabsContent value="storage" className="mt-4">
          <StorageTab botId={botId} />
        </TabsContent>

        <TabsContent value="usage" className="mt-4">
          <UsageTab settings={settings} />
        </TabsContent>

        <TabsContent value="resources" className="mt-4">
          <ResourcesTab botId={botId} />
        </TabsContent>

        <TabsContent value="vps" className="mt-4">
          <div className="flex flex-col gap-4">
            <VpsInfoPanel botId={botId} />
            <VpsUpgradeCard botId={botId} />
          </div>
        </TabsContent>

        <TabsContent value="danger" className="mt-4">
          <DangerZoneTab settings={settings} botId={botId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// --- Status dot ---

function StatusDot({ status }: { status: BotSettings["status"] }) {
  const colors = {
    running: "bg-emerald-500",
    stopped: "bg-zinc-400",
    archived: "bg-amber-500",
  };
  return <span className={`inline-block size-3 rounded-full ${colors[status]}`} />;
}

// --- Tab 1: Identity ---

function IdentityTab({
  settings,
  botId,
  onUpdate,
}: {
  settings: BotSettings;
  botId: string;
  onUpdate: (s: BotSettings) => void;
}) {
  const [name, setName] = useState(settings.identity.name);
  const [personality, setPersonality] = useState(settings.identity.personality);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateBotIdentity(botId, {
        name,
        avatar: settings.identity.avatar,
        personality,
      });
      onUpdate({ ...settings, identity: updated });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setSaveError("Failed to save \u2014 please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-bold">Identity</h2>
        <p className="text-sm text-muted-foreground">Customize your bot's name and personality.</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="bot-name" className="text-sm font-medium">
            Name
          </label>
          <Input id="bot-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="space-y-2">
          <label htmlFor="bot-personality" className="text-sm font-medium">
            Personality
          </label>
          <Textarea
            id="bot-personality"
            className="min-h-[120px]"
            value={personality}
            onChange={(e) => setPersonality(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <span className="text-sm font-medium">Personality templates</span>
          <div className="flex flex-wrap gap-2">
            {PERSONALITY_TEMPLATES.map((t) => (
              <Button
                key={t.id}
                variant="outline"
                size="sm"
                onClick={() => {
                  if (t.text) setPersonality(t.text);
                }}
              >
                {t.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </Button>
        {saved && <span className="text-sm text-emerald-500">Saved!</span>}
        {saveError && <p className="text-sm text-destructive">{saveError}</p>}
      </div>
    </div>
  );
}

// --- Tab 2: Brain ---

function BrainTab({
  settings,
  botId,
  onUpdate,
}: {
  settings: BotSettings;
  botId: string;
  onUpdate: (s: BotSettings) => void;
}) {
  const { brain } = settings;
  const [modelInput, setModelInput] = useState(brain.model);
  const [savingModel, setSavingModel] = useState(false);
  const [changingMode, setChangingMode] = useState(false);
  const [brainError, setBrainError] = useState<string | null>(null);

  async function handleSaveModel() {
    if (modelInput === brain.model) return;
    setSavingModel(true);
    setBrainError(null);
    try {
      await updateBotBrain(botId, { model: modelInput });
      onUpdate({
        ...settings,
        brain: { ...settings.brain, model: modelInput },
      });
    } catch {
      setBrainError("Failed to update model -- please try again.");
    } finally {
      setSavingModel(false);
    }
  }

  async function handleModeChange(mode: "hosted" | "byok") {
    if (mode === brain.mode) return;
    setChangingMode(true);
    setBrainError(null);
    try {
      await updateBotBrain(botId, { mode });
      onUpdate({
        ...settings,
        brain: { ...settings.brain, mode },
      });
    } catch {
      setBrainError("Failed to switch provider mode -- please try again.");
    } finally {
      setChangingMode(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-bold">Brain</h2>
        <p className="text-sm text-muted-foreground">Model and provider configuration.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Model</CardTitle>
          <CardDescription>
            LLM model ID (e.g. claude-sonnet-4, gpt-4o). Used via{" "}
            {brain.mode === "hosted" ? "WOPR Hosted" : "BYOK"}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              value={modelInput}
              onChange={(e) => setModelInput(e.target.value)}
              placeholder="e.g. claude-sonnet-4"
              className="max-w-sm"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveModel}
              disabled={savingModel || modelInput === brain.model}
            >
              {savingModel ? "Saving..." : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Provider Mode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors hover:bg-accent/50">
            <input
              type="radio"
              name="provider-mode"
              value="hosted"
              checked={brain.mode === "hosted"}
              onChange={() => handleModeChange("hosted")}
              disabled={changingMode}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">WOPR Hosted</span>
                {brain.mode === "hosted" && <Badge variant="default">Active</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">
                Everything routed through WOPR. Uses credits. No API keys needed.
              </p>
            </div>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors hover:bg-accent/50">
            <input
              type="radio"
              name="provider-mode"
              value="byok"
              checked={brain.mode === "byok"}
              onChange={() => handleModeChange("byok")}
              disabled={changingMode}
              className="mt-1"
            />
            <div className="flex-1">
              <span className="text-sm font-medium">Bring Your Own Key</span>
              <p className="text-sm text-muted-foreground">
                Use your own Anthropic/OpenAI key. You pay the provider directly.
              </p>
              {brain.mode !== "byok" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => handleModeChange("byok")}
                  disabled={changingMode}
                >
                  {changingMode ? "Switching..." : "Switch to BYOK"}
                </Button>
              )}
            </div>
          </label>
        </CardContent>
      </Card>

      {brainError && <p className="text-sm text-destructive">{brainError}</p>}
    </div>
  );
}

// --- Tab 3: Channels ---

function ChannelsTab({
  settings,
  botId,
  onUpdate,
}: {
  settings: BotSettings;
  botId: string;
  onUpdate: () => void;
}) {
  const router = useRouter();
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [channelError, setChannelError] = useState<string | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState<string | null>(null);

  async function handleDisconnect(channelId: string) {
    setDisconnecting(channelId);
    setChannelError(null);
    try {
      await disconnectChannel(botId, channelId);
      setConfirmDisconnect(null);
      onUpdate();
    } catch {
      setChannelError("Failed to disconnect channel -- please try again.");
    } finally {
      setDisconnecting(null);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-bold">Channels</h2>
        <p className="text-sm text-muted-foreground">
          Connected channels and available integrations.
        </p>
      </div>

      <div className="space-y-3">
        {settings.channels.map((ch) => (
          <Card key={ch.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{ch.type}</span>
                  <ChannelStatusBadge status={ch.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {ch.name} &middot; {ch.stats}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => alert("Channel configuration coming soon")}
                >
                  Configure
                </Button>
                {ch.status === "connected" && (
                  <Button variant="ghost" size="sm" onClick={() => setConfirmDisconnect(ch.id)}>
                    Disconnect
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add More Channels</CardTitle>
          <CardDescription>
            Your WOPR works everywhere you do. All channels are free.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {settings.availableChannels.map((ch) => (
              <Button
                key={ch.type}
                variant="outline"
                onClick={() =>
                  router.push(`/onboarding/channels?bot=${botId}&channel=${ch.type.toLowerCase()}`)
                }
              >
                + Add {ch.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {channelError && <p className="text-sm text-destructive">{channelError}</p>}

      <Dialog open={confirmDisconnect !== null} onOpenChange={() => setConfirmDisconnect(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect channel?</DialogTitle>
            <DialogDescription>
              This will remove the channel from your bot. You can reconnect it later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDisconnect(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmDisconnect && handleDisconnect(confirmDisconnect)}
              disabled={disconnecting !== null}
            >
              {disconnecting ? "Disconnecting..." : "Disconnect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Channel status badge ---

function ChannelStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    connected: {
      label: "Connected",
      className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/25",
    },
    disconnected: {
      label: "Disconnected",
      className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/25",
    },
    "always-on": {
      label: "Always On",
      className: "bg-blue-500/15 text-blue-500 border-blue-500/25",
    },
  };
  const c = config[status] ?? config.disconnected;
  return (
    <Badge variant="outline" className={c.className}>
      {c.label}
    </Badge>
  );
}

// --- Tab 4: Superpowers ---

function SuperpowersTab({
  settings,
  botId,
  onUpdate,
}: {
  settings: BotSettings;
  botId: string;
  onUpdate: () => void;
}) {
  const [activating, setActivating] = useState<string | null>(null);
  const [activateError, setActivateError] = useState<string | null>(null);

  async function handleActivate(superpowerId: string) {
    setActivating(superpowerId);
    setActivateError(null);
    try {
      await activateSuperpower(botId, superpowerId);
      onUpdate();
    } catch {
      setActivateError("Failed to activate capability \u2014 please try again.");
    } finally {
      setActivating(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Superpowers</h2>
        <p className="text-sm text-muted-foreground">
          Capabilities that make your bot extraordinary.
        </p>
      </div>

      {/* Active superpowers */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Active
        </h3>
        {settings.activeSuperpowers.map((sp) => (
          <ActiveSuperpowerCard
            key={sp.id}
            superpower={sp}
            onConfigure={() => alert("Superpower configuration coming soon")}
          />
        ))}
      </div>

      <Separator />

      {/* Available superpowers */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Your WOPR can do more
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {settings.availableSuperpowers.map((sp) => (
            <AvailableSuperpowerCard
              key={sp.id}
              superpower={sp}
              activating={activating === sp.id}
              onActivate={() => handleActivate(sp.id)}
            />
          ))}
        </div>
        <p className="text-sm text-muted-foreground">One click to activate. Uses your credits.</p>
        {activateError && <p className="text-sm text-destructive">{activateError}</p>}
      </div>
    </div>
  );
}

function ActiveSuperpowerCard({
  superpower,
  onConfigure,
}: {
  superpower: ActiveSuperpower;
  onConfigure: () => void;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{superpower.name}</span>
            <Badge variant="outline">{superpower.mode === "hosted" ? "Hosted" : "BYOK"}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {superpower.usageCount} {superpower.usageLabel} &middot;{" "}
            <CreditDetailed value={superpower.spend} /> spent
          </p>
          <p className="text-xs text-muted-foreground">
            Provider: {superpower.provider} &middot; {superpower.model}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onConfigure}>
            Configure
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AvailableSuperpowerCard({
  superpower,
  activating,
  onActivate,
}: {
  superpower: AvailableSuperpower;
  activating: boolean;
  onActivate: () => void;
}) {
  return (
    <Card className="flex flex-col justify-between">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{superpower.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-3">
        <p className="text-sm text-muted-foreground">{superpower.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">{superpower.pricing}</span>
          <Button size="sm" onClick={onActivate} disabled={activating}>
            {activating ? "Adding..." : "+ Add"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Tab 5: Plugins ---

function PluginsTab({
  settings,
  botId,
  onUpdate,
}: {
  settings: BotSettings;
  botId: string;
  onUpdate: () => void;
}) {
  const [togglingPlugin, setTogglingPlugin] = useState<string | null>(null);
  const [installingPlugin, setInstallingPlugin] = useState<string | null>(null);
  const [pluginError, setPluginError] = useState<string | null>(null);

  async function handleToggle(pluginId: string, enabled: boolean) {
    setTogglingPlugin(pluginId);
    setPluginError(null);
    try {
      await togglePlugin(botId, pluginId, enabled);
      onUpdate();
    } catch {
      setPluginError(`Failed to ${enabled ? "enable" : "disable"} plugin -- please try again.`);
    } finally {
      setTogglingPlugin(null);
    }
  }

  async function handleInstall(pluginId: string) {
    setInstallingPlugin(pluginId);
    setPluginError(null);
    try {
      await installPlugin(botId, pluginId);
      onUpdate();
    } catch {
      setPluginError("Failed to install plugin -- please try again.");
    } finally {
      setInstallingPlugin(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Plugins</h2>
        <p className="text-sm text-muted-foreground">Installed plugins and plugin discovery.</p>
      </div>

      {/* Installed */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Installed
        </h3>
        {settings.installedPlugins.map((plugin) => (
          <InstalledPluginCard
            key={plugin.id}
            plugin={plugin}
            onToggle={handleToggle}
            toggling={togglingPlugin === plugin.id}
          />
        ))}
      </div>

      <Separator />

      {/* Discover */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Discover Plugins
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {settings.discoverPlugins.map((plugin) => (
            <DiscoverPluginCard
              key={plugin.id}
              plugin={plugin}
              onInstall={handleInstall}
              installing={installingPlugin === plugin.id}
            />
          ))}
        </div>
        <Button variant="outline" asChild>
          <a href="/marketplace">Browse all plugins</a>
        </Button>
      </div>

      {pluginError && <p className="text-sm text-destructive">{pluginError}</p>}
    </div>
  );
}

function InstalledPluginCard({
  plugin,
  onToggle,
  toggling,
}: {
  plugin: InstalledPlugin;
  onToggle: (pluginId: string, enabled: boolean) => void;
  toggling: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{plugin.name}</span>
            <Badge
              variant="outline"
              className={PLUGIN_STATUS_STYLES[plugin.status] ?? DEFAULT_STATUS_STYLE}
            >
              {plugin.status === "active" ? "Active" : "Disabled"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{plugin.description}</p>
          <p className="text-xs text-muted-foreground">Uses: {plugin.capabilities.join(", ")}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => alert("Plugin configuration coming soon")}
          >
            Configure
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggle(plugin.id, plugin.status !== "active")}
            disabled={toggling}
          >
            {toggling ? "Updating..." : plugin.status === "active" ? "Disable" : "Enable"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DiscoverPluginCard({
  plugin,
  onInstall,
  installing,
}: {
  plugin: DiscoverPlugin;
  onInstall: (pluginId: string) => void;
  installing: boolean;
}) {
  return (
    <Card className="flex flex-col justify-between">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{plugin.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-3">
        <p className="text-sm text-muted-foreground">{plugin.description}</p>
        {plugin.needs.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {plugin.needs.map((n) => (
              <Badge key={n} variant="secondary" className="text-xs">
                Needs: {n}
              </Badge>
            ))}
          </div>
        )}
        <Button size="sm" onClick={() => onInstall(plugin.id)} disabled={installing}>
          {installing ? "Installing..." : "Install"}
        </Button>
      </CardContent>
    </Card>
  );
}

// --- Tab 6: Usage ---

function UsageTab({ settings }: { settings: BotSettings }) {
  const { usage } = settings;
  const denom = usage.totalSpend + usage.creditBalance;
  const spendPercent = denom > 0 ? (usage.totalSpend / denom) * 100 : 0;
  const balanceLow = denom > 0 && usage.creditBalance < denom * 0.2;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-bold">Usage -- {settings.identity.name}</h2>
        <p className="text-sm text-muted-foreground">Per-bot credit consumption breakdown.</p>
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="text-sm text-muted-foreground">
            This week: {formatCreditStandard(usage.totalSpend)} of{" "}
            {formatCreditStandard(usage.creditBalance)} remaining credits
          </div>
          <Progress value={spendPercent} className="h-2" />
        </CardContent>
      </Card>

      {/* By Capability */}
      <Card>
        <CardHeader>
          <CardTitle>By Capability</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {usage.capabilities.map((cap) => (
            <div key={cap.capability} className="flex items-center gap-3">
              <span className="w-24 text-sm font-medium">{cap.capability}</span>
              <div className="flex-1">
                <Progress value={cap.percent} className="h-2" />
              </div>
              <span className="w-16 text-right text-sm font-medium min-w-[7rem]">
                <CreditDetailed value={cap.spend} />
              </span>
              <span className="w-12 text-right text-xs text-muted-foreground">{cap.percent}%</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Trend</CardTitle>
          <CardDescription>Daily spend over the last 14 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-24 items-end gap-1">
            {usage.trend.map((point) => {
              const maxSpend = Math.max(...usage.trend.map((p) => p.spend));
              const height = maxSpend > 0 ? (point.spend / maxSpend) * 100 : 0;
              return (
                <div
                  key={point.date}
                  className="flex flex-1 flex-col items-center gap-1"
                  title={`${point.date}: ${formatCreditDetailed(point.spend)}`}
                >
                  <div
                    className="w-full rounded-t bg-primary/60"
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-[10px] text-muted-foreground">{point.date.slice(-2)}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Top-up CTA */}
      {balanceLow && (
        <Card className="border-amber-500/25 bg-amber-500/5">
          <CardContent className="flex items-center justify-between p-4">
            <span className="text-sm font-medium">Running low on credits?</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" asChild>
                <a href="/billing/credits">Top up -- $10</a>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href="/billing/credits">$25</a>
              </Button>
              <Button size="sm" asChild>
                <a href="/billing/credits">$50</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// --- Tab 7: Danger Zone ---

function DangerZoneTab({ settings, botId }: { settings: BotSettings; botId: string }) {
  const router = useRouter();
  const [confirmAction, setConfirmAction] = useState<"stop" | "archive" | "delete" | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const botName = settings.identity.name;

  function handleDialogClose() {
    setConfirmAction(null);
    setActionError(null);
  }

  async function handleConfirm() {
    if (!confirmAction) return;
    if (confirmAction === "delete" && confirmText !== botName) return;
    setActing(true);
    setActionError(null);
    try {
      await controlBot(botId, confirmAction);
      if (confirmAction === "delete" || confirmAction === "archive") {
        router.push("/dashboard");
        return;
      }
      setConfirmAction(null);
      setConfirmText("");
    } catch {
      setActionError(`Failed to ${confirmAction} bot \u2014 please try again.`);
    } finally {
      setActing(false);
    }
  }

  const actions = [
    {
      key: "stop" as const,
      label: `Stop ${botName}`,
      description: "Pause this bot. Channels go offline. Can restart anytime.",
      variant: "outline" as const,
    },
    {
      key: "archive" as const,
      label: `Archive ${botName}`,
      description: "Remove from fleet. Keeps config and memories for 30 days. Can restore.",
      variant: "outline" as const,
    },
    {
      key: "delete" as const,
      label: `Delete ${botName}`,
      description: "Permanent. All data destroyed. This cannot be undone.",
      variant: "destructive" as const,
    },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-destructive">Danger Zone</h2>
        <p className="text-sm text-muted-foreground">
          Irreversible and destructive actions. Proceed with caution.
        </p>
      </div>

      <div className="space-y-4">
        {actions.map((action) => (
          <Card key={action.key} className={action.key === "delete" ? "border-destructive/50" : ""}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">{action.description}</p>
              </div>
              <Button variant={action.variant} onClick={() => setConfirmAction(action.key)}>
                {action.label}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Confirmation dialog */}
      <Dialog open={confirmAction !== null} onOpenChange={handleDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction === "stop" && `Stop ${botName}?`}
              {confirmAction === "archive" && `Archive ${botName}?`}
              {confirmAction === "delete" && `Delete ${botName} permanently?`}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === "stop" &&
                "This will pause your bot. All channels will go offline. You can restart it at any time."}
              {confirmAction === "archive" &&
                "This will remove your bot from the fleet. Config and memories are kept for 30 days. You can restore it within that window."}
              {confirmAction === "delete" && (
                <>
                  This action is permanent and cannot be undone. All data, memories, and
                  configuration will be destroyed. Type{" "}
                  <strong className="text-foreground">{botName}</strong> to confirm.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {actionError && <p className="text-sm text-destructive">{actionError}</p>}

          {confirmAction === "delete" && (
            <Input
              placeholder={`Type "${botName}" to confirm`}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleDialogClose}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={acting || (confirmAction === "delete" && confirmText !== botName)}
            >
              {acting
                ? "Processing..."
                : confirmAction === "stop"
                  ? "Stop bot"
                  : confirmAction === "archive"
                    ? "Archive bot"
                    : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
