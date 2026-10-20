// Pure, import-free helpers for specialist invitations (unit tested directly
// via tests/helpers/load-ts.mjs). The Admin-API side lives in lib/team/provision.ts.

/** Minimal HTML escaping for values interpolated into email markup. */
export function escapeHtml(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * The set-password link sent in an invitation. It goes straight to our own
 * /auth/callback with the recovery token hash (verified server-side with
 * verifyOtp), which signs the person in and forwards them to /auth/set-password.
 */
export function setPasswordLink(siteUrl: string, hashedToken: string): string {
  const base = siteUrl.replace(/\/$/, "");
  const q = new URLSearchParams({ token_hash: hashedToken, type: "recovery", next: "/auth/set-password" });
  return `${base}/auth/callback?${q.toString()}`;
}

export const INVITE_SUBJECT = "You've been invited to join the All Abode team as a property specialist";

export const RESEND_SUBJECT = "Your All Abode sign-in link";

/** Brand-consistent invitation email (inline styles: email clients ignore CSS variables).
 *  `returning` is for a resend to someone who has already signed in before. */
export function invitationEmailHtml(input: { name: string; link: string; loginUrl: string; returning?: boolean }): string {
  const name = escapeHtml(input.name.trim() || "there");
  const link = escapeHtml(input.link);
  const login = escapeHtml(input.loginUrl);
  return `
<div style="font-family:Inter,Arial,sans-serif;color:#1f2933;max-width:560px;margin:0 auto;padding:24px">
  <p style="font-family:Montserrat,Arial,sans-serif;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#8a6d32;margin:0 0 8px">All Abode Property Solutions</p>
  <h1 style="font-family:Montserrat,Arial,sans-serif;font-size:22px;color:#0a2540;margin:0 0 16px">${input.returning ? "Your sign-in link" : "Welcome to the team"}</h1>
  <p>Hi ${name},</p>
  <p>${input.returning
    ? "Here is a new link to set or reset your password for your All Abode property specialist account."
    : "You've been invited to join the All Abode team as a property specialist. We've created your account. Set your password to sign in, complete your profile and start listing properties."}</p>
  <p style="margin:24px 0">
    <a href="${link}" style="display:inline-block;background:#0a2540;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:4px">Set your password</a>
  </p>
  <ol style="padding-left:20px">
    <li>Click the button above and choose a password.</li>
    <li>Next time, sign in at <a href="${login}" style="color:#0d518c">${login}</a> with this email address.</li>
  </ol>
  <p style="font-size:13px;color:#52606d">This link works once and expires after a short time. If it has expired, ask All Abode to send you a new link. If you weren't expecting this email, you can ignore it.</p>
</div>`.trim();
}

/** What to do when an auth user with the invited email already exists. */
export type ExistingUserDecision = "create" | "link" | "replace" | "refuse";

/**
 * - no auth user → create one;
 * - the email already belongs to an owner, tenant or staff record → refuse;
 * - a confirmed auth user → link the new specialist row to it;
 * - an UNCONFIRMED auth user → replace it (delete + create): nobody has proven
 *   they own that inbox, so it may be a squatter who pre-registered the email.
 */
export function decideExistingUser(input: {
  exists: boolean;
  confirmed: boolean;
  belongsToOtherRole: boolean;
}): ExistingUserDecision {
  if (input.belongsToOtherRole) return "refuse";
  if (!input.exists) return "create";
  return input.confirmed ? "link" : "replace";
}

/** A linked auth user that has never signed in (null/empty last_sign_in_at). */
export function hasNeverSignedIn(lastSignInAt: string | null | undefined): boolean {
  return !lastSignInAt;
}
