import type { Metadata } from "next";
import { Icon } from "@/components/icon";
import {
  DashboardShell,
  StatCard,
  Panel,
  type NavItem,
} from "@/components/dashboard/shell";

export const metadata: Metadata = {
  title: "Tenant Dashboard",
  robots: { index: false },
};

const nav: NavItem[] = [
  { label: "Dashboard", icon: "dashboard", href: "/dashboard/tenant" },
  { label: "My Lease", icon: "description", href: "/dashboard/tenant" },
  { label: "Payments", icon: "payments", href: "/dashboard/tenant" },
  { label: "Maintenance", icon: "build_circle", href: "/dashboard/tenant" },
  { label: "Messages", icon: "chat", href: "/dashboard/tenant" },
  { label: "Settings", icon: "settings", href: "/dashboard/tenant" },
];

const payments = [
  { month: "August 2024", date: "Aug 5, 2024", amount: "₱45,000", status: "Paid" },
  { month: "July 2024", date: "Jul 3, 2024", amount: "₱45,000", status: "Paid" },
  { month: "June 2024", date: "Jun 4, 2024", amount: "₱45,000", status: "Paid" },
];

const requests = [
  { icon: "plumbing", title: "Kitchen faucet leak", date: "Aug 20, 2024", status: "In Progress", tone: "bg-reserved/10 text-reserved" },
  { icon: "ac_unit", title: "Aircon servicing", date: "Aug 2, 2024", status: "Completed", tone: "bg-available/10 text-available" },
];

export default function TenantDashboard() {
  return (
    <DashboardShell role="Tenant" nav={nav} userName="Maria">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-navy">
              Welcome back, Maria
            </h1>
            <p className="mt-1 text-sm text-slate">
              Unit 4B, The Astoria — BGC, Taguig
            </p>
          </div>
          <button className="label-caps inline-flex items-center gap-2 bg-navy px-4 py-2.5 text-white transition-colors hover:bg-navy-800">
            <Icon name="add" size={18} />
            New Request
          </button>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard icon="payments" label="Next Rent Due" value="₱45,000" delta="Due Sep 5" tone="flat" />
          <StatCard icon="event" label="Lease Ends" value="Dec 2024" delta="Renewal available" tone="flat" />
          <StatCard icon="build_circle" label="Open Requests" value="1" delta="In progress" tone="flat" />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.4fr]">
          {/* Lease summary */}
          <Panel title="Current Lease">
            <dl className="flex flex-col gap-4 text-sm">
              {[
                ["Property", "Unit 4B, The Astoria"],
                ["Monthly Rent", "₱45,000"],
                ["Lease Term", "Jan 2024 – Dec 2024"],
                ["Deposit", "₱90,000 held"],
                ["Manager", "All Abode Property Solutions"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4 border-b border-line pb-3 last:border-0 last:pb-0">
                  <dt className="text-slate">{k}</dt>
                  <dd className="text-right font-medium text-navy">{v}</dd>
                </div>
              ))}
            </dl>
            <button className="label-caps mt-5 flex w-full items-center justify-center gap-2 border border-navy py-2.5 text-navy transition-colors hover:bg-navy hover:text-white">
              <Icon name="download" size={18} />
              Download Lease Copy
            </button>
          </Panel>

          {/* Payment history */}
          <Panel
            title="Payment History"
            action={<button className="label-caps text-navy-700 hover:text-gold">View All</button>}
          >
            <ul className="divide-y divide-line">
              {payments.map((p) => (
                <li key={p.month} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="flex size-9 items-center justify-center rounded-md bg-available/10 text-available">
                    <Icon name="check_circle" size={20} fill={1} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-navy">{p.month}</p>
                    <p className="text-xs text-slate">Paid {p.date}</p>
                  </div>
                  <span className="text-sm font-semibold text-navy">{p.amount}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        {/* Maintenance requests */}
        <div className="mt-8">
          <Panel
            title="Maintenance Requests"
            action={<button className="label-caps text-navy-700 hover:text-gold">New Request</button>}
          >
            <ul className="flex flex-col gap-3">
              {requests.map((r) => (
                <li key={r.title} className="flex items-center gap-3 rounded-md border border-line p-3">
                  <span className={`flex size-10 items-center justify-center rounded-md ${r.tone}`}>
                    <Icon name={r.icon} size={22} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-navy">{r.title}</p>
                    <p className="text-xs text-slate">Reported {r.date}</p>
                  </div>
                  <span className="label-caps rounded-full bg-surface-gray px-3 py-1 text-slate">
                    {r.status}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </DashboardShell>
  );
}
