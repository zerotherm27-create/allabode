"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRole } from "@/lib/auth/role";
import { sendEmailResult } from "@/lib/email";
import { formatFromAddress, isLikelyEmail } from "@/lib/email-address";
import { NURTURE_FROM_ADDRESS } from "@/lib/nurture/message";
import { renderSample } from "@/lib/nurture/preview";
import { MERGE_FIELDS } from "@/lib/nurture/render";
import {
  isOverrideTableMissing,
  parseOverrideInput,
  pickTemplateSource,
  type OverrideErrors,
} from "@/lib/nurture/override-validate";
import {
  checkTestRateLimit,
  isFollowUpMigrationMissing,
  isUuid,
  parseNote,
  parseSwitch,
} from "@/lib/leads/follow-ups";

export type FollowUpActionState = { ok: boolean; message: string; errors?: OverrideErrors };

const fail = (message: string): FollowUpActionState => ({ ok: false, message });
const PATH = "/dashboard/specialist/follow-ups";

async function whoAmI() {
  const { role, specialistId, email } = await getCurrentRole();
  if (role !== "specialist" || !specialistId) return null;
  return { specialistId, email };
}

function dbFail(error: { code?: string; message?: string }): FollowUpActionState {
  console.error("[specialist/follow-ups] write failed:", error);
  return fail(
    isFollowUpMigrationMissing(error)
      ? "Follow-up emails aren't switched on yet. Please try again later."
      : "Couldn't save that. Please try again.",
  );
}

