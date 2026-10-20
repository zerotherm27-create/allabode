import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const {
  escapeHtml, setPasswordLink, invitationEmailHtml, decideExistingUser, hasNeverSignedIn, INVITE_SUBJECT, RESEND_SUBJECT,
} = await loadTs("lib/team/invite.ts");

test("existing-account decision: refuse other roles, link confirmed, replace unconfirmed, else create", () => {
  assert.equal(decideExistingUser({ exists: false, confirmed: false, belongsToOtherRole: false }), "create");
  assert.equal(decideExistingUser({ exists: true, confirmed: true, belongsToOtherRole: false }), "link");
  assert.equal(decideExistingUser({ exists: true, confirmed: false, belongsToOtherRole: false }), "replace");
  for (const exists of [true, false]) {
    for (const confirmed of [true, false]) {
      assert.equal(decideExistingUser({ exists, confirmed, belongsToOtherRole: true }), "refuse");
    }
  }
});

test("set-password link goes through our callback with the recovery token hash", () => {
  const link = setPasswordLink("https://allabodeph.com/", "abc+/=");
  const u = new URL(link);
  assert.equal(u.origin + u.pathname, "https://allabodeph.com/auth/callback");
  assert.equal(u.searchParams.get("token_hash"), "abc+/=");
  assert.equal(u.searchParams.get("type"), "recovery");
  assert.equal(u.searchParams.get("next"), "/auth/set-password");
});

test("invitation email escapes the name and carries the link and login URL", () => {
  const html = invitationEmailHtml({ name: "<b>Ram</b> & Co", link: "https://x.test/a?b=1&c=2", loginUrl: "https://x.test/portal/login" });
  assert.match(html, /Hi &lt;b&gt;Ram&lt;\/b&gt; &amp; Co,/);
  assert.ok(html.includes('href="https://x.test/a?b=1&amp;c=2"'));
  assert.ok(html.includes("https://x.test/portal/login"));
  assert.match(html, /Set your password/);
  assert.match(INVITE_SUBJECT, /invited to join the All Abode team as a property specialist/);
  assert.equal(escapeHtml(`"'`), "&quot;&#39;");
});

test("never signed in = no last_sign_in_at", () => {
  assert.equal(hasNeverSignedIn(null), true);
  assert.equal(hasNeverSignedIn(undefined), true);
  assert.equal(hasNeverSignedIn(""), true);
  assert.equal(hasNeverSignedIn("2026-10-21T00:00:00Z"), false);
});

test("resend email for a returning specialist says set or reset, not invited", () => {
  const html = invitationEmailHtml({ name: "Ram", link: "https://x.test/a", loginUrl: "https://x.test/portal/login", returning: true });
  assert.match(html, /new link to set or reset your password/);
  assert.doesNotMatch(html, /You've been invited/);
  assert.ok(RESEND_SUBJECT.length > 0);
});
