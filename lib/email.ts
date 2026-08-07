/** A file to send with the message. Resend takes the bytes base64-encoded. */
export type EmailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

/** Thin Resend wrapper. Fails silently — email never blocks primary actions. */
export async function sendEmail({
  to,
  subject,
  html,
  attachments,
}: {
  to: string;
  subject: string;
  html: string;
  /** Keep the total under Resend's 40 MB message limit. */
  attachments?: EmailAttachment[];
}): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return; // not configured — skip silently

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
    }
  } catch (err) {
    console.warn("[email] sendEmail failed:", err);
  }
}
