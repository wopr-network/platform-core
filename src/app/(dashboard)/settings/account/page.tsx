"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckIcon } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import CreateOrgWizard from "@/components/settings/create-org-wizard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { BillingUsage } from "@/lib/api";
import { changePassword, createBillingPortalSession, getBillingUsage } from "@/lib/api";

export default function AccountPage() {
  const [usage, setUsage] = useState<BillingUsage | null>(null);
  const [loading, setLoading] = useState(true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwError, setPwError] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);

  const [portalLoading, setPortalLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const pwSuccessTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pwSuccessTimer.current) clearTimeout(pwSuccessTimer.current);
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await getBillingUsage();
      setUsage(data);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    setPwError(false);

    if (newPassword !== confirmPassword) {
      setPwMsg("Passwords do not match.");
      setPwError(true);
      return;
    }

    setChangingPw(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setPwMsg("Password changed successfully.");
      setPwError(false);
      setPwSuccess(true);
      pwSuccessTimer.current = setTimeout(() => setPwSuccess(false), 2000);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPwMsg("Failed to change password. Please check your current password.");
      setPwError(true);
    } finally {
      setChangingPw(false);
    }
  }

  async function handleManageBilling() {
    setPortalLoading(true);
    try {
      const { url } = await createBillingPortalSession();
      window.location.href = url;
    } catch {
      // If portal session fails, fall back to billing page
      window.location.href = "/billing/plans";
    } finally {
      setPortalLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="rounded-sm border p-6 space-y-3">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-48" />
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
        <div className="rounded-sm border p-6 space-y-4">
          <Skeleton className="h-5 w-36" />
          {Array.from({ length: 3 }, (_, n) => `sk-${n}`).map((skId) => (
            <div key={skId} className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
          <Skeleton className="h-9 w-36" />
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-3 text-muted-foreground">
        <p className="text-sm text-destructive">Failed to load account data.</p>
        <Button variant="outline" size="sm" onClick={load}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Account</h1>
        <p className="text-sm text-muted-foreground">Manage your password and billing settings</p>
      </div>

      {/* Current Plan */}
      {usage && (
        <Card>
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>Your active subscription tier</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-sm capitalize">
                {usage.planName}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {usage.instancesRunning} of {usage.instanceCap} instances used
              </span>
            </div>
            <Button
              variant="terminal"
              size="sm"
              onClick={handleManageBilling}
              disabled={portalLoading}
            >
              {portalLoading ? "Redirecting..." : "Manage Billing"}
            </Button>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Password Change */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="current-password">Current password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm-new-password">Confirm new password</Label>
              <Input
                id="confirm-new-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <AnimatePresence>
              {pwMsg && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className={`text-sm ${pwError ? "text-destructive" : "text-terminal"}`}
                >
                  {pwMsg}
                </motion.p>
              )}
            </AnimatePresence>
            <Button type="submit" variant="terminal" className="w-fit" disabled={changingPw}>
              <AnimatePresence mode="wait">
                {pwSuccess ? (
                  <motion.span
                    key="success"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-1"
                  >
                    <CheckIcon className="size-4" />
                    Changed
                  </motion.span>
                ) : (
                  <motion.span
                    key="default"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {changingPw ? "Changing..." : "Change password"}
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Teams & Organizations */}
      <Card>
        <CardHeader>
          <CardTitle>Teams & Organizations</CardTitle>
          <CardDescription>Share bots, billing, and keys across a team.</CardDescription>
        </CardHeader>
        <CardContent>
          <CreateOrgWizard />
        </CardContent>
      </Card>
    </div>
  );
}
