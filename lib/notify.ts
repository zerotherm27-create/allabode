import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";

export interface NotifyOpts {
  recipientUserId: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  entityType?: string;
  entityId?: string;
  /** If provided, also send an email. */
  recipientEmail?: string;
}

/**
 * Insert a notification row and optionally fire an email.
 * Best-effort: never throws.
 */
export async function createNotification(
  supabase: SupabaseClient,
  opts: NotifyOpts
): Promise<void> {
  try {
    await supabase.from("notifications").insert({
      recipient_user_id: opts.recipientUserId,
      type:              opts.type,
      title:             opts.title,
      body:              opts.body,
      link:              opts.link ?? null,
      entity_type:       opts.entityType ?? null,
      entity_id:         opts.entityId ?? null,
    });

    if (opts.recipientEmail) {
      await sendEmail({
        to:      opts.recipientEmail,
        subject: opts.title,
        html: `<p>${opts.body}</p>${
          opts.link
            ? `<p><a href="${process.env.NEXT_PUBLIC_SITE_URL ?? "https://allabodeph.com"}${opts.link}">View in portal</a></p>`
            : ""
        }`,
      });
    }
  } catch (err) {
    console.warn("[notify] createNotification failed:", err);
  }
}
