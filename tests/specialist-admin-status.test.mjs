import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const { sortSpecialists, availableActions, isMissingTable } = await loadTs("lib/team/admin-status.ts");

test("invitees first, then pending/active, then suspended; newest first within a group", () => {
  const rows = [
    { id: "a", status: "approved", created_at: "2026-01-01" },
    { id: "b", status: "pending", created_at: "2026-01-01" },
    { id: "c", status: "pending", created_at: "2026-02-01" },
    { id: "d", status: "rejected", created_at: "2026-03-01" },
    { id: "s", status: "suspended", created_at: "2026-04-01" },
    { id: "i", status: "approved", created_at: "2025-01-01", invited: true },
  ];
  assert.deepEqual(sortSpecialists(rows, (r) => !!r.invited).map((r) => r.id), ["i", "c", "b", "a", "s", "d"]);
  // Without an invitee test, approved rows sort with the active group.
  assert.deepEqual(sortSpecialists(rows).map((r) => r.id), ["c", "b", "a", "i", "s", "d"]);
});

test("available actions per status: suspend/reinstate only", () => {
  assert.deepEqual(availableActions("approved"), { suspend: true, reinstate: false });
  assert.deepEqual(availableActions("suspended"), { suspend: false, reinstate: true });
  for (const s of ["pending", "rejected"]) {
    assert.deepEqual(availableActions(s), { suspend: false, reinstate: false });
  }
});

test("detects missing table errors", () => {
  assert.equal(isMissingTable({ code: "42P01" }), true);
  assert.equal(isMissingTable({ code: "PGRST205", message: "x" }), true);
  assert.equal(isMissingTable({ code: "42501", message: "denied" }), false);
  assert.equal(isMissingTable(null), false);
});

const {
  specialistAccountState, ACCOUNT_STATE_LABEL, normalizeSpecialistEmail, validateNewSpecialist,
  specialistConflictMessage,
} = await loadTs("lib/team/admin-status.ts");

test("an approved row whose login has never been used is an invitation", () => {
  const never = new Set(["u1"]);
  assert.equal(specialistAccountState({ status: "approved", auth_user_id: "u1" }, never), "invited");
  assert.equal(specialistAccountState({ status: "approved", auth_user_id: "u2" }, never), "active");
  assert.equal(specialistAccountState({ status: "approved", auth_user_id: null }), "invited");
  // Unknown sign-in status (Admin API unavailable) shows as Active.
  assert.equal(specialistAccountState({ status: "approved", auth_user_id: "u1" }, null), "active");
  assert.equal(specialistAccountState({ status: "suspended", auth_user_id: "u1" }, never), "suspended");
  assert.equal(ACCOUNT_STATE_LABEL.invited, "Invited — hasn't signed in yet");
});

test("specialist email is trimmed, lower-cased and validated", () => {
  assert.equal(normalizeSpecialistEmail("  Ram.Santos@Example.COM "), "ram.santos@example.com");
  for (const bad of ["", "ram", "ram@", "a b@x.com", null, 3]) assert.equal(normalizeSpecialistEmail(bad), null);
});

test("add-specialist form validation", () => {
  assert.deepEqual(
    validateNewSpecialist({ full_name: " Ram Santos ", email: "RAM@x.com", phone: "", tagline: "" }),
    { ok: true, value: { displayName: "Ram Santos", email: "ram@x.com", phone: null, tagline: null } },
  );
  const r = validateNewSpecialist({ full_name: "R", email: "nope", phone: "123", tagline: "x".repeat(141) });
  assert.equal(r.ok, false);
  assert.deepEqual(Object.keys(r.errors).sort(), ["email", "full_name", "phone", "tagline"]);
  assert.equal(validateNewSpecialist({ full_name: "Ram", email: "r@x.com", phone: "0917 123 4567" }).ok, true);
});

test("unique violations map to friendly messages", () => {
  const v = { email: "ram@x.com", subdomain: "ram" };
  assert.match(specialistConflictMessage({ code: "23505", message: 'duplicate key value violates unique constraint "specialists_email_lower_key"' }, v), /ram@x\.com has already been added/);
  assert.match(specialistConflictMessage({ code: "23505", message: 'duplicate key value violates unique constraint "specialists_subdomain_key"' }, v), /"ram" is already taken/);
  // Email is tested before the subdomain keyword: a value can contain either word.
  const tricky = { email: "subdomain@x.com", subdomain: "email-ram" };
  assert.match(specialistConflictMessage({ code: "23505", message: 'duplicate key value violates unique constraint "specialists_email_lower_key"', details: "Key (lower(email))=(subdomain@x.com) already exists." }, tricky), /subdomain@x\.com has already been added/);
  assert.match(specialistConflictMessage({ code: "23505", message: 'duplicate key value violates unique constraint "specialists_subdomain_key"', details: "Key (subdomain)=(email-ram) already exists." }, tricky), /"email-ram" is already taken/);
  assert.equal(specialistConflictMessage({ code: "42501" }, v), null);
  assert.equal(specialistConflictMessage(null, v), null);
});

const {
  canApproveListing, canRejectListing, normalizeRejectionNote, statusAfterApproval,
  parseApprovalFilter, approvalCounts, filterByApproval, isMissingColumn,
} = await loadTs("lib/team/admin-status.ts");

test("staff approve from submitted, or reinstate from rejected", () => {
  assert.equal(canApproveListing("submitted"), true);
  assert.equal(canApproveListing("rejected"), true);
  for (const s of ["draft", "approved", null, undefined]) {
    assert.equal(canApproveListing(s), false, String(s));
  }
});

test("a house listing left in draft can be approved, a specialist draft cannot", () => {
  assert.equal(canApproveListing("draft", { house: true }), true);
  assert.equal(canApproveListing("draft", { house: false }), false);
  assert.equal(canApproveListing("approved", { house: true }), false);
});

test("staff send back a submission or take down an approved listing", () => {
  assert.equal(canRejectListing("submitted"), true);
  assert.equal(canRejectListing("approved"), true);
  for (const s of ["draft", "rejected", null, undefined]) {
    assert.equal(canRejectListing(s), false, String(s));
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
