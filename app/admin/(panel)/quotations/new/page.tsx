import Link from "next/link";
import { Icon } from "@/components/icon";
import { QuotationTermsForm } from "@/components/admin/quotation-terms-form";
import { createQuotation } from "@/app/admin/quotations-actions";

export default function NewQuotationPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/quotations" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate hover:text-navy">
        <Icon name="arrow_back" size={18} /> Back to quotations
      </Link>
      <h1 className="font-display text-2xl font-bold text-navy">New Quotation</h1>
      <p className="mt-1 text-sm text-slate">
        Fill in the recipient, line items, scope of work, and payment terms. The recipient signs first via their own
        link, then the company representative signs (remotely, or a designated signatory countersigns).
      </p>
      <div className="mt-6">
        <QuotationTermsForm action={createQuotation} submitLabel="Create & send to recipient" />
      </div>
    </div>
  );
}
