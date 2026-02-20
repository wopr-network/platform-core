import {
  controlInstance,
  createInstance,
  getInstanceHealth,
  getInstanceLogs,
  listInstances,
} from "@/lib/api";
import { listMarketplacePlugins } from "@/lib/marketplace-data";

/** Actions that require UI confirmation before executing. */
const DESTRUCTIVE_ACTIONS = new Set(["destroy"]);

/**
 * Callback type for requesting UI confirmation on destructive actions.
 * The registration code passes this in from the React layer.
 */
export type ConfirmCallback = (message: string) => Promise<boolean>;

export function getWebMCPTools(confirm: ConfirmCallback): ModelContextTool[] {
  return [
    {
      name: "wopr_list_instances",
      description:
        "List all WOPR bot instances with their status, uptime, template, provider, and installed plugins.",
      inputSchema: {
        type: "object",
        properties: {},
      },
      handler: async () => {
        try {
          const instances = await listInstances();
          return { instances };
        } catch (err) {
          return { error: err instanceof Error ? err.message : String(err) };
        }
      },
    },
    {
      name: "wopr_create_instance",
      description: "Create a new WOPR bot instance from a template.",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Name for the new instance" },
          template: {
            type: "string",
            description: "Preset name (e.g. 'Discord AI Bot', 'Custom')",
          },
          provider: {
            type: "string",
            description: "AI provider (e.g. 'anthropic', 'openai')",
          },
          channels: {
            type: "array",
            items: { type: "string" },
            description: "Channel plugins to enable (e.g. ['discord'])",
          },
          plugins: {
            type: "array",
            items: { type: "string" },
            description: "Additional plugin IDs to install",
          },
        },
        required: ["name", "template", "provider"],
      },
      handler: async (params) => {
        try {
          const instance = await createInstance({
            name: params.name as string,
            template: params.template as string,
            provider: params.provider as string,
            channels: (params.channels as string[]) ?? [],
            plugins: (params.plugins as string[]) ?? [],
          });
          return { instance };
        } catch (err) {
          return { error: err instanceof Error ? err.message : String(err) };
        }
      },
    },
    {
      name: "wopr_control_instance",
      description:
        "Control a WOPR bot instance: start, stop, or restart it. The 'destroy' action requires UI confirmation.",
      inputSchema: {
        type: "object",
        properties: {
          instanceId: { type: "string", description: "The instance ID" },
          action: {
            type: "string",
            enum: ["start", "stop", "restart", "destroy"],
            description: "Action to perform",
          },
        },
        required: ["instanceId", "action"],
      },
      handler: async (params) => {
        try {
          const action = params.action as "start" | "stop" | "restart" | "destroy";
          const instanceId = params.instanceId as string;

          if (DESTRUCTIVE_ACTIONS.has(action)) {
            const confirmed = await confirm(
              `Are you sure you want to ${action} instance ${instanceId}? This action cannot be undone.`,
            );
            if (!confirmed) {
              return { error: "Action cancelled by user", cancelled: true };
            }
          }

          await controlInstance(instanceId, action);
          return { ok: true, instanceId, action };
        } catch (err) {
          return { error: err instanceof Error ? err.message : String(err) };
        }
      },
    },
    {
      name: "wopr_install_plugin",
      description: "Install a plugin on a WOPR bot instance.",
      inputSchema: {
        type: "object",
        properties: {
          instanceId: {
            type: "string",
            description: "The instance ID to install the plugin on",
          },
          pluginName: { type: "string", description: "The plugin ID to install" },
        },
        required: ["instanceId", "pluginName"],
      },
      handler: async (params) => {
        try {
          // The current UI uses mock install flow (install-wizard.tsx).
          // The real install endpoint will be POST /fleet/bots/:id/plugins
          // For now, return the plugin manifest as acknowledgment.
          const allPlugins = await listMarketplacePlugins();
          const plugin = allPlugins.find((p) => p.id === (params.pluginName as string));
          if (!plugin) {
            return { error: `Plugin '${params.pluginName}' not found in marketplace` };
          }
          return {
            status: "pending",
            message: `Plugin '${plugin.name}' queued for installation on instance ${params.instanceId}. Full install API coming in a future release.`,
            plugin: { id: plugin.id, name: plugin.name, version: plugin.version },
          };
        } catch (err) {
          return { error: err instanceof Error ? err.message : String(err) };
        }
      },
    },
    {
      name: "wopr_browse_plugins",
      description:
        "Browse available plugins in the WOPR marketplace. Optionally filter by category.",
      inputSchema: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description:
              "Filter by category: channel, provider, voice, memory, context, webhook, integration, ui, moderation, analytics",
          },
        },
      },
      handler: async (params) => {
        try {
          let plugins = await listMarketplacePlugins();
          if (params.category) {
            plugins = plugins.filter((p) => p.category === params.category);
          }
          return {
            plugins: plugins.map((p) => ({
              id: p.id,
              name: p.name,
              description: p.description,
              version: p.version,
              category: p.category,
              capabilities: p.capabilities,
              author: p.author,
            })),
          };
        } catch (err) {
          return { error: err instanceof Error ? err.message : String(err) };
        }
      },
    },
    {
      name: "wopr_get_instance_health",
      description:
        "Get detailed health information for a WOPR bot instance, including uptime, session count, plugin health, and provider status.",
      inputSchema: {
        type: "object",
        properties: {
          instanceId: { type: "string", description: "The instance ID" },
        },
        required: ["instanceId"],
      },
      handler: async (params) => {
        try {
          const health = await getInstanceHealth(params.instanceId as string);
          return { health };
        } catch (err) {
          return { error: err instanceof Error ? err.message : String(err) };
        }
      },
    },
    {
      name: "wopr_view_logs",
      description: "View recent logs for a WOPR bot instance. Optionally filter by log level.",
      inputSchema: {
        type: "object",
        properties: {
          instanceId: { type: "string", description: "The instance ID" },
          level: {
            type: "string",
            enum: ["debug", "info", "warn", "error"],
            description: "Filter by log level",
          },
          limit: {
            type: "number",
            description: "Number of log entries to return (default 50)",
          },
        },
        required: ["instanceId"],
      },
      handler: async (params) => {
        try {
          const logs = await getInstanceLogs(params.instanceId as string, {
            level: params.level as "debug" | "info" | "warn" | "error" | undefined,
          });
          const limit = (params.limit as number) ?? 50;
          return { logs: logs.slice(0, limit) };
        } catch (err) {
          return { error: err instanceof Error ? err.message : String(err) };
        }
      },
    },
  ];
}
