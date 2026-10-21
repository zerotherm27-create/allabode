"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { sendEmailResult } from "@/lib/email";
import { isLikelyEmail } from "@/lib/email-address";
import { MERGE_FIELDS } from "@/lib/nurture/render";
import { NURTURE_FROM_ADDRESS } from "@/lib/nurture/message";
import { renderAdminSample } from "@/lib/nurture/preview";
import { checkTestRateLimit, isFollowUpMigrationMissing } from "@/lib/leads/follow-ups";
import {
  isUuid,
  parseTemplateInput,
  type TemplateErrors,
} from "@/lib/admin/follow-up-templates";

export type TemplateActionState = {
  ok: boolean;
  message: string;
  warnings?: string[];
  errors?: TemplateErrors;
  /** Set after a successful create so the form can move to the edit page. */
  savedId?: string;
};

const fail = (message: string, errors?: TemplateErrors): TemplateActionState => ({ ok: false, message, errors });
const PATH = "/admin/follow-ups";

/** Staff check FIRST, via the is_staff RPC; returns the session client + user. */
async function staff() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated.", supabase: null, user: null } as const;
  const { data: isStaff } = await supabase.rpc("is_staff");
  if (!isStaff) return { error: "Staff access required.", supabase: null, user: null } as const;
  return { error: null, supabase, user } as const;
}

function dbFail(error: { code?: string; message?: string }): TemplateActionState {
  console.error("[admin/follow-ups] write failed:", error);
  if (isFollowUpMigrationMissing(error)) {
    return fail("Follow-up emails aren't set up in the database yet. Run the leads and nurture migration first.");
  }
  if (error.code === "23505") {
    return fail("That key is already used by another email.", { template_key: "That key is already used by another email." });
  }
  if (error.code === "23514") return fail("The database rejected one of the values. Check the lengths and the delay.");
  return fail("Couldn't save that. Please try again.");
}

function formObject(fd: FormData): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const k of ["template_key", "name", "subject", "body", "delay_days", "position", "audience"]) {
    const v = fd.get(k);
    o[k] = typeof v === "string" ? v : "";
  }
  o.is_active = fd.get("is_active") === "on";
  return o;
}

/** Create (no id) or update (id) a template. Templates are never deleted. */
export async function saveTemplate(
  _prev: TemplateActionState | null,
  formData: FormData,
): Promise<TemplateActionState> {
  const auth = await staff();
  if (auth.error) return fail(auth.error);
  const { supabase, user } = auth;

  const idRaw = formData.get("id");
  const id = typeof idRaw === "string" && idRaw !== "" ? idRaw : null;
  if (id !== null && !isUuid(id)) return fail("That email could not be found.");

  const parsed = parseTemplateInput(formObject(formData), MERGE_FIELDS, { requireKey: id === null });
  if (!parsed.ok) return fail("Please fix the highlighted fields.", parsed.errors);
  const v = parsed.value;

  if (id === null) {
    const { data, error } = await supabase
      .from("email_templates")
      .insert({
        template_key: v.template_key,
        name: v.name,
        subject: v.subject,
        body: v.body,
        delay_days: v.delay_days,
        position: v.position,
        audience: v.audience,
        is_active: v.is_active,
      })
      .select("id");
    if (error) return dbFail(error);
    if (!data || data.length === 0) return fail("Couldn't save that. Please try again.");
    await logAudit(supabase, {
      action: "follow_up_template.create",
      entityType: "email_template",
      entityId: data[0].id,
      actorId: user.id,
      metadata: { template_key: v.template_key },
    });
    revalidatePath(PATH);
    return { ok: true, message: "Email created.", warnings: parsed.warnings, savedId: data[0].id };
  }

  const { data, error } = await supabase
    .from("email_templates")
    .update({
      name: v.name,
      subject: v.subject,
      body: v.body,
      delay_days: v.delay_days,
      position: v.position,
      audience: v.audience,
      is_active: v.is_active,
    })
    .eq("id", id)
    .select("id");
  if (error) return dbFail(error);
  if (!data || data.length === 0) return fail("That email could not be found, or you don't have access to change it.");
  await logAudit(supabase, {
    action: "follow_up_template.update",
    entityType: "email_template",
    entityId: id,
    actorId: user.id,
  });
  revalidatePath(PATH);
  revalidatePath(`${PATH}/${id}`);
  return { ok: true, message: "Changes saved.", warnings: parsed.warnings };
}

/** Deactivate / reactivate. There is intentionally no delete (send history keeps a reference). */
export async function setTemplateActive(id: string, active: boolean): Promise<TemplateActionState> {
  const auth = await staff();
  if (auth.error) return fail(auth.error);
  const { supabase, user } = auth;
  if (!isUuid(id) || typeof active !== "boolean") return fail("That email could not be found.");

  const { data, error } = await supabase
    .from("email_templates")
    .update({ is_active: active })
    .eq("id", id)
    .select("id");
  if (error) return dbFail(error);
  if (!data || data.length === 0) return fail("That email could not be found, or you don't have access to change it.");
  await logAudit(supabase, {
    action: active ? "follow_up_template.activate" : "follow_up_template.deactivate",
    entityType: "email_template",
    entityId: id,
    actorId: user.id,
  });
  revalidatePath(PATH);
  revalidatePath(`${PATH}/${id}`);
  return {
    ok: true,
    message: active
      ? "Email reactivated."
      : "Email deactivated. Nothing more will be sent from it; past sends stay in the log.",
  };
}

// Best-effort limiter, per server instance (same approach as the specialist page).
const testSends = new Map<string, number[]>();

/** Sends the CURRENT editor content, rendered with sample data, to the signed-in staff member only. */
export async function sendAdminTestEmail(input: {
  subject: string;
  body: string;
  audience: string;
}): Promise<TemplateActionState> {
  const auth = await staff();
  if (auth.error) return fail(auth.error);
  const { user } = auth;
  if (!user.email || !isLikelyEmail(user.email)) return fail("Your account has no valid email address to send to.");

  const parsed = parseTemplateInput(
    { template_key: "test", name: "test", delay_days: 0, position: 0, audience: input?.audience, subject: input?.subject, body: input?.body },
    MERGE_FIELDS,
  );
  if (!parsed.ok) {
    const first = parsed.errors.subject ?? parsed.errors.body ?? parsed.errors.audience ?? "Check the subject and body.";
    return fail(first);
  }

  const gate = checkTestRateLimit(testSends.get(user.id) ?? [], Date.now());
  if (!gate.allowed) {
    return fail(`You've sent the maximum of 3 test emails this hour. Try again in about ${gate.retryInMinutes} minute${gate.retryInMinutes === 1 ? "" : "s"}.`);
  }

  const rendered = renderAdminSample(
    { subject: parsed.value.subject, body: parsed.value.body },
    parsed.value.audience,
  );

  testSends.set(user.id, [...gate.recent, Date.now()]);
  const result = await sendEmailResult({
    to: user.email,
    from: NURTURE_FROM_ADDRESS,
    subject: `[Test] ${rendered.subject}`,
    html: rendered.html,
    text: rendered.text,
    tags: [{ name: "category", value: "lead_followup_test" }],
  });
  if (!result.ok) return fail(`Couldn't send the test email. ${result.reason}`);
  return { ok: true, message: `Test email sent to ${user.email}. It can take a minute to arrive; check spam too.` };
}
