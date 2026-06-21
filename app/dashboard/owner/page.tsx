import type { Metadata } from "next";
import { Icon } from "@/components/icon";
import {
  DashboardShell,
  StatCard,
  Panel,
  type NavItem,
} from "@/components/dashboard/shell";

export const metadata: Metadata = {
  title: "Owner Dashboard",
  robots: { index: false },
};

const nav: NavItem[] = [
  { label: "Dashboard", icon: "dashboard", href: "/dashboard/owner" },
  { label: "Properties", icon: "home_work", href: "/dashboard/owner" },
  { label: "Payments", icon: "payments", href: "/dashboard/owner" },
  { label: "Maintenance", icon: "build_circle", href: "/dashboard/owner" },
  { label: "Reports", icon: "analytics", href: "/dashboard/owner" },
  { label: "Settings", icon: "settings", href: "/dashboard/owner" },
];

const income = [
  { m: "Mar", v: 62 },
  { m: "Apr", v: 70 },
  { m: "May", v: 65 },
  { m: "Jun", v: 80 },
  { m: "Jul", v: 74 },
  { m: "Aug", v: 92 },
];

const actions = [
  {
    icon: "event_repeat",
    title: "Lease Renewal",
    body: "Unit 4B, The Astoria — tenant requesting a 12-month extension.",
    cta: "Review",
  },
  {
    icon: "build",
    title: "Maintenance Approval",
    body: "Roof deck waterproofing quote awaiting your approval.",
    cta: "Approve",
  },
];

const portfolio = [
  { unit: "Unit 4B, The Astoria", location: "BGC, Taguig", rent: "₱45,000", tenant: "Maria Santos", status: "Occupied", gradient: "from-navy via-navy-700 to-navy-600" },
  { unit: "Unit 12A, One Serendra", location: "BGC, Taguig", rent: "₱60,000", tenant: "Listed — 3 viewings", status: "Listed", gradient: "from-navy-800 via-navy-700 to-navy-600" },
  { unit: "Townhouse C, Valle Verde", location: "Pasig City", rent: "₱85,000", tenant: "J. Reyes", status: "Occupied", gradient: "from-navy-700 via-navy-600 to-navy-800" },
];

const reports = [
  { name: "August 2024 Financial Summary", date: "Sep 1, 2024", size: "1.2 MB" },
  { name: "July 2024 Financial Summary", date: "Aug 1, 2024", size: "1.1 MB" },
  { name: "June 2024 Financial Summary", date: "Jul 1, 2024", size: "1.3 MB" },
];

export default function OwnerDashboard() {
  return (
    <DashboardShell role="Owner" nav={nav} userName="Owner">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-navy">
              Portfolio Overview
            </h1>
            <p className="mt-1 text-sm text-slate">
              Welcome back. Here is the current status of your investments.
            </p>
          </div>
          <button className="label-caps inline-flex items-center gap-2 bg-navy px-4 py-2.5 text-white transition-colors hover:bg-navy-800">
            <Icon name="download" size={18} />
            Download Full Report
          </button>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard icon="home_work" label="Total Units" value="12" delta="+2 this year" />
          <StatCard icon="donut_large" label="Occupancy Rate" value="85%" delta="Stable" tone="flat" />
          <StatCard icon="account_balance_wallet" label="Monthly Revenue" value="₱150K" delta="+5% vs last month" />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
          {/* Income chart */}
          <Panel
            title="Rental Income — last 6 months"
            action={<span className="label-caps text-slate">Monthly</span>}
          >
            <div className="flex h-56 items-end justify-between gap-3 pt-4">
              {income.map((d) => (
                <div key={d.m} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t bg-gradient-to-t from-navy to-navy-700"
                    style={{ height: `${d.v}%` }}
                    role="img"
                    aria-label={`${d.m}: ${d.v}% of peak`}
                  />
                  <span className="text-xs text-slate">{d.m}</span>
                </div>
              ))}
            </div>
          </Panel>

          {/* Action required */}
          <Panel
            title="Action Required"
            action={
              <span className="flex size-6 items-center justify-center rounded-full bg-reserved text-xs font-bold text-white">
                {actions.length}
              </span>
            }
          >
            <ul className="flex flex-col gap-4">
              {actions.map((a) => (
                <li key={a.title} className="flex gap-3 rounded-md border border-line p-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-reserved/10 text-reserved">
                    <Icon name={a.icon} size={20} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-navy">{a.title}</p>
                    <p className="mt-0.5 text-xs text-slate">{a.body}</p>
                    <button className="label-caps mt-2 text-navy-700 hover:text-gold">
                      {a.cta} →
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        {/* Property portfolio */}
        <div className="mt-8">
          <h2 className="font-display text-lg font-bold text-navy">Property Portfolio</h2>
          <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {portfolio.map((p) => (
              <article key={p.unit} className="overflow-hidden rounded-lg border border-line bg-surface">
                <div className={`relative aspect-[16/9] bg-gradient-to-br ${p.gradient}`}>
                  <span
                    className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      p.status === "Occupied" ? "bg-available text-white" : "bg-reserved text-white"
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="font-display text-base font-semibold text-navy">{p.unit}</h3>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-slate">
                    <Icon name="location_on" size={14} className="text-gold" />
                    {p.location}
                  </p>
                  <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-sm">
                    <div>
                      <p className="label-caps text-slate">Monthly Rent</p>
                      <p className="font-semibold text-navy">{p.rent}</p>
                    </div>
                    <div className="text-right">
                      <p className="label-caps text-slate">Tenant</p>
                      <p className="text-navy">{p.tenant}</p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* Monthly reports */}
        <div className="mt-8">
          <Panel
            title="Monthly Reports"
            action={<button className="label-caps text-navy-700 hover:text-gold">View Archive</button>}
          >
            <ul className="divide-y divide-line">
              {reports.map((r) => (
                <li key={r.name} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="flex size-9 items-center justify-center rounded-md bg-navy/5 text-navy-700">
                    <Icon name="description" size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-navy">{r.name}</p>
                    <p className="text-xs text-slate">Generated {r.date} · {r.size}</p>
                  </div>
                  <button
                    aria-label={`Download ${r.name}`}
                    className="inline-flex size-9 items-center justify-center rounded-md text-slate hover:bg-surface-gray hover:text-navy"
                  >
                    <Icon name="download" size={20} />
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </DashboardShell>
  );
}
