import { createAuthClient } from "better-auth/react";

const baseURL = process.env.NEXT_PUBLIC_API_URL;
if (!baseURL && typeof window !== "undefined" && window.location.hostname !== "localhost") {
  console.error(
    "[auth-client] NEXT_PUBLIC_API_URL is not set. Auth requests will fall back to localhost.",
  );
}

export const authClient = createAuthClient({
  baseURL: baseURL ?? "http://localhost:3000",
});

export const { useSession, signIn, signUp, signOut } = authClient;
