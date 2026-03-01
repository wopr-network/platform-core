import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-client", () => ({
  useSession: vi.fn(() => ({
    data: { user: { id: "user-1", name: "Test User", image: null } },
    isPending: false,
  })),
}));

const mockQuery = vi.hoisted(() => vi.fn().mockResolvedValue([]));
vi.mock("@/lib/trpc", () => ({
  trpcVanilla: {
    org: { listMyOrganizations: { query: mockQuery } },
  },
}));

import { getActiveTenantId, TenantProvider, useTenant } from "@/lib/tenant-context";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <TenantProvider>{children}</TenantProvider>
    </QueryClientProvider>
  );
}

function clearTenantCookie() {
  // biome-ignore lint/suspicious/noDocumentCookie: test helper — mirrors production writeTenantCookie pattern
  document.cookie = "wopr_tenant_id=; path=/; max-age=0";
}

function setTenantCookie(tenantId: string) {
  // biome-ignore lint/suspicious/noDocumentCookie: test helper — mirrors production writeTenantCookie pattern
  document.cookie = `wopr_tenant_id=${encodeURIComponent(tenantId)}; path=/`;
}

describe("useTenant", () => {
  beforeEach(() => {
    clearTenantCookie();
    mockQuery.mockResolvedValue([]);
  });

  it("defaults to the user's personal account", async () => {
    const { result } = renderHook(() => useTenant(), {
      wrapper: createWrapper(),
    });

    await vi.waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.activeTenantId).toBe("user-1");
    expect(result.current.tenants).toEqual([
      { id: "user-1", name: "Test User", type: "personal", image: null },
    ]);
  });

  it("includes orgs when listMyOrganizations returns results", async () => {
    mockQuery.mockResolvedValue([{ id: "org-1", name: "My Team", image: null }]);

    const { result } = renderHook(() => useTenant(), {
      wrapper: createWrapper(),
    });

    await vi.waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.tenants).toHaveLength(2);
    expect(result.current.tenants[1]).toEqual({
      id: "org-1",
      name: "My Team",
      type: "org",
      image: null,
    });
  });

  it("persists tenant switch to cookie", async () => {
    mockQuery.mockResolvedValue([{ id: "org-1", name: "My Team", image: null }]);

    const { result } = renderHook(() => useTenant(), {
      wrapper: createWrapper(),
    });

    await vi.waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.switchTenant("org-1");
    });

    expect(result.current.activeTenantId).toBe("org-1");
    expect(document.cookie).toContain("wopr_tenant_id=org-1");
  });

  it("falls back to personal if stored tenant is not in list", async () => {
    setTenantCookie("org-deleted");
    mockQuery.mockResolvedValue([]);

    const { result } = renderHook(() => useTenant(), {
      wrapper: createWrapper(),
    });

    await vi.waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.activeTenantId).toBe("user-1");
  });

  it("gracefully handles listMyOrganizations failure", async () => {
    mockQuery.mockRejectedValue(new Error("Not implemented"));

    const { result } = renderHook(() => useTenant(), {
      wrapper: createWrapper(),
    });

    await vi.waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.tenants).toHaveLength(1);
    expect(result.current.tenants[0].type).toBe("personal");
  });
});

describe("getActiveTenantId", () => {
  beforeEach(() => {
    clearTenantCookie();
  });

  it("returns stored tenant ID from cookie", () => {
    setTenantCookie("org-1");
    expect(getActiveTenantId()).toBe("org-1");
  });

  it("returns empty string when nothing stored", () => {
    expect(getActiveTenantId()).toBe("");
  });
});
