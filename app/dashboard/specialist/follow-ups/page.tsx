import { Icon } from "@/components/icon";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRole } from "@/lib/auth/role";
import { site } from "@/lib/site";
import { formatFromAddress } from "@/lib/email-address";
import { NURTURE_FROM_ADDRESS } from "@/lib/nurture/message";
import { renderSample } from "@/lib/nurture/preview";
import { nurtureMode } from "@/lib/nurture/schedule";
import { describeDelay, isFollowUpMigrationMissing, isTemplateOn } from "@/lib/leads/follow-ups";
import {
  MasterSwitch,
  PersonalNoteForm,
  TemplateToggle,
  TestEmailButton,
} from "@/components/specialist/follow-up-controls";

type Template = { id: string; name: string; subject: string; body: string; delay_days: number; position: number };
type SpecialistRow = { display_name: string | null; email: string | null; phone: string | null; subdomain: string | null };

export default async function FollowUpsPage() {
  const { specialistId, email } = await getCurrentRole();

  let unavailable = false;
  let failed = false;
  let templates: Template[] = [];
  let prefs = new Map<string, boolean | null>();
  let enabled = true;
  let note = "";
  let specialist: SpecialistRow | null = null;

  if (specialistId) {
    const supabase = await createClient();
    const [tpl, pref, set, sp] = await Promise.all([
      supabase
        .from("email_templates")
        .select("id,name,subject,body,delay_days,position")
        .eq("is_active", true)
        .eq("audience", "lead")
        .order("position", { ascending: true })
        .order("delay_days", { ascending: true }),
      supabase.from("specialist_template_prefs").select("template_id,enabled").eq("specialist_id", specialistId),
      supabase
        .from("specialist_email_settings")
        .select("followups_enabled,personal_note")
        .eq("specialist_id", specialistId)
        .maybeSingle(),
      supabase.from("specialists").select("display_name,email,phone,subdomain").eq("id", specialistId).maybeSingle(),
    ]);
    const err = [tpl, pref, set, sp].find((r) => r.error)?.error;
    if (err) {
      if (isFollowUpMigrationMissing(err)) unavailable = true;
      else {
        failed = true;
        console.error("[specialist/follow-ups] failed to load:", err);
      }
    } else {
      templates = (tpl.data ?? []) as Template[];
      prefs = new Map(((pref.data ?? []) as { template_id: string; enabled: boolean | null }[]).map((p) => [p.template_id, p.enabled]));
      const s = set.data as { followups_enabled: boolean | null; personal_note: string | null } | null;
      enabled = s?.followups_enabled !== false;
      note = s?.personal_note ?? "";
      specialist = sp.data as SpecialistRow | null;
    }
  }

  const mode = nurtureMode({ NURTURE_ENABLED: process.env.NURTURE_ENABLED, NURTURE_DRY_RUN: process.env.NURTURE_DRY_RUN });
  const senderName = formatFromAddress(specialist?.display_name ?? "", NURTURE_FROM_ADDRESS);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-bold text-navy">Follow-up emails</h1>
      <p className="mt-1 text-sm text-slate">
        When someone contacts you through your profile or listings and agrees to follow-up emails, All Abode can send
        them a short series of friendly emails for you.
      </p>

      {unavailable && (
        <p role="status" className="mt-6 rounded-lg border border-line bg-surface px-4 py-3 text-sm text-navy">
          Follow-up emails aren&apos;t switched on yet. You&apos;ll be able to manage them here once they are.
        </p>
      )}
      {failed && (
        <p role="alert" className="mt-6 rounded-lg border border-error/30 bg-error-bg px-4 py-3 text-sm text-error">
          Couldn&apos;t load your follow-up settings. Refresh the page to try again.
        </p>
      )}

      {!unavailable && !failed && (
        <>
          {mode !== "live" && (
            <p role="status" className="mt-6 flex gap-2 rounded-lg border border-gold/40 bg-cream px-4 py-3 text-sm text-navy">
              <Icon name="info" size={18} className="mt-0.5 shrink-0" />
              <span>
                Sending to customers isn&apos;t switched on yet, so no follow-up emails go out for now. Your choices
                here are saved and will apply once it is. Test emails to yourself still work.
              </span>
            </p>
          )}

          <section aria-label="Sender" className="mt-6 rounded-lg border border-line bg-surface p-4 md:p-6">
            <div className="flex gap-3">
              <Icon name="mail" size={20} className="mt-0.5 shrink-0 text-navy-700" />
              <div className="text-sm text-slate">
                <p>
                  Emails are sent as <span className="break-all font-medium text-ink">{senderName}</span>.
                </p>
                <p className="mt-1">
                  Replies come straight to you at{" "}
                  <span className="break-all font-medium text-ink">{specialist?.email ?? email ?? "your login email"}</span>
                  , and every email has an unsubscribe link. Emails stop automatically once a lead reaches Viewing,
                  Negotiating, Closed or Lost, or unsubscribes.
                </p>
              </div>
            </div>
          </section>

          <section aria-label="Master switch" className="mt-6 rounded-lg border border-line bg-surface p-4 md:p-6">
            <MasterSwitch enabled={enabled} />
          </section>

          <section aria-labelledby="emails-heading" className="mt-6">
            <h2 id="emails-heading" className="font-display text-lg font-semibold text-navy">
              The emails
            </h2>
            <p className="mt-1 text-sm text-slate">
              Written by All Abode. Switch off any you don&apos;t want sent. Previews use sample customer details.
            </p>

            {templates.length === 0 ? (
              <p className="mt-4 rounded-lg border border-line bg-surface px-4 py-6 text-center text-sm text-slate">
                No follow-up emails have been set up yet.
              </p>
            ) : (
              <ol className="mt-4 space-y-4">
                {templates.map((t) => {
                  const rendered = specialist ? renderSample(t, specialist, note) : null;
                  return (
                    <li key={t.id} className="rounded-lg border border-line bg-surface p-4 md:p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="font-display text-base font-semibold text-navy">{t.name}</h3>
                          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate">
                            <Icon name="schedule" size={16} />
                            {describeDelay(t.delay_days)}
                          </p>
                        </div>
                        <TemplateToggle templateId={t.id} name={t.name} enabled={isTemplateOn(prefs.has(t.id) ? { enabled: prefs.get(t.id) ?? null } : null)} />
                      </div>

                      {rendered && (
                        <details className="group mt-4 rounded-md border border-line">
                          <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-3 text-sm font-semibold text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-700">
                            <Icon name="visibility" size={16} />
                            Preview
                          </summary>
                          <div className="border-t border-line bg-cream p-4">
                            <p className="label-caps text-slate">Subject</p>
                            <p className="mt-1 break-words text-sm font-medium text-ink">{rendered.subject}</p>
                            <p className="label-caps mt-4 text-slate">Message</p>
                            <pre className="mt-1 whitespace-pre-wrap break-words font-body text-sm text-ink">{rendered.text}</pre>
                          </div>
                        </details>
                      )}

                      <div className="mt-4">
                        <TestEmailButton templateId={t.id} />
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <section aria-label="Personal note" className="mt-6 rounded-lg border border-line bg-surface p-4 md:p-6">
            <PersonalNoteForm note={note} />
          </section>

          <p className="mt-6 text-sm text-slate">
            Questions about these emails? Contact{" "}
            <a href={site.emailHref} className="font-medium text-navy-700 underline">
              All Abode
            </a>
            .
          </p>
        </>
      )}
    </div>
  );
}
