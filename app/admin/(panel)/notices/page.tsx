import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icon";
import { publishNotice, expireNotice } from "@/app/admin/notice-actions";

const TYPE_COLOR: Record<string, string> = {
  info:        "bg-navy/5 text-navy-700",
  warning:     "bg-gold/10 text-gold-bright",
  maintenance: "bg-reserved/10 text-reserved",
  urgent:      "bg-sold/10 text-sold",
};
const TYPE_ICON: Record<string, string> = {
  info: "info", warning: "warning", maintenance: "build", urgent: "emergency",
};

type Notice = {
  id: string; title: string; body: string; notice_type: string;
  audience: string; published_at: string | null; expires_at: string | null;
  created_at: string;
};

export default async function AdminNoticesPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("notices")
    .select("id,title,body,notice_type,audience,published_at,expires_at,created_at")
    .order("created_at", { ascending: false });

  const notices = (data ?? []) as Notice[];
  const now = new Date();

  const isActive = (n: Notice) =>
    !!n.published_at && (!n.expires_at || new Date(n.expires_at) > now);
  const isDraft    = (n: Notice) => !n.published_at;
  const isExpired  = (n: Notice) => !!n.expires_at && new Date(n.expires_at) <= now;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Notices</h1>
          <p className="mt-1 text-sm text-slate">
            {notices.filter(isActive).length} active · {notices.filter(isDraft).length} draft
          </p>
        </div>
        <Link
          href="/admin/notices/new"
          className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
        >
          <Icon name="add" size={18} /> New notice
        </Link>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {notices.length === 0 ? (
          <p className="rounded-lg border border-line bg-surface p-8 text-center text-sm text-slate">
            No notices yet. Create one to broadcast to portal users.
          </p>
        ) : (
          notices.map((n) => {
            const active  = isActive(n);
            const draft   = isDraft(n);
            const expired = isExpired(n);
            return (
              <div key={n.id} className={`rounded-lg border p-5 ${active ? "border-navy/20 bg-surface" : "border-line bg-surface-gray"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md ${TYPE_COLOR[n.notice_type] ?? "bg-navy/5 text-navy-700"}`}>
                      <Icon name={TYPE_ICON[n.notice_type] ?? "info"} size={18} fill={1} />
                    </span>
                    <div>
                      <p className="font-display font-semibold text-navy">{n.title}</p>
                      <p className="mt-0.5 text-sm text-slate line-clamp-2">{n.body}</p>
                      <p className="mt-1 text-xs text-slate capitalize">
                        Audience: {n.audience}
                        {n.expires_at ? ` · Expires ${new Date(n.expires_at).toLocaleDateString("en-PH")}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      active  ? "bg-available/10 text-available" :
                      draft   ? "bg-surface-gray text-slate border border-line" :
                      expired ? "bg-sold/10 text-sold" : ""
                    }`}>
                      {active ? "Active" : draft ? "Draft" : "Expired"}
                    </span>
                    {draft && (
                      <form action={publishNotice.bind(null, n.id)}>
                        <button type="submit" className="inline-flex items-center gap-1.5 rounded-md bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-800">
                          <Icon name="publish" size={14} /> Publish
                        </button>
                      </form>
                    )}
                    {active && (
                      <form action={expireNotice.bind(null, n.id)}>
                        <button type="submit" className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-medium text-slate hover:border-sold hover:text-sold">
                          Expire now
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
