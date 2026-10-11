// Pure, dependency-free: derives the "Needs attention" list and the activity feed for the
// admin owner/tenant detail pages from rows that page has already fetched. No I/O here so it
// is unit-testable (tests/action-items.test.mjs).

export type Side = "tenant" | "landlord" | "staff" | "both";
export type Severity = "overdue" | "due" | "info";

export type ActionItem = {
  id: string;
  side: Side;
  severity: Severity;
  title: string;
  detail: string;
  href?: string;
  /** ISO date the item is due / was due, when known. */
  due?: string | null;
};

export type ActivityEvent = {
  id: string;
  at: string;
  title: string;
  detail?: string;
  href?: string;
  kind: string;
};

export type Party = "tenant" | "owner";

export type InvoiceIn = {
  id: string; invoice_number: string; status: string; total_amount: number | string;
  amount_paid: number | string; due_date: string; issued_at: string | null; created_at: string;
};
export type PaymentIn = {
  id: string; amount: number | string; status: string; method: string; received_at: string;
  created_at: string; receipt_pdf_path: string | null;
};
export type LeaseIn = {
  id: string; status: string; start_date: string; end_date: string | null; rent_amount: number | string;
  tenantName?: string | null; unitLabel?: string | null;
};
export type DepositIn = { id: string; lease_id: string; status: string; amount_held: number | string };
export type TicketIn = {
  id: string; ticket_number: string; subject: string; status: string; sla_due_at: string | null; created_at: string;
};
export type WorkOrderIn = {
  id: string; work_order_number: string; title: string; status: string; scheduled_date: string | null; created_at: string;
};
export type StatementIn = {
  id: string; status: string; period_start: string; period_end: string; published_at: string | null; created_at: string;
  closing_balance?: number | string; net_remittance?: number | string;
};
export type QuotationIn = {
  id: string; quotation_number: string; title: string | null; status: string; valid_until: string | null;
  created_at: string;
};
export type ContractIn = {
  id: string; type: string; href: string; detail: string; status: string; statusLabel: string;
  created_at: string; signed_at: string | null;
};
export type DocumentIn = { id: string; title: string; document_type: string; created_at: string };
export type NotificationIn = { id: string; title: string; is_read: boolean; created_at: string; link: string | null };

export type PersonData = {
  party: Party;
  /** YYYY-MM-DD, "today" in the viewer's frame. Passed in so the function stays pure. */
  today: string;
  person: { id: string; auth_user_id: string | null; spa_authorization_received?: boolean | null };
  invoices: InvoiceIn[];
  payments: PaymentIn[];
  leases: LeaseIn[];
  deposits: DepositIn[];
  tickets: TicketIn[];
  workOrders: WorkOrderIn[];
  statements: StatementIn[];
  quotations: QuotationIn[];
  contracts: ContractIn[];
  documents: DocumentIn[];
  notifications: NotificationIn[];
};

const LEASE_EXPIRY_WINDOW_DAYS = 60;
const CONTRACT_STALE_DAYS = 7;

const OPEN_INVOICE = new Set(["issued", "partially_paid", "overdue"]);
const CLOSED_TICKET = new Set(["resolved", "closed", "cancelled", "duplicate"]);
const CLOSED_WORK_ORDER = new Set(["completed", "verified", "cancelled"]);
const DONE_STATEMENT = new Set(["published", "locked", "revised", "voided"]);
const ENDED_LEASE = new Set(["ended", "terminated", "archived", "renewed"]);

const PRIORITY: Record<Severity, number> = { overdue: 0, due: 1, info: 2 };

const day = (iso: string) => iso.slice(0, 10);
const num = (n: number | string) => Number(n) || 0;
const peso = (n: number) => `₱${Math.round(n).toLocaleString("en-PH")}`;

/** Whole days from `from` to `to` (both YYYY-MM-DD / ISO); positive when `to` is later. */
export function daysBetween(from: string, to: string): number {
  const a = Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10));
  const b = Date.UTC(+to.slice(0, 4), +to.slice(5, 7) - 1, +to.slice(8, 10));
  return Math.round((b - a) / 86_400_000);
}

