"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function OAuthCallbackContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const provider = params.provider as string;
  const errorParam = searchParams.get("error");
  const [error, setError] = useState<string | null>(errorParam);

  useEffect(() => {
    if (errorParam) {
      if (errorParam === "access_denied") {
        setError("Access was denied. Please try again.");
      } else if (errorParam === "account_already_linked") {
        setError("An account with this email already exists. Sign in to link your account.");
      } else {
        setError(`Authentication failed: ${errorParam}`);
      }
      return;
    }

    // Better Auth handles the token exchange server-side.
    // If we reach this page without an error, redirect to home.
    const timer = setTimeout(() => {
      router.push("/");
    }, 1000);

    return () => clearTimeout(timer);
  }, [errorParam, router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Authentication failed</CardTitle>
              <CardDescription>Could not sign in with {provider}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
            <CardFooter className="justify-center">
              <Link
                href="/login"
                className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                Back to sign in
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Completing sign in with {provider}...</p>
      </div>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense>
      <OAuthCallbackContent />
    </Suspense>
  );
}
