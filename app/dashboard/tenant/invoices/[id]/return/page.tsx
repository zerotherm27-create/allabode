import Link from "next/link";
import { Icon } from "@/components/icon";

export default async function PaymentReturnPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { id }     = await params;
  const { status } = await searchParams;

  const succeeded = status === "success" || status === "PAYMENT_SUCCESS" || status === "PAID";
  const cancelled = status === "cancel" || status === "CANCELLED";

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-surface-gray px-4">
      <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-8 shadow-sm text-center">
        <span className={`flex size-14 items-center justify-center rounded-full mx-auto ${
          succeeded ? "bg-available/10 text-available" :
          cancelled ? "bg-surface-gray text-slate" :
          "bg-sold/10 text-sold"
        }`}>
          <Icon
            name={succeeded ? "check_circle" : cancelled ? "cancel" : "error"}
            size={28}
            fill={1}
          />
        </span>
        <h1 className="mt-4 font-display text-xl font-bold text-navy">
          {succeeded ? "Payment received" : cancelled ? "Payment cancelled" : "Payment unsuccessful"}
        </h1>
        <p className="mt-2 text-sm text-slate">
          {succeeded
            ? "Thank you! Your payment has been received and your invoice will be updated shortly."
            : cancelled
            ? "You cancelled the payment. Your invoice is still outstanding."
            : "Something went wrong with your payment. Please try again or contact All Abode."}
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <Link
            href={`/dashboard/tenant/invoices/${id}`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-navy py-3 text-sm font-semibold text-white hover:bg-navy-800"
          >
            <Icon name="receipt" size={18} /> View invoice
          </Link>
          <Link
            href="/dashboard/tenant"
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-line bg-surface py-3 text-sm font-medium text-navy hover:bg-surface-gray"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