export function deriveActionItems(d: PersonData): ActionItem[] {
  const items: ActionItem[] = [];
  const me: Side = d.party === "tenant" ? "tenant" : "landlord";
  const meLabel = d.party === "tenant" ? "Tenant" : "Landlord";

  // Invoices with a balance still owed
  for (const inv of d.invoices) {
    if (!OPEN_INVOICE.has(inv.status)) continue;
    const balance = num(inv.total_amount) - num(inv.amount_paid);
    if (balance <= 0) continue;
    const late = day(inv.due_date) < d.today;
    items.push({
      id: `inv-${inv.id}`,
      side: me,
      severity: late ? "overdue" : "due",
      title: `${inv.invoice_number}: ${peso(balance)} unpaid`,
      detail: late ? `${meLabel} to pay — ${daysBetween(inv.due_date, d.today)} day(s) overdue` : `${meLabel} to pay — due ${day(inv.due_date)}`,
      href: `/admin/invoices/${inv.id}`,
      due: inv.due_date,
    });
  }

  // Payments waiting for staff verification
  for (const p of d.payments) {
    if (p.status !== "pending_review") continue;
    items.push({
      id: `pay-${p.id}`,
      side: "staff",
      severity: "due",
      title: `Payment of ${peso(num(p.amount))} needs verification`,
      detail: `Received ${day(p.received_at)} via ${p.method.replace(/_/g, " ")}`,
    });
  }

  // Contracts waiting on a signature
  for (const c of d.contracts) {
    if (c.status === "draft" || c.status === "completed" || c.status === "voided") continue;
    const age = daysBetween(c.created_at, d.today);
    const stale = age >= CONTRACT_STALE_DAYS;
    let side: Side;
    let who: string;
    if (c.status === "sent") {
      side = c.type === "pm" ? "landlord" : "tenant";
      who = c.type === "pm" ? "Owner" : "Tenant";
    } else {
      // owner_signed / tenant_signed → the company / landlord countersign is outstanding
      side = "landlord";
      who = "Landlord / company";
    }
    items.push({
      id: `ctr-${c.type}-${c.id}`,
      side,
      severity: stale ? "overdue" : "due",
      title: `${c.detail}: ${c.statusLabel}`,
      detail: `${who} to sign — sent ${age} day(s) ago`,
      href: c.href,
    });
  }

  // Quotations the client hasn't completed
  for (const q of d.quotations) {
    if (q.status === "completed" || q.status === "voided" || q.status === "draft") continue;
    const expired = !!q.valid_until && q.valid_until < d.today;
    const label = q.title || q.quotation_number;
    if (q.status === "company_signed") {
      items.push({
        id: `qt-${q.id}`, side: "staff", severity: "due",
        title: `Quotation ${q.quotation_number} signed by company, not yet sent`,
        detail: label, href: `/admin/quotations/${q.id}`, due: q.valid_until,
      });
    } else {
      items.push({
        id: `qt-${q.id}`, side: me, severity: expired ? "overdue" : "due",
        title: `Quotation ${q.quotation_number} awaiting ${meLabel.toLowerCase()} signature`,
        detail: expired ? `Expired ${q.valid_until}` : q.valid_until ? `Valid until ${q.valid_until}` : label,
        href: `/admin/quotations/${q.id}`, due: q.valid_until,
      });
    }
  }

  // Leases ending soon or past their end date but still marked live
  const endedLeaseIds = new Set<string>();
  for (const l of d.leases) {
    if (ENDED_LEASE.has(l.status)) endedLeaseIds.add(l.id);
    if (!l.end_date || ENDED_LEASE.has(l.status) || l.status === "draft") continue;
    const left = daysBetween(d.today, l.end_date);
    if (left > LEASE_EXPIRY_WINDOW_DAYS) continue;
    const where = [l.unitLabel, l.tenantName].filter(Boolean).join(" · ") || "Lease";
    items.push({
      id: `lease-${l.id}`,
      side: "both",
      severity: left < 0 ? "overdue" : "due",
      title: left < 0 ? `${where}: lease ended ${-left} day(s) ago` : `${where}: lease ends in ${left} day(s)`,
      detail: "Renew or terminate",
      href: `/admin/leases/${l.id}/edit`,
      due: l.end_date,
    });
  }

  // Deposits still held after the lease ended
  for (const dep of d.deposits) {
    if (dep.status !== "held" || !endedLeaseIds.has(dep.lease_id)) continue;
    items.push({
      id: `dep-${dep.id}`, side: "staff", severity: "due",
      title: `Security deposit ${peso(num(dep.amount_held))} still held`,
      detail: "Lease ended — return or forfeit", href: `/admin/security-deposits/${dep.id}`,
    });
  }

  // Tickets
  for (const t of d.tickets) {
    if (CLOSED_TICKET.has(t.status)) continue;
    const side: Side =
      t.status === "waiting_on_tenant" ? "tenant" : t.status === "waiting_on_owner" ? "landlord" : "staff";
    const slaBreached = !!t.sla_due_at && day(t.sla_due_at) < d.today;
    items.push({
      id: `tk-${t.id}`, side,
      severity: slaBreached ? "overdue" : "info",
      title: `${t.ticket_number}: ${t.subject}`,
      detail: `${t.status.replace(/_/g, " ")}${slaBreached ? " — SLA breached" : ""}`,
      href: `/admin/tickets/${t.id}`, due: t.sla_due_at,
    });
  }

  // Work orders
  for (const w of d.workOrders) {
    if (CLOSED_WORK_ORDER.has(w.status)) continue;
    const late = !!w.scheduled_date && w.scheduled_date < d.today;
    items.push({
      id: `wo-${w.id}`, side: "staff", severity: late ? "overdue" : "info",
      title: `${w.work_order_number}: ${w.title}`,
      detail: `${w.status.replace(/_/g, " ")}${w.scheduled_date ? ` — scheduled ${w.scheduled_date}` : ""}`,
      href: `/admin/work-orders/${w.id}`, due: w.scheduled_date,
    });
  }

  // Statements not yet published
  for (const s of d.statements) {
    if (DONE_STATEMENT.has(s.status)) continue;
    items.push({
      id: `soa-${s.id}`, side: "staff", severity: "info",
      title: `Statement ${s.period_start} → ${s.period_end} not published`,
      detail: s.status.replace(/_/g, " "), href: `/admin/statements/${s.id}`,
    });
  }

  // Account setup
  if (d.party === "owner" && d.person.spa_authorization_received === false) {
    items.push({
      id: "spa", side: "landlord", severity: "info",
      title: "SPA / authorization letter not received", detail: "Landlord to submit",
    });
  }
  if (!d.person.auth_user_id) {
    items.push({
      id: "portal", side: "staff", severity: "info",
      title: "Portal login not linked", detail: "Account is created when they sign a contract or sign up",
    });
  }

  return items.sort((a, b) => PRIORITY[a.severity] - PRIORITY[b.severity]);
}

