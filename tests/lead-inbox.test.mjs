import test from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./helpers/load-ts.mjs";

const m = await loadTs("lib/leads/inbox.ts");
const rows = [
  { name: "Ana Cruz", email: "ana@x.com", lead_stage: "Contacted", created_at: "2026-10-03" },
  { name: "Ben Lim", email: "ben@y.com", lead_stage: "New", created_at: "2026-10-01" },
  { name: "Cy Tan", email: "cy@x.com", lead_stage: "New", created_at: "2026-10-02" },
  { name: "Di Roe", email: "di@z.com", lead_stage: "Lost", created_at: "2026-10-04" },
];

test("stage validation", () => {
  assert.equal(m.isLeadStage("Viewing"), true);
  for (const v of ["viewing", "", null, undefined, 3, "Won"]) assert.equal(m.isLeadStage(v), false);
  assert.equal(m.parseStageFilter("Lost"), "Lost");
  assert.equal(m.parseStageFilter("bogus"), "all");
  assert.equal(m.parseStageFilter(["New", "Lost"]), "New");
  assert.equal(m.parseStageFilter(undefined), "all");
});

test("notes parsing", () => {
  assert.deepEqual(m.parseNotes("  hi  "), { ok: true, value: "hi" });
  assert.deepEqual(m.parseNotes(null), { ok: true, value: "" });
  assert.equal(m.parseNotes("a".repeat(5001)).ok, false);
  assert.equal(m.parseNotes("a".repeat(5000)).ok, true);
  assert.equal(m.parseNotes(5).ok, false);
});

test("counts", () => {
  const c = m.countByStage(rows);
  assert.equal(c.all, 4);
  assert.equal(c.New, 2);
  assert.equal(c.Contacted, 1);
  assert.equal(c.Closed, 0);
});

test("filter, search and ordering", () => {
  const all = m.filterLeads(rows, "all", "");
  assert.deepEqual(all.map((r) => r.name), ["Cy Tan", "Ben Lim", "Di Roe", "Ana Cruz"]);
  assert.deepEqual(m.filterLeads(rows, "New", "").map((r) => r.name), ["Cy Tan", "Ben Lim"]);
  assert.deepEqual(m.filterLeads(rows, "all", " X.COM ").map((r) => r.name), ["Cy Tan", "Ana Cruz"]);
  assert.deepEqual(m.filterLeads(rows, "Lost", "ana"), []);
});

test("consent state", () => {
  assert.equal(m.consentState({ consent_followup: true, unsubscribed_at: null }), "consented");
  assert.equal(m.consentState({ consent_followup: true, unsubscribed_at: "2026-10-01" }), "unsubscribed");
  assert.equal(m.consentState({ consent_followup: false, unsubscribed_at: null }), "none");
  assert.equal(m.consentState({ consent_followup: null, unsubscribed_at: null }), "none");
});

test("migration-missing detection", () => {
  assert.equal(m.isMigrationMissing({ code: "42703" }), true);
  assert.equal(m.isMigrationMissing({ message: 'column inquiries.lead_stage does not exist' }), true);
  assert.equal(m.isMigrationMissing({ code: "42501", message: "denied" }), false);
  assert.equal(m.isMigrationMissing(null), false);
});
