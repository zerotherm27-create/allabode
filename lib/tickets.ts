export const SLA_HOURS: Record<string, number> = {
  critical: 4,
  high: 24,
  normal: 72,
  low: 120,
};

export function computeSlaDeadline(priority: string, createdAt: Date): Date {
  const hours = SLA_HOURS[priority] ?? 72;
  return new Date(createdAt.getTime() + hours * 60 * 60 * 1000);
}

export function isSlaBreach(sla_due_at: string | null): boolean {
  if (!sla_due_at) return false;
  return new Date(sla_due_at) < new Date();
}

export const TICKET_STATUS_LABEL: Record<string, string> = {
  new:                 "New",
  triaged:             "Triaged",
  assigned:            "Assigned",
  in_progress:         "In Progress",
  waiting_on_tenant:   "Waiting on Tenant",
  waiting_on_owner:    "Waiting on Owner",
  waiting_on_vendor:   "Waiting on Vendor",
  resolved:            "Resolved",
  closed:              "Closed",
  cancelled:           "Cancelled",
  duplicate:           "Duplicate",
  escalated:           "Escalated",
  reopened:            "Reopened",
};

export const TICKET_STATUS_COLOR: Record<string, string> = {
  new:                 "bg-navy/5 text-navy-700",
  triaged:             "bg-gold/10 text-gold-bright",
  assigned:            "bg-gold/10 text-gold-bright",
  in_progress:         "bg-navy/10 text-navy",
  waiting_on_tenant:   "bg-reserved/10 text-reserved",
  waiting_on_owner:    "bg-reserved/10 text-reserved",
  waiting_on_vendor:   "bg-reserved/10 text-reserved",
  resolved:            "bg-available/10 text-available",
  closed:              "bg-surface-gray text-slate",
  cancelled:           "bg-surface-gray text-slate",
  duplicate:           "bg-surface-gray text-slate",
  escalated:           "bg-sold/10 text-sold",
  reopened:            "bg-gold/10 text-gold-bright",
};

export const TICKET_PRIORITY_COLOR: Record<string, string> = {
  critical: "text-sold",
  high:     "text-reserved",
  normal:   "text-navy-700",
  low:      "text-slate",
};

export const TICKET_PRIORITY_ICON: Record<string, string> = {
  critical: "emergency",
  high:     "priority_high",
  normal:   "remove",
  low:      "keyboard_arrow_down",
};

export const TICKET_CATEGORIES = [
  { value: "maintenance",     label: "Maintenance" },
  { value: "billing_inquiry", label: "Billing Inquiry" },
  { value: "lease_inquiry",   label: "Lease Inquiry" },
  { value: "access_keys",     label: "Access / Keys" },
  { value: "safety_security", label: "Safety & Security" },
  { value: "housekeeping",    label: "Housekeeping" },
  { value: "inspection",      label: "Inspection" },
  { value: "general_admin",   label: "General Admin" },
  { value: "owner_request",   label: "Owner Request" },
] as const;

export const OPEN_STATUSES = [
  "new", "triaged", "assigned", "in_progress",
  "waiting_on_tenant", "waiting_on_owner", "waiting_on_vendor",
  "escalated", "reopened",
];

export const CLOSED_STATUSES = ["resolved", "closed", "cancelled", "duplicate"];
