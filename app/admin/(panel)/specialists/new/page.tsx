import Link from "next/link";
import { Icon } from "@/components/icon";
import { AddSpecialistForm } from "./add-form";

export const metadata = { title: "Add specialist" };

export default function AddSpecialistPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/admin/specialists"
        className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm text-slate hover:text-navy"
      >
        <Icon name="arrow_back" size={18} />
        Back to specialists
      </Link>
      <h1 className="font-display text-2xl font-bold text-navy">Add a property specialist</h1>
      <p className="mt-1 text-sm text-slate">
        Accounts are by invitation only. Adding a specialist creates their account and emails them a
        link to set a password; they then sign in at /portal/login. Their profile appears on the Team
        page as soon as they&rsquo;re added, so add them when they&rsquo;re ready.
      </p>
      <div className="mt-6 rounded-lg border border-line bg-surface p-6">
        <AddSpecialistForm />
      </div>
    </div>
  );
}
