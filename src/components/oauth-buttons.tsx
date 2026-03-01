"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth-client";

const providers = [
  { id: "github", label: "GitHub" },
  { id: "discord", label: "Discord" },
  { id: "google", label: "Google" },
] as const;

interface OAuthButtonsProps {
  callbackUrl?: string;
}

export function OAuthButtons({ callbackUrl = "/" }: OAuthButtonsProps) {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleOAuth(provider: string) {
    setLoading(provider);
    try {
      await signIn.social({
        provider,
        callbackURL: callbackUrl,
      });
    } catch {
      // signIn.social redirects on success; failure here means the redirect didn't happen
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {providers.map((p) => (
        <Button
          key={p.id}
          variant="outline"
          className="w-full border-terminal/30 hover:border-terminal hover:bg-terminal/5 hover:text-terminal"
          disabled={loading !== null}
          onClick={() => handleOAuth(p.id)}
        >
          {loading === p.id ? (
            <span className="inline-flex items-center gap-1">
              CONNECTING
              <span className="h-4 w-1.5 animate-pulse bg-terminal" />
            </span>
          ) : (
            `Continue with ${p.label}`
          )}
        </Button>
      ))}
    </div>
  );
}
