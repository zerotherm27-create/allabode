"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/icon";

export default function PayInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function startPayment() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/create", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ invoiceId: id }),
      });
      const data = await res.json() as { checkoutUrl?: string; error?: string };
      if (!res.ok || !data.checkoutUrl) {
        setError(data.error ?? "Could not initiate payment.");
        setLoading(false);
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-surface-gray px-4">
      <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-8 shadow-sm text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-navy/5 text-navy-700 mx-auto">
          <Icon name="payments" size={28} />
        </span>
        <h1 className="mt-4 font-display text-xl font-bold text-navy">Pay invoice</h1>
        <p className="mt-2 text-sm text-slate">
          You will be redirected to our secure payment partner to complete your payment.
        </p>

        {error && (
          <div className="mt-4 rounded-md border border-sold/20 bg-sold/5 p-3 text-sm text-sold">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={startPayment}
          disabled={loading}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-navy py-3 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50"
        >
          {loading ? (
            <><Icon name="progress_activity" size={18} className="animate-spin" /> Redirecting…</>
          ) : (
            <><Icon name="open_in_new" size={18} /> Continue to payment</>
          )}
        </button>

        <Link href={`/dashboard/tenant/invoices/${id}`} className="mt-4 block text-sm text-slate hover:text-navy">
          ← Cancel and go back
        </Link>
      </div>

      <p className="mt-6 text-xs text-slate">
        Payments processed securely via {process.env.NEXT_PUBLIC_PAYMENT_PROVIDER === "xendit" ? "Xendit" : "Maya"}.
      </p>
    </div>
  );
}