/** Master switch. */
export async function setFollowUpsEnabled(enabled: boolean): Promise<FollowUpActionState> {
  const on = parseSwitch(enabled);
  if (on === null) return fail("Choose on or off.");
  const me = await whoAmI();
  if (!me) return fail("You need to be signed in as a property specialist.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("specialist_email_settings")
    .upsert({ specialist_id: me.specialistId, followups_enabled: on }, { onConflict: "specialist_id" })
    .select("specialist_id");
  if (error) return dbFail(error);
  if (!data || data.length === 0) return fail("Couldn't save that. Please try again.");

  revalidatePath(PATH);
  return {
    ok: true,
    message: on ? "Follow-up emails are on." : "Follow-up emails are off. Nothing more will be sent for your leads.",
  };
}

/** One template on/off for this specialist. */
export async function setTemplateEnabled(templateId: string, enabled: boolean): Promise<FollowUpActionState> {
  const on = parseSwitch(enabled);
  if (on === null || !isUuid(templateId)) return fail("That email could not be found.");
  const me = await whoAmI();
  if (!me) return fail("You need to be signed in as a property specialist.");

  const supabase = await createClient();
  const { data: tpl, error: tErr } = await supabase
    .from("email_templates")
    .select("id")
    .eq("id", templateId)
    .eq("is_active", true)
    .eq("audience", "lead")
    .maybeSingle();
  if (tErr) return dbFail(tErr);
  if (!tpl) return fail("That email could not be found.");

  const { data, error } = await supabase
    .from("specialist_template_prefs")
    .upsert(
      { specialist_id: me.specialistId, template_id: templateId, enabled: on },
      { onConflict: "specialist_id,template_id" },
    )
    .select("template_id");
  if (error) return dbFail(error);
  if (!data || data.length === 0) return fail("Couldn't save that. Please try again.");

  revalidatePath(PATH);
  return { ok: true, message: on ? "Email switched on." : "Email switched off." };
}

/** Personal note merged into emails as {{personal_note}}. */
export async function savePersonalNote(
  _prev: FollowUpActionState | null,
  formData: FormData,
): Promise<FollowUpActionState> {
  const parsed = parseNote(formData.get("note"));
  if (!parsed.ok) return fail(parsed.error);
  const me = await whoAmI();
  if (!me) return fail("You need to be signed in as a property specialist.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("specialist_email_settings")
    .upsert(
      { specialist_id: me.specialistId, personal_note: parsed.value === "" ? null : parsed.value },
      { onConflict: "specialist_id" },
    )
    .select("specialist_id");
  if (error) return dbFail(error);
  if (!data || data.length === 0) return fail("Couldn't save that. Please try again.");

  revalidatePath(PATH);
  return { ok: true, message: parsed.value ? "Personal note saved." : "Personal note cleared." };
}

// Best-effort limiter: per server instance, so it blunts repeat clicks rather
// than being a hard guarantee across instances.
const testSends = new Map<string, number[]>();

/** Sends one rendered template, with sample data, to the specialist's own login email only. */
export async function sendTestEmail(templateId: string): Promise<FollowUpActionState> {
  if (!isUuid(templateId)) return fail("That email could not be found.");
  const me = await whoAmI();
  if (!me) return fail("You need to be signed in as a property specialist.");
  if (!me.email || !isLikelyEmail(me.email)) return fail("Your account has no valid email address to send to.");

  const gate = checkTestRateLimit(testSends.get(me.specialistId) ?? [], Date.now());
  if (!gate.allowed) {
    return fail(`You've sent the maximum of 3 test emails this hour. Try again in about ${gate.retryInMinutes} minute${gate.retryInMinutes === 1 ? "" : "s"}.`);
  }

  const supabase = await createClient();
  const [{ data: tpl, error: tErr }, { data: sp, error: sErr }, { data: st }, ov] = await Promise.all([
    supabase
      .from("email_templates")
      .select("subject,body,audience")
      .eq("id", templateId)
      .eq("is_active", true)
      .eq("audience", "lead")
      .maybeSingle(),
    supabase.from("specialists").select("display_name,email,phone,subdomain").eq("id", me.specialistId).maybeSingle(),
    supabase.from("specialist_email_settings").select("personal_note").eq("specialist_id", me.specialistId).maybeSingle(),
    supabase
      .from("specialist_template_overrides")
      .select("subject,body")
      .eq("specialist_id", me.specialistId)
      .eq("template_id", templateId)
      .maybeSingle(),
  ]);
  if (tErr) return dbFail(tErr);
  if (sErr) return dbFail(sErr);
  if (!tpl || !sp) return fail("That email could not be found.");
  if (ov.error && !isOverrideTableMissing(ov.error)) return dbFail(ov.error);

  // Same choice the sender makes: your own version when you have one.
  const source = pickTemplateSource(
    tpl as { subject: string; body: string; audience: string | null },
    ov.error ? null : (ov.data as { subject: string | null; body: string | null } | null),
    MERGE_FIELDS,
  );
  const rendered = renderSample(
    source,
    sp as { display_name: string | null; email: string | null; phone: string | null; subdomain: string | null },
    (st as { personal_note: string | null } | null)?.personal_note ?? null,
    { specialistVersion: source.fromOverride },
  );

  // Count the attempt before sending so a slow/failed provider can't be hammered.
  testSends.set(me.specialistId, [...gate.recent, Date.now()]);

  const result = await sendEmailResult({
    to: me.email,
    from: formatFromAddress((sp as { display_name: string | null }).display_name ?? "", NURTURE_FROM_ADDRESS),
    subject: `[Test] ${rendered.subject}`,
    html: rendered.html,
    text: rendered.text,
    tags: [
      { name: "category", value: "lead_followup_test" },
    ],
  });
  if (!result.ok) return fail(`Couldn't send the test email. ${result.reason}`);
  return { ok: true, message: `Test email sent to ${me.email}. It can take a minute to arrive; check your spam folder too.` };
}

function overrideDbFail(error: { code?: string; message?: string }): FollowUpActionState {
  console.error("[specialist/follow-ups] override write failed:", error);
  if (isOverrideTableMissing(error)) {
    return fail("Writing your own version isn't switched on yet. Please try again later.");
  }
  if (error.code === "23514") return fail("Check the lengths of the subject and message, then try again.");
  if (error.code === "42501") return fail("That email can't be edited.");
  return dbFail(error);
}

/** An active customer email this specialist may write their own version of. */
async function editableTemplate(supabase: Awaited<ReturnType<typeof createClient>>, templateId: string) {
  return supabase
    .from("email_templates")
    .select("id")
    .eq("id", templateId)
    .eq("is_active", true)
    .eq("audience", "lead")
    .maybeSingle();
}

/** Saves this specialist's own subject + body for one customer email (their leads only). */
export async function saveTemplateOverride(
  _prev: FollowUpActionState | null,
  formData: FormData,
): Promise<FollowUpActionState> {
  const templateId = formData.get("template_id");
  if (!isUuid(templateId)) return fail("That email could not be found.");
  const parsed = parseOverrideInput(
    { subject: formData.get("subject"), body: formData.get("body") },
    MERGE_FIELDS,
  );
  if (!parsed.ok) return { ok: false, message: "Please fix the highlighted fields.", errors: parsed.errors };
  const me = await whoAmI();
  if (!me) return fail("You need to be signed in as a property specialist.");

  const supabase = await createClient();
  const { data: tpl, error: tErr } = await editableTemplate(supabase, templateId);
  if (tErr) return dbFail(tErr);
  if (!tpl) return fail("That email could not be found.");

  const { data, error } = await supabase
    .from("specialist_template_overrides")
    .upsert(
      {
        specialist_id: me.specialistId,
        template_id: templateId,
        subject: parsed.value.subject,
        body: parsed.value.body,
      },
      { onConflict: "specialist_id,template_id" },
    )
    .select("template_id");
  if (error) return overrideDbFail(error);
  if (!data || data.length === 0) return fail("Couldn't save that. Please try again.");

  revalidatePath(PATH);
  return { ok: true, message: "Your version is saved. It will be used for your leads from now on, including emails already scheduled." };
}

/** Removes this specialist's own version, so the owner's email is used again. */
export async function resetTemplateOverride(templateId: string): Promise<FollowUpActionState> {
  if (!isUuid(templateId)) return fail("That email could not be found.");
  const me = await whoAmI();
  if (!me) return fail("You need to be signed in as a property specialist.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("specialist_template_overrides")
    .delete()
    .eq("specialist_id", me.specialistId)
    .eq("template_id", templateId)
    .select("template_id");
  if (error) return overrideDbFail(error);
  if (!data || data.length === 0) return fail("You don't have your own version of this email.");

  revalidatePath(PATH);
  return { ok: true, message: "Back to All Abode's version." };
}
