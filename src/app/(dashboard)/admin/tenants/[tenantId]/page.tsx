"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type {
  AdminNote,
  BotInstance,
  CreditAdjustment,
  TenantDetailResponse,
  UsageSummary,
} from "@/lib/admin-api";
import {
  addTenantNote,
  banTenant,
  changeRole,
  getTenantAgents,
  getTenantDetail,
  getTenantNotes,
  getTenantUsageByCapability,
  getTransactions,
  getTransactionsCsv,
  grantCredits,
  reactivateTenant,
  refundCredits,
  suspendTenant,
} from "@/lib/admin-api";

// ---- Helpers ----

function formatCents(cents: number): string {
  if (cents < 0) return `-$${(Math.abs(cents) / 100).toFixed(2)}`;
  return `$${(cents / 100).toFixed(2)}`;
}

function formatTimestamp(ts: number | null | undefined): string {
  if (!ts) return "Never";
  return new Date(ts).toLocaleString();
}

function formatRelativeTime(ts: number | null | undefined): string {
  if (!ts) return "Never";
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---- Status / Role badge helpers ----

function statusBadgeClass(status: string): string {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    case "suspended":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
    case "grace_period":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
    case "banned":
      return "bg-red-200 text-red-900 dark:bg-red-900/50 dark:text-red-200";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }
}

function roleBadgeClass(role: string): string {
  switch (role) {
    case "platform_admin":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
    case "tenant_admin":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }
}

function billingStateBadgeVariant(
  state: string,
): "default" | "destructive" | "outline" | "secondary" {
  switch (state) {
    case "active":
      return "default";
    case "suspended":
      return "secondary";
    case "destroyed":
      return "destructive";
    default:
      return "outline";
  }
}

// ---- Section: Header ----

