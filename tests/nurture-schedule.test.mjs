import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const {
  computeDueAt, isDue, isTooLate, canEnrol, checkEligibility, planEnrolment,
  afterFailure, nurtureMode, runCap, maxAttempts, STOP_STAGES,
} = await loadTs("lib/nurture/schedule.ts");

const lead = (o = {}) => ({
  specialist_id: "s1", lead_stage: "New", consent_followup: true, unsubscribed_at: null, email: "lead@example.com", ...o,
});
const base = (o = {}) => ({
  lead: lead(),
  suppressed: false,
  specialist: { status: "approved", email: "spec@example.com" },
  settings: null,
  template: { is_active: true, audience: "lead" },
  pref: null,
  ...o,
});

test("computeDueAt adds whole days; clamps bad input", () => {
  assert.equal(computeDueAt("2026-10-01T05:00:00.000Z", 3), "2026-10-04T05:00:00.000Z");
  assert.equal(computeDueAt("2026-10-01T05:00:00.000Z", 0), "2026-10-01T05:00:00.000Z");
  assert.equal(computeDueAt("2026-10-01T05:00:00.000Z", -4), "2026-10-01T05:00:00.000Z");
  assert.equal(computeDueAt("2026-10-01T05:00:00.000Z", 2.9), "2026-10-03T05:00:00.000Z");
});

test("isDue and isTooLate", () => {
  const now = new Date("2026-10-10T00:00:00Z");
  assert.equal(isDue("2026-10-09T23:59:59Z", now), true);
  assert.equal(isDue("2026-10-10T00:00:01Z", now), false);
  assert.equal(isDue("garbage", now), false);
  assert.equal(isTooLate("2026-10-04T23:00:00Z", now), true);
  assert.equal(isTooLate("2026-10-06T00:00:00Z", now), false);
});

test("canEnrol: needs specialist, consent, not unsubscribed", () => {
  assert.deepEqual(canEnrol(lead()), { ok: true });
  assert.deepEqual(canEnrol(null), { ok: false, reason: "lead_missing" });
  assert.deepEqual(canEnrol(lead({ specialist_id: null })), { ok: false, reason: "no_specialist" });
  assert.deepEqual(canEnrol(lead({ consent_followup: false })), { ok: false, reason: "no_consent" });
  assert.deepEqual(canEnrol(lead({ consent_followup: null })), { ok: false, reason: "no_consent" });
  assert.deepEqual(canEnrol(lead({ unsubscribed_at: "2026-10-01T00:00:00Z" })), { ok: false, reason: "unsubscribed" });
});

test("eligible lead email passes", () => {
  assert.deepEqual(checkEligibility(base()), { ok: true });
  assert.deepEqual(checkEligibility(base({ settings: { followups_enabled: true }, pref: { enabled: true } })), { ok: true });
  assert.deepEqual(checkEligibility(base({ lead: lead({ lead_stage: "Contacted" }) })), { ok: true });
});

test("every stop stage stops lead emails", () => {
  for (const stage of STOP_STAGES) {
    assert.deepEqual(checkEligibility(base({ lead: lead({ lead_stage: stage }) })), { ok: false, reason: "stage_changed" });
  }
});

test("each stop rule has its reason", () => {
  const cases = [
    [{ suppressed: true }, "suppressed"],
    [{ specialist: null }, "specialist_inactive"],
    [{ specialist: { status: "suspended", email: "spec@example.com" } }, "specialist_inactive"],
    [{ specialist: { status: "pending", email: "spec@example.com" } }, "specialist_inactive"],
    [{ settings: { followups_enabled: false } }, "followups_off"],
    [{ template: { is_active: false, audience: "lead" } }, "template_inactive"],
    [{ pref: { enabled: false } }, "template_off"],
    [{ lead: lead({ email: "not-an-email" }) }, "invalid_email"],
    [{ specialist: { status: "approved", email: null } }, "invalid_email"],
    [{ lead: lead({ consent_followup: false }) }, "no_consent"],
    [{ lead: lead({ specialist_id: null }) }, "no_specialist"],
    [{ lead: lead({ unsubscribed_at: "2026-10-01T00:00:00Z" }) }, "unsubscribed"],
    [{ dueAt: "2026-09-01T00:00:00Z", now: new Date("2026-10-01T00:00:00Z") }, "too_late"],
  ];
  for (const [over, reason] of cases) {
    assert.deepEqual(checkEligibility(base(over)), { ok: false, reason }, reason);
  }
});

