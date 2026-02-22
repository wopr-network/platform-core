"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OnboardWelcomePage() {
  return (
    <Card className="text-center">
      <CardHeader className="pb-2">
        <CardTitle className="text-3xl tracking-tight">Let&apos;s set up your WOPR</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-lg text-muted-foreground">Your AI agent, your keys, your rules.</p>

        <div className="mx-auto grid max-w-md gap-4 text-left text-sm">
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              1
            </div>
            <div>
              <p className="font-medium">Bring your own API keys</p>
              <p className="text-muted-foreground">
                Connect your AI provider keys directly. We never proxy or store them centrally.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              2
            </div>
            <div>
              <p className="font-medium">Connect your channels</p>
              <p className="text-muted-foreground">
                Discord, Slack, Telegram, and more. Driven by plugin manifests.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              3
            </div>
            <div>
              <p className="font-medium">Deploy in minutes</p>
              <p className="text-muted-foreground">
                Pick your plugins, review your config, and launch your agent.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3 text-sm text-green-400">
          Your keys are encrypted and stored securely on the server. We never see or proxy your API
          calls.
        </div>

        <Button size="lg" asChild>
          <Link href="/onboard/provider">Get Started</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
