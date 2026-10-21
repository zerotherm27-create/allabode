import test from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./helpers/load-ts.mjs";

const m = await loadTs("lib/team/activity.ts");
const NOW = Date.parse("2026-10-22T12:00:00Z");
const hrs = (h) => new Date(NOW - h * 3_600_000).toISOString();
const base = { specialists: [{ id: "a", display_name: "Ann" }, { id: "b", display_name: "Bo" }], listings: [], inquiries: [], sends: [], rangeDays: 30, now: NOW };

test("parseRange validates", () => {
  assert.equal(m.parseRange("7"), 7);
  assert.equal(m.parseRange("90"), 90);
  assert.equal(m.parseRange("5"), 30);
  assert.equal(m.parseRange(undefined), 30);
  assert.equal(m.parseRange(["7", "30"]), 7);
});

test("empty data yields zeros", () => {
  const o = m.computeActivity(base);
  assert.equal(o.company.newLeads, 0);
  assert.deepEqual(o.bySpecialist.a.listings, { live: 0, awaiting: 0, draft: 0, other: 0 });
  assert.equal(o.house.staleLeads.length, 0);
});

test("listing buckets", () => {
  const L = (approval_status, status) => ({ specialist_id: "a", approval_status, status });
  const o = m.computeActivity({ ...base, listings: [
    L("approved", "Published"), L("approved", "Available"), L("submitted", "Draft"),
    L("draft", "Draft"), L("approved", "Draft"), L("rejected", "Draft"), L("approved", "Leased"),
    { specialist_id: null, approval_status: "approved", status: "Published" },
  ] });
  assert.deepEqual(o.bySpecialist.a.listings, { live: 2, awaiting: 1, draft: 2, other: 2 });
  assert.equal(o.house.listings.live, 1);
  assert.equal(o.company.listings.live, 3);
});

test("leads, stages, null stage, house, stale", () => {
  const o = m.computeActivity({ ...base, inquiries: [
    { id: "1", name: "Old", specialist_id: "a", lead_stage: "New", created_at: hrs(48) },
    { id: "2", name: "Fresh", specialist_id: "a", lead_stage: null, created_at: hrs(2) },
    { id: "3", name: "Won", specialist_id: "a", lead_stage: "Closed", created_at: hrs(72) },
    { id: "4", name: "Orphan", specialist_id: null, lead_stage: "New", created_at: hrs(30) },
    { id: "5", name: "Ancient", specialist_id: "b", lead_stage: "New", created_at: hrs(24 * 60) },
  ] });
  const a = o.bySpecialist.a;
  assert.equal(a.newLeads, 3);
  assert.equal(a.stages.New, 2);
  assert.equal(a.stages.Closed, 1);
  assert.deepEqual(a.staleLeads.map((x) => x.id), ["1"]);
  assert.equal(o.house.newLeads, 1);
  assert.deepEqual(o.house.staleLeads, [{ id: "4", name: "Orphan" }]);
  // out of range: not a new lead, but still stale (still untouched)
  assert.equal(o.bySpecialist.b.newLeads, 0);
  assert.equal(o.bySpecialist.b.staleLeads.length, 1);
  assert.equal(o.company.newLeads, 4);
  assert.equal(o.company.staleLeads.length, 3);
});

test("sends and unsubscribes respect the range", () => {
  const o = m.computeActivity({ ...base, rangeDays: 7,
    sends: [
      { specialist_id: "a", status: "sent", sent_at: hrs(5) },
      { specialist_id: "a", status: "sent", sent_at: hrs(24 * 10) },
      { specialist_id: "a", status: "failed", created_at: hrs(10) },
      { specialist_id: "a", status: "queued", created_at: hrs(1) },
      { specialist_id: null, status: "sent", sent_at: hrs(1) },
    ],
    inquiries: [
      { id: "1", specialist_id: "a", created_at: hrs(24 * 20), unsubscribed_at: hrs(3), lead_stage: "Lost" },
      { id: "2", specialist_id: "a", created_at: hrs(24 * 20), unsubscribed_at: hrs(24 * 20), lead_stage: "Lost" },
    ] });
  assert.equal(o.bySpecialist.a.followUpsSent, 1);
  assert.equal(o.bySpecialist.a.followUpsFailed, 1);
  assert.equal(o.house.followUpsSent, 1);
  assert.equal(o.company.followUpsSent, 2);
  assert.equal(o.bySpecialist.a.unsubscribes, 1);
});
