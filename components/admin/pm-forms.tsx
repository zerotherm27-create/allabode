"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { F, Group, inputCls, SubmitButton } from "@/components/admin/form-kit";

type Action = (fd: FormData) => void | Promise<void>;
export type Option = { id: string; label: string };

const PROPERTY_TYPES = [
  "Condo", "House and Lot", "Apartment", "Townhouse", "Dorm / Bed Space",
  "Commercial", "Office", "Lot", "Warehouse", "Other",
];
const PROPERTY_STATUSES = ["Active", "Inactive", "Sold", "Archived"];
const UNIT_STATUSES = ["Vacant", "Occupied", "Reserved", "Maintenance"];
const LEASE_STATUSES = [
  "draft", "pending_signature", "active", "renewal_pending", "renewed",
  "expiring", "ended", "terminated", "archived",
];
const BILLING_CYCLES = ["monthly", "quarterly", "semi_annual", "annual"];
const LEASE_TYPE_DEFAULT_MGMT_FEE: Record<string, number> = {
  long_term: 5,
  short_term: 10,
  bnb: 20,
};

function leaseTypeLabel(value: string) {
  if (value === "bnb") return "BNB / daily platform";
  return value === "short_term" ? "Short-term rental" : "Long-term rental";
}

function defaultMgmtFeeForLeaseType(value: string | undefined) {
  return LEASE_TYPE_DEFAULT_MGMT_FEE[value ?? "long_term"] ?? LEASE_TYPE_DEFAULT_MGMT_FEE.long_term;
}

function Footer({ cancelHref, label }: { cancelHref: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <SubmitButton label={label} />
      <Link href={cancelHref} className="text-sm font-medium text-slate hover:text-navy">
        Cancel
      </Link>
    </div>
  );
}

// ---------- Owner ----------
export type OwnerValues = {
  name?: string; email?: string; phone?: string; address?: string;
  bank_name?: string; bank_account_name?: string; bank_account_no?: string;
  management_fee_percent?: number | null; notes?: string;
};
export function OwnerForm({ action, initial = {} }: { action: Action; initial?: OwnerValues }) {
  const v = initial;
  return (
    <form action={action} className="flex flex-col gap-6">
      <Group title="Owner">
        <F label="Name"><input name="name" defaultValue={v.name} required className={inputCls} /></F>
        <F label="Email" hint="Used to link their portal login"><input name="email" type="email" defaultValue={v.email} required className={inputCls} /></F>
        <F label="Phone"><input name="phone" defaultValue={v.phone} className={inputCls} /></F>
        <F label="Management fee (%)"><input name="management_fee_percent" type="number" step="0.01" defaultValue={v.management_fee_percent ?? undefined} className={inputCls} /></F>
        <F label="Address" span><input name="address" defaultValue={v.address} className={inputCls} /></F>
      </Group>
      <Group title="Remittance (bank details)">
        <F label="Bank name"><input name="bank_name" defaultValue={v.bank_name} className={inputCls} /></F>
        <F label="Account name"><input name="bank_account_name" defaultValue={v.bank_account_name} className={inputCls} /></F>
        <F label="Account number"><input name="bank_account_no" defaultValue={v.bank_account_no} className={inputCls} /></F>
      </Group>
      <Group title="Internal">
        <F label="Notes" span><textarea name="notes" defaultValue={v.notes} rows={3} className={`${inputCls} h-auto py-2`} /></F>
      </Group>
      <Footer cancelHref="/admin/owners" label="Save owner" />
    </form>
  );
}

// ---------- Tenant ----------
export type TenantValues = { name?: string; email?: string; phone?: string; notes?: string };
export function TenantForm({ action, initial = {} }: { action: Action; initial?: TenantValues }) {
  const v = initial;
  return (
    <form action={action} className="flex flex-col gap-6">
      <Group title="Tenant">
        <F label="Name"><input name="name" defaultValue={v.name} required className={inputCls} /></F>
        <F label="Email" hint="Used to link their portal login"><input name="email" type="email" defaultValue={v.email} required className={inputCls} /></F>
        <F label="Phone"><input name="phone" defaultValue={v.phone} className={inputCls} /></F>
        <F label="Notes" span><textarea name="notes" defaultValue={v.notes} rows={3} className={`${inputCls} h-auto py-2`} /></F>
      </Group>
      <Footer cancelHref="/admin/tenants" label="Save tenant" />
    </form>
  );
}