export function countBySide(items: ActionItem[]): Record<Side, number> {
  const c: Record<Side, number> = { tenant: 0, landlord: 0, staff: 0, both: 0 };
  for (const i of items) c[i.side] += 1;
  return c;
}

export function buildActivity(d: PersonData, limit = 15): ActivityEvent[] {
  const ev: ActivityEvent[] = [];

  for (const i of d.invoices) {
    if (i.status === "draft") continue;
    ev.push({ id: `inv-${i.id}`, at: i.issued_at ?? i.created_at, kind: "invoice", title: `Invoice ${i.invoice_number} issued`, detail: peso(num(i.total_amount)), href: `/admin/invoices/${i.id}` });
  }
  for (const p of d.payments) {
    ev.push({ id: `pay-${p.id}`, at: p.received_at, kind: "payment", title: `Payment received ${peso(num(p.amount))}`, detail: p.status.replace(/_/g, " ") });
  }
  for (const c of d.contracts) {
    ev.push({ id: `ctr-${c.type}-${c.id}-c`, at: c.created_at, kind: "contract", title: `${c.detail} created`, detail: c.statusLabel, href: c.href });
    if (c.signed_at) ev.push({ id: `ctr-${c.type}-${c.id}-s`, at: c.signed_at, kind: "contract", title: `${c.detail} fully signed`, href: c.href });
  }
  for (const q of d.quotations) {
    ev.push({ id: `qt-${q.id}`, at: q.created_at, kind: "quotation", title: `Quotation ${q.quotation_number} ${q.status.replace(/_/g, " ")}`, detail: q.title ?? undefined, href: `/admin/quotations/${q.id}` });
  }
  for (const t of d.tickets) {
    ev.push({ id: `tk-${t.id}`, at: t.created_at, kind: "ticket", title: `Ticket ${t.ticket_number} opened`, detail: t.subject, href: `/admin/tickets/${t.id}` });
  }
  for (const s of d.statements) {
    if (s.published_at) ev.push({ id: `soa-${s.id}`, at: s.published_at, kind: "statement", title: "Statement published", detail: `${s.period_start} → ${s.period_end}`, href: `/admin/statements/${s.id}` });
  }
  for (const doc of d.documents) {
    ev.push({ id: `doc-${doc.id}`, at: doc.created_at, kind: "document", title: `Document added: ${doc.title}`, detail: doc.document_type.replace(/_/g, " ") });
  }
  for (const n of d.notifications) {
    ev.push({ id: `nt-${n.id}`, at: n.created_at, kind: "notification", title: `Notification sent: ${n.title}`, detail: n.is_read ? "read" : "unread" });
  }

  return ev.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, limit);
}
