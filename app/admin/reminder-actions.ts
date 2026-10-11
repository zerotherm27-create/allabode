"use server";

import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import { createNotification } from "@/lib/notify";
import { deriveActionItems } from "@/lib/admin/action-items";
import { getPersonHistory, type PersonRecord } from "@/lib/admin/person-history";

export type ReminderState = { ok?: boolean; error?: string };

const THROTTLE_HOURS = 6;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Send a reminder about one "Needs attention" item to the person whose page it is.
 * The item is re-derived server-side from the id, so the client can't choose the message text.
 * In-app notification (when they have a portal login) + email.
 */
export async function sendReminder(
  party: "tenant" | "owner",
  personId: string,
  itemId: string,
): Promise<ReminderState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: isStaff } = await supabase.rpc("is_staff");
  if (!user || !isStaff) return { error: "Not authorised." };

  const table = party === "tenant" ? "tenants" : "owners";
  const { data } = await supabase
    .from(table)
    .select(party === "owner" ? "id,name,email,phone,auth_user_id,spa_authorization_received" : "id,name,email,phone,auth_user_id")
    .eq("id", personId)
    .maybeSingle();
  if (!data) return { error: "Record not found." };
  const person = data as unknown as PersonRecord;

  const history = await getPersonHistory(supabase, party, person);
  const item = deriveActionItems(history).find((i) => i.id === itemId);
  if (!item) return { error: "This item is no longer outstanding." };

  const mine = party === "tenant" ? "tenant" : "landlord";
  if (item.side !== mine && item.side !== "both") return { error: "This item is not waiting on them." };

  const title = `Reminder: ${item.title}`;

  if (person.auth_user_id) {
    const since = new Date(Date.now() - THROTTLE_HOURS * 3_600_000).toISOString();
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_user_id", person.auth_user_id)
      .eq("type", "reminder")
      .eq("title", title)
      .gte("created_at", since);
    if ((count ?? 0) > 0) return { error: `Already reminded in the last ${THROTTLE_HOURS} hours.` };
  }

  const body = `${esc(item.title)}. ${esc(item.detail)}. Please settle this at your earliest convenience, or contact All Abode Property Solutions if you have any questions.`;
  const link = party === "tenant" ? "/dashboard/tenant" : "/dashboard/owner";

  if (person.auth_user_id) {
    await createNotification(supabase, {
      recipientUserId: person.auth_user_id,
      type: "reminder",
      title,
      body,
      link,
      recipientEmail: person.email,
    });
  } else {
    // No portal login yet, so there is nowhere to put an in-app notification — email only.
    await sendEmail({ to: person.email, subject: title, html: `<p>${body}</p>` });
  }

  await logAudit(supabase, {
    action: "reminder.sent",
    entityType: party,
    entityId: person.id,
    actorId: user.id,
    metadata: { item: itemId, title: item.title },
  });

  return { ok: true };
}
