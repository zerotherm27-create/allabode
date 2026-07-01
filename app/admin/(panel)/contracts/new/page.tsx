import Link from "next/link";
import { Icon } from "@/components/icon";
import { F, Group, inputCls, SubmitButton } from "@/components/admin/form-kit";
import { createAgreement } from "@/app/admin/agreement-actions";

export default function NewContractPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin/contracts" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate hover:text-navy">
        <Icon name="arrow_back" size={18} /> Back to contracts
      </Link>
      <h1 className="font-display text-2xl font-bold text-navy">Send a Property Management Agreement</h1>
      <p className="mt-1 text-sm text-slate">
        The owner fills out and signs everything themselves on a secure link — you only need their name and email.
      </p>
      <form action={createAgreement} className="mt-6 flex flex-col gap-6">
        <Group title="Owner">
          <F label="Owner name" hint="Optional — used in the email greeting only">
            <input name="owner_name_hint" className={inputCls} />
          </F>
          <F label="Owner email" hint="The signing link is sent here">
            <input name="owner_email" type="email" required className={inputCls} />
          </F>
        </Group>
        <div>
          <SubmitButton label="Send agreement" />
        </div>
      </form>
    </div>
  );
}
