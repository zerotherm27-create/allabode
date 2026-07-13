import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
import { DataTable, type Column } from "@/components/admin/data-table";

type PmRow = {
  id: string;
  owner_email: string;
  owner_name_hint: string | null;
  owner_details: { name?: string } | null;
  status: string;
  created_at: string;
  manager_signed_at: string | null;
};

type TenancyRow = {
  id: string;
  tenant_email: string;
  tenant_name_hint: string | null;
  tenant_details: { name?: string } | null;
  property_details: { buildingName?: string; floorUnit?: string } | null;
  status: string;
  created_at: string;
  landlord_signed_at: string | null;
};

type ParkingRow = {
  id: string;
  tenant_email: string;
  tenant_name_hint: string | null;
  tenant_details: { name?: string } | null;
  parking_details: { slotLabel?: string; buildingName?: string } | null;
  status: string;
  created_at: string;
  landlord_signed_at: string | null;
};

type StrRow = {
  id: string;
  tenant_email: string;
  tenant_name_hint: string | null;
  tenant_details: { name?: string } | null;
  property_details: { buildingName?: string; unitNumber?: string } | null;
  status: string;
  created_at: string;
  homeowner_signed_at: string | null;
};

type Row = {
  id: string;
  type: "pm" | "tenancy" | "parking" | "short_term_rental";
  href: string;
  name: string;
  email: string;
  detail: string;
  status: string;
  statusLabel: string;
  created_at: string;
  signed_at: string | null;
};

const PM_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  sent: "Sent — awaiting owner",
  owner_signed: "Owner signed — awaiting countersign",
  completed: "Fully executed",
  voided: "Voided",
};
const TENANCY_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  sent: "Sent — awaiting tenant",
  tenant_signed: "Tenant signed — awaiting landlord",
  completed: "Fully executed",
  voided: "Voided",
};
const STATUS_COLOR: Record<string, string> = {
  draft: "bg-surface-gray text-slate",
  sent: "bg-gold/15 text-gold-bright",
  owner_signed: "bg-reserved/15 text-reserved",
  tenant_signed: "bg-reserved/15 text-reserved",
  completed: "bg-available/15 text-available",
  voided: "bg-error/10 text-error",
};

