import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
import { nurtureMode } from "@/lib/nurture/schedule";
import { maskEmail } from "@/lib/nurture/message";
import { isFollowUpMigrationMissing } from "@/lib/leads/follow-ups";
import {
  describeNurtureFlags,
  describeSkipReason,
  LOG_PAGE_SIZE,
  pageRange,
  parseLogFilters,
  SEND_STATUSES,
  totalPages,
  type SendStatus,
} from "@/lib/admin/follow-up-templates";

export const metadata = { title: "Follow-up send log" };
export const dynamic = "force-dynamic";

type One<T> = T | T[] | null;
type LogRow = {
  id: string;
  status: SendStatus;
  skip_reason: string | null;
  last_error: string | null;
  attempts: number;
  due_at: string;
  sent_at: string | null;
  inquiries: One<{ name: string | null; email: string | null }>;
  specialists: One<{ display_name: string | null }>;
  email_templates: One<{ name: string | null; template_key: string | null }>;
};

const one = <T,>(v: One<T> | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

const statusStyle: Record<SendStatus, string> = {
  queued: "bg-navy/5 text-navy",
  sent: "bg-available/10 text-available",
  skipped: "bg-surface-gray text-slate",
  failed: "bg-error-bg text-error",
};

const fmt = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" });
const when = (iso: string | null) => (iso ? fmt.format(new Date(iso)) : "—");

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-700";

export default async function FollowUpLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseLogFilters(await searchParams);
  const flags = describeNurtureFlags(nurtureMode({ NURTURE_ENABLED: process.env.NURTURE_ENABLED, NURTURE_DRY_RUN: process.env.NURTURE_DRY_RUN }));
  const supabase = await createClient();

  const { from, to } = pageRange(filters.page);
  let q = supabase
    .from("lead_email_sends")
    .select(
      "id,status,skip_reason,last_error,attempts,due_at,sent_at,inquiries(name,email),specialists(display_name),email_templates(name,template_key)",
      { count: "exact" },
    )
    .order("due_at", { ascending: false })
    .range(from, to);
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.specialistId) q = q.eq("specialist_id", filters.specialistId);

  const countFor = (status: SendStatus) => {
    let c = supabase.from("lead_email_sends").select("id", { count: "exact", head: true }).eq("status", status);
    if (filters.specialistId) c = c.eq("specialist_id", filters.specialistId);
    return c;
  };

  const [list, spList, ...counts] = await Promise.all([
    q,
    supabase.from("specialists").select("id,display_name").order("display_name"),
    ...SEND_STATUSES.map(countFor),
  ]);

  const missing = isFollowUpMigrationMissing(list.error);
  const rows = (list.data ?? []) as unknown as LogRow[];
  const total = list.count ?? 0;
  const pages = totalPages(total);
  const specialists = (spList.data ?? []) as { id: string; display_name: string }[];

  const href = (page: number) => {
    const p = new URLSearchParams();
    if (filters.status) p.set("status", filters.status);
    if (filters.specialistId) p.set("specialist", filters.specialistId);
    if (page > 1) p.set("page", String(page));
    const qs = p.toString();
    return `/admin/follow-ups/log${qs ? `?${qs}` : ""}`;
  };

  return (
    <div>
      <Link href="/admin/follow-ups" className="text-sm text-navy-700 hover:underline">Follow-up emails</Link>
      <h1 className="mt-2 font-display text-2xl font-bold text-navy">Send log</h1>

      <div className="mt-4 rounded-lg border border-line bg-surface p-4 text-sm">
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-ink">
          <span>Sending: <strong className="text-navy">{flags.enabled}</strong></span>
          <span>Dry run: <strong className="text-navy">{flags.dryRun}</strong></span>
        </p>
        <p className="mt-1 text-slate">{flags.summary}</p>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {SEND_STATUSES.map((s, i) => (
          <div key={s} className="rounded-lg border border-line bg-surface p-4">
            <dt className="label-caps text-slate capitalize">{s}</dt>
            <dd className="mt-1 font-display text-2xl font-bold text-navy">{(counts[i].count ?? 0).toLocaleString("en-US")}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-1 text-xs text-slate">
        Counts follow the specialist filter{filters.specialistId ? "" : " (all specialists)"}, not the status filter.
      </p>

      <form method="get" className="mt-6 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="log-status" className="text-sm font-medium text-navy">Status</label>
          <select id="log-status" name="status" defaultValue={filters.status ?? ""} className={`mt-1.5 block min-h-11 rounded-md border border-line bg-surface px-3 text-base text-ink ${focus}`}>
            <option value="">All</option>
            {SEND_STATUSES.map((s) => (
              <option key={s} value={s} className="capitalize">{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="log-specialist" className="text-sm font-medium text-navy">Specialist</label>
          <select id="log-specialist" name="specialist" defaultValue={filters.specialistId ?? ""} className={`mt-1.5 block min-h-11 max-w-xs rounded-md border border-line bg-surface px-3 text-base text-ink ${focus}`}>
            <option value="">All</option>
            {specialists.map((s) => (
              <option key={s.id} value={s.id}>{s.display_name}</option>
            ))}
          </select>
        </div>
        <button type="submit" className={`inline-flex min-h-11 items-center gap-2 rounded-md bg-navy px-5 text-sm font-semibold text-white hover:bg-navy-700 ${focus}`}>
          Apply filters
        </button>
        {(filters.status || filters.specialistId) && (
          <Link href="/admin/follow-ups/log" className={`inline-flex min-h-11 items-center px-2 text-sm font-medium text-navy-700 hover:underline ${focus}`}>Clear</Link>
        )}
      </form>

      {list.error && (
        <p role="alert" className="mt-6 rounded-md border border-error/30 bg-error-bg px-4 py-3 text-sm text-ink">
          {missing
            ? "Follow-up emails aren't set up in the database yet. Run the leads and nurture migration first."
            : "Couldn't load the send log. Please refresh and try again."}
        </p>
      )}

      {!list.error && rows.length === 0 && (
        <p className="mt-6 rounded-lg border border-line bg-surface p-6 text-sm text-slate">Nothing to show for these filters.</p>
      )}

      {rows.length > 0 && (
        <ul className="mt-6 flex flex-col gap-3">
          {rows.map((r) => {
            const lead = one(r.inquiries);
            const sp = one(r.specialists);
            const tpl = one(r.email_templates);
            return (
              <li key={r.id} className="rounded-lg border border-line bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display font-semibold text-navy">{tpl?.name ?? "Deleted email"}</p>
                    <p className="mt-0.5 break-words text-sm text-slate">
                      To {lead?.name?.trim() || "unknown lead"} ({lead?.email ? maskEmail(lead.email) : "no email"}) · Specialist: {sp?.display_name ?? "none"}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusStyle[r.status] ?? "bg-surface-gray text-slate"}`}>{r.status}</span>
                </div>
                <p className="mt-2 text-xs text-slate">
                  Due {when(r.due_at)}
                  {r.sent_at ? ` · Sent ${when(r.sent_at)}` : ""}
                  {r.attempts > 0 ? ` · ${r.attempts} attempt${r.attempts === 1 ? "" : "s"}` : ""}
                </p>
                {r.skip_reason && (
                  <p className="mt-1 text-sm text-ink">Skipped: {describeSkipReason(r.skip_reason)}</p>
                )}
                {r.last_error && (
                  <p className="mt-1 break-words text-sm text-error">Error: {r.last_error}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {pages > 1 && (
        <nav aria-label="Pagination" className="mt-6 flex items-center justify-between gap-3 text-sm">
          {filters.page > 1 ? (
            <Link href={href(filters.page - 1)} className={`inline-flex min-h-11 items-center gap-1 rounded-md border border-line bg-surface px-4 font-semibold text-navy hover:bg-surface-gray ${focus}`}>
              <Icon name="arrow_back" size={18} /> Newer
            </Link>
          ) : <span />}
          <span className="text-slate">Page {filters.page} of {pages} · {total.toLocaleString("en-US")} total ({LOG_PAGE_SIZE} per page)</span>
          {filters.page < pages ? (
            <Link href={href(filters.page + 1)} className={`inline-flex min-h-11 items-center gap-1 rounded-md border border-line bg-surface px-4 font-semibold text-navy hover:bg-surface-gray ${focus}`}>
              Older <Icon name="arrow_forward" size={18} />
            </Link>
          ) : <span />}
        </nav>
      )}
    </div>
  );
}
