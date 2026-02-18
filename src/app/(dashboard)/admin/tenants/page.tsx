"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdminUserSummary } from "@/lib/admin-api";
import { getUsersList } from "@/lib/admin-api";

function statusBadgeVariant(status: string): "default" | "destructive" | "outline" | "secondary" {
  switch (status) {
    case "active":
      return "default";
    case "suspended":
      return "destructive";
    case "grace_period":
      return "secondary";
    default:
      return "outline";
  }
}

function formatDate(ts: number | null): string {
  if (!ts) return "Never";
  return new Date(ts).toLocaleDateString();
}

function formatBalance(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function AdminTenantsPage() {
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await getUsersList({ search: q || undefined, limit: 100 });
      setUsers(result.users);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tenants");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers("");
  }, [loadUsers]);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    loadUsers(search);
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tenants</h1>
        <span className="text-sm text-muted-foreground">{total} total</span>
      </div>

      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <Input
          placeholder="Search by name, email, or tenant ID..."
          value={search}
          onChange={handleSearchChange}
          className="max-w-sm"
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      {error && <p className="text-red-500">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>All Tenants</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name / Email</TableHead>
                  <TableHead>Tenant ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Agents</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Link
                        href={`/admin/tenants/${user.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {user.name ?? user.email}
                      </Link>
                      {user.name && <p className="text-xs text-muted-foreground">{user.email}</p>}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs text-muted-foreground">{user.tenant_id}</code>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(user.status)}>{user.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{user.role}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">
                        {formatBalance(user.credit_balance_cents)}
                      </span>
                    </TableCell>
                    <TableCell>{user.agent_count}</TableCell>
                    <TableCell>{formatDate(user.last_seen)}</TableCell>
                    <TableCell>{formatDate(user.created_at)}</TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No tenants found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
