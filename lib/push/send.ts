// Server-only: Web Push delivery to a user's subscribed devices.
// Silently does nothing until the VAPID keys are set, so the rest of the lead
// flow works before push is configured. Never throws.
import webpush from "web-push";
import { createServiceClient } from "@/lib/supabase/server";

export type PushPayload = { title: string; body: string; url: string };

export function isPushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT,
  );
}

/** Sends `payload` to every device each user has enabled; removes dead subscriptions. */
export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  if (!isPushConfigured() || userIds.length === 0) return;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT!,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!,
    );
    const service = createServiceClient();
    const { data, error } = await service
      .from("push_subscriptions")
      .select("id,endpoint,p256dh,auth")
      .in("user_id", userIds);
    if (error || !data) return;
    const body = JSON.stringify(payload);
    await Promise.all(
      (data as { id: string; endpoint: string; p256dh: string; auth: string }[]).map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            body,
            { TTL: 60 * 60 * 24 },
          );
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) {
            await service.from("push_subscriptions").delete().eq("id", sub.id);
          }
        }
      }),
    );
  } catch {
    console.warn("[push] send failed");
  }
}
