"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { setMyPagePublished, type SpecialistProfileState } from "@/app/dashboard/specialist/actions";

/** Overview card: shows whether the specialist's public page is live, and lets them publish or unpublish it. */
export function PublishPanel({ published: initial, slug }: { published: boolean; slug: string | null }) {
  const [published, setPublished] = useState(initial);
  const [pending, start] = useTransition();
  const [state, setState] = useState<SpecialistProfileState | null>(null);

  return (
    <section
      aria-labelledby="publish-heading"
      className={`mt-6 rounded-lg border bg-surface p-5 ${published ? "border-line" : "border-gold"}`}
    >
      <h2 id="publish-heading" className="font-display text-base font-semibold text-navy">
        {published ? "Your page is live" : "Your page isn’t published yet"}
      </h2>
      <p className="mt-1 text-sm text-slate">
        {published
          ? "You appear on the Team page, and your profile and web address are public."
          : "You’re not on the Team page yet, and your profile and web address are not public. Finish your profile, then publish. All Abode can also publish it for you."}
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (published && !window.confirm("Unpublish your page? You’ll disappear from the Team page and your listings will show as All Abode listings.")) return;
            start(async () => {
              const r = await setMyPagePublished(!published);
              setState(r);
              if (r.ok) setPublished(!published);
            });
          }}
          className={
            published
              ? "inline-flex min-h-11 items-center justify-center rounded-md border border-line px-5 text-sm font-semibold text-navy transition-colors hover:bg-surface-gray disabled:opacity-60"
              : "inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-navy px-5 text-sm font-semibold text-white transition-colors hover:bg-navy-700 disabled:opacity-60"
          }
        >
          {pending ? "Saving…" : published ? "Unpublish" : "Publish my page"}
        </button>
        {published && slug && (
          <Link href={`/team/${slug}`} className="inline-flex min-h-11 items-center gap-1 text-sm text-navy-700 hover:underline">
            View my page <Icon name="open_in_new" size={14} />
          </Link>
        )}
        {state?.message && (
          <p role={state.ok ? "status" : "alert"} className={`text-sm ${state.ok ? "text-available" : "text-error"}`}>
            {state.message}
          </p>
        )}
      </div>
    </section>
  );
}
