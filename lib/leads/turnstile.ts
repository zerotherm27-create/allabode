/**
 * Verifies a Cloudflare Turnstile token. Fails open (returns true) when
 * TURNSTILE_SECRET_KEY isn't configured, so the forms keep working before
 * the site key/secret are set up — this layer activates automatically once
 * the env vars are added.
 */
export async function verifyTurnstile(token: unknown, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (typeof token !== "string" || !token) return false;

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
    });
    const data = (await res.json().catch(() => null)) as { success?: boolean } | null;
    return data?.success === true;
  } catch {
    return true; // network hiccup talking to Cloudflare shouldn't block real leads
  }
}
