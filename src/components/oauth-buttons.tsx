"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth-client";

const providers = [
  { id: "github", label: "GitHub" },
  { id: "discord", label: "Discord" },
  { id: "google", label: "Google" },
] as const;

export function OAuthButtons() {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleOAuth(provider: string) {
    setLoading(provider);
    await signIn.social({
      provider,
      callbackURL: "/",
    });
    setLoading(null);
  }

  return (
    <div className="flex flex-col gap-2">
      {providers.map((p) => (
        <Button
          key={p.id}
          variant="outline"
          className="w-full"
          disabled={loading !== null}
          onClick={() => handleOAuth(p.id)}
        >
          {loading === p.id ? "Redirecting..." : `Continue with ${p.label}`}
        </Button>
      ))}
    </div>
  );
}
