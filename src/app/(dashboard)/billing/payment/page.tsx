"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { ByokCallout } from "@/components/billing/byok-callout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BillingInfo, Invoice } from "@/lib/api";
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
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);

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

  function toggleInvoiceDetail(invoiceId: string) {
    setExpandedInvoice(expandedInvoice === invoiceId ? null : invoiceId);
  }

  if (loading || !info) {
    return (
      <div className="max-w-3xl space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="rounded-sm border p-6 space-y-4">
          <Skeleton className="h-5 w-36" />
          {Array.from({ length: 2 }, (_, n) => `sk-${n}`).map((skId, i) => (
            <div key={skId} className="flex items-center justify-between rounded-md border p-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-12" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
        <div className="rounded-sm border p-6 space-y-3">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-24" />
        </div>
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
                <InvoiceRow
                  key={invoice.id}
                  invoice={invoice}
                  expanded={expandedInvoice === invoice.id}
                  onToggle={() => toggleInvoiceDetail(invoice.id)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function InvoiceRow({
  invoice,
  expanded,
  onToggle,
}: {
  invoice: Invoice;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasLineItems = invoice.hostedLineItems && invoice.hostedLineItems.length > 0;

  return (
    <>
      <TableRow>
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
        <TableCell className="flex gap-1">
          {hasLineItems && (
            <Button variant="ghost" size="sm" onClick={onToggle}>
              {expanded ? "Hide" : "Details"}
            </Button>
          )}
          <Button variant="ghost" size="sm" asChild>
            <a href={invoice.downloadUrl}>Download</a>
          </Button>
        </TableCell>
      </TableRow>
      {expanded && hasLineItems && (
        <TableRow>
          <TableCell colSpan={4} className="bg-muted/50 p-4">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">
              Hosted Usage Line Items
            </p>
            <div className="space-y-1 text-xs">
              {invoice.hostedLineItems?.map((item, i) => (
                <div key={`${invoice.id}-item-${i}`} className="flex justify-between">
                  <span>
                    {item.capability} — {item.units.toLocaleString()} units @ $
                    {item.unitPrice.toFixed(4)}/unit
                  </span>
                  <span className="font-medium">${item.total.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
