export type InstanceStatus = "running" | "stopped" | "degraded" | "error";

export interface Instance {
  id: string;
  name: string;
  template: string;
  status: InstanceStatus;
  provider: string;
  channels: string[];
  plugins: PluginInfo[];
  uptime: number | null;
  createdAt: string;
}

export interface PluginInfo {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
}

export interface ChannelInfo {
  id: string;
  name: string;
  type: string;
  status: "connected" | "disconnected" | "error";
}

export interface SessionInfo {
  id: string;
  userId: string;
  messageCount: number;
  startedAt: string;
  lastActivityAt: string;
}

export interface InstanceDetail extends Instance {
  config: Record<string, unknown>;
  channelDetails: ChannelInfo[];
  sessions: SessionInfo[];
  resourceUsage: {
    memoryMb: number;
    cpuPercent: number;
  };
}

export interface InstanceTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  defaultPlugins: string[];
}

// --- Mock data ---

const MOCK_TEMPLATES: InstanceTemplate[] = [
  {
    id: "general",
    name: "General Assistant",
    description: "A versatile assistant for general-purpose conversations.",
    icon: "Bot",
    defaultPlugins: ["memory", "web-search"],
  },
  {
    id: "coding",
    name: "Code Helper",
    description: "Specialized for code review, debugging, and development tasks.",
    icon: "Code",
    defaultPlugins: ["memory", "code-executor", "git"],
  },
  {
    id: "discord-bot",
    name: "Discord Bot",
    description: "A Discord bot with moderation and community management features.",
    icon: "MessageSquare",
    defaultPlugins: ["memory", "discord", "moderation"],
  },
  {
    id: "data-analyst",
    name: "Data Analyst",
    description: "Analyzes datasets, generates charts, and provides insights.",
    icon: "BarChart",
    defaultPlugins: ["memory", "data-tools", "chart-gen"],
  },
  {
    id: "custom",
    name: "Custom",
    description: "Start from scratch with a blank configuration.",
    icon: "Settings",
    defaultPlugins: [],
  },
];

const MOCK_INSTANCES: Instance[] = [
  {
    id: "inst-001",
    name: "prod-assistant",
    template: "General Assistant",
    status: "running",
    provider: "anthropic",
    channels: ["discord-general", "slack-eng"],
    plugins: [
      { id: "p1", name: "memory", version: "1.2.0", enabled: true },
      { id: "p2", name: "web-search", version: "0.9.1", enabled: true },
    ],
    uptime: 86400,
    createdAt: "2026-01-15T10:00:00Z",
  },
  {
    id: "inst-002",
    name: "code-review-bot",
    template: "Code Helper",
    status: "running",
    provider: "anthropic",
    channels: ["github-prs"],
    plugins: [
      { id: "p3", name: "memory", version: "1.2.0", enabled: true },
      { id: "p4", name: "code-executor", version: "2.0.0", enabled: true },
      { id: "p5", name: "git", version: "1.0.0", enabled: true },
    ],
    uptime: 172800,
    createdAt: "2026-01-10T08:30:00Z",
  },
  {
    id: "inst-003",
    name: "community-mod",
    template: "Discord Bot",
    status: "degraded",
    provider: "openai",
    channels: ["discord-main"],
    plugins: [
      { id: "p6", name: "memory", version: "1.2.0", enabled: true },
      { id: "p7", name: "discord", version: "3.1.0", enabled: true },
      { id: "p8", name: "moderation", version: "1.5.0", enabled: false },
    ],
    uptime: 3600,
    createdAt: "2026-02-01T14:00:00Z",
  },
  {
    id: "inst-004",
    name: "analytics-engine",
    template: "Data Analyst",
    status: "stopped",
    provider: "anthropic",
    channels: [],
    plugins: [
      { id: "p9", name: "memory", version: "1.2.0", enabled: true },
      { id: "p10", name: "data-tools", version: "0.5.0", enabled: true },
    ],
    uptime: null,
    createdAt: "2026-02-05T09:00:00Z",
  },
  {
    id: "inst-005",
    name: "broken-experiment",
    template: "Custom",
    status: "error",
    provider: "openai",
    channels: ["test-channel"],
    plugins: [],
    uptime: null,
    createdAt: "2026-02-10T16:00:00Z",
  },
];

function getMockDetail(instance: Instance): InstanceDetail {
  return {
    ...instance,
    config: {
      model: instance.provider === "anthropic" ? "claude-sonnet-4-5-20250514" : "gpt-4o",
      maxTokens: 4096,
      temperature: 0.7,
      systemPrompt: `You are ${instance.name}, a helpful assistant.`,
    },
    channelDetails: instance.channels.map((ch, i) => ({
      id: `ch-${i}`,
      name: ch,
      type: ch.startsWith("discord") ? "discord" : ch.startsWith("slack") ? "slack" : "other",
      status: instance.status === "running" ? "connected" : "disconnected",
    })),
    sessions:
      instance.status === "running"
        ? [
            {
              id: "sess-001",
              userId: "user-alice",
              messageCount: 42,
              startedAt: "2026-02-12T08:00:00Z",
              lastActivityAt: "2026-02-12T09:30:00Z",
            },
            {
              id: "sess-002",
              userId: "user-bob",
              messageCount: 17,
              startedAt: "2026-02-12T09:00:00Z",
              lastActivityAt: "2026-02-12T09:25:00Z",
            },
          ]
        : [],
    resourceUsage: {
      memoryMb: instance.status === "running" ? 256 : 0,
      cpuPercent: instance.status === "running" ? 12.5 : 0,
    },
  };
}

