import test from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./helpers/load-ts.mjs";

const m = await loadTs("lib/leads/follow-ups.ts");

test("parseNote accepts empty, trims, normalises line breaks", () => {
  assert.deepEqual(m.parseNote(undefined), { ok: true, value: "" });
  assert.deepEqual(m.parseNote("   "), { ok: true, value: "" });
  assert.deepEqual(m.parseNote("  Hi\r\nthere "), { ok: true, value: "Hi\nthere" });
});

test("parseNote enforces 400 characters", () => {
  assert.equal(m.parseNote("a".repeat(400)).ok, true);
  const r = m.parseNote("a".repeat(401));
  assert.equal(r.ok, false);
  assert.match(r.error, /400/);
});

test("parseNote rejects control characters and non-strings", () => {
  assert.equal(m.parseNote("bad\u0000note").ok, false);
  assert.equal(m.parseNote("bad note").ok, false);
  assert.equal(m.parseNote(42).ok, false);
  assert.equal(m.parseNote("tab\tok\nline").ok, true);
});

test("parseSwitch", () => {
  assert.equal(m.parseSwitch("true"), true);
  assert.equal(m.parseSwitch(false), false);
  assert.equal(m.parseSwitch("off"), false);
  assert.equal(m.parseSwitch("maybe"), null);
  assert.equal(m.parseSwitch(undefined), null);
});

test("isTemplateOn defaults to on without a pref row", () => {
  assert.equal(m.isTemplateOn(null), true);
  assert.equal(m.isTemplateOn(undefined), true);
  assert.equal(m.isTemplateOn({ enabled: true }), true);
  assert.equal(m.isTemplateOn({ enabled: false }), false);
});

test("describeDelay", () => {
  assert.equal(m.describeDelay(0), "Sent right away");
  assert.equal(m.describeDelay(1), "1 day after enquiry");
  assert.equal(m.describeDelay(3), "3 days after enquiry");
  assert.equal(m.describeDelay(NaN), "Sent right away");
});

test("test email rate limit: 3 per hour, frees as the window slides", () => {
  const now = 10_000_000;
  const h = 3_600_000;
  assert.equal(m.checkTestRateLimit([], now).allowed, true);
  assert.equal(m.checkTestRateLimit([now - 10, now - 5], now).allowed, true);
  const blocked = m.checkTestRateLimit([now - 30 * 60_000, now - 20 * 60_000, now - 10 * 60_000], now);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryInMinutes, 30);
  const old = m.checkTestRateLimit([now - h - 1, now - h - 2, now - 5], now);
  assert.equal(old.allowed, true);
  assert.equal(old.recent.length, 1);
});

test("isUuid and migration detection", () => {
  assert.equal(m.isUuid("3f2b8c1e-1111-4222-8333-444455556666"), true);
  assert.equal(m.isUuid("nope"), false);
  assert.equal(m.isFollowUpMigrationMissing({ code: "PGRST205" }), true);
  assert.equal(m.isFollowUpMigrationMissing({ message: 'relation "specialist_email_settings" does not exist' }), true);
  assert.equal(m.isFollowUpMigrationMissing({ code: "23505", message: "dup" }), false);
  assert.equal(m.isFollowUpMigrationMissing(null), false);
});