export default async function AdminContractsPage() {
  const supabase = await createClient();
  const [{ data: pmData }, { data: tenancyData }, { data: parkingData }, { data: strData }] = await Promise.all([
    supabase
      .from("agreements")
      .select("id,owner_email,owner_name_hint,owner_details,status,created_at,manager_signed_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("tenancy_agreements")
      .select("id,tenant_email,tenant_name_hint,tenant_details,property_details,status,created_at,landlord_signed_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("parking_agreements")
      .select("id,tenant_email,tenant_name_hint,tenant_details,parking_details,status,created_at,landlord_signed_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("short_term_rental_agreements")
      .select("id,tenant_email,tenant_name_hint,tenant_details,property_details,status,created_at,homeowner_signed_at")
      .order("created_at", { ascending: false }),
  ]);

  const rows: Row[] = [
    ...((pmData ?? []) as PmRow[]).map((r): Row => ({
      id: r.id,
      type: "pm",
      href: `/admin/contracts/${r.id}`,
      name: r.owner_details?.name || r.owner_name_hint || r.owner_email,
      email: r.owner_email,
      detail: "Property Management",
      status: r.status,
      statusLabel: PM_STATUS_LABEL[r.status] ?? r.status,
      created_at: r.created_at,
      signed_at: r.manager_signed_at,
    })),
    ...((tenancyData ?? []) as TenancyRow[]).map((r): Row => ({
      id: r.id,
      type: "tenancy",
      href: `/admin/contracts/tenancy/${r.id}`,
      name: r.tenant_details?.name || r.tenant_name_hint || r.tenant_email,
      email: r.tenant_email,
      detail: [r.property_details?.buildingName, r.property_details?.floorUnit].filter(Boolean).join(" ") || "Tenancy",
      status: r.status,
      statusLabel: TENANCY_STATUS_LABEL[r.status] ?? r.status,
      created_at: r.created_at,
      signed_at: r.landlord_signed_at,
    })),
    ...((parkingData ?? []) as ParkingRow[]).map((r): Row => ({
      id: r.id,
      type: "parking",
      href: `/admin/contracts/parking/${r.id}`,
      name: r.tenant_details?.name || r.tenant_name_hint || r.tenant_email,
      email: r.tenant_email,
      detail: [r.parking_details?.slotLabel, r.parking_details?.buildingName].filter(Boolean).join(", ") || "Parking",
      status: r.status,
      statusLabel: TENANCY_STATUS_LABEL[r.status] ?? r.status,
      created_at: r.created_at,
      signed_at: r.landlord_signed_at,
    })),
    ...((strData ?? []) as StrRow[]).map((r): Row => ({
      id: r.id,
      type: "short_term_rental",
      href: `/admin/contracts/short-term-rental/${r.id}`,
      name: r.tenant_details?.name || r.tenant_name_hint || r.tenant_email,
      email: r.tenant_email,
      detail: [r.property_details?.unitNumber, r.property_details?.buildingName].filter(Boolean).join(", ") || "Short Term Rental",
      status: r.status,
      statusLabel: TENANCY_STATUS_LABEL[r.status] ?? r.status,
      created_at: r.created_at,
      signed_at: r.homeowner_signed_at,
    })),
  ].sort((x, y) => (x.created_at < y.created_at ? 1 : -1));

  const columns: Column<Row>[] = [
    {
      header: "Contract", primary: true,
      cell: (r) => (
        <Link href={r.href} className="font-medium text-navy hover:text-navy-700">
          {r.name}
        </Link>
      ),
    },
    {
      header: "Type",
      cell: (r) => (
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
          r.type === "pm" ? "bg-navy/10 text-navy"
            : r.type === "tenancy" ? "bg-gold/15 text-gold-bright"
            : r.type === "parking" ? "bg-navy-700/10 text-navy-700"
            : "bg-available/15 text-available"
        }`}>
          {r.type === "pm" ? "PM Agreement" : r.type === "tenancy" ? "Tenancy" : r.type === "parking" ? "Parking" : "Short Term Rental"}
        </span>
      ),
    },
    { header: "Email", cell: (r) => <span className="text-slate">{r.email}</span> },
    {
      header: "Status",
      cell: (r) => (
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[r.status] ?? "bg-surface-gray text-slate"}`}>
          {r.statusLabel}
        </span>
      ),
    },
    { header: "Sent", cell: (r) => <span className="text-slate">{new Date(r.created_at).toLocaleDateString("en-PH")}</span> },
    { header: "Signed", cell: (r) => <span className="text-slate">{r.signed_at ? new Date(r.signed_at).toLocaleDateString("en-PH") : "—"}</span> },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Contracts</h1>
          <p className="mt-1 text-sm text-slate">{rows.length} total</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/contracts/new" className="inline-flex items-center gap-2 rounded-md bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-navy-800 press">
            <Icon name="add" size={20} /> PM agreement
          </Link>
          <Link href="/admin/contracts/tenancy/new" className="inline-flex items-center gap-2 rounded-md border border-navy px-5 py-3 text-sm font-semibold text-navy hover:bg-surface-gray press">
            <Icon name="add" size={20} /> Tenancy agreement
          </Link>
          <Link href="/admin/contracts/parking/new" className="inline-flex items-center gap-2 rounded-md border border-navy px-5 py-3 text-sm font-semibold text-navy hover:bg-surface-gray press">
            <Icon name="add" size={20} /> Parking agreement
          </Link>
          <Link href="/admin/contracts/short-term-rental/new" className="inline-flex items-center gap-2 rounded-md border border-navy px-5 py-3 text-sm font-semibold text-navy hover:bg-surface-gray press">
            <Icon name="add" size={20} /> Short term rental
          </Link>
        </div>
      </div>
      <div className="mt-6">
        <DataTable
          rows={rows}
          columns={columns}
          getKey={(r) => `${r.type}-${r.id}`}
          empty={<>No agreements yet. <Link href="/admin/contracts/new" className="text-navy-700 underline">Send the first one</Link>.</>}
        />
      </div>
    </div>
  );
}
