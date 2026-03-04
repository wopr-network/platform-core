import { trpcVanilla } from "./trpc";

// ---- Types ----

/** A plugin as seen by the admin marketplace curation UI */
export interface AdminPlugin {
  id: string;
  npm_package: string;
  name: string;
  description: string;
  version: string;
  author: string;
  category: string;
  icon_url: string | null;
  enabled: boolean;
  featured: boolean;
  sort_order: number;
  notes: string;
  superpower_md: string | null;
  discovered_at: number;
  enabled_at: number | null;
  reviewed: boolean;
}

/** Payload for manual add */
export interface AddPluginRequest {
  npm_package: string;
}

/** Payload for updating a plugin */
export interface UpdatePluginRequest {
  id: string;
  enabled?: boolean;
  featured?: boolean;
  sort_order?: number;
  notes?: string;
  reviewed?: boolean;
}

// ---- API calls ----

export async function getDiscoveryQueue(): Promise<AdminPlugin[]> {
  const all: AdminPlugin[] = await trpcVanilla.adminMarketplace.listPlugins.query(undefined);
  return all.filter((p) => !p.reviewed);
}

export async function getEnabledPlugins(): Promise<AdminPlugin[]> {
  const all: AdminPlugin[] = await trpcVanilla.adminMarketplace.listPlugins.query(undefined);
  return all.filter((p) => p.enabled && p.reviewed).sort((a, b) => a.sort_order - b.sort_order);
}

export async function getAllPlugins(): Promise<AdminPlugin[]> {
  return trpcVanilla.adminMarketplace.listPlugins.query(undefined);
}

export async function updatePlugin(req: UpdatePluginRequest): Promise<AdminPlugin> {
  return trpcVanilla.adminMarketplace.updatePlugin.mutate(req);
}

export async function addPluginByNpm(req: AddPluginRequest): Promise<AdminPlugin> {
  return trpcVanilla.adminMarketplace.addPlugin.mutate(req);
}

export async function reorderPlugins(orderedIds: string[]): Promise<void> {
  await Promise.all(
    orderedIds.map((id, i) =>
      trpcVanilla.adminMarketplace.updatePlugin.mutate({ id, sort_order: i }),
    ),
  );
}
