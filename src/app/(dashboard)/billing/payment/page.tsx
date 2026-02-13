"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { ByokCallout } from "@/components/billing/byok-callout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BillingInfo } from "@/lib/api";
import { getBillingInfo, removePaymentMethod, updateBillingEmail } from "@/lib/api";

const statusStyles: Record<string, string> = {
  paid: "bg-emerald-500/15 text-emerald-500 border-emerald-500/25",
  pending: "bg-yellow-500/15 text-yellow-500 border-yellow-500/25",
  failed: "bg-red-500/15 text-red-500 border-red-500/25",
};

export default function PaymentPage() {
  const [info, setInfo] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingEmail, setBillingEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getBillingInfo();
    setInfo(data);
    setBillingEmail(data.email);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSaveEmail(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    try {
      await updateBillingEmail(billingEmail);
      setSaveMsg("Billing email updated.");
    } catch {
      setSaveMsg("Failed to update billing email.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemovePayment(id: string) {
    await removePaymentMethod(id);
    if (info) {
      setInfo({
        ...info,
        paymentMethods: info.paymentMethods.filter((pm) => pm.id !== id),
      });
    }
  }

  if (loading || !info) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        Loading payment info...
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payment</h1>
        <p className="text-sm text-muted-foreground">
          Manage your payment methods and view billing history
        </p>
      </div>

      <ByokCallout compact />

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
          <CardDescription>
            Cards on file for WOPR platform charges (not AI provider costs)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {info.paymentMethods.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payment methods on file.</p>
          ) : (
            <div className="space-y-3">
              {info.paymentMethods.map((pm) => (
                <div
                  key={pm.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-12 items-center justify-center rounded bg-muted text-xs font-medium">
                      {pm.brand}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        **** **** **** {pm.last4}
                        {pm.isDefault && (
                          <Badge variant="outline" className="ml-2">
                            Default
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Expires {String(pm.expiryMonth).padStart(2, "0")}/{pm.expiryYear}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleRemovePayment(pm.id)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
          <Button variant="outline">Add payment method</Button>
          <p className="text-xs text-muted-foreground">
            Stripe integration coming soon. Payment methods will be managed via Stripe Elements.
          </p>
        </CardContent>
      </Card>

      {/* Billing Email */}
      <Card>
        <CardHeader>
          <CardTitle>Billing Email</CardTitle>
          <CardDescription>Where we send invoices and billing notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveEmail} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="billing-email">Email address</Label>
              <Input
                id="billing-email"
                type="email"
                value={billingEmail}
                onChange={(e) => setBillingEmail(e.target.value)}
                required
              />
            </div>
            {saveMsg && <p className="text-sm text-muted-foreground">{saveMsg}</p>}
            <Button type="submit" className="w-fit" disabled={saving}>
              {saving ? "Saving..." : "Save email"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Billing History */}
      <div>
        <h2 className="text-lg font-semibold">Billing History</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Past invoices for WOPR platform services
        </p>
      </div>

      {info.invoices.length === 0 ? (
        <p className="text-sm text-muted-foreground">No invoices yet.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {info.invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    {new Date(invoice.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell>${invoice.amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusStyles[invoice.status]}>
                      {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={invoice.downloadUrl}>Download</a>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
