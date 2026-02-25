"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, GripVertical, Package, Plus, Star } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import { Textarea } from "@/components/ui/textarea";
import {
  type AdminPlugin,
  addPluginByNpm,
  getDiscoveryQueue,
  getEnabledPlugins,
  reorderPlugins,
  updatePlugin,
} from "@/lib/admin-marketplace-api";
import { cn } from "@/lib/utils";

// ---- Category badge styling ----

function categoryBadgeClass(category: string): string {
  switch (category) {
    case "superpower":
      return "border-amber-500/30 text-amber-400";
    case "channel":
      return "border-terminal/30 text-terminal";
    default:
      return "border-border text-muted-foreground";
  }
}

// ---- Main component ----

export function MarketplaceAdmin() {
  const [queue, setQueue] = useState<AdminPlugin[]>([]);
  const [enabled, setEnabled] = useState<AdminPlugin[]>([]);
  const [selected, setSelected] = useState<AdminPlugin | null>(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [addPackage, setAddPackage] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const notesTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const dragItemRef = useRef<number | null>(null);
  const dragOverRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [q, e] = await Promise.all([getDiscoveryQueue(), getEnabledPlugins()]);
      setQueue(q);
      setEnabled(e);
    } catch {
      // keep previous state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Sync notes when selected plugin changes
  useEffect(() => {
    setNotes(selected?.notes ?? "");
  }, [selected?.notes]);

  // ---- Handlers ----

  const handleToggle = async (plugin: AdminPlugin, field: "enabled" | "featured") => {
    const updated = await updatePlugin({ id: plugin.id, [field]: !plugin[field] });
    if (selected?.id === plugin.id) setSelected(updated);
    await load();
  };

  const handleReview = async (plugin: AdminPlugin, enable: boolean) => {
    await updatePlugin({
      id: plugin.id,
      reviewed: true,
      enabled: enable,
    });
    if (selected?.id === plugin.id) setSelected(null);
    await load();
  };

  const handleNotesChange = (value: string) => {
    setNotes(value);
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    notesTimerRef.current = setTimeout(async () => {
      if (selected) {
        const updated = await updatePlugin({ id: selected.id, notes: value });
        setSelected(updated);
      }
    }, 800);
  };

  const handleAdd = async () => {
    if (!addPackage.trim()) return;
    setAddLoading(true);
    try {
      await addPluginByNpm({ npm_package: addPackage.trim() });
      setAddPackage("");
      setAddOpen(false);
      await load();
    } finally {
      setAddLoading(false);
    }
  };

  // ---- DnD handlers ----

  const handleDragStart = (index: number) => {
    dragItemRef.current = index;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    dragOverRef.current = index;
  };

  const handleDrop = async () => {
    const from = dragItemRef.current;
    const to = dragOverRef.current;
    if (from === null || to === null || from === to) return;

    const reordered = [...enabled];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    setEnabled(reordered);

    await reorderPlugins(reordered.map((p) => p.id));
    dragItemRef.current = null;
    dragOverRef.current = null;
  };

  // ---- Skeleton ----

  if (loading) {
    return (
      <div className="flex h-full">
        <div className="flex-1 p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <div className="w-96 shrink-0 border-l border-border p-6 space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* ---- Left Panel ---- */}
      <div className="flex-1 overflow-auto border-r border-border p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold uppercase tracking-wider [text-shadow:0_0_10px_rgba(0,255,65,0.25)]">
            Marketplace Curation
          </h1>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                className="bg-terminal/10 text-terminal border border-terminal/30 hover:bg-terminal/20"
              >
                <Plus className="size-4 mr-1.5" />
                Add Plugin
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Plugin by npm Package</DialogTitle>
                <DialogDescription>
                  Paste the npm package name to add it to the discovery queue.
                </DialogDescription>
              </DialogHeader>
              <Input
                className="font-mono"
                placeholder="@wopr-network/plugin-name"
                value={addPackage}
                onChange={(e) => setAddPackage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAdd();
                }}
              />
              <DialogFooter>
                <Button variant="ghost" onClick={() => setAddOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="ghost"
                  className="bg-terminal/10 text-terminal border border-terminal/30 hover:bg-terminal/20"
                  onClick={handleAdd}
                  disabled={addLoading || !addPackage.trim()}
                >
                  {addLoading ? "Adding..." : "Add"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Discovery Queue */}
        {queue.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Discovery Queue
              </h2>
              <Badge
                variant="secondary"
                className="bg-amber-500/15 text-amber-400 border border-amber-500/20 text-xs"
              >
                {queue.length}
              </Badge>
            </div>
            <div className="border border-amber-500/20 rounded-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-amber-500/5 hover:bg-amber-500/5">
                    <TableHead className="text-xs uppercase tracking-wider">Package</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider">Category</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queue.map((plugin) => (
                    <TableRow
                      key={plugin.id}
                      className={cn(
                        "cursor-pointer hover:bg-secondary/50",
                        selected?.id === plugin.id && "bg-terminal/5",
                      )}
                      onClick={() => setSelected(plugin)}
                    >
                      <TableCell>
                        <div>
                          <div className="text-sm font-medium">{plugin.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {plugin.npm_package}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("text-xs", categoryBadgeClass(plugin.category))}
                        >
                          {plugin.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-terminal hover:bg-terminal/10 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReview(plugin, true);
                            }}
                          >
                            Enable
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:bg-secondary text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReview(plugin, false);
                            }}
                          >
                            Ignore
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Enabled Plugins */}
        <div className="space-y-2">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Enabled Plugins
          </h2>
          <div className="border border-terminal/10 rounded-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary hover:bg-secondary">
                  <TableHead className="w-8" />
                  <TableHead className="text-xs uppercase tracking-wider">Name</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Category</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Featured</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Version</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Enabled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enabled.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <span className="text-sm text-muted-foreground font-mono">
                        &gt; No plugins enabled yet
                      </span>
                    </TableCell>
                  </TableRow>
                ) : (
                  enabled.map((plugin, index) => (
                    <TableRow
                      key={plugin.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={handleDrop}
                      className={cn(
                        "h-10 cursor-pointer hover:bg-secondary/50",
                        selected?.id === plugin.id && "bg-terminal/5",
                      )}
                      onClick={() => setSelected(plugin)}
                    >
                      <TableCell className="w-8">
                        <GripVertical className="size-4 text-muted-foreground cursor-grab" />
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{plugin.name}</div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("text-xs", categoryBadgeClass(plugin.category))}
                        >
                          {plugin.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={plugin.featured}
                          className="data-[state=checked]:bg-amber-500"
                          onClick={(e) => e.stopPropagation()}
                          onCheckedChange={() => handleToggle(plugin, "featured")}
                        />
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground font-mono">
                          v{plugin.version}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={plugin.enabled}
                          className="data-[state=checked]:bg-terminal"
                          onClick={(e) => e.stopPropagation()}
                          onCheckedChange={() => handleToggle(plugin, "enabled")}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* ---- Right Panel (Detail) ---- */}
      <div className="w-96 shrink-0 overflow-auto p-6 space-y-4">
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              {/* Header */}
              <div>
                <h2 className="text-lg font-bold">{selected.name}</h2>
                <p className="text-xs text-muted-foreground font-mono">{selected.npm_package}</p>
                <p className="text-sm text-muted-foreground mt-1">{selected.description}</p>
              </div>

              {/* Metadata */}
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="font-mono">v{selected.version}</span>
                <span>by {selected.author}</span>
                <Badge
                  variant="outline"
                  className={cn("text-xs", categoryBadgeClass(selected.category))}
                >
                  {selected.category}
                </Badge>
              </div>

              {/* SUPERPOWER.md Preview */}
              {selected.superpower_md && (
                <div className="space-y-1.5">
                  <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    SUPERPOWER.MD Preview
                  </h3>
                  <div className="rounded-sm border border-border bg-secondary/50 p-3 max-h-64 overflow-auto">
                    <pre className="whitespace-pre-wrap text-xs font-mono leading-relaxed">
                      {selected.superpower_md}
                    </pre>
                  </div>
                </div>
              )}

              {/* Toggles */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Enabled</span>
                  <Switch
                    checked={selected.enabled}
                    className="data-[state=checked]:bg-terminal"
                    onCheckedChange={() => handleToggle(selected, "enabled")}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm flex items-center gap-1.5">
                    <Star className="size-3.5" />
                    Featured
                  </span>
                  <Switch
                    checked={selected.featured}
                    className="data-[state=checked]:bg-amber-500"
                    onCheckedChange={() => handleToggle(selected, "featured")}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Internal Notes
                </h3>
                <Textarea
                  className="min-h-[80px] text-sm bg-black/30 border-border focus:border-terminal"
                  placeholder="Add internal notes about this plugin..."
                  value={notes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                />
              </div>

              {/* npm link */}
              <a
                href={`https://www.npmjs.com/package/${selected.npm_package}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-terminal hover:underline"
              >
                <Package className="size-3.5" />
                View on npm
                <ExternalLink className="size-3" />
              </a>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center h-full"
            >
              <span className="text-sm text-muted-foreground font-mono">
                &gt; Select a plugin to preview
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
