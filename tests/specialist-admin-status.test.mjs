import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const { sortSpecialists, availableActions, isMissingTable } = await loadTs("lib/team/admin-status.ts");

test("pending first, newest first within status", () => {
  const rows = [
    { id: "a", status: "approved", created_at: "2026-01-01" },
    { id: "b", status: "pending", created_at: "2026-01-01" },
    { id: "c", status: "pending", created_at: "2026-02-01" },
    { id: "d", status: "rejected", created_at: "2026-03-01" },
  ];
  assert.deepEqual(sortSpecialists(rows).map((r) => r.id), ["c", "b", "a", "d"]);
});

test("available actions per status", () => {
  assert.deepEqual(availableActions("pending"), { approve: true, reject: true, suspend: false, reinstate: false });
  assert.equal(availableActions("approved").suspend, true);
  assert.equal(availableActions("suspended").reinstate, true);
  assert.equal(availableActions("rejected").approve, true);
});

test("detects missing table errors", () => {
  assert.equal(isMissingTable({ code: "42P01" }), true);
  assert.equal(isMissingTable({ code: "PGRST205", message: "x" }), true);
  assert.equal(isMissingTable({ code: "42501", message: "denied" }), false);
  assert.equal(isMissingTable(null), false);
});
