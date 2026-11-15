// Server-only: tells the new specialist about a lead assigned to them, and the
// previous one that it was taken off their list. Best-effort, never throws.
import { createServiceClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notify";
import { sendPushToUsers } from "@/lib/push/send";
import { buildLeadAlert, SPECIALIST_LEADS_LINK } from "@/lib/leads/lead-alerts";

type Service = ReturnType<typeof createServiceClient>;

async function authUserId(service: Service, specialistId: string): Promise<string | null> {
  const { data } = await service.from("specialists").select("auth_user_id").eq("id", specialistId).maybeSingle();
  return (data as { auth_user_id: string | null } | null)?.auth_user_id ?? null;
}

export async function notifyReassignment(
  inquiryId: string,
  fromSpecialistId: string | null,
  toSpecialistId: string | null,
): Promise<void> {
  try {
    if (fromSpecialistId === toSpecialistId) return;
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    const service = createServiceClient();
    const { data: lead } = await service
      .from("inquiries")
      .select("type,name,phone,message,details")
      .eq("id", inquiryId)
      .maybeSingle();
    const row = lead as {
      type: string;
      name: string | null;
      phone: string | null;
      message: string | null;
      details: Record<string, unknown> | null;
    } | null;
    if (!row) return;
    const alert = buildLeadAlert({
      type: row.type,
      name: row.name,
      phone: row.phone,
      message: row.message,
      listing: typeof row.details?.listing === "string" ? row.details.listing : null,
    });

    if (toSpecialistId) {
      const uid = await authUserId(service, toSpecialistId);
      if (uid) {
        const title = `Assigned to you: ${alert.title}`;
        await createNotification(service, {
          recipientUserId: uid,
          type: "lead",
          title,
          body: alert.body,
          link: SPECIALIST_LEADS_LINK,
        });
        await sendPushToUsers([uid], { title, body: alert.body, url: SPECIALIST_LEADS_LINK });
      }
    }
    if (fromSpecialistId) {
      const uid = await authUserId(service, fromSpecialistId);
      if (uid) {
        await createNotification(service, {
          recipientUserId: uid,
          type: "lead",
          title: "A lead was removed from your list",
          body: alert.body,
          link: SPECIALIST_LEADS_LINK,
        });
      }
    }
  } catch {
    console.warn("[lead:reassign-notify] failed");
  }
}
