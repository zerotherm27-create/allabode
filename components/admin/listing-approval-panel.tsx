"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Icon } from "@/components/icon";
import { ApprovalBadge } from "@/components/specialist/approval-badge";
import { approveListing, rejectListing, type SpecialistActionState } from "@/app/admin/specialist-actions";
import { REJECTION_NOTE_MAX, canApproveListing, canRejectListing } from "@/lib/team/admin-status";

function Notice({ state }: { state: SpecialistActionState | null }) {
  if (!state) return null;
  return (
    <p
      role={state.ok ? "status" : "alert"}
      className={`mt-3 flex items-start gap-2 rounded-md px-3 py-2 text-sm ${
        state.ok ? "bg-available/15 text-navy" : "bg-error-bg text-error"
      }`}
    >
      <Icon name={state.ok ? "check_circle" : "error"} size={18} className="mt-0.5 shrink-0" />
      {state.message}
    </p>
  );
}

function Submit({ label, pendingLabel, tone }: { label: string; pendingLabel: string; tone: "primary" | "danger" }) {
  const { pending } = useFormStatus();
  const cls = tone === "primary"
    ? "bg-navy text-white hover:bg-navy-800"
    : "border border-error text-error hover:bg-error-bg";
  return (
    <button
      type="submit"
      disabled={pending}
      className={`press inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${cls}`}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

function ApproveForm({
  action, state, listingId, status, intro, label,
}: {
  action: (fd: FormData) => void;
  state: SpecialistActionState | null;
  listingId: string;
  status: string;
  intro: string;
  label: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="listing_id" value={listingId} />
      <p className="text-sm text-slate">
        {intro}{status === "Draft" ? " Its Draft status becomes Available." : ""}
      </p>
      <div className="mt-3">
        <Submit label={label} pendingLabel="Approving…" tone="primary" />
      </div>
      <Notice state={state} />
    </form>
  );
}

function NoteForm({
  action, state, listingId, heading, placeholder, label, pendingLabel,
}: {
  action: (fd: FormData) => void;
  state: SpecialistActionState | null;
  listingId: string;
  heading: string;
  placeholder: string;
  label: string;
  pendingLabel: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="listing_id" value={listingId} />
      <label htmlFor="rejection-note" className="text-sm font-medium text-navy">{heading}</label>
      <textarea
        id="rejection-note"
        name="note"
        required
        rows={3}
        maxLength={REJECTION_NOTE_MAX}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/15"
      />
      <div className="mt-3">
        <Submit label={label} pendingLabel={pendingLabel} tone="danger" />
      </div>
      <Notice state={state} />
    </form>
  );
}

/** Staff review panel for a specialist-owned listing, or any listing whose
 *  approval state is not 'approved' (so none is left without a control). */
export function ListingApprovalPanel({
  listingId,
  specialistName,
  house,
  approvalStatus,
  rejectionNote,
  status,
  everApproved,
}: {
  listingId: string;
  specialistName: string | null;
  /** No specialist owns the listing (a house listing). */
  house: boolean;
  approvalStatus: string;
  rejectionNote: string | null;
  status: string;
  /** listings.ever_approved; undefined when unknown (then a rejected listing counts as re-approval). */
  everApproved?: boolean;
}) {
  const [approveState, approveAction] = useActionState(approveListing, null);
  const [rejectState, rejectAction] = useActionState(rejectListing, null);
  const settled = approveState?.ok || rejectState?.ok;
  const canApprove = canApproveListing(approvalStatus, { house });
  const canReject = canRejectListing(approvalStatus);
  const submitted = approvalStatus === "submitted";
  // "Approve again" only for a listing that has been live before.
  const reapproval = everApproved ?? approvalStatus === "rejected";

  return (
    <section aria-labelledby="approval-heading" className="mt-6 rounded-lg border border-line bg-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="approval-heading" className="font-display text-sm font-semibold text-navy">
            {house ? "Listing approval" : "Specialist approval"}
          </h2>
          <p className="mt-1 text-xs text-slate">
            {house ? "House listing" : `Listed by ${specialistName ?? "a property specialist"}`}
          </p>
        </div>
        <ApprovalBadge status={approvalStatus} />
      </div>

      {approvalStatus === "rejected" && rejectionNote && (
        <div className="mt-4 rounded-md bg-error-bg px-3 py-2 text-sm text-ink">
          <p className="text-xs font-medium text-error">{house ? "Staff note" : "Your note to the specialist"}</p>
          <p className="mt-1 whitespace-pre-line">{rejectionNote}</p>
        </div>
      )}
      {approvalStatus === "draft" && !house && (
        <p className="mt-4 text-sm text-slate">The specialist has not submitted this listing for review yet.</p>
      )}
      {approvalStatus === "approved" && (
        <p className="mt-4 text-sm text-slate">Approved. The listing is visible to the public while its status is not Draft or Archived.</p>
      )}
      {approvalStatus === "rejected" && (
        <p className="mt-4 text-sm text-slate">Hidden from the public until it is approved again.</p>
      )}

      {!settled && (canApprove || canReject) && (
        <div className={`mt-5 grid gap-6 ${canApprove && canReject ? "md:grid-cols-2" : ""}`}>
          {canApprove && (
            <ApproveForm
              action={approveAction}
              state={approveState}
              listingId={listingId}
              status={status}
              intro={reapproval ? "Approving again makes the listing public." : "Approving makes the listing public."}
              label={reapproval ? "Approve again" : "Approve listing"}
            />
          )}
          {canReject && (
            submitted ? (
              <NoteForm
                action={rejectAction}
                state={rejectState}
                listingId={listingId}
                heading="Send back with a note"
                placeholder="What should the specialist change?"
                label="Send back"
                pendingLabel="Sending…"
              />
            ) : (
              <NoteForm
                action={rejectAction}
                state={rejectState}
                listingId={listingId}
                heading="Take down with a note"
                placeholder={house ? "Why is this listing coming down?" : "Why is this listing coming down? The specialist sees this note."}
                label="Take down"
                pendingLabel="Taking down…"
              />
            )
          )}
        </div>
      )}
      {settled && (
        <div className="mt-4">
          <Notice state={approveState?.ok ? approveState : rejectState} />
        </div>
      )}
    </section>
  );
}
