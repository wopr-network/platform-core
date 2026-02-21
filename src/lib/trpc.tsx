"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { useState } from "react";
import { PLATFORM_BASE_URL } from "./api-config";
import { handleUnauthorized } from "./fetch-utils";
import type { AppRouter } from "./trpc-types";

export const trpc = createTRPCReact<AppRouter>();

async function trpcFetchWithAuth(url: RequestInfo | URL, options?: RequestInit) {
  const res = await fetch(url, { ...options, credentials: "include" });
  if (res.status === 401) {
    handleUnauthorized();
  }
  return res;
}

/**
 * Vanilla tRPC client for imperative calls (not React hooks).
 * Used by admin-api.ts and other non-component code.
 */
export const trpcVanilla = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${PLATFORM_BASE_URL}/trpc`,
      fetch: trpcFetchWithAuth,
    }),
  ],
});

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient(): QueryClient {
  if (typeof window === "undefined") {
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

export function TRPCProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const queryClient = getQueryClient();
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${PLATFORM_BASE_URL}/trpc`,
          fetch: trpcFetchWithAuth,
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
