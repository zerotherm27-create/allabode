import { Icon } from "@/components/icon";

const APPROVAL: Record<string, { label: string; icon: string; cls: string }> = {
  draft: { label: "Draft", icon: "edit", cls: "bg-surface-gray text-navy" },
  submitted: { label: "In review", icon: "hourglass_top", cls: "bg-reserved/15 text-navy" },
  approved: { label: "Approved", icon: "check_circle", cls: "bg-available/15 text-navy" },
  rejected: { label: "Needs changes", icon: "error", cls: "bg-error-bg text-error" },
};

/** Where a specialist's listing stands in All Abode's review. Icon + label, never colour alone. */
export function ApprovalBadge({ status }: { status: string | null | undefined }) {
  const a = APPROVAL[status ?? "draft"] ?? APPROVAL.draft;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${a.cls}`}>
      <Icon name={a.icon} size={14} />
      {a.label}
    </span>
  );
}