// ---------- Vendor ----------
export type VendorValues = {
  name?: string; tin?: string; address?: string;
  is_approved?: boolean; is_blocked?: boolean; notes?: string;
};
export function VendorForm({ action, initial = {} }: { action: Action; initial?: VendorValues }) {
  const v = initial;
  return (
    <form action={action} className="flex flex-col gap-6">
      <Group title="Vendor">
        <F label="Name"><input name="name" defaultValue={v.name} required className={inputCls} /></F>
        <F label="TIN"><input name="tin" defaultValue={v.tin} className={inputCls} /></F>
        <F label="Address" span><input name="address" defaultValue={v.address} className={inputCls} /></F>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="is_approved" defaultChecked={v.is_approved} className="h-4 w-4 accent-navy" />
          <span className="text-sm text-navy">Approved for expense posting</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="is_blocked" defaultChecked={v.is_blocked} className="h-4 w-4 accent-navy" />
          <span className="text-sm text-navy">Blocked</span>
        </label>
        <F label="Notes" span><textarea name="notes" defaultValue={v.notes} rows={3} className={`${inputCls} h-auto py-2`} /></F>
      </Group>
      <Footer cancelHref="/admin/vendors" label="Save vendor" />
    </form>
  );
}

// ---------- Property ----------
export type PropertyValues = {
  owner_id?: string; name?: string; address?: string; city?: string; province?: string;
  property_type?: string; status?: string; management_start_date?: string; notes?: string;
};
export function PropertyForm({ action, initial = {}, owners }: { action: Action; initial?: PropertyValues; owners: Option[] }) {
  const v = initial;
  return (
    <form action={action} className="flex flex-col gap-6">
      <Group title="Property">
        <F label="Owner">
          <select name="owner_id" defaultValue={v.owner_id ?? ""} required className={inputCls}>
            <option value="" disabled>Select owner…</option>
            {owners.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </F>
        <F label="Name"><input name="name" defaultValue={v.name} required className={inputCls} /></F>
        <F label="Property type">
          <select name="property_type" defaultValue={v.property_type ?? "Condo"} className={inputCls}>
            {PROPERTY_TYPES.map((o) => <option key={o}>{o}</option>)}
          </select>
        </F>
        <F label="Status">
          <select name="status" defaultValue={v.status ?? "Active"} className={inputCls}>
            {PROPERTY_STATUSES.map((o) => <option key={o}>{o}</option>)}
          </select>
        </F>
        <F label="Management start date"><input name="management_start_date" type="date" defaultValue={v.management_start_date} className={inputCls} /></F>
        <F label="Address" span><input name="address" defaultValue={v.address} className={inputCls} /></F>
        <F label="City"><input name="city" defaultValue={v.city} className={inputCls} /></F>
        <F label="Province"><input name="province" defaultValue={v.province} className={inputCls} /></F>
        <F label="Notes" span><textarea name="notes" defaultValue={v.notes} rows={3} className={`${inputCls} h-auto py-2`} /></F>
      </Group>
      <Footer cancelHref="/admin/properties" label="Save property" />
    </form>
  );
}

// ---------- Unit ----------
export type UnitValues = {
  property_id?: string; unit_label?: string; bedrooms?: number | null; bathrooms?: number | null;
  floor_area?: number | null; base_rent?: number | null; status?: string; notes?: string;
};
export function UnitForm({ action, initial = {}, properties }: { action: Action; initial?: UnitValues; properties: Option[] }) {
  const v = initial;
  return (
    <form action={action} className="flex flex-col gap-6">
      <Group title="Unit">
        <F label="Property">
          <select name="property_id" defaultValue={v.property_id ?? ""} required className={inputCls}>
            <option value="" disabled>Select property…</option>
            {properties.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </F>
        <F label="Unit label" hint="e.g. Unit 4B"><input name="unit_label" defaultValue={v.unit_label} required className={inputCls} /></F>
        <F label="Bedrooms"><input name="bedrooms" type="number" defaultValue={v.bedrooms ?? undefined} className={inputCls} /></F>
        <F label="Bathrooms"><input name="bathrooms" type="number" defaultValue={v.bathrooms ?? undefined} className={inputCls} /></F>
        <F label="Floor area (sqm)"><input name="floor_area" type="number" step="0.01" defaultValue={v.floor_area ?? undefined} className={inputCls} /></F>
        <F label="Base rent (₱)"><input name="base_rent" type="number" step="0.01" defaultValue={v.base_rent ?? undefined} className={inputCls} /></F>
        <F label="Status">
          <select name="status" defaultValue={v.status ?? "Vacant"} className={inputCls}>
            {UNIT_STATUSES.map((o) => <option key={o}>{o}</option>)}
          </select>
        </F>
        <F label="Notes" span><textarea name="notes" defaultValue={v.notes} rows={3} className={`${inputCls} h-auto py-2`} /></F>
      </Group>
      <Footer cancelHref="/admin/units" label="Save unit" />
    </form>
  );
}

// ---------- Lease ----------
export type LeaseValues = {
  unit_id?: string; tenant_id?: string; start_date?: string; end_date?: string;
  rent_amount?: number | null; billing_cycle?: string; deposit?: number | null;
  advance?: number | null; remittance_due_date?: string; notice_period_days?: number | null; status?: string; terms?: string;
  lease_type?: string; mgmt_fee_pct?: number | null; vat_pct?: number | null;
};
export function LeaseForm({
  action, initial = {}, units, tenants,
}: { action: Action; initial?: LeaseValues; units: Option[]; tenants: Option[] }) {
  const v = initial;
  const initialLeaseType = v.lease_type ?? "long_term";
  const initialMgmtFee = useMemo(
    () => String(v.mgmt_fee_pct ?? defaultMgmtFeeForLeaseType(initialLeaseType)),
    [initialLeaseType, v.mgmt_fee_pct]
  );
  const [leaseType, setLeaseType] = useState(initialLeaseType);
  const [mgmtFeePct, setMgmtFeePct] = useState(initialMgmtFee);
  return (
    <form action={action} className="flex flex-col gap-6">
      <Group title="Lease">
        <F label="Unit">
          <select name="unit_id" defaultValue={v.unit_id ?? ""} required className={inputCls}>
            <option value="" disabled>Select unit…</option>
            {units.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </F>
        <F label="Tenant">
          <select name="tenant_id" defaultValue={v.tenant_id ?? ""} required className={inputCls}>
            <option value="" disabled>Select tenant…</option>
            {tenants.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </F>
        <F label="Lease type">
          <select
            name="lease_type"
            value={leaseType}
            onChange={(event) => {
              const next = event.target.value;
              const previousDefault = String(defaultMgmtFeeForLeaseType(leaseType));
              if (mgmtFeePct === "" || mgmtFeePct === previousDefault) {
                setMgmtFeePct(String(defaultMgmtFeeForLeaseType(next)));
              }
              setLeaseType(next);
            }}
            className={inputCls}
          >
            <option value="long_term">{leaseTypeLabel("long_term")}</option>
            <option value="short_term">{leaseTypeLabel("short_term")}</option>
            <option value="bnb">{leaseTypeLabel("bnb")}</option>
          </select>
        </F>
        <F label="Start date"><input name="start_date" type="date" defaultValue={v.start_date} required className={inputCls} /></F>
        <F label="End date"><input name="end_date" type="date" defaultValue={v.end_date} className={inputCls} /></F>
        <F label="Rent amount (₱)"><input name="rent_amount" type="number" step="0.01" defaultValue={v.rent_amount ?? undefined} required className={inputCls} /></F>
        <F label="Billing cycle">
          <select name="billing_cycle" defaultValue={v.billing_cycle ?? "monthly"} className={inputCls}>
            {BILLING_CYCLES.map((o) => <option key={o} value={o}>{o.replace("_", "-")}</option>)}
          </select>
        </F>
        <F label="Deposit (₱)"><input name="deposit" type="number" step="0.01" defaultValue={v.deposit ?? undefined} className={inputCls} /></F>
        <F label="Advance (₱)"><input name="advance" type="number" step="0.01" defaultValue={v.advance ?? undefined} className={inputCls} /></F>
        <F label="Remittance due date" hint="Copied into generated owner SOAs">
          <input name="remittance_due_date" type="date" defaultValue={v.remittance_due_date} className={inputCls} />
        </F>
        <F label="Notice period (days)"><input name="notice_period_days" type="number" defaultValue={v.notice_period_days ?? undefined} className={inputCls} /></F>
        <F label="Status">
          <select name="status" defaultValue={v.status ?? "draft"} className={inputCls}>
            {LEASE_STATUSES.map((o) => <option key={o} value={o}>{o.replace(/_/g, " ")}</option>)}
          </select>
        </F>
        <F label="Terms" span><textarea name="terms" defaultValue={v.terms} rows={3} className={`${inputCls} h-auto py-2`} /></F>
      </Group>
      <Group title="Management Fees">
        <F label="Management fee %" hint={`${leaseTypeLabel(leaseType)} default: ${defaultMgmtFeeForLeaseType(leaseType)}%. You can override per lease.`}>
          <input
            name="mgmt_fee_pct"
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={mgmtFeePct}
            onChange={(event) => setMgmtFeePct(event.target.value)}
            required
            className={inputCls}
          />
        </F>
        <F label="VAT %" hint="Applied on management fee">
          <input name="vat_pct" type="number" step="0.01" min="0" max="100" defaultValue={v.vat_pct ?? 12} required className={inputCls} />
        </F>
      </Group>
      <Footer cancelHref="/admin/leases" label="Save lease" />
    </form>
  );
}
