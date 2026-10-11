import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/icon";
import { DataTable, type Column } from "@/components/admin/data-table";
import { DocumentList } from "@/components/admin/document-list";
import { StatCard } from "@/components/admin/shell";
import { ReminderButton } from "@/components/admin/reminder-button";
import {
  buildActivity, countBySide, deriveActionItems, type ActionItem, type Side,
} from "@/lib/admin/action-items";
import {
  CONTRACT_STATUS_COLOR, CONTRACT_TYPE_COLOR, CONTRACT_TYPE_LABEL, type ContractRow,
} from "@/lib/admin/contract-rows";
import type { PersonHistory, PersonRecord } from "@/lib/admin/person-history";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "billing", label: "Billing" },
  { key: "contracts", label: "Contracts & quotes" },
  { key: "leases", label: "Leases" },
  { key: "tickets", label: "Tickets" },
  { key: "documents", label: "Documents" },
] as const;
export type TabKey = (typeof TABS)[number]["key"];
export const isTabKey = (v: string | undefined): v is TabKey => TABS.some((t) => t.key === v);

const peso = (n: number | string) => `₱${Math.round(Number(n) || 0).toLocaleString("en-PH")}`;
const date = (d: string | null | undefined) => (d ? new Date(d).toLocaleDateString("en-PH") : "—");
const label = (s: string) => s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

const SIDE_LABEL: Record<Side, string> = { tenant: "Tenant", landlord: "Landlord", staff: "Staff", both: "Both parties" };
const SIDE_COLOR: Record<Side, string> = {
  tenant: "bg-gold/15 text-gold-bright",
  landlord: "bg-navy/10 text-navy",
  staff: "bg-surface-gray text-slate",
  both: "bg-reserved/15 text-reserved",
};

function Pill({ className, children }: { className: string; children: ReactNode }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>{children}</span>;
}

const STATUS_TONE: Record<string, string> = {
  paid: "bg-available/15 text-available", verified: "bg-available/15 text-available", active: "bg-available/15 text-available",
  completed: "bg-available/15 text-available", resolved: "bg-available/15 text-available", closed: "bg-surface-gray text-slate",
  published: "bg-available/15 text-available", returned: "bg-available/15 text-available",
  overdue: "bg-error/10 text-error", voided: "bg-error/10 text-error", reversed: "bg-error/10 text-error",
  forfeited: "bg-error/10 text-error", expiring: "bg-reserved/15 text-reserved",
  issued: "bg-gold/15 text-gold-bright", partially_paid: "bg-gold/15 text-gold-bright", pending_review: "bg-gold/15 text-gold-bright",
  held: "bg-gold/15 text-gold-bright",
};
const Status = ({ value }: { value: string }) => (
  <Pill className={STATUS_TONE[value] ?? "bg-surface-gray text-slate"}>{label(value)}</Pill>
);

function Section({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 font-display text-base font-semibold text-navy">
        {title}
        {count !== undefined && <span className="ml-2 text-sm font-normal text-slate">{count}</span>}
      </h2>
      {children}
    </section>
  );
}

const LinkCell = ({ href, children }: { href: string; children: ReactNode }) => (
  <Link href={href} className="font-medium text-navy hover:text-navy-700">{children}</Link>
);

