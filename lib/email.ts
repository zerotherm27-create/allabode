/** A file to send with the message. Resend takes the bytes base64-encoded. */
export type EmailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  /** Keep the total under Resend's 40 MB message limit. */
  attachments?: EmailAttachment[];
  /** Overrides the default sender, e.g. `"Name via All Abode" <address>`. */
  from?: string;
  replyTo?: string;
  /** Extra headers, e.g. List-Unsubscribe / List-Unsubscribe-Post. */
  headers?: Record<string, string>;
  /** Plain-text alternative to the HTML body. */
  text?: string;
  tags?: { name: string; value: string }[];
};

export const DEFAULT_FROM = "All Abode Property Solutions <noreply@allabodeph.com>";

/** Pure: builds the JSON body for Resend's POST /emails. Optional keys are omitted when unset. */
export function buildResendPayload(message: EmailMessage): Record<string, unknown> {
  const { to, subject, html, attachments, from, replyTo, headers, text, tags } = message;
  return {
    from: from || DEFAULT_FROM,
    to,
    subject,
    html,
    ...(text ? { text } : {}),
    ...(replyTo ? { reply_to: replyTo } : {}),
    ...(headers && Object.keys(headers).length ? { headers } : {}),
    ...(tags?.length ? { tags } : {}),
    ...(attachments?.length
      ? {
          attachments: attachments.map((a) => ({
            filename: a.filename,
            content: a.content.toString("base64"),
            ...(a.contentType ? { content_type: a.contentType } : {}),
          })),
        }
      : {}),
  };
}

/** Pure: pulls the message id out of a Resend success body, or undefined. */
export function parseResendId(body: string): string | undefined {
  try {
    const id = (JSON.parse(body) as { id?: unknown } | null)?.id;
    return typeof id === "string" && id ? id : undefined;
  } catch {
    return undefined;
  }
}

/** Thin Resend wrapper. Fails silently — email never blocks primary actions. */
export async function sendEmail(message: EmailMessage): Promise<void> {
  await sendEmailResult(message);
}

/**
 * Same as sendEmail, but tells the caller whether Resend accepted the message
 * (and its message id), for flows that must surface a failed send.
 * Never throws.
 */
export async function sendEmailResult(
  message: EmailMessage,
  options: { idempotencyKey?: string } = {},
): Promise<{ ok: true; id?: string } | { ok: false; reason: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, reason: "Email is not configured (RESEND_API_KEY is not set)." };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        // Resend drops a repeat POST with the same key (kept ~24h).
        ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey.slice(0, 256) } : {}),
      },
      body: JSON.stringify(buildResendPayload(message)),
    });
    const raw = await res.text();
    if (!res.ok) {
      console.warn("[email] Resend error:", res.status, raw);
      return { ok: false, reason: `The email service returned an error (${res.status}).` };
    }
    return { ok: true, id: parseResendId(raw) };
  } catch (err) {
    console.warn("[email] sendEmail failed:", err);
    return { ok: false, reason: "The email service could not be reached." };
  }
}
