import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/admin/shell";
import { Icon } from "@/components/icon";

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  const [listingsRes, inquiriesRes, appraisalsRes, leadsRes] = await Promise.all([
    supabase.from("listings").select("status"),
    supabase.from("inquiries").select("type,status"),
    supabase.from("appraisal_requests").select("status"),
    supabase.from("property_management_leads").select("status"),
  ]);

  const listings = (listingsRes.data ?? []) as { status: string }[];
  const inquiries = (inquiriesRes.data ?? []) as { type: string; status: string }[];
  const appraisals = (appraisalsRes.data ?? []) as { status: string }[];
  const leads = (leadsRes.data ?? []) as { status: string }[];

  const byStatus = (s: string) => listings.filter((l) => l.status === s).length;

  const listingCards = [
    { label: "Total listings", value: listings.length, icon: "home_work" },
    { label: "Published", value: byStatus("Published"), icon: "public" },
    { label: "Draft", value: byStatus("Draft"), icon: "edit_note" },
    { label: "Available", value: byStatus("Available"), icon: "check_circle" },
    { label: "Reserved", value: byStatus("Reserved"), icon: "schedule" },
    { label: "Leased", value: byStatus("Leased"), icon: "key" },
    { label: "Sold", value: byStatus("Sold"), icon: "sell" },
    { label: "Archived", value: byStatus("Archived"), icon: "inventory_2" },
  ];

  const leadCards = [
    {
      label: "New inquiries",
      value: inquiries.filter((i) => i.status === "New" && i.type !== "viewing").length,
      icon: "forum",
      href: "/admin/inquiries",
    },
    {
      label: "New viewing requests",
      value: inquiries.filter((i) => i.status === "New" && i.type === "viewing").length,
      icon: "event",
      href: "/admin/inquiries",
    },
    {
      label: "New appraisal requests",
      value: appraisals.filter((a) => a.status === "New").length,
      icon: "analytics",
      href: "/admin/appraisals",
    },
    {
      label: "New PM leads",
      value: leads.filter((l) => l.status === "New").length,
      icon: "corporate_fare",
      href: "/admin/leads",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="font-display text-2xl font-bold text-navy">Overview</h1>
      <p className="mt-1 text-sm text-slate">Snapshot of listings and incoming leads.</p>

      <h2 className="mt-8 font-display text-lg font-semibold text-navy">Listings</h2>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {listingCards.map((c) => (
          <StatCard key={c.label} {...c} />
        ))}
      </div>

      <h2 className="mt-10 font-display text-lg font-semibold text-navy">Leads</h2>
      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {leadCards.map((c) => (
          <Link key={c.label} href={c.href} className="block">
            <StatCard label={c.label} value={c.value} icon={c.icon} accent />
          </Link>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/admin/listings/new"
          className="inline-flex items-center gap-2 rounded-md bg-navy px-5 py-3 text-sm font-semibold text-white hover:bg-navy-800"
        >
          <Icon name="add" size={20} />
          Add listing
        </Link>
        <Link
          href="/admin/listings"
          className="inline-flex items-center gap-2 rounded-md border border-line px-5 py-3 text-sm font-semibold text-navy hover:bg-surface-gray"
        >
          <Icon name="home_work" size={20} />
          Manage listings
        </Link>
      </div>
    </div>
  );
}
