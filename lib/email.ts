/** A file to send with the message. Resend takes the bytes base64-encoded. */
export type EmailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  /** Keep the total under Resend's 40 MB message limit. */
  attachments?: EmailAttachment[];
};

/** Thin Resend wrapper. Fails silently — email never blocks primary actions. */
export async function sendEmail(message: EmailMessage): Promise<void> {
  await sendEmailResult(message);
}

/**
 * Same as sendEmail, but tells the caller whether Resend accepted the message
 * (for flows that must surface a failed send, e.g. specialist invitations).
 * Never throws.
 */
export async function sendEmailResult({
  to,
  subject,
  html,
  attachments,
}: EmailMessage): Promise<{ ok: true } | { ok: false; reason: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, reason: "Email is not configured (RESEND_API_KEY is not set)." };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "All Abode Property Solutions <noreply@allabodeph.com>",
        to,
        subject,
        html,
        ...(attachments?.length
          ? {
              attachments: attachments.map((a) => ({
                filename: a.filename,
                content: a.content.toString("base64"),
                ...(a.contentType ? { content_type: a.contentType } : {}),
              })),
            }
          : {}),
      }),
    });
    if (!res.ok) {
      console.warn("[email] Resend error:", res.status, await res.text());
      return { ok: false, reason: `The email service returned an error (${res.status}).` };
    }
    return { ok: true };
  } catch (err) {
    console.warn("[email] sendEmail failed:", err);
    return { ok: false, reason: "The email service could not be reached." };
  }
}
