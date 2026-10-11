import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchContractRows, type ContractRow } from "@/lib/admin/contract-rows";
import type { Party, PersonData } from "@/lib/admin/action-items";
import type { DocumentRow } from "@/components/admin/document-list";

export type PersonRecord = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  auth_user_id: string | null;
  spa_authorization_received?: boolean | null;
};

export type PropertyRow = { id: string; name: string; units: { id: string; unit_label: string }[] };

export type PersonHistory = PersonData & {
  documents: DocumentRow[];
  contracts: ContractRow[];
  properties: PropertyRow[];
};

type Rows = { data: unknown[] | null };
const list = <T,>(r: Rows): T[] => (r.data ?? []) as T[];
const eq = (a: string | null | undefined, b: string) => (a ?? "").trim().toLowerCase() === b.trim().toLowerCase();

/** YYYY-MM-DD for "today" in Manila — matches how the rest of the admin app reasons about dates. */
export function manilaToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(now);
}

/**
 * Everything the admin owner/tenant detail pages show, fetched in parallel.
 * Staff RLS already grants read access to all of these tables.
 */
export async function getPersonHistory(
  supabase: SupabaseClient,
  party: Party,
  person: PersonRecord,
): Promise<PersonHistory> {
  const today = manilaToday();

  // Owner: properties → units drive lease / work-order / contract scoping.
  let properties: PropertyRow[] = [];
  if (party === "owner") {
    properties = list<PropertyRow>(
      await supabase.from("properties").select("id,name,units(id,unit_label)").eq("owner_id", person.id).order("name"),
    );
  }
  const propertyIds = properties.map((p) => p.id);
  const unitIds = properties.flatMap((p) => (p.units ?? []).map((u) => u.id));

  const personFilter = party === "tenant" ? "tenant_id" : "owner_id";

  const invoiceQ = supabase
    .from("invoices")
    .select("id,invoice_number,status,total_amount,amount_paid,due_date,issued_at,created_at")
    .eq(personFilter, person.id)
    .order("created_at", { ascending: false });
  // Owner-billed invoices only: lease invoices also carry owner_id but are billed to the tenant.
  const invoices = party === "owner" ? invoiceQ.is("tenant_id", null) : invoiceQ;

  const leaseSelect = "id,status,start_date,end_date,rent_amount,deposit,units(unit_label,properties(name)),tenants(name)";
  const leaseQ = supabase.from("leases").select(leaseSelect).order("start_date", { ascending: false });

  const [
    invoiceRes, paymentRes, depositRes, ticketRes, statementRes, quotationRes, documentRes, notificationRes,
    leaseRes, workOrderByProperty, contracts,
  ] = await Promise.all([
    invoices,
    supabase
      .from("payments")
      .select("id,amount,status,method,received_at,created_at,receipt_pdf_path")
      .eq(personFilter, person.id)
      .order("received_at", { ascending: false }),
    supabase
      .from("security_deposits")
      .select("id,lease_id,status,amount_held,received_at")
      .eq(personFilter, person.id)
      .order("received_at", { ascending: false }),
    supabase
      .from("tickets")
      .select("id,ticket_number,subject,status,sla_due_at,created_at")
      .eq(personFilter, person.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("statements_of_account")
      .select("id,status,period_start,period_end,closing_balance,net_remittance,published_at,created_at")
      .eq(personFilter, person.id)
      .order("period_end", { ascending: false }),
    // Quotations have no FK to a person by design — match on the recipient email.
    supabase
      .from("quotations")
      .select("id,quotation_number,title,status,valid_until,created_at,recipient_email")
      .ilike("recipient_email", person.email.trim())
      .order("created_at", { ascending: false }),
    supabase
      .from("documents")
      .select("id,title,document_type,file_name,file_size,file_mime_type,visibility,is_signed,is_immutable,created_at")
      .eq("entity_type", party)
      .eq("entity_id", person.id)
      .order("created_at", { ascending: false }),
    person.auth_user_id
      ? supabase
          .from("notifications")
          .select("id,title,is_read,created_at,link")
          .eq("recipient_user_id", person.auth_user_id)
          .order("created_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] as unknown[] }),
    party === "tenant"
      ? leaseQ.eq("tenant_id", person.id)
      : unitIds.length
        ? leaseQ.in("unit_id", unitIds)
        : Promise.resolve({ data: [] as unknown[] }),
    party === "owner" && propertyIds.length
      ? supabase
          .from("work_orders")
          .select("id,work_order_number,title,status,scheduled_date,created_at")
          .in("property_id", propertyIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as unknown[] }),
    fetchContractRows(
      supabase,
      party === "tenant"
        ? { party: "tenant", id: person.id, email: person.email }
        : { party: "owner", id: person.id, email: person.email, unitIds },
    ),
  ]);

  const tickets = list<PersonData["tickets"][number]>(ticketRes);

  // Tenant work orders hang off their tickets (work_orders has no person column).
  let workOrders = list<PersonData["workOrders"][number]>(workOrderByProperty);
  if (party === "tenant" && tickets.length) {
    workOrders = list(
      await supabase
        .from("work_orders")
        .select("id,work_order_number,title,status,scheduled_date,created_at")
        .in("ticket_id", tickets.map((t) => t.id))
        .order("created_at", { ascending: false }),
    );
  }

  type LeaseRaw = {
    id: string; status: string; start_date: string; end_date: string | null; rent_amount: number | string;
    units: { unit_label: string; properties: { name: string } | null } | null;
    tenants: { name: string } | null;
  };
  const leases = list<LeaseRaw>(leaseRes).map((l) => ({
    id: l.id,
    status: l.status,
    start_date: l.start_date,
    end_date: l.end_date,
    rent_amount: l.rent_amount,
    unitLabel: l.units ? [l.units.properties?.name, l.units.unit_label].filter(Boolean).join(" · ") : null,
    tenantName: party === "owner" ? l.tenants?.name ?? null : null,
  }));

  return {
    party,
    today,
    person: {
      id: person.id,
      auth_user_id: person.auth_user_id,
      spa_authorization_received: person.spa_authorization_received,
    },
    properties,
    contracts,
    leases,
    invoices: list(invoiceRes),
    payments: list(paymentRes),
    deposits: list(depositRes),
    tickets,
    workOrders,
    statements: list(statementRes),
    // `_`/`%` are wildcards in ilike, so re-check for an exact (case-insensitive) match.
    quotations: list<PersonData["quotations"][number] & { recipient_email: string }>(quotationRes).filter((q) =>
      eq(q.recipient_email, person.email),
    ),
    documents: list(documentRes),
    notifications: list(notificationRes),
  };
}