// --- API client ---

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// Use mock data until the backend is ready.
// Each function tries the real API first and falls back to mocks.

export async function listInstances(): Promise<Instance[]> {
  try {
    return await apiFetch<Instance[]>("/instances");
  } catch {
    return MOCK_INSTANCES;
  }
}

export async function getInstance(id: string): Promise<InstanceDetail> {
  try {
    return await apiFetch<InstanceDetail>(`/instances/${id}`);
  } catch {
    const inst = MOCK_INSTANCES.find((i) => i.id === id);
    if (!inst) throw new Error(`Instance ${id} not found`);
    return getMockDetail(inst);
  }
}

export async function createInstance(data: {
  name: string;
  template: string;
  provider: string;
  channels: string[];
  plugins: string[];
}): Promise<Instance> {
  try {
    return await apiFetch<Instance>("/instances", {
      method: "POST",
      body: JSON.stringify(data),
    });
  } catch {
    // Mock: return a fake created instance
    const newInst: Instance = {
      id: `inst-${Date.now()}`,
      name: data.name,
      template: data.template,
      status: "stopped",
      provider: data.provider,
      channels: data.channels,
      plugins: data.plugins.map((p, i) => ({
        id: `p-new-${i}`,
        name: p,
        version: "1.0.0",
        enabled: true,
      })),
      uptime: null,
      createdAt: new Date().toISOString(),
    };
    return newInst;
  }
}

export async function controlInstance(
  id: string,
  action: "start" | "stop" | "restart" | "destroy",
): Promise<void> {
  try {
    await apiFetch(`/instances/${id}/${action}`, { method: "POST" });
  } catch {
    // Mock: no-op
  }
}

export async function listTemplates(): Promise<InstanceTemplate[]> {
  try {
    return await apiFetch<InstanceTemplate[]>("/templates");
  } catch {
    return MOCK_TEMPLATES;
  }
}

// --- Observability types ---

export type HealthStatus = "healthy" | "degraded" | "unhealthy";
export type LogLevel = "debug" | "info" | "warn" | "error";

export interface PluginHealth {
  name: string;
  status: HealthStatus;
  latencyMs: number | null;
  lastCheck: string;
}

export interface ProviderHealth {
  name: string;
  available: boolean;
  latencyMs: number | null;
}

export interface HealthHistoryEntry {
  timestamp: string;
  status: HealthStatus;
}

export interface InstanceHealth {
  status: HealthStatus;
  uptime: number;
  activeSessions: number;
  totalSessions: number;
  plugins: PluginHealth[];
  providers: ProviderHealth[];
  history: HealthHistoryEntry[];
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  source: string;
  message: string;
}

export interface MetricsSnapshot {
  timestamp: string;
  requestCount: number;
  latencyP50: number;
  latencyP95: number;
  latencyP99: number;
  activeSessions: number;
  memoryMb: number;
}

export interface TokenUsage {
  provider: string;
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
}

export interface PluginEventCount {
  plugin: string;
  count: number;
}

export interface InstanceMetrics {
  timeseries: MetricsSnapshot[];
  tokenUsage: TokenUsage[];
  pluginEvents: PluginEventCount[];
}

export interface FleetInstance {
  id: string;
  name: string;
  status: InstanceStatus;
  health: HealthStatus;
  uptime: number | null;
  pluginCount: number;
  sessionCount: number;
  provider: string;
}

// --- Observability mock data ---

function generateTimeseries(count: number): MetricsSnapshot[] {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => {
    const t = now - (count - 1 - i) * 60_000;
    return {
      timestamp: new Date(t).toISOString(),
      requestCount: Math.floor(Math.random() * 50) + 10,
      latencyP50: Math.floor(Math.random() * 100) + 50,
      latencyP95: Math.floor(Math.random() * 200) + 150,
      latencyP99: Math.floor(Math.random() * 400) + 300,
      activeSessions: Math.floor(Math.random() * 5) + 1,
      memoryMb: Math.floor(Math.random() * 100) + 200,
    };
  });
}

function generateHealthHistory(count: number): HealthHistoryEntry[] {
  const now = Date.now();
  const statuses: HealthStatus[] = ["healthy", "healthy", "healthy", "degraded", "healthy"];
  return Array.from({ length: count }, (_, i) => ({
    timestamp: new Date(now - (count - 1 - i) * 300_000).toISOString(),
    status: statuses[i % statuses.length],
  }));
}

