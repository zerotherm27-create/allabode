import Link from "next/link";
import { Icon } from "@/components/icon";
import { QuotationTermsForm } from "@/components/admin/quotation-terms-form";
import { createQuotation } from "@/app/admin/quotations-actions";
import { isAiConfigured } from "@/lib/ai/client";

export default function NewQuotationPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/quotations" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate hover:text-navy">
        <Icon name="arrow_back" size={18} /> Back to quotations
      </Link>
      <h1 className="font-display text-2xl font-bold text-navy">New Quotation</h1>
      <p className="mt-1 text-sm text-slate">
        Fill in the recipient, line items, scope of work, and payment terms. Once saved, sign as company
        representative first (in-dashboard, if you&#x2019;re a signatory, or send a pre-signing link to a colleague),
        then send it to the recipient — their signature completes the quotation.
      </p>
      <div className="mt-6">
        <QuotationTermsForm action={createQuotation} submitLabel="Save draft" aiEnabled={isAiConfigured()} />
      </div>
    </div>
  );
}
