// Import-free on purpose (loaded directly by unit tests).
// A Web Push endpoint is a URL the SERVER later POSTs to, so it must only ever be
// a real browser push service. Anything else (internal hosts, IP literals,
// arbitrary https sites) would let a signed-in user make the server call it.

const ALLOWED_HOSTS = [
  "fcm.googleapis.com", // Chrome, Edge, Brave, Opera, Samsung (FCM)
  "updates.push.services.mozilla.com", // Firefox
  "push.services.mozilla.com",
  "web.push.apple.com", // Safari / installed iOS & macOS web apps
  "notify.windows.com", // legacy Edge (WNS), incl. wns2-*.notify.windows.com
];

export function isAllowedPushEndpoint(v: unknown): v is string {
  if (typeof v !== "string" || v.length > 1000) return false;
  let u: URL;
  try {
    u = new URL(v);
  } catch {
    return false;
  }
  if (u.protocol !== "https:") return false;
  if (u.username || u.password) return false;
  if (u.port && u.port !== "443") return false;
  const host = u.hostname.toLowerCase().replace(/\.$/, "");
  return ALLOWED_HOSTS.some((a) => host === a || host.endsWith(`.${a}`));
}
