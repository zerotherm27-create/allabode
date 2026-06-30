import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";

async function getStatus() {
  const supabase = await createClient();

  const [{ count: ownerCount }, { count: tenantCount }, { count: leaseCount }, { data: autoRule }] =
    await Promise.all([
      supabase.from("owners").select("id", { count: "exact", head: true }),
      supabase.from("tenants").select("id", { count: "exact", head: true }),
      supabase.from("leases").select("id", { count: "exact", head: true }),
      supabase.from("automation_rules").select("is_active").eq("code", "auto_publish_owner_soa").maybeSingle(),
    ]);

  return {
    owners: ownerCount ?? 0,
    tenants: tenantCount ?? 0,
    leases: leaseCount ?? 0,
    migration0018: autoRule !== null,
    autoPublishOn: !!(autoRule as { is_active?: boolean } | null)?.is_active,
    hasOpenAI: !!process.env.OPENAI_API_KEY,
    hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasCronSecret: !!process.env.CRON_SECRET,
    hasResend: !!process.env.RESEND_API_KEY,
  };
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${ok ? "border-available/30 bg-available/5 text-available" : "border-reserved/30 bg-reserved/5 text-reserved"}`}>
      <Icon name={ok ? "check_circle" : "cancel"} size={16} fill={1} />
      {label}
    </div>
  );
}

function Step({ n, title, children, link, linkLabel }: {
  n: number; title: string; children: React.ReactNode;
  link?: string; linkLabel?: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex shrink-0 flex-col items-center">
        <div className="flex size-8 items-center justify-center rounded-full bg-navy font-display text-sm font-bold text-white">{n}</div>
        <div className="mt-1 w-px flex-1 bg-line" />
      </div>
      <div className="pb-8">
        <p className="font-display font-semibold text-navy">{title}</p>
        <div className="mt-1.5 text-sm text-slate leading-relaxed">{children}</div>
        {link && (
          <Link href={link} className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-navy/20 bg-surface px-3 py-1.5 text-xs font-medium text-navy hover:bg-navy/5">
            <Icon name="open_in_new" size={13} />
            {linkLabel ?? "Go"}
          </Link>
        )}
      </div>
    </div>
  );
}

function EnvRow({ name, set, note }: { name: string; set: boolean; note: string }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-line last:border-0">
      <Icon name={set ? "check_circle" : "radio_button_unchecked"} size={16} fill={set ? 1 : 0} className={set ? "text-available mt-0.5" : "text-slate mt-0.5"} />
      <div className="min-w-0 flex-1">
        <code className="text-xs font-mono text-navy">{name}</code>
        <p className="text-xs text-slate mt-0.5">{note}</p>
      </div>
      {set
        ? <span className="shrink-0 text-xs text-available font-medium">Set ✓</span>
        : <span className="shrink-0 text-xs text-reserved font-medium">Missing</span>}
    </div>
  );
}

export default async function SetupGuidePage() {
  const s = await getStatus();

  const envOk = s.hasOpenAI && s.hasServiceRole && s.hasCronSecret;
  const allOk = envOk && s.migration0018 && s.leases > 0;

  return (
    <div className="max-w-2xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-navy">Setup Guide</h1>
        <p className="mt-1 text-sm text-slate">Step-by-step walkthrough for getting the SOA automation pipeline running correctly.</p>
      </div>

      {/* Live status bar */}
      <div className="mt-6 rounded-xl border border-line bg-surface p-5">
        <p className="label-caps text-slate mb-3">Current Status</p>
        <div className="flex flex-wrap gap-2">
          <StatusBadge ok={s.migration0018} label="Migration 0018 applied" />
          <StatusBadge ok={s.hasServiceRole} label="Service role key" />
          <StatusBadge ok={s.hasOpenAI} label="OpenAI API key" />
          <StatusBadge ok={s.hasCronSecret} label="Cron secret" />
          <StatusBadge ok={s.hasResend} label="Resend (email)" />
          <StatusBadge ok={s.leases > 0} label={`${s.leases} active lease${s.leases !== 1 ? "s" : ""}`} />
        </div>
        {allOk && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-available/10 px-4 py-3 text-sm font-medium text-available">
            <Icon name="rocket_launch" size={16} fill={1} />
            Everything looks good — SOA automation is ready to run.
          </div>
        )}
      </div>

      {/* ── PART 1: ONE-TIME SETUP ── */}
      <div className="mt-10">
        <div className="flex items-center gap-2 mb-6">
          <span className="flex size-7 items-center justify-center rounded-full bg-gold/20">
            <Icon name="build" size={14} className="text-gold" fill={1} />
          </span>
          <h2 className="font-display text-lg font-bold text-navy">Part 1 — One-Time System Setup</h2>
        </div>

        <Step n={1} title="Run database migrations (in order)">
          <p>Open the <strong>Supabase SQL Editor</strong> for project <code className="bg-navy/5 px-1 rounded text-xs">volzvgrvrgqygtodkwau</code> and run each file below in order. Each file is in the <code className="bg-navy/5 px-1 rounded text-xs">supabase/migrations/</code> folder of the repo.</p>
          <div className="mt-3 flex flex-col gap-1.5">
            {[
              ["0001_init.sql", "Core tables: users, listings, inquiries"],
              ["0003_property_management.sql", "PM platform: owners, tenants, properties, leases, payments, SOA, audit"],
              ["0004_invoices.sql", "Invoices + billing"],
              ["0005_tickets.sql", "Support ticketing"],
              ["0006_documents.sql", "Document storage"],
              ["0007_notifications.sql", "Notices + inbox"],
              ["0008_maintenance.sql", "Maintenance plans + work orders"],
              ["0009_automation.sql", "Automation rules + cron log"],
              ["0010_payments_gateway.sql", "Payment intents (Maya / Xendit)"],
              ["0012_security_deposits.sql", "Security deposits"],
              ["0014_lease_commissions.sql", "Lease commissions"],
              ["0016_receipts_tenant.sql", "Tenant/unit tagging on receipts"],
              ["0017_payout_carried.sql", "Carried-forward payout status"],
              ["0018_auto_publish_rule.sql", "Auto-publish SOA automation rule"],
            ].map(([file, desc]) => (
              <div key={file} className="flex items-start gap-2 rounded-md bg-navy/3 px-3 py-1.5">
                <Icon name="check_box_outline_blank" size={14} className="text-slate mt-0.5 shrink-0" />
                <div>
                  <code className="text-xs font-mono text-navy">{file}</code>
                  <span className="ml-2 text-xs text-slate">{desc}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate">Each migration is idempotent — safe to re-run if unsure.</p>
        </Step>

        <Step n={2} title="Create Supabase Storage buckets">
          <p>In the Supabase dashboard → <strong>Storage</strong>, run the file <code className="bg-navy/5 px-1 rounded text-xs">supabase/setup-storage.sql</code> in the SQL editor. This creates three buckets:</p>
          <div className="mt-2 flex flex-col gap-1">
            <div className="rounded-md border border-line px-3 py-2 text-xs"><code className="font-mono text-navy">receipts</code> — private · receipt image uploads</div>
            <div className="rounded-md border border-line px-3 py-2 text-xs"><code className="font-mono text-navy">finance-docs</code> — private · generated SOA PDFs</div>
            <div className="rounded-md border border-line px-3 py-2 text-xs"><code className="font-mono text-navy">site-assets</code> — public · listing photos</div>
          </div>
          <p className="mt-2 text-xs text-slate">Also create a private <code className="bg-navy/5 px-1 rounded">documents</code> bucket manually for tenant/owner documents.</p>
        </Step>

        <Step n={3} title="Set environment variables">
          <p>Add these to <code className="bg-navy/5 px-1 rounded text-xs">.env.local</code> (local dev) and <strong>Vercel → Project → Settings → Environment Variables</strong> (production):</p>
          <div className="mt-3 rounded-xl border border-line bg-surface overflow-hidden">
            <EnvRow name="SUPABASE_SERVICE_ROLE_KEY" set={s.hasServiceRole} note="From Supabase → Project Settings → API → service_role key. NEVER prefix with NEXT_PUBLIC_." />
            <EnvRow name="OPENAI_API_KEY" set={s.hasOpenAI} note="Powers AI validation on SOA generation. Get from platform.openai.com." />
            <EnvRow name="CRON_SECRET" set={s.hasCronSecret} note="Any random string (e.g. openssl rand -hex 32). Secures Vercel Cron endpoints." />
            <EnvRow name="RESEND_API_KEY" set={s.hasResend} note="Optional. Email notifications to owners/tenants. Get from resend.com." />
            <EnvRow name="NEXT_PUBLIC_SUPABASE_URL" set={true} note="Already set — public Supabase project URL." />
            <EnvRow name="NEXT_PUBLIC_SUPABASE_ANON_KEY" set={true} note="Already set — public anon key for client-side queries." />
          </div>
          <p className="mt-2 text-xs text-slate">After adding vars to Vercel, redeploy for them to take effect.</p>
        </Step>

        <Step n={4} title="Add auth callback URL">
          <p>In Supabase → <strong>Authentication → URL Configuration → Redirect URLs</strong>, add:</p>
          <div className="mt-2 flex flex-col gap-1">
            <div className="rounded-md border border-line bg-navy/3 px-3 py-2 font-mono text-xs">https://allabode.vercel.app/auth/callback</div>
            <div className="rounded-md border border-line bg-navy/3 px-3 py-2 font-mono text-xs">http://localhost:3000/auth/callback</div>
          </div>
          <p className="mt-2 text-xs text-slate">Required for the email-confirmation flow to link portal accounts correctly.</p>
        </Step>
      </div>

      {/* ── PART 2: DATA SETUP ── */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-6">
          <span className="flex size-7 items-center justify-center rounded-full bg-navy-700/10">
            <Icon name="database" size={14} className="text-navy-700" fill={1} />
          </span>
          <h2 className="font-display text-lg font-bold text-navy">Part 2 — Add Your Data</h2>
        </div>

        <Step n={5} title="Add owners and properties" link="/admin/owners" linkLabel="Go to Owners">
          <p>Create owner records first, then add properties linked to each owner, then units within each property.</p>
          <p className="mt-1.5">Order: <strong>Owners → Properties → Units</strong></p>
        </Step>

        <Step n={6} title="Add tenants and create leases" link="/admin/leases" linkLabel="Go to Leases">
          <p>Add tenant records, then create a lease connecting a unit, owner, and tenant. On the lease, set:</p>
          <ul className="mt-1.5 ml-3 list-disc space-y-0.5">
            <li><strong>Rent amount</strong> — monthly rent the tenant pays</li>
            <li><strong>Management fee %</strong> — AllAbode's cut (e.g. 10%)</li>
            <li><strong>VAT %</strong> — VAT on the management fee (e.g. 12%)</li>
            <li><strong>Remittance due date</strong> — when the owner payout is due each month</li>
            <li><strong>Security deposit</strong> — click "Record Deposit" on the lease page</li>
            <li><strong>Commission</strong> — click "Record Commission" on the lease page</li>
          </ul>
        </Step>

        <Step n={7} title="Record payments when received" link="/admin/leases" linkLabel="Go to Leases">
          <p>Each month when the tenant pays rent, go to the lease and click <strong>"Record Payment"</strong>. This posts a payment to the ledger which will appear on that month's SOA.</p>
          <p className="mt-1.5 text-xs">Payments recorded before the 1st of the next month will be included automatically in the SOA.</p>
        </Step>

        <Step n={8} title="Upload receipts for expenses" link="/admin/receipts/new" linkLabel="Upload a Receipt">
          <p>For any property expense (repairs, bills, etc.), upload the receipt under <strong>Finance → Receipts</strong>. The AI will extract the amount and vendor. Then review and approve the extracted data under <strong>Finance → Expenses</strong> and click <strong>"Post to Ledger"</strong>.</p>
          <p className="mt-1.5 text-xs">Expenses posted before the SOA is generated (1st of month, 2 AM) will be included automatically. If posted after, use <strong>"Regenerate Lines"</strong> on the SOA.</p>
        </Step>
      </div>

      {/* ── PART 3: MONTHLY WORKFLOW ── */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-6">
          <span className="flex size-7 items-center justify-center rounded-full bg-available/10">
            <Icon name="calendar_month" size={14} className="text-available" fill={1} />
          </span>
          <h2 className="font-display text-lg font-bold text-navy">Part 3 — Monthly SOA Workflow</h2>
        </div>

        <div className="mb-5 rounded-xl border border-gold/30 bg-gold/5 px-4 py-3 text-sm text-navy">
          <p className="font-semibold flex items-center gap-2"><Icon name="info" size={15} fill={1} className="text-gold" /> This runs automatically once the system is set up.</p>
          <p className="mt-1 text-slate text-xs">Two cron jobs fire on the 1st and 2nd of each month. Your job is to review and publish (or let auto-send do it).</p>
        </div>

        <Step n={9} title="Day 1 · 2:00 AM — System generates SOAs automatically">
          <p>The cron <code className="bg-navy/5 px-1 rounded text-xs">/api/cron/generate-owner-soa</code> fires at 2 AM on the 1st. For each active lease it:</p>
          <ol className="mt-1.5 ml-3 list-decimal space-y-0.5">
            <li>Computes income (payments), deductions (expenses + mgmt fee + VAT), and payout</li>
            <li>Runs an AI plausibility check — flags anything unusual</li>
            <li>If AI says safe → sets status to <strong>"Approved"</strong> and notifies you</li>
            <li>If AI flags issues → stays <strong>"Generated"</strong> and notifies you with the reason</li>
          </ol>
          <p className="mt-1.5 text-xs text-slate">You'll receive an in-app notification (bell icon) when SOAs are ready.</p>
        </Step>

        <Step n={10} title="Day 1 · Morning — Review SOAs in Statements" link="/admin/statements" linkLabel="Go to Statements">
          <p>Open each SOA and check the numbers. You're looking for:</p>
          <ul className="mt-1.5 ml-3 list-disc space-y-0.5">
            <li>Income lines match payments recorded for that lease</li>
            <li>Deduction lines match expenses posted for that property</li>
            <li>Management fee and VAT look correct</li>
            <li>Payout amount is what you'd expect</li>
          </ul>
        </Step>

        <Step n={11} title="Day 1 · If a receipt was entered late — Regenerate Lines">
          <p>If you need to add an expense after the SOA was generated:</p>
          <ol className="mt-1.5 ml-3 list-decimal space-y-0.5">
            <li>Upload and approve the receipt → post to ledger (<Link href="/admin/receipts/new" className="underline hover:text-navy">Receipts → New</Link>)</li>
            <li>Go back to the SOA and click <strong>"Regenerate Lines"</strong></li>
            <li>The SOA lines will be recomputed and re-validated by AI</li>
          </ol>
          <p className="mt-1.5 text-xs text-slate">You can regenerate as many times as needed until you publish.</p>
        </Step>

        <Step n={12} title='Day 1 · When satisfied — Click "Publish & Send to Owner"'>
          <p>On any <strong>Approved</strong> SOA, click <strong>"Publish &amp; Send to Owner"</strong>. This will:</p>
          <ol className="mt-1.5 ml-3 list-decimal space-y-0.5">
            <li>Generate a PDF of the SOA</li>
            <li>Upload it securely to storage</li>
            <li>Mark the SOA as Published</li>
            <li>Notify the owner by email and in-app message</li>
            <li>Make the PDF available in the owner's portal for download</li>
          </ol>
        </Step>

        <Step n={13} title="Optional — Enable auto-send (hands-off mode)" link="/admin/automation" linkLabel="Go to Automation">
          <p>If you want the system to auto-publish approved SOAs without any clicks, go to <strong>System → Automation</strong> and enable <strong>"Auto-publish approved SOAs"</strong>.</p>
          <div className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${s.autoPublishOn ? "bg-available/10 text-available" : "bg-surface-gray text-slate border border-line"}`}>
            <Icon name={s.autoPublishOn ? "toggle_on" : "toggle_off"} size={18} fill={1} />
            Auto-send is currently <strong>{s.autoPublishOn ? "ON" : "OFF"}</strong>
            {s.autoPublishOn
              ? " — approved SOAs will publish automatically on the 2nd at 2:00 AM."
              : " — you must click “Publish & Send to Owner” manually."}
          </div>
          <p className="mt-2 text-xs text-slate">When auto-send is ON, the Day 2 cron publishes all AI-approved SOAs from the previous day at 2 AM on the 2nd — giving you Day 1 to review and regenerate before it fires.</p>
        </Step>
      </div>

      {/* ── QUICK REFERENCE ── */}
      <div className="mt-6 rounded-xl border border-line bg-surface p-5">
        <p className="label-caps text-slate mb-4">Quick Reference — SOA Statuses</p>
        <div className="flex flex-col gap-2 text-sm">
          {[
            ["generated",  "ink",        "Created by cron. AI flagged issues. Needs manual review."],
            ["approved",   "navy-700",   "AI said it's clean (or manually approved). Ready to publish."],
            ["published",  "available",  "PDF generated and sent to owner. Visible in owner portal."],
          ].map(([status, color, desc]) => (
            <div key={status} className="flex items-start gap-3">
              <span className={`mt-0.5 shrink-0 rounded px-2 py-0.5 text-xs font-medium capitalize bg-${color}/10 text-${color}`}>{status}</span>
              <p className="text-slate text-xs">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-line bg-surface p-5">
        <p className="label-caps text-slate mb-4">Quick Reference — Cron Schedule</p>
        <div className="flex flex-col gap-2 text-xs font-mono">
          {[
            ["0 2 1 * *",  "1st of month, 2:00 AM", "Generate owner SOAs"],
            ["0 2 2 * *",  "2nd of month, 2:00 AM", "Auto-publish approved SOAs (if enabled)"],
            ["0 1 * * *",  "Daily, 1:00 AM",         "Generate tenant invoices"],
            ["0 8 * * *",  "Daily, 8:00 AM",         "Check lease expiry reminders"],
            ["30 7 * * *", "Daily, 7:30 AM",         "Check maintenance plans due"],
          ].map(([cron, human, label]) => (
            <div key={cron} className="flex items-center gap-3 border-b border-line pb-2 last:border-0 last:pb-0">
              <code className="w-28 shrink-0 text-navy">{cron}</code>
              <span className="w-44 shrink-0 text-slate">{human}</span>
              <span className="text-ink">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 pb-8 flex flex-wrap gap-3">
        <Link href="/admin/statements" className="inline-flex items-center gap-1.5 rounded-lg border border-navy bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-700">
          <Icon name="receipt_long" size={16} /> View Statements
        </Link>
        <Link href="/admin/automation" className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-navy hover:bg-surface-gray">
          <Icon name="autorenew" size={16} /> Automation Rules
        </Link>
        <Link href="/admin/receipts/new" className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-navy hover:bg-surface-gray">
          <Icon name="receipt" size={16} /> Upload Receipt
        </Link>
      </div>
    </div>
  );
}
