import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";

async function getStatus() {
  const supabase = await createClient();
  const [
    { count: owners },
    { count: tenants },
    { count: properties },
    { count: leases },
    { count: pendingReceipts },
    { data: autoRule },
  ] = await Promise.all([
    supabase.from("owners").select("id", { count: "exact", head: true }),
    supabase.from("tenants").select("id", { count: "exact", head: true }),
    supabase.from("properties").select("id", { count: "exact", head: true }),
    supabase.from("leases").select("id", { count: "exact", head: true }).in("status", ["active", "renewal_pending", "expiring"]),
    supabase.from("receipts").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("automation_rules").select("is_active").eq("code", "auto_publish_owner_soa").maybeSingle(),
  ]);
  return {
    owners: owners ?? 0,
    tenants: tenants ?? 0,
    properties: properties ?? 0,
    leases: leases ?? 0,
    pendingReceipts: pendingReceipts ?? 0,
    autoPublishOn: !!(autoRule as { is_active?: boolean } | null)?.is_active,
  };
}

function CheckItem({ done, children }: { done: boolean; children: React.ReactNode }) {
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-4 ${done ? "border-available/30 bg-available/5" : "border-line bg-surface"}`}>
      <span className={`mt-0.5 shrink-0 flex size-6 items-center justify-center rounded-full ${done ? "bg-available text-white" : "border-2 border-slate/40"}`}>
        {done && <Icon name="check" size={14} />}
      </span>
      <span className={`text-sm leading-relaxed ${done ? "text-available" : "text-ink"}`}>{children}</span>
    </div>
  );
}

function WorkflowStep({ icon, title, children, cta, ctaHref, tag }: {
  icon: string; title: string; children: React.ReactNode;
  cta?: string; ctaHref?: string; tag?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <div className="flex items-start gap-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-navy/8 text-navy">
          <Icon name={icon} size={22} fill={1} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-display font-bold text-navy">{title}</p>
            {tag && (
              <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-medium text-gold">{tag}</span>
            )}
          </div>
          <div className="mt-2 text-sm text-slate leading-relaxed space-y-1.5">{children}</div>
          {cta && ctaHref && (
            <Link
              href={ctaHref}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-700"
            >
              {cta} <Icon name="arrow_forward" size={15} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default async function SetupGuidePage() {
  const s = await getStatus();

  const setupDone = s.owners > 0 && s.properties > 0 && s.leases > 0;

  return (
    <div className="max-w-2xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-navy">Staff Guide</h1>
        <p className="mt-1 text-sm text-slate">Everything the team needs to run the platform day-to-day — no technical knowledge required.</p>
      </div>

      {/* Dashboard snapshot */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Owners", value: s.owners, icon: "person", href: "/admin/owners" },
          { label: "Properties", value: s.properties, icon: "apartment", href: "/admin/properties" },
          { label: "Active Leases", value: s.leases, icon: "description", href: "/admin/leases" },
          { label: "Tenants", value: s.tenants, icon: "groups", href: "/admin/tenants" },
        ].map((item) => (
          <Link key={item.label} href={item.href} className="flex flex-col items-center rounded-xl border border-line bg-surface p-4 hover:bg-surface-gray text-center">
            <Icon name={item.icon} size={24} className="text-navy/40" fill={1} />
            <span className="mt-2 font-display text-2xl font-bold text-navy">{item.value}</span>
            <span className="mt-0.5 text-xs text-slate">{item.label}</span>
          </Link>
        ))}
      </div>

      {s.pendingReceipts > 0 && (
        <Link href="/admin/receipts" className="mt-3 flex items-center gap-3 rounded-xl border border-reserved/30 bg-reserved/5 px-4 py-3 hover:bg-reserved/10">
          <Icon name="warning" size={18} fill={1} className="text-reserved shrink-0" />
          <div>
            <p className="text-sm font-semibold text-reserved">{s.pendingReceipts} receipt{s.pendingReceipts !== 1 ? "s" : ""} waiting for review</p>
            <p className="text-xs text-slate">These need to be approved and posted before they appear on an SOA.</p>
          </div>
          <Icon name="chevron_right" size={18} className="text-slate ml-auto shrink-0" />
        </Link>
      )}

      {/* ── SECTION 1: FIRST TIME ── */}
      <div className="mt-10">
        <p className="label-caps text-slate mb-1">Getting Started</p>
        <h2 className="font-display text-xl font-bold text-navy mb-1">First time? Do these once.</h2>
        <p className="text-sm text-slate mb-5">Before the system can generate statements, it needs to know your properties and leases.</p>

        <div className="flex flex-col gap-3">
          <CheckItem done={s.owners > 0}>
            <strong>Add your property owners</strong> — Go to <Link href="/admin/owners" className="underline hover:text-navy font-medium">Property Management → Owners</Link> and create a record for each owner. Include their name, contact details, and bank account for payout.
          </CheckItem>
          <CheckItem done={s.properties > 0}>
            <strong>Add your properties and units</strong> — Under <Link href="/admin/properties" className="underline hover:text-navy font-medium">Properties</Link>, add each building or house. Then add the individual units inside each property.
          </CheckItem>
          <CheckItem done={s.tenants > 0}>
            <strong>Add your tenants</strong> — Go to <Link href="/admin/tenants" className="underline hover:text-navy font-medium">Tenants</Link> and create a record for each tenant with their contact info.
          </CheckItem>
          <CheckItem done={s.leases > 0}>
            <strong>Create a lease for each unit</strong> — Under <Link href="/admin/leases" className="underline hover:text-navy font-medium">Leases</Link>, link each tenant to their unit. Fill in the monthly rent, management fee, start and end dates, and remittance due date.
          </CheckItem>
        </div>
      </div>

      {/* ── SECTION 2: NEW TENANT ── */}
      <div className="mt-12">
        <p className="label-caps text-slate mb-1">When a New Tenant Moves In</p>
        <h2 className="font-display text-xl font-bold text-navy mb-5">New lease checklist</h2>
        <div className="flex flex-col gap-3">
          <WorkflowStep icon="description" title="Create the lease">
            <p>Go to <strong>Leases → New Lease</strong>. Set the rent amount, management fee %, VAT %, and the remittance due date (the day each month the owner expects to receive their payout).</p>
          </WorkflowStep>
          <WorkflowStep icon="savings" title="Record the security deposit">
            <p>Open the lease and click <strong>&quot;Record Deposit&quot;</strong>. Enter the amount the tenant paid (usually 2 months&apos; rent). The system tracks this separately — it doesn&apos;t affect the monthly payout calculation.</p>
          </WorkflowStep>
          <WorkflowStep icon="payments" title="Record the AllAbode commission">
            <p>Still on the lease page, click <strong>&quot;Record Commission&quot;</strong>. This logs the one-time leasing fee AllAbode earns. It shows on the first SOA as an informational line — not deducted from the owner&apos;s income.</p>
          </WorkflowStep>
          <WorkflowStep icon="mark_email_read" title="Invite the tenant to the portal">
            <p>Go to <strong>System → Pending Signups</strong>. The tenant can sign up at the portal login page using their registered email. Once signed up, they can view their lease, pay invoices, submit maintenance requests, and download documents.</p>
          </WorkflowStep>
        </div>
      </div>

      {/* ── SECTION 3: EVERY MONTH ── */}
      <div className="mt-12">
        <p className="label-caps text-slate mb-1">Every Month</p>
        <h2 className="font-display text-xl font-bold text-navy mb-5">Your monthly routine</h2>
        <div className="flex flex-col gap-3">

          <WorkflowStep icon="payments" title="Record rent payments" tag="As they come in">
            <p>When a tenant pays rent, go to their <strong>Lease</strong> and click <strong>&quot;Record Payment&quot;</strong>. Enter the amount and date received. Do this as soon as payment is received — payments recorded before the end of the month are automatically included in that month&apos;s statement.</p>
            <p>Invoices are generated automatically on the 1st of each month and sent to the tenant.</p>
          </WorkflowStep>

          <WorkflowStep icon="receipt" title="Upload receipts for property expenses" tag="As they happen" cta="Upload a receipt" ctaHref="/admin/receipts/new">
            <p>Whenever there&apos;s an expense for a property (repairs, utility bills, maintenance work), take a photo or scan of the receipt and upload it under <strong>Finance → Receipts → Upload</strong>.</p>
            <p>The system reads the receipt automatically and extracts the amount and vendor. You just confirm it&apos;s correct and click <strong>&quot;Post to Ledger&quot;</strong> — this is what makes it appear on the owner&apos;s statement.</p>
          </WorkflowStep>

          <WorkflowStep icon="auto_awesome" title="Statements are generated automatically" tag="1st of month, 2:00 AM">
            <p>You don&apos;t need to do anything here. At 2 AM on the 1st, the system automatically generates a Statement of Account for every active lease. It pulls in all rent payments and approved expenses for that month.</p>
            <p>You&apos;ll receive a notification in the bell icon (top right) when statements are ready to review.</p>
          </WorkflowStep>

          <WorkflowStep icon="fact_check" title="Review each statement" tag="Morning of the 1st" cta="Go to Statements" ctaHref="/admin/statements">
            <p>Open <strong>Finance → Statements</strong> and check each one. Look at:</p>
            <ul className="ml-4 list-disc space-y-1">
              <li>Income — does it match the rent received?</li>
              <li>Deductions — are the expenses correct?</li>
              <li>Payout — does the final amount look right?</li>
            </ul>
            <p>If you uploaded a receipt late and it&apos;s missing, post it to ledger then click <strong>&quot;Regenerate Lines&quot;</strong> on the statement — it will recalculate everything.</p>
          </WorkflowStep>

          <WorkflowStep icon="send" title={`Send to owner — click "Publish & Send to Owner"`}>
            <p>When you&apos;re happy with the numbers, click <strong>&quot;Publish &amp; Send to Owner&quot;</strong>. The system will:</p>
            <ul className="ml-4 list-disc space-y-1">
              <li>Generate a PDF of the statement</li>
              <li>Send the owner an email notification</li>
              <li>Make the PDF available in their portal for download</li>
            </ul>
            <p>That&apos;s it — the owner can log in to their portal and see the full breakdown.</p>
          </WorkflowStep>
        </div>
      </div>

      {/* ── SECTION 4: AUTO SEND ── */}
      <div className="mt-12">
        <p className="label-caps text-slate mb-1">Optional</p>
        <h2 className="font-display text-xl font-bold text-navy mb-2">Hands-free mode</h2>
        <p className="text-sm text-slate mb-5">If you want statements to go out automatically without any clicks, you can turn on auto-send.</p>

        <div className={`rounded-xl border p-5 ${s.autoPublishOn ? "border-available/30 bg-available/5" : "border-line bg-surface"}`}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Icon
                name={s.autoPublishOn ? "toggle_on" : "toggle_off"}
                size={36}
                fill={1}
                className={s.autoPublishOn ? "text-available" : "text-slate"}
              />
              <div>
                <p className="font-display font-bold text-navy">Auto-send statements</p>
                <p className="text-sm text-slate mt-0.5">
                  {s.autoPublishOn
                    ? "ON — approved statements publish automatically on the 2nd at 2:00 AM."
                    : "OFF — you must click \"Publish & Send to Owner\" manually."}
                </p>
              </div>
            </div>
            <Link
              href="/admin/automation"
              className="shrink-0 rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium text-navy hover:bg-surface-gray"
            >
              {s.autoPublishOn ? "Turn off" : "Turn on"} in Automation
            </Link>
          </div>
          {s.autoPublishOn && (
            <p className="mt-4 rounded-lg bg-available/10 px-4 py-2.5 text-xs text-available font-medium">
              You still have all of Day 1 to review and make changes. Auto-send fires at 2 AM on the 2nd — one full day after generation.
            </p>
          )}
        </div>
      </div>

      {/* ── SECTION 5: OTHER DAILY TASKS ── */}
      <div className="mt-12">
        <p className="label-caps text-slate mb-1">Other Tasks</p>
        <h2 className="font-display text-xl font-bold text-navy mb-5">Things that come up day-to-day</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { icon: "confirmation_number", title: "Maintenance requests", desc: "Tenants submit via portal. Assign, update status, and resolve from Tickets.", href: "/admin/tickets" },
            { icon: "folder", title: "Lease documents", desc: "Upload signed contracts, photos, and notices to a lease, property, or tenant.", href: "/admin/documents" },
            { icon: "campaign", title: "Send a notice", desc: "Post an announcement to all owners, all tenants, or a specific person.", href: "/admin/notices" },
            { icon: "build", title: "Schedule maintenance", desc: "Set up recurring maintenance plans and track work orders.", href: "/admin/maintenance" },
            { icon: "home_work", title: "Manage listings", desc: "Add or update properties listed on the public website.", href: "/admin/listings" },
            { icon: "forum", title: "Inquiries & leads", desc: "View messages from the website contact forms and appraisal requests.", href: "/admin/inquiries" },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="flex items-start gap-3 rounded-xl border border-line bg-surface p-4 hover:bg-surface-gray">
              <Icon name={item.icon} size={20} fill={1} className="text-navy/50 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-navy text-sm">{item.title}</p>
                <p className="text-xs text-slate mt-0.5">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── HELP NOTE ── */}
      <div className="mt-10 mb-8 rounded-xl border border-line bg-surface-gray px-5 py-4 text-sm text-slate">
        <p className="font-medium text-navy flex items-center gap-2"><Icon name="support_agent" size={16} fill={1} /> Need help?</p>
        <p className="mt-1">If something doesn&apos;t look right on a statement, contact the system administrator. Do not delete or modify records without checking first — all changes are tracked in the <Link href="/admin/audit" className="underline hover:text-navy">Audit Log</Link>.</p>
      </div>
    </div>
  );
}
