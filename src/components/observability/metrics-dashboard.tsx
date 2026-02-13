"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InstanceMetrics } from "@/lib/api";
import { getInstanceMetrics } from "@/lib/api";

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function MetricsDashboard({ instanceId }: { instanceId: string }) {
  const [metrics, setMetrics] = useState<InstanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getInstanceMetrics(instanceId);
      setMetrics(data);
    } finally {
      setLoading(false);
    }
  }, [instanceId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading && !metrics) {
    return <div className="text-muted-foreground">Loading metrics...</div>;
  }

  if (!metrics) {
    return <div className="text-muted-foreground">No metrics data available.</div>;
  }

  const timeseriesData = metrics.timeseries.map((s) => ({
    ...s,
    time: formatTime(s.timestamp),
  }));

  const tokenData = metrics.tokenUsage.map((t) => ({
    provider: t.provider,
    input: t.inputTokens,
    output: t.outputTokens,
    cost: t.totalCost,
  }));

  const pluginData = metrics.pluginEvents.map((e) => ({
    plugin: e.plugin,
    events: e.count,
  }));

  return (
    <div className="space-y-6">
      {/* Request Count */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Request Count</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={timeseriesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#888" }} />
              <YAxis tick={{ fontSize: 11, fill: "#888" }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }}
                labelStyle={{ color: "#888" }}
              />
              <Line
                type="monotone"
                dataKey="requestCount"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="Requests"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Latency Percentiles */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Response Latency (ms)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={timeseriesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#888" }} />
              <YAxis tick={{ fontSize: 11, fill: "#888" }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }}
                labelStyle={{ color: "#888" }}
              />
              <Line
                type="monotone"
                dataKey="latencyP50"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
                name="p50"
              />
              <Line
                type="monotone"
                dataKey="latencyP95"
                stroke="#eab308"
                strokeWidth={2}
                dot={false}
                name="p95"
              />
              <Line
                type="monotone"
                dataKey="latencyP99"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
                name="p99"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Token Usage */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Token Usage by Provider</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={tokenData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="provider" tick={{ fontSize: 11, fill: "#888" }} />
                <YAxis tick={{ fontSize: 11, fill: "#888" }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }}
                  labelStyle={{ color: "#888" }}
                />
                <Bar dataKey="input" fill="#3b82f6" name="Input Tokens" />
                <Bar dataKey="output" fill="#8b5cf6" name="Output Tokens" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 space-y-1">
              {metrics.tokenUsage.map((t) => (
                <div
                  key={t.provider}
                  className="flex justify-between text-xs text-muted-foreground"
                >
                  <span className="capitalize">{t.provider}</span>
                  <span className="font-medium text-foreground">${t.totalCost.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Plugin Events */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Plugin Events</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={pluginData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="plugin" tick={{ fontSize: 11, fill: "#888" }} />
                <YAxis tick={{ fontSize: 11, fill: "#888" }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }}
                  labelStyle={{ color: "#888" }}
                />
                <Bar dataKey="events" fill="#22c55e" name="Events" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active Sessions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Active Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={timeseriesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#888" }} />
                <YAxis tick={{ fontSize: 11, fill: "#888" }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }}
                  labelStyle={{ color: "#888" }}
                />
                <Line
                  type="monotone"
                  dataKey="activeSessions"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  name="Sessions"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Memory Usage */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Memory Usage (MB)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={timeseriesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#888" }} />
                <YAxis tick={{ fontSize: 11, fill: "#888" }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }}
                  labelStyle={{ color: "#888" }}
                />
                <Line
                  type="monotone"
                  dataKey="memoryMb"
                  stroke="#ec4899"
                  strokeWidth={2}
                  dot={false}
                  name="Memory"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