function TenantHeader({
  detail,
  tenantId,
  onRefresh,
}: {
  detail: TenantDetailResponse;
  tenantId: string;
  onRefresh: () => void;
}) {
  const user = detail.user;
  const status = detail.status.status;

  function copyTenantId() {
    navigator.clipboard.writeText(tenantId).catch(() => {});
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">{user?.name ?? user?.email ?? "Unknown"}</h1>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(status)}`}
              >
                {status}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadgeClass(user?.role ?? "user")}`}
              >
                {user?.role ?? "user"}
              </span>
            </div>
            {user?.name && <p className="text-muted-foreground">{user.email}</p>}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <button
                type="button"
                onClick={copyTenantId}
                className="font-mono hover:text-foreground transition-colors cursor-pointer"
                title="Click to copy"
              >
                {tenantId}
              </button>
              <span>·</span>
              <span>Joined {formatTimestamp(user?.created_at)}</span>
              <span>·</span>
              <span>Last seen {formatRelativeTime(user?.last_seen)}</span>
            </div>
            {detail.status.statusReason && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Status reason: {detail.status.statusReason}
              </p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={onRefresh}>
              Refresh
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Section: Credits ----

function CreditsSection({
  detail,
  tenantId,
  onRefresh,
}: {
  detail: TenantDetailResponse;
  tenantId: string;
  onRefresh: () => void;
}) {
  const [grantOpen, setGrantOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [grantAmount, setGrantAmount] = useState("");
  const [grantReason, setGrantReason] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function handleGrant() {
    const parsed = parseFloat(grantAmount);
    if (Number.isNaN(parsed) || parsed <= 0) return;
    const cents = Math.round(parsed * 100);
    if (!cents || !grantReason.trim()) return;
    try {
      await grantCredits(tenantId, cents, grantReason);
      setMsg(`Granted ${formatCents(cents)}`);
      setGrantOpen(false);
      setGrantAmount("");
      setGrantReason("");
      onRefresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed");
    }
  }

  async function handleRefund() {
    const parsed = parseFloat(refundAmount);
    if (Number.isNaN(parsed) || parsed <= 0) return;
    const cents = Math.round(parsed * 100);
    if (!cents || !refundReason.trim()) return;
    try {
      await refundCredits(tenantId, cents, refundReason);
      setMsg(`Refunded ${formatCents(cents)}`);
      setRefundOpen(false);
      setRefundAmount("");
      setRefundReason("");
      onRefresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed");
    }
  }

  const balance = detail.credits.balance_cents;
  const usageTotal = detail.usage.total;
  const totalChargeDollars = usageTotal.totalCharge / 100;
  const dailyBurn = totalChargeDollars / 30;
  const runwayDays = dailyBurn > 0 ? Math.floor(balance / 100 / dailyBurn) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Credits</CardTitle>
      </CardHeader>
      <CardContent>
        {msg && <p className="mb-3 text-sm text-green-600 dark:text-green-400">{msg}</p>}
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Balance</p>
            <p className="text-2xl font-bold font-mono">{formatCents(balance)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">30-day burn</p>
            <p className="text-lg font-semibold">${totalChargeDollars.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Runway</p>
            <p className="text-lg font-semibold">
              {runwayDays != null ? `~${runwayDays} days` : "N/A"}
            </p>
          </div>
        </div>
        <div className="mt-4 flex gap-2 flex-wrap">
          <Dialog open={grantOpen} onOpenChange={setGrantOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                Grant Credits
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Grant Credits</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Amount (USD)</Label>
                  <Input
                    placeholder="10.00"
                    value={grantAmount}
                    onChange={(e) => setGrantAmount(e.target.value)}
                    type="number"
                    min="0.01"
                    step="0.01"
                  />
                </div>
                <div>
                  <Label>Reason</Label>
                  <Input
                    placeholder="Goodwill for outage"
                    value={grantReason}
                    onChange={(e) => setGrantReason(e.target.value)}
                  />
                </div>
                <Button onClick={handleGrant}>Grant</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                Refund
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Refund Credits</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Amount (USD)</Label>
                  <Input
                    placeholder="5.00"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    type="number"
                    min="0.01"
                    step="0.01"
                  />
                </div>
                <div>
                  <Label>Reason</Label>
                  <Input
                    placeholder="Billing error"
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                  />
                </div>
                <Button onClick={handleRefund}>Refund</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Section: Agents ----

function AgentsSection({ agents }: { agents: BotInstance[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Agents ({agents.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {agents.length === 0 ? (
          <p className="text-muted-foreground">No agents found</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Billing State</TableHead>
                <TableHead>Node</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Suspended</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell className="font-medium">{agent.name}</TableCell>
                  <TableCell>
                    <code className="text-xs text-muted-foreground">{agent.id}</code>
                  </TableCell>
                  <TableCell>
                    <Badge variant={billingStateBadgeVariant(agent.billingState)}>
                      {agent.billingState}
                    </Badge>
                  </TableCell>
                  <TableCell>{agent.nodeId ?? "—"}</TableCell>
                  <TableCell>{new Date(agent.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {agent.suspendedAt ? new Date(agent.suspendedAt).toLocaleDateString() : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ---- Section: Usage ----

interface DailyUsage {
  date: string;
  cost: number;
  charge: number;
}

function aggregateByDay(summaries: UsageSummary[]): DailyUsage[] {
  const map = new Map<string, { cost: number; charge: number }>();
  for (const s of summaries) {
    const date = new Date(s.window_start).toISOString().slice(0, 10);
    const existing = map.get(date) ?? { cost: 0, charge: 0 };
    map.set(date, {
      cost: existing.cost + s.total_cost / 100,
      charge: existing.charge + s.total_charge / 100,
    });
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, { cost, charge }]) => ({ date, cost, charge }));
}

function UsageSection({
  usageData,
  total,
}: {
  usageData: UsageSummary[];
  total: { totalCost: number; totalCharge: number; eventCount: number };
}) {
  const dailyData = aggregateByDay(usageData);

  // Aggregate by capability
  const byCapability = new Map<string, { eventCount: number; cost: number; charge: number }>();
  for (const s of usageData) {
    const existing = byCapability.get(s.capability) ?? { eventCount: 0, cost: 0, charge: 0 };
    byCapability.set(s.capability, {
      eventCount: existing.eventCount + s.event_count,
      cost: existing.cost + s.total_cost / 100,
      charge: existing.charge + s.total_charge / 100,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage (Last 30 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-3 mb-6">
          <div>
            <p className="text-sm text-muted-foreground">Total Events</p>
            <p className="text-xl font-semibold">{total.eventCount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Provider Cost</p>
            <p className="text-xl font-semibold">${(total.totalCost / 100).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Charged</p>
            <p className="text-xl font-semibold">${(total.totalCharge / 100).toFixed(2)}</p>
          </div>
        </div>

        {dailyData.length > 0 ? (
          <div className="mb-6 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v.toFixed(2)}`} />
                <Tooltip
                  formatter={(value) =>
                    typeof value === "number" ? `$${value.toFixed(4)}` : String(value)
                  }
                />
                <Area
                  type="monotone"
                  dataKey="charge"
                  name="Charged"
                  stroke="#6366f1"
                  fill="#6366f120"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="cost"
                  name="Cost"
                  stroke="#10b981"
                  fill="#10b98120"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="mb-6 text-muted-foreground">No usage data for this period</p>
        )}

        {byCapability.size > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Capability</TableHead>
                <TableHead>Events</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Charged</TableHead>
                <TableHead>Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from(byCapability.entries()).map(([cap, data]) => {
                const margin =
                  data.charge > 0 ? ((data.charge - data.cost) / data.charge) * 100 : 0;
                return (
                  <TableRow key={cap}>
                    <TableCell className="font-medium">{cap}</TableCell>
                    <TableCell>{data.eventCount.toLocaleString()}</TableCell>
                    <TableCell>${data.cost.toFixed(4)}</TableCell>
                    <TableCell>${data.charge.toFixed(4)}</TableCell>
                    <TableCell>{margin.toFixed(0)}%</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ---- Section: Transactions ----

function TransactionsSection({
  transactions,
  tenantId,
}: {
  transactions: { entries: CreditAdjustment[]; total: number };
  tenantId: string;
}) {
  const [entries, setEntries] = useState(transactions.entries);
  const [filteredTotal, setFilteredTotal] = useState(transactions.total);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setEntries(transactions.entries);
    setFilteredTotal(transactions.total);
  }, [transactions.entries, transactions.total]);

  const PAGE_SIZE = 50;

  async function applyFilter(type: string) {
    setTypeFilter(type);
    setPage(0);
    try {
      const result = await getTransactions(tenantId, {
        type: type === "all" ? undefined : (type as "grant" | "refund" | "correction"),
        limit: PAGE_SIZE,
        offset: 0,
      });
      setEntries(result.entries);
      setFilteredTotal(result.total);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed to load transactions");
    }
  }

  async function loadMore() {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await getTransactions(tenantId, {
        type: typeFilter === "all" ? undefined : (typeFilter as "grant" | "refund" | "correction"),
        limit: PAGE_SIZE,
        offset: nextPage * PAGE_SIZE,
      });
      setEntries((prev) => [...prev, ...result.entries]);
      setPage(nextPage);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleExportCsv() {
    try {
      const csv = await getTransactionsCsv(tenantId);
      downloadCsv(csv, `transactions-${tenantId}.csv`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Export failed");
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Transactions ({transactions.total})</CardTitle>
          <Button size="sm" variant="outline" onClick={handleExportCsv}>
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {msg && <p className="mb-3 text-sm text-red-500">{msg}</p>}
        <div className="mb-4">
          <Select value={typeFilter} onValueChange={applyFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="grant">Grant</SelectItem>
              <SelectItem value="refund">Refund</SelectItem>
              <SelectItem value="correction">Correction</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Admin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((tx) => (
              <TableRow key={tx.id}>
                <TableCell className="text-sm text-muted-foreground">
                  {formatTimestamp(tx.created_at)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      tx.type === "grant"
                        ? "default"
                        : tx.type === "refund"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {tx.type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className={tx.amount_cents >= 0 ? "text-green-600" : "text-red-500"}>
                    {tx.amount_cents >= 0 ? "+" : ""}
                    {formatCents(tx.amount_cents)}
                  </span>
                </TableCell>
                <TableCell className="max-w-xs truncate">{tx.reason}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{tx.admin_user}</TableCell>
              </TableRow>
            ))}
            {entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No transactions
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {entries.length < filteredTotal && (
          <div className="mt-4 text-center">
            <Button variant="outline" size="sm" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? "Loading..." : "Load more"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---- Section: Admin Actions ----

function AdminActionsSection({
  detail,
  tenantId,
  onRefresh,
}: {
  detail: TenantDetailResponse;
  tenantId: string;
  onRefresh: () => void;
}) {
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [banOpen, setBanOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [banReason, setBanReason] = useState("");
  const [banTosRef, setBanTosRef] = useState("");
  const [banConfirm, setBanConfirm] = useState("");
  const [newRole, setNewRole] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const status = detail.status.status;
  const userId = detail.user?.id ?? tenantId;

  async function handleSuspend() {
    if (!suspendReason.trim()) return;
    try {
      await suspendTenant(tenantId, suspendReason);
      setMsg("Tenant suspended");
      setSuspendOpen(false);
      setSuspendReason("");
      onRefresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed");
    }
  }

  async function handleReactivate() {
    try {
      await reactivateTenant(tenantId);
      setMsg("Tenant reactivated");
      onRefresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed");
    }
  }

  async function handleBan() {
    if (!banReason.trim() || !banTosRef.trim() || banConfirm !== `BAN ${tenantId}`) return;
    try {
      await banTenant(tenantId, banReason, banTosRef, banConfirm);
      setMsg("Tenant banned");
      setBanOpen(false);
      onRefresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed");
    }
  }

  async function handleChangeRole() {
    if (!newRole) return;
    try {
      await changeRole(userId, tenantId, newRole);
      setMsg(`Role changed to ${newRole}`);
      setRoleOpen(false);
      onRefresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Actions</CardTitle>
      </CardHeader>
      <CardContent>
        {msg && <p className="mb-3 text-sm text-green-600 dark:text-green-400">{msg}</p>}
        <div className="flex flex-wrap gap-2">
          {status !== "suspended" && status !== "banned" && (
            <Dialog open={suspendOpen} onOpenChange={setSuspendOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  Suspend
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Suspend Tenant</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Suspending will stop all bots and block API access.
                  </p>
                  <div>
                    <Label>Reason (required)</Label>
                    <Input
                      placeholder="Non-payment / ToS violation"
                      value={suspendReason}
                      onChange={(e) => setSuspendReason(e.target.value)}
                    />
                  </div>
                  <Button
                    variant="destructive"
                    onClick={handleSuspend}
                    disabled={!suspendReason.trim()}
                  >
                    Confirm Suspend
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {(status === "suspended" || status === "grace_period") && (
            <Button variant="outline" size="sm" onClick={handleReactivate}>
              Reactivate
            </Button>
          )}

          {status !== "banned" && (
            <Dialog open={banOpen} onOpenChange={setBanOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  Ban
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ban Tenant</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <p className="text-sm text-red-500 font-medium">
                    This action is permanent. Credits will be auto-refunded.
                  </p>
                  <div>
                    <Label>Reason</Label>
                    <Input value={banReason} onChange={(e) => setBanReason(e.target.value)} />
                  </div>
                  <div>
                    <Label>ToS Reference</Label>
                    <Input
                      placeholder="Section 4.2 — Prohibited Use"
                      value={banTosRef}
                      onChange={(e) => setBanTosRef(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>
                      Type <code>BAN {tenantId}</code> to confirm
                    </Label>
                    <Input
                      value={banConfirm}
                      onChange={(e) => setBanConfirm(e.target.value)}
                      placeholder={`BAN ${tenantId}`}
                    />
                  </div>
                  <Button
                    variant="destructive"
                    onClick={handleBan}
                    disabled={
                      banConfirm !== `BAN ${tenantId}` || !banReason.trim() || !banTosRef.trim()
                    }
                  >
                    Confirm Ban
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          <Dialog open={roleOpen} onOpenChange={setRoleOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                Change Role
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Change Role</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>New Role</Label>
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">user</SelectItem>
                      <SelectItem value="tenant_admin">tenant_admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleChangeRole} disabled={!newRole}>
                  Save Role
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="outline" size="sm" disabled title="Coming soon">
            Impersonate
          </Button>
          <Button variant="outline" size="sm" disabled title="Coming soon">
            Reset Password
          </Button>
          <Button variant="outline" size="sm" disabled title="Coming soon">
            Force Disconnect
          </Button>
          <Button variant="outline" size="sm" disabled title="Coming soon">
            Export Data
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Section: Admin Notes ----

function AdminNotesSection({
  notes,
  tenantId,
  onNoteAdded,
}: {
  notes: AdminNote[];
  tenantId: string;
  onNoteAdded: () => void;
}) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await addTenantNote(tenantId, content.trim());
      setContent("");
      setMsg("Note added");
      onNoteAdded();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed to add note");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Notes (internal)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 mb-6">
          {notes.length === 0 ? (
            <p className="text-muted-foreground">No notes yet</p>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="rounded-lg border p-3 space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{note.admin_user}</span>
                  <span>{formatTimestamp(note.created_at)}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{note.content}</p>
              </div>
            ))
          )}
        </div>
        {msg && <p className="mb-2 text-sm text-green-600 dark:text-green-400">{msg}</p>}
        <form onSubmit={handleSubmit} className="space-y-2">
          <Textarea
            placeholder="Add an internal note..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
          />
          <Button type="submit" size="sm" disabled={submitting || !content.trim()}>
            {submitting ? "Adding..." : "Add Note"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ---- Main Page ----

export default function TenantGodViewPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  const [detail, setDetail] = useState<TenantDetailResponse | null>(null);
  const [agents, setAgents] = useState<BotInstance[]>([]);
  const [notes, setNotes] = useState<AdminNote[]>([]);
  const [transactions, setTransactions] = useState<{ entries: CreditAdjustment[]; total: number }>({
    entries: [],
    total: 0,
  });
  const [usageData, setUsageData] = useState<UsageSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [d, a, n, t, u] = await Promise.all([
        getTenantDetail(tenantId),
        getTenantAgents(tenantId).catch(() => []),
        getTenantNotes(tenantId).catch(() => []),
        getTransactions(tenantId, { limit: 50 }).catch(() => ({ entries: [], total: 0 })),
        getTenantUsageByCapability(tenantId).catch(() => []),
      ]);
      setDetail(d);
      setAgents(a);
      setNotes(n);
      setTransactions(t);
      setUsageData(u);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tenant data");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Loading tenant data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-2">
        <p className="text-red-500">{error}</p>
        <Button onClick={loadData}>Retry</Button>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Tenant not found: {tenantId}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <TenantHeader detail={detail} tenantId={tenantId} onRefresh={loadData} />

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4">
          <CreditsSection detail={detail} tenantId={tenantId} onRefresh={loadData} />
          <UsageSection usageData={usageData} total={detail.usage.total} />
        </TabsContent>

        <TabsContent value="agents" className="mt-4">
          <AgentsSection agents={agents} />
        </TabsContent>

        <TabsContent value="usage" className="mt-4">
          <UsageSection usageData={usageData} total={detail.usage.total} />
        </TabsContent>

        <TabsContent value="transactions" className="mt-4">
          <TransactionsSection transactions={transactions} tenantId={tenantId} />
        </TabsContent>

        <TabsContent value="actions" className="mt-4">
          <AdminActionsSection detail={detail} tenantId={tenantId} onRefresh={loadData} />
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <AdminNotesSection notes={notes} tenantId={tenantId} onNoteAdded={loadData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
