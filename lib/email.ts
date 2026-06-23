/** Thin Resend wrapper. Fails silently — email never blocks primary actions. */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
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
      }),
    });
    if (!res.ok) {
      console.warn("[email] Resend error:", res.status, await res.text());
    }
  } catch (err) {
    console.warn("[email] sendEmail failed:", err);
  }
}
