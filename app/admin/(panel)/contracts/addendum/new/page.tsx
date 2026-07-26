import Link from "next/link";
import { Icon } from "@/components/icon";
import { AddendumTermsForm } from "@/components/admin/addendum-terms-form";
import { createAddendum, listAmendableContracts } from "@/app/admin/addendum-actions";

export default async function NewAddendumPage() {
  const parentOptions = await listAmendableContracts();

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/contracts" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate hover:text-navy">
        <Icon name="arrow_back" size={18} /> Back to contracts
      </Link>
      <h1 className="font-display text-2xl font-bold text-navy">Send an Addendum</h1>
      <p className="mt-1 text-sm text-slate">
        An addendum amends a contract that has already been fully executed. Pick the original contract, fill in only
        what changes — everything you leave blank is omitted from the document and stays as it is in the original.
        The other party fills in their details and government ID on the signing link, then signs; the landlord signs
        via their own link (or a designated signatory countersigns).
      </p>
      <div className="mt-6">
        <AddendumTermsForm
          action={createAddendum}
          parentOptions={parentOptions}
          submitLabel="Create & send"
        />
      </div>
    </div>
  );
}