function AttentionPanel({ items, party, personId }: { items: ActionItem[]; party: "tenant" | "owner"; personId: string }) {
  const mine: Side = party === "tenant" ? "tenant" : "landlord";
  const counts = countBySide(items);
  return (
    <section className="rounded-lg border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4">
        <h2 className="font-display text-base font-semibold text-navy">Needs attention</h2>
        <div className="flex flex-wrap gap-2">
          {(["tenant", "landlord", "both", "staff"] as Side[]).filter((s) => counts[s] > 0).map((s) => (
            <Pill key={s} className={SIDE_COLOR[s]}>{counts[s]} · {SIDE_LABEL[s]}</Pill>
          ))}
        </div>
      </div>
      {items.length === 0 ? (
        <p className="flex items-center gap-2 px-5 py-6 text-sm text-slate">
          <Icon name="check_circle" size={18} className="text-available" /> Nothing outstanding — everything is settled.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((i) => {
            const body = (
              <>
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm font-medium text-ink">{i.title}</span>
                  <span className="text-xs text-slate">{i.detail}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {i.severity === "overdue" && <Pill className="bg-error/10 text-error">Overdue</Pill>}
                  <Pill className={SIDE_COLOR[i.side]}>{SIDE_LABEL[i.side]}</Pill>
                </span>
              </>
            );
            const cls = "flex flex-wrap items-center justify-between gap-2 px-5 py-3";
            // A reminder only makes sense for items waiting on this person (not staff-only or the other party).
            const canRemind = i.side === mine || i.side === "both";
            return (
              <li key={i.id} className={canRemind ? "flex flex-wrap items-center justify-between gap-2 pr-5" : undefined}>
                {i.href
                  ? <Link href={i.href} className={`${cls} hover:bg-surface-gray ${canRemind ? "min-w-0 flex-1" : ""}`}>{body}</Link>
                  : <div className={`${cls} ${canRemind ? "min-w-0 flex-1" : ""}`}>{body}</div>}
                {canRemind && <ReminderButton party={party} personId={personId} itemId={i.id} />}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function PersonDetail({
  party, person, history, tab, editHref,
}: {
  party: "tenant" | "owner";
  person: PersonRecord;
  history: PersonHistory;
  tab: TabKey;
  editHref: string;
}) {
  const base = party === "tenant" ? `/admin/tenants/${person.id}` : `/admin/owners/${person.id}`;
  const items = deriveActionItems(history);
  const activity = buildActivity(history);

  const outstanding = history.invoices
    .filter((i) => ["issued", "partially_paid", "overdue"].includes(i.status))
    .reduce((s, i) => s + Math.max(0, Number(i.total_amount) - Number(i.amount_paid)), 0);
  const paid = history.payments.filter((p) => p.status !== "reversed").reduce((s, p) => s + Number(p.amount), 0);
  const activeLeases = history.leases.filter((l) => l.status === "active" || l.status === "expiring").length;
  const openTickets = history.tickets.filter((t) => !["resolved", "closed", "cancelled", "duplicate"].includes(t.status)).length;

  const invoiceCols: Column<PersonHistory["invoices"][number]>[] = [
    { header: "Invoice", primary: true, cell: (r) => <LinkCell href={`/admin/invoices/${r.id}`}>{r.invoice_number}</LinkCell> },
    { header: "Status", cell: (r) => <Status value={r.status} /> },
    { header: "Total", cell: (r) => peso(r.total_amount) },
    { header: "Paid", cell: (r) => peso(r.amount_paid) },
    { header: "Due", cell: (r) => date(r.due_date) },
  ];
  const paymentCols: Column<PersonHistory["payments"][number]>[] = [
    { header: "Received", primary: true, cell: (r) => date(r.received_at) },
    { header: "Amount", cell: (r) => <span className="font-medium text-navy">{peso(r.amount)}</span> },
    { header: "Method", cell: (r) => label(r.method) },
    { header: "Status", cell: (r) => <Status value={r.status} /> },
    { header: "Acknowledgement receipt", align: "right", cell: (r) => r.receipt_pdf_path
      ? <a href={`/api/portal/payments/${r.id}/receipt`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1 text-navy-700 hover:underline"><Icon name="receipt_long" size={18} /> View</a>
      : <span className="text-slate">—</span> },
  ];
  const depositCols: Column<PersonHistory["deposits"][number]>[] = [
    { header: "Deposit", primary: true, cell: (r) => <LinkCell href={`/admin/security-deposits/${r.id}`}>{peso(r.amount_held)}</LinkCell> },
    { header: "Status", cell: (r) => <Status value={r.status} /> },
  ];
  const statementCols: Column<PersonHistory["statements"][number]>[] = [
    { header: "Period", primary: true, cell: (r) => <LinkCell href={`/admin/statements/${r.id}`}>{date(r.period_start)} – {date(r.period_end)}</LinkCell> },
    { header: "Status", cell: (r) => <Status value={r.status} /> },
    { header: "Closing balance", cell: (r) => peso(r.closing_balance ?? 0) },
    ...(party === "owner" ? [{ header: "Net remittance", cell: (r: PersonHistory["statements"][number]) => peso(r.net_remittance ?? 0) }] : []),
  ];
  const contractCols: Column<ContractRow>[] = [
    { header: "Contract", primary: true, cell: (r) => <LinkCell href={r.href}>{r.detail}</LinkCell> },
    { header: "Type", cell: (r) => <Pill className={CONTRACT_TYPE_COLOR[r.type]}>{CONTRACT_TYPE_LABEL[r.type]}</Pill> },
    { header: "Status", cell: (r) => <Pill className={CONTRACT_STATUS_COLOR[r.status] ?? "bg-surface-gray text-slate"}>{r.statusLabel}</Pill> },
    { header: "Sent", cell: (r) => date(r.created_at) },
    { header: "Signed", cell: (r) => date(r.signed_at) },
  ];
  const quotationCols: Column<PersonHistory["quotations"][number]>[] = [
    { header: "Quotation", primary: true, cell: (r) => <LinkCell href={`/admin/quotations/${r.id}`}>{r.quotation_number}</LinkCell> },
    { header: "Title", cell: (r) => r.title ?? "—" },
    { header: "Status", cell: (r) => <Status value={r.status} /> },
    { header: "Valid until", cell: (r) => date(r.valid_until) },
  ];
  const leaseCols: Column<PersonHistory["leases"][number]>[] = [
    { header: "Unit", primary: true, cell: (r) => <LinkCell href={`/admin/leases/${r.id}/edit`}>{r.unitLabel ?? "Lease"}</LinkCell> },
    ...(party === "owner" ? [{ header: "Tenant", cell: (r: PersonHistory["leases"][number]) => r.tenantName ?? "—" }] : []),
    { header: "Status", cell: (r) => <Status value={r.status} /> },
    { header: "Term", cell: (r) => `${date(r.start_date)} – ${date(r.end_date)}` },
    { header: "Rent", cell: (r) => peso(r.rent_amount) },
  ];
  const ticketCols: Column<PersonHistory["tickets"][number]>[] = [
    { header: "Ticket", primary: true, cell: (r) => <LinkCell href={`/admin/tickets/${r.id}`}>{r.ticket_number}</LinkCell> },
    { header: "Subject", cell: (r) => r.subject },
    { header: "Status", cell: (r) => <Status value={r.status} /> },
    { header: "Opened", cell: (r) => date(r.created_at) },
  ];
  const workOrderCols: Column<PersonHistory["workOrders"][number]>[] = [
    { header: "Work order", primary: true, cell: (r) => <LinkCell href={`/admin/work-orders/${r.id}`}>{r.work_order_number}</LinkCell> },
    { header: "Title", cell: (r) => r.title },
    { header: "Status", cell: (r) => <Status value={r.status} /> },
    { header: "Scheduled", cell: (r) => date(r.scheduled_date) },
  ];

  const empty = (what: string) => <>No {what}.</>;

  return (
    <div className="mx-auto max-w-5xl">
      <Link href={party === "tenant" ? "/admin/tenants" : "/admin/owners"} className="inline-flex min-h-11 items-center gap-1 text-sm text-slate hover:text-navy">
        <Icon name="arrow_back" size={18} /> {party === "tenant" ? "Tenants" : "Owners"}
      </Link>

      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">{person.name}</h1>
          <p className="mt-1 text-sm text-slate">
            {person.email}{person.phone ? ` · ${person.phone}` : ""} ·{" "}
            {person.auth_user_id ? "Portal linked" : "Portal not linked"}
          </p>
        </div>
        <Link href={editHref} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-navy px-5 text-sm font-semibold text-navy hover:bg-surface-gray press">
          <Icon name="edit" size={18} /> Edit details
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Outstanding balance" value={peso(outstanding)} icon="payments" accent={outstanding > 0} />
        <StatCard label="Total paid" value={peso(paid)} icon="receipt_long" />
        <StatCard label={party === "tenant" ? "Active leases" : "Leased units"} value={activeLeases} icon="home_work" />
        <StatCard label="Open tickets" value={openTickets} icon="support_agent" />
      </div>

      <nav aria-label="Sections" className="mt-8 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "overview" ? base : `${base}?tab=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={`inline-flex min-h-11 shrink-0 items-center border-b-2 px-4 text-sm font-medium ${
              tab === t.key ? "border-navy text-navy" : "border-transparent text-slate hover:text-navy"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "overview" && (
        <div className="mt-6 flex flex-col gap-8">
          <AttentionPanel items={items} party={party} personId={person.id} />
          {party === "owner" && (
            <Section title="Properties" count={history.properties.length}>
              <DataTable
                rows={history.properties}
                getKey={(r) => r.id}
                empty={empty("properties")}
                columns={[
                  { header: "Property", primary: true, cell: (r) => <LinkCell href={`/admin/properties/${r.id}/edit`}>{r.name}</LinkCell> },
                  { header: "Units", cell: (r) => (r.units ?? []).map((u) => u.unit_label).join(", ") || "—" },
                ]}
              />
            </Section>
          )}
          <Section title="Recent activity">
            {activity.length === 0 ? (
              <div className="rounded-lg border border-line bg-surface px-4 py-8 text-center text-sm text-slate">No activity yet.</div>
            ) : (
              <ol className="rounded-lg border border-line bg-surface">
                {activity.map((e) => {
                  const inner = (
                    <>
                      <span className="flex min-w-0 flex-col">
                        <span className="text-sm text-ink">{e.title}</span>
                        {e.detail && <span className="text-xs text-slate">{e.detail}</span>}
                      </span>
                      <time dateTime={e.at} className="shrink-0 text-xs text-slate">{date(e.at)}</time>
                    </>
                  );
                  const cls = "flex items-start justify-between gap-3 border-b border-line px-5 py-3 last:border-b-0";
                  return (
                    <li key={e.id}>
                      {e.href ? <Link href={e.href} className={`${cls} hover:bg-surface-gray`}>{inner}</Link> : <div className={cls}>{inner}</div>}
                    </li>
                  );
                })}
              </ol>
            )}
          </Section>
        </div>
      )}

      {tab === "billing" && (
        <>
          <Section title="Invoices" count={history.invoices.length}>
            <DataTable rows={history.invoices} columns={invoiceCols} getKey={(r) => r.id} empty={empty("invoices")} />
          </Section>
          <Section title="Payments & acknowledgement receipts" count={history.payments.length}>
            <DataTable rows={history.payments} columns={paymentCols} getKey={(r) => r.id} empty={empty("payments recorded")} />
          </Section>
          <Section title="Security deposits" count={history.deposits.length}>
            <DataTable rows={history.deposits} columns={depositCols} getKey={(r) => r.id} empty={empty("security deposits")} />
          </Section>
          <Section title="Statements of account" count={history.statements.length}>
            <DataTable rows={history.statements} columns={statementCols} getKey={(r) => r.id} empty={empty("statements")} />
          </Section>
        </>
      )}

      {tab === "contracts" && (
        <>
          <Section title="Contracts" count={history.contracts.length}>
            <DataTable rows={history.contracts} columns={contractCols} getKey={(r) => `${r.type}-${r.id}`} empty={empty("contracts")} />
          </Section>
          <Section title="Quotations" count={history.quotations.length}>
            <DataTable rows={history.quotations} columns={quotationCols} getKey={(r) => r.id} empty={empty("quotations")} />
          </Section>
        </>
      )}

      {tab === "leases" && (
        <Section title="Leases" count={history.leases.length}>
          <DataTable rows={history.leases} columns={leaseCols} getKey={(r) => r.id} empty={empty("leases")} />
        </Section>
      )}

      {tab === "tickets" && (
        <>
          <Section title="Tickets" count={history.tickets.length}>
            <DataTable rows={history.tickets} columns={ticketCols} getKey={(r) => r.id} empty={empty("tickets")} />
          </Section>
          <Section title="Work orders" count={history.workOrders.length}>
            <DataTable rows={history.workOrders} columns={workOrderCols} getKey={(r) => r.id} empty={empty("work orders")} />
          </Section>
        </>
      )}

      {tab === "documents" && (
        <Section title="Documents" count={history.documents.length}>
          <DocumentList documents={history.documents} entityType={party} entityId={person.id} />
        </Section>
      )}
    </div>
  );
}
