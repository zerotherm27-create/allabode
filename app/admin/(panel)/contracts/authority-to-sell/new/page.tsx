import Link from "next/link";
import { Icon } from "@/components/icon";
import { F, Group, inputCls, SubmitButton } from "@/components/admin/form-kit";
import { createAuthorityToSell } from "@/app/admin/authority-to-sell-actions";

export default function NewAuthorityToSellPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin/contracts" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate hover:text-navy">
        <Icon name="arrow_back" size={18} /> Back to contracts
      </Link>
      <h1 className="font-display text-2xl font-bold text-navy">Send an Authority to Sell</h1>
      <p className="mt-1 text-sm text-slate">
        The owner fills out the property, price, commission and period themselves on a secure link and signs. The
        broker details are pre-filled, and you countersign afterwards.
      </p>
      <form action={createAuthorityToSell} className="mt-6 flex flex-col gap-6">
        <Group title="Owner / Seller">
          <F label="Owner name" hint="Optional — used in the email greeting only">
            <input name="owner_name_hint" className={inputCls} />
          </F>
          <F label="Owner email" hint="The signing link is sent here">
            <input name="owner_email" type="email" required className={inputCls} />
          </F>
        </Group>
        <div>
          <SubmitButton label="Send Authority to Sell" />
        </div>
      </form>
    </div>
  );
}