function generateLogs(count: number): LogEntry[] {
  const levels: LogLevel[] = ["info", "info", "debug", "warn", "error", "info"];
  const sources = ["daemon", "memory", "discord", "web-search", "session-mgr"];
  const messages = [
    "Request processed successfully",
    "Plugin loaded",
    "Session started for user-alice",
    "High memory usage detected",
    "Provider rate limit approaching",
    "WebSocket connection established",
    "Cache miss for embedding lookup",
    "Plugin event dispatched",
    "Health check completed",
    "Connection timeout to provider",
  ];
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => ({
    id: `log-${i}`,
    timestamp: new Date(now - (count - 1 - i) * 5000).toISOString(),
    level: levels[i % levels.length],
    source: sources[i % sources.length],
    message: messages[i % messages.length],
  }));
}

const MOCK_HEALTH: Record<string, InstanceHealth> = {
  "inst-001": {
    status: "healthy",
    uptime: 86400,
    activeSessions: 2,
    totalSessions: 47,
    plugins: [
      { name: "memory", status: "healthy", latencyMs: 12, lastCheck: "2026-02-12T09:30:00Z" },
      { name: "web-search", status: "healthy", latencyMs: 45, lastCheck: "2026-02-12T09:30:00Z" },
    ],
    providers: [
      { name: "anthropic", available: true, latencyMs: 230 },
      { name: "openai", available: true, latencyMs: 180 },
    ],
    history: generateHealthHistory(20),
  },
  "inst-003": {
    status: "degraded",
    uptime: 3600,
    activeSessions: 0,
    totalSessions: 5,
    plugins: [
      { name: "memory", status: "healthy", latencyMs: 15, lastCheck: "2026-02-12T09:30:00Z" },
      { name: "discord", status: "degraded", latencyMs: 2500, lastCheck: "2026-02-12T09:30:00Z" },
      {
        name: "moderation",
        status: "unhealthy",
        latencyMs: null,
        lastCheck: "2026-02-12T09:25:00Z",
      },
    ],
    providers: [{ name: "openai", available: true, latencyMs: 350 }],
    history: generateHealthHistory(20),
  },
};

const MOCK_METRICS: Record<string, InstanceMetrics> = {
  "inst-001": {
    timeseries: generateTimeseries(30),
    tokenUsage: [
      { provider: "anthropic", inputTokens: 125000, outputTokens: 89000, totalCost: 4.28 },
      { provider: "openai", inputTokens: 45000, outputTokens: 32000, totalCost: 1.54 },
    ],
    pluginEvents: [
      { plugin: "memory", count: 340 },
      { plugin: "web-search", count: 128 },
    ],
  },
};

const MOCK_FLEET: FleetInstance[] = MOCK_INSTANCES.map((inst) => ({
  id: inst.id,
  name: inst.name,
  status: inst.status,
  health:
    inst.status === "running" ? "healthy" : inst.status === "degraded" ? "degraded" : "unhealthy",
  uptime: inst.uptime,
  pluginCount: inst.plugins.length,
  sessionCount: inst.status === "running" ? 2 : 0,
  provider: inst.provider,
}));

// --- Observability API functions ---

export async function getInstanceHealth(id: string): Promise<InstanceHealth> {
  try {
    return await apiFetch<InstanceHealth>(`/instances/${id}/health`);
  } catch {
    return (
      MOCK_HEALTH[id] ?? {
        status: "unhealthy" as const,
        uptime: 0,
        activeSessions: 0,
        totalSessions: 0,
        plugins: [],
        providers: [],
        history: [],
      }
    );
  }
}

export async function getInstanceLogs(
  id: string,
  params?: { level?: LogLevel; source?: string; search?: string },
): Promise<LogEntry[]> {
  try {
    const qs = new URLSearchParams();
    if (params?.level) qs.set("level", params.level);
    if (params?.source) qs.set("source", params.source);
    if (params?.search) qs.set("search", params.search);
    const query = qs.toString();
    return await apiFetch<LogEntry[]>(`/instances/${id}/logs${query ? `?${query}` : ""}`);
  } catch {
    let logs = generateLogs(50);
    if (params?.level) logs = logs.filter((l) => l.level === params.level);
    if (params?.source) logs = logs.filter((l) => l.source === params.source);
    if (params?.search) {
      const term = params.search.toLowerCase();
      logs = logs.filter((l) => l.message.toLowerCase().includes(term));
    }
    return logs;
  }
}

export async function getInstanceMetrics(id: string): Promise<InstanceMetrics> {
  try {
    return await apiFetch<InstanceMetrics>(`/instances/${id}/metrics`);
  } catch {
    return (
      MOCK_METRICS[id] ?? {
        timeseries: generateTimeseries(30),
        tokenUsage: [
          { provider: "anthropic", inputTokens: 50000, outputTokens: 35000, totalCost: 1.7 },
        ],
        pluginEvents: [{ plugin: "memory", count: 100 }],
      }
    );
  }
}

export async function getFleetHealth(): Promise<FleetInstance[]> {
  try {
    return await apiFetch<FleetInstance[]>("/fleet/health");
  } catch {
    return MOCK_FLEET;
  }
}
