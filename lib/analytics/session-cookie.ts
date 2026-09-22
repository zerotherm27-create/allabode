/** httpOnly session cookie for first-party analytics. Not used for auth —
 *  just ties anonymous pageviews/heartbeats to one `site_sessions` row. */

export const ANALYTICS_COOKIE = "aa_session";
export const SESSION_MAX_AGE_SECONDS = 1800; // 30 min sliding inactivity window

export function analyticsCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}
