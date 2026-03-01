"use client";

import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { trpcVanilla } from "@/lib/trpc";

const COOKIE_NAME = "wopr_tenant_id";

function readTenantCookie(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.split("; ").find((row) => row.startsWith(`${COOKIE_NAME}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : "";
}

function writeTenantCookie(tenantId: string): void {
  // biome-ignore lint/suspicious/noDocumentCookie: intentional session cookie write (security: tenant ID moved out of localStorage)
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(tenantId)}; path=/; SameSite=Lax; Secure`;
}

/**
 * Read the active tenant ID from a session cookie.
 * Used by non-React code (apiFetch, trpc client) to inject X-Tenant-Id headers.
 */
export function getActiveTenantId(): string {
  return readTenantCookie();
}

export interface TenantOption {
  id: string;
  name: string;
  type: "personal" | "org";
  image?: string | null;
}

export interface TenantContextValue {
  activeTenantId: string;
  tenants: TenantOption[];
  isLoading: boolean;
  switchTenant: (tenantId: string) => void;
}

const TenantContext = createContext<TenantContextValue | null>(null);

interface OrgListProcedures {
  listMyOrganizations: {
    query(): Promise<Array<{ id: string; name: string; image?: string | null }>>;
  };
}

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending: sessionPending } = useSession();
  const queryClient = useQueryClient();
  const user = session?.user;

  const [orgs, setOrgs] = useState<Array<{ id: string; name: string; image?: string | null }>>([]);
  const [orgsLoaded, setOrgsLoaded] = useState(false);
  const [activeTenantId, setActiveTenantId] = useState<string>(() => {
    return readTenantCookie();
  });

  // Fetch orgs once user is available
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      try {
        const orgClient = trpcVanilla as unknown as { org: OrgListProcedures };
        const result = await orgClient.org.listMyOrganizations.query();
        if (!cancelled) setOrgs(result);
      } catch {
        // Endpoint may not exist yet (WOP-1000). Gracefully degrade.
      } finally {
        if (!cancelled) setOrgsLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const tenants = useMemo<TenantOption[]>(() => {
    if (!user) return [];
    const personal: TenantOption = {
      id: user.id,
      name: user.name ?? "Personal",
      type: "personal",
      image: user.image ?? null,
    };
    const orgOptions: TenantOption[] = orgs.map((o) => ({
      id: o.id,
      name: o.name,
      type: "org",
      image: o.image ?? null,
    }));
    return [personal, ...orgOptions];
  }, [user, orgs]);

  // Resolve active tenant: fall back to personal if stored value is invalid
  const resolvedTenantId = useMemo(() => {
    if (!user) return "";
    if (activeTenantId && tenants.some((t) => t.id === activeTenantId)) {
      return activeTenantId;
    }
    return user.id;
  }, [user, activeTenantId, tenants]);

  const switchTenant = useCallback(
    (tenantId: string) => {
      setActiveTenantId(tenantId);
      writeTenantCookie(tenantId);
      queryClient.invalidateQueries();
    },
    [queryClient],
  );

  const isLoading = sessionPending || (!orgsLoaded && !!user);

  const value = useMemo<TenantContextValue>(
    () => ({
      activeTenantId: resolvedTenantId,
      tenants,
      isLoading,
      switchTenant,
    }),
    [resolvedTenantId, tenants, isLoading, switchTenant],
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return ctx;
}