test("specialist reminder: only while New, goes to the specialist, ignores lead suppression", () => {
  const tpl = { is_active: true, audience: "specialist" };
  assert.deepEqual(checkEligibility(base({ template: tpl })), { ok: true });
  assert.deepEqual(checkEligibility(base({ template: tpl, suppressed: true })), { ok: true });
  assert.deepEqual(checkEligibility(base({ template: tpl, lead: lead({ lead_stage: "Contacted" }) })), { ok: false, reason: "stage_changed" });
  assert.deepEqual(checkEligibility(base({ template: tpl, lead: lead({ email: "bad" }) })), { ok: true });
  assert.deepEqual(
    checkEligibility(base({ template: tpl, specialist: { status: "approved", email: "bad" } })),
    { ok: false, reason: "invalid_email" },
  );
});

test("planEnrolment: one row per active template, due from created_at", () => {
  const rows = planEnrolment(
    { id: "i1", specialist_id: "s1", created_at: "2026-10-01T00:00:00.000Z" },
    [
      { id: "t0", delay_days: 0, is_active: true },
      { id: "t3", delay_days: 3, is_active: true },
      { id: "tx", delay_days: 7, is_active: false },
    ],
  );
  assert.deepEqual(rows, [
    { inquiry_id: "i1", template_id: "t0", specialist_id: "s1", due_at: "2026-10-01T00:00:00.000Z", status: "queued" },
    { inquiry_id: "i1", template_id: "t3", specialist_id: "s1", due_at: "2026-10-04T00:00:00.000Z", status: "queued" },
  ]);
  const now = new Date("2026-10-02T00:00:00.000Z");
  assert.equal(planEnrolment({ id: "i", specialist_id: "s", created_at: null }, [{ id: "t", delay_days: 1, is_active: true }], now)[0].due_at,
    "2026-10-03T00:00:00.000Z");
});

test("afterFailure retries until max attempts", () => {
  assert.equal(afterFailure(1), "queued");
  assert.equal(afterFailure(2), "queued");
  assert.equal(afterFailure(3), "failed");
  assert.equal(afterFailure(1, 1), "failed");
});

test("nurtureMode: dry run wins, enabled must be exactly true", () => {
  assert.equal(nurtureMode({}), "disabled");
  assert.equal(nurtureMode({ NURTURE_ENABLED: "1" }), "disabled");
  assert.equal(nurtureMode({ NURTURE_ENABLED: "TRUE" }), "disabled");
  assert.equal(nurtureMode({ NURTURE_ENABLED: "true" }), "live");
  assert.equal(nurtureMode({ NURTURE_ENABLED: "true", NURTURE_DRY_RUN: "true" }), "dry_run");
  assert.equal(nurtureMode({ NURTURE_DRY_RUN: "true" }), "dry_run");
});

test("runCap / maxAttempts read rule config with clamps", () => {
  assert.equal(runCap(null), 50);
  assert.equal(runCap({ per_run_cap: 100 }), 100);
  assert.equal(runCap({ per_run_cap: 5000 }), 200);
  assert.equal(runCap({ per_run_cap: 0 }), 1);
  assert.equal(runCap({ per_run_cap: "9" }), 50);
  assert.equal(maxAttempts({ max_attempts: 3 }), 3);
  assert.equal(maxAttempts({}), 3);
  assert.equal(maxAttempts({ max_attempts: 99 }), 10);
});
