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

test("suspend only from approved; approve never from approved or suspended", () => {
  for (const s of ["pending", "rejected", "suspended"]) assert.equal(availableActions(s).suspend, false);
  for (const s of ["approved", "suspended"]) assert.equal(availableActions(s).approve, false);
  assert.equal(availableActions("approved").suspend, true);
});

const {
  canApproveListing, canRejectListing, normalizeRejectionNote, statusAfterApproval,
  parseApprovalFilter, approvalCounts, filterByApproval, isMissingColumn,
} = await loadTs("lib/team/admin-status.ts");

test("listings can be approved or rejected only from submitted", () => {
  assert.equal(canApproveListing("submitted"), true);
  assert.equal(canRejectListing("submitted"), true);
  for (const s of ["draft", "approved", "rejected", null, undefined]) {
    assert.equal(canApproveListing(s), false);
    assert.equal(canRejectListing(s), false);
  }
});

test("rejection note is required, trimmed and capped", () => {
  assert.deepEqual(normalizeRejectionNote("  Add photos  "), { ok: true, value: "Add photos" });
  assert.equal(normalizeRejectionNote("   ").ok, false);
  assert.equal(normalizeRejectionNote(undefined).ok, false);
  assert.equal(normalizeRejectionNote("x".repeat(501)).ok, false);
  assert.equal(normalizeRejectionNote("x".repeat(500)).ok, true);
});

test("approval moves a Draft listing to Available and leaves other statuses alone", () => {
  assert.equal(statusAfterApproval("Draft"), "Available");
  assert.equal(statusAfterApproval("Published"), null);
  assert.equal(statusAfterApproval("Available"), null);
});

test("approval filter parsing, counts and ordering", () => {
  assert.equal(parseApprovalFilter("submitted"), "submitted");
  assert.equal(parseApprovalFilter("nope"), "all");
  assert.equal(parseApprovalFilter(["rejected", "x"]), "rejected");
  assert.equal(parseApprovalFilter(undefined), "all");
  const rows = [
    { id: "a", approval_status: "approved" },
    { id: "b", approval_status: "submitted" },
    { id: "c" },
    { id: "d", approval_status: "submitted" },
    { id: "e", approval_status: "rejected" },
  ];
  assert.deepEqual(approvalCounts(rows), { all: 5, submitted: 2, approved: 2, rejected: 1, draft: 0 });
  assert.deepEqual(filterByApproval(rows, "all").map((r) => r.id), ["b", "d", "a", "c", "e"]);
  assert.deepEqual(filterByApproval(rows, "approved").map((r) => r.id), ["a", "c"]);
});

test("detects missing column and relationship errors", () => {
  assert.equal(isMissingColumn({ code: "42703" }), true);
  assert.equal(isMissingColumn({ code: "PGRST200", message: "Could not find a relationship between 'listings' and 'specialists'" }), true);
  assert.equal(isMissingColumn({ message: "column listings.approval_status does not exist" }), true);
  assert.equal(isMissingColumn({ code: "42501", message: "permission denied" }), false);
  assert.equal(isMissingColumn(null), false);
});
