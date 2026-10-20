"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Icon } from "@/components/icon";
import { ApprovalBadge } from "@/components/specialist/approval-badge";

/** Save / submit buttons for the specialist variant. The clicked button's
 *  `intent` value reaches the action ("save" or "submit"). Save comes first in
 *  the DOM so Enter in a text field saves rather than submits for review. */
export function SpecialistActions({
  approval,
  isNew,
  busy,
  cancelHref,
  noPhotos = false,
}: {
  approval: string;
  isNew: boolean;
  busy: boolean;
  cancelHref: string;
  /** The listing exists but has no photos yet. */
  noPhotos?: boolean;
}) {
  const { pending } = useFormStatus();
  const [clicked, setClicked] = useState("");
  const canSubmit = !isNew && (approval === "draft" || approval === "rejected");
  const saveLabel = isNew || approval === "draft" ? "Save draft" : "Save changes";
  const disabled = pending || busy;
  const base =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-6 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-700 disabled:opacity-50";
  const spinner = <Icon name="progress_activity" size={18} className="animate-spin" />;
  return (
    <div className="flex flex-wrap items-center gap-3">
      {isNew && (
        <p className="flex w-full items-center gap-2 text-sm text-slate">
          <Icon name="photo_camera" size={18} />
          You&rsquo;ll add photos right after you save the draft.
        </p>
      )}
      {canSubmit && noPhotos && (
        <p className="w-full text-sm text-slate">Listings with photos get more inquiries.</p>
      )}
      <button
        type="submit"
        name="intent"
        value="save"
        disabled={disabled}
        onClick={() => setClicked("save")}
        title={busy ? "Wait for the AI generation to finish first" : undefined}
        className={`${base} ${canSubmit ? "border border-line bg-surface text-navy hover:bg-surface-gray" : "bg-navy text-white hover:bg-navy-700"}`}
      >
        {pending && clicked === "save" ? <>{spinner}Saving…</> : saveLabel}
      </button>
      {canSubmit && (
        <button
          type="submit"
          name="intent"
          value="submit"
          disabled={disabled}
          onClick={() => setClicked("submit")}
          title={busy ? "Wait for the AI generation to finish first" : undefined}
          className={`${base} bg-navy text-white hover:bg-navy-700`}
        >
          {pending && clicked === "submit" ? <>{spinner}Submitting…</> : "Submit for approval"}
        </button>
      )}
      <Link
        href={cancelHref}
        className="inline-flex min-h-11 items-center text-sm font-medium text-slate hover:text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-700"
      >
        Cancel
      </Link>
    </div>
  );
}

export function ApprovalNotice({ approval, note }: { approval: string; note?: string | null }) {
  const copy: Record<string, string> = {
    draft: "Only you can see this draft. Submit it when it's ready and All Abode will review it before it goes live.",
    submitted: "All Abode is reviewing this listing. You can keep editing while you wait.",
    approved: "This listing is approved. Changes you save go live right away.",
    rejected: "This listing needs changes before it can go live. Update it, then submit it again.",
  };
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center gap-3">
        <ApprovalBadge status={approval} />
        <p className="text-sm text-slate">{copy[approval] ?? copy.draft}</p>
      </div>
      {approval === "rejected" && note && (
        <p className="mt-3 rounded-md bg-error-bg px-3 py-2 text-sm text-error">
          <span className="font-semibold">Note from All Abode: </span>
          {note}
        </p>
      )}
    </div>
  );
}
