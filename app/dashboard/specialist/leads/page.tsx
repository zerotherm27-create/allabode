import Link from "next/link";
import { Icon } from "@/components/icon";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRole } from "@/lib/auth/role";
import {
  LEAD_STAGES,
  countByStage,
  filterLeads,
  isMigrationMissing,
  parseStageFilter,
  type LeadFilter,
} from "@/lib/leads/inbox";

type Row = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  lead_stage: string;
  created_at: string;
};

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-700";

function href(stage: LeadFilter, q: string) {
  const p = new URLSearchParams();
  if (stage !== "all") p.set("stage", stage);
  if (q) p.set("q", q);
  const s = p.toString();
  return `/dashboard/specialist/leads${s ? `?${s}` : ""}`;
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });

export default async function SpecialistLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const stage = parseStageFilter(sp.stage);
  const q = (typeof sp.q === "string" ? sp.q : "").slice(0, 100);
  const { specialistId } = await getCurrentRole();

  let all: Row[] = [];
  let unavailable = false;
  let failed = false;
  if (specialistId) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("inquiries")
      .select("id,name,email,phone,message,lead_stage,created_at")
      .eq("specialist_id", specialistId)
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) {
      if (isMigrationMissing(error)) unavailable = true;
      else {
        failed = true;
        console.error("[specialist/leads] failed to load:", error);
      }
    } else {
      all = (data ?? []) as Row[];
    }
  }

  const counts = countByStage(all);
  const rows = filterLeads(all, stage, q);
  const tabs: { key: LeadFilter; label: string }[] = [
    { key: "all", label: "All" },
    ...LEAD_STAGES.map((s) => ({ key: s as LeadFilter, label: s })),
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-2xl font-bold text-navy">Leads</h1>
      <p className="mt-1 text-sm text-slate">
        People who contacted you through your profile or your listings. {counts.New}{" "}
        {counts.New === 1 ? "lead is" : "leads are"} new.
      </p>

      {unavailable && (
        <p role="status" className="mt-6 rounded-lg border border-line bg-surface px-4 py-3 text-sm text-navy">
          Lead tracking isn&apos;t switched on yet. Your leads will appear here once it is.
        </p>
      )}
      {failed && (
        <p role="alert" className="mt-6 rounded-lg border border-error/30 bg-error-bg px-4 py-3 text-sm text-error">
          Couldn&apos;t load your leads. Refresh the page to try again.
        </p>
      )}

      {!unavailable && !failed && (
        <>
          <nav aria-label="Filter leads by stage" className="mt-6 -mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
            {tabs.map((t) => {
              const active = stage === t.key;
              return (
                <Link
                  key={t.key}
                  href={href(t.key, q)}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md border px-4 text-sm font-medium transition-colors ${focus} ${
                    active
                      ? "border-navy bg-navy text-white"
                      : "border-line bg-surface text-navy hover:bg-surface-gray"
                  }`}
                >
                  {t.label}
                  <span className={`text-xs ${active ? "text-white/80" : "text-slate"}`}>{counts[t.key]}</span>
                </Link>
              );
            })}
          </nav>

          <form action="/dashboard/specialist/leads" method="get" role="search" className="mt-4 flex gap-2">
            {stage !== "all" && <input type="hidden" name="stage" value={stage} />}
            <label htmlFor="lead-search" className="sr-only">
              Search leads by name or email
            </label>
            <input
              id="lead-search"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Search by name or email"
              className={`min-h-11 w-full max-w-sm rounded-md border border-line bg-surface px-3 text-base text-ink ${focus}`}
            />
            <button
              type="submit"
              className={`inline-flex min-h-11 items-center gap-2 rounded-md bg-navy px-5 text-sm font-semibold text-white transition-colors hover:bg-navy-700 ${focus}`}
            >
              <Icon name="search" size={18} />
              Search
            </button>
          </form>

          {rows.length === 0 ? (
            <p className="mt-6 rounded-lg border border-line bg-surface px-4 py-8 text-center text-sm text-slate">
              {all.length === 0
                ? "No leads yet. When someone sends you a message, it will show up here."
                : "No leads match this filter."}
            </p>
          ) : (
            <ul className="mt-6 divide-y divide-line rounded-lg border border-line bg-surface">
              {rows.map((l) => (
                <li key={l.id}>
                  <Link
                    href={`/dashboard/specialist/leads/${l.id}`}
                    className={`flex min-h-11 flex-col gap-1 px-4 py-4 transition-colors hover:bg-surface-gray sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${focus}`}
                  >
                    <span className="min-w-0">
                      <span className="block font-medium text-navy">{l.name}</span>
                      <span className="block truncate text-sm text-slate">{l.email}</span>
                      {l.message && <span className="mt-1 block truncate text-sm text-slate">{l.message}</span>}
                    </span>
                    <span className="flex shrink-0 items-center gap-3 text-xs text-slate">
                      <span
                        className={`rounded-full px-2.5 py-1 font-medium ${
                          l.lead_stage === "New" ? "bg-gold/20 text-navy" : "bg-surface-gray text-navy"
                        }`}
                      >
                        {l.lead_stage}
                      </span>
                      {fmt(l.created_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
