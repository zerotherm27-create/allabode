import test from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./helpers/load-ts.mjs";

const m = await loadTs("lib/leads/intake.ts");
const ID = "123e4567-e89b-42d3-a456-426614174000";

test("consent needs both flags to be exactly true", () => {
  assert.equal(m.parseFollowupConsent({ consent: true, consentFollowup: true }), true);
  for (const b of [
    {},
    { consent: true },
    { consentFollowup: true },
    { consent: true, consentFollowup: "true" },
    { consent: true, consentFollowup: 1 },
    { consent: false, consentFollowup: true },
  ]) assert.equal(m.parseFollowupConsent(b), false);
});

test("listing uuid parsing rejects junk", () => {
  assert.equal(m.parseListingUuid(ID.toUpperCase()), ID);
  for (const v of ["", "abc", null, 5, `${ID}x`, "1; drop table"]) assert.equal(m.parseListingUuid(v), null);
});

test("planIntake: specialist slug wins, then listing, else plain", () => {
  assert.deepEqual(m.planIntake("inquiry", { specialist: "jojo", listingId: ID }), { kind: "specialist", slug: "jojo", listingId: ID });
  assert.deepEqual(m.planIntake("inquiry", { specialist: "jojo" }), { kind: "specialist", slug: "jojo", listingId: null });
  assert.deepEqual(m.planIntake("inquiry", { listingId: ID }), { kind: "listing", listingId: ID, type: "inquiry" });
  assert.deepEqual(m.planIntake("viewing", { listingId: ID }), { kind: "listing", listingId: ID, type: "viewing" });
  assert.deepEqual(m.planIntake("inquiry", { specialist: "BAD SLUG", listingId: "x" }), { kind: "plain" });
  assert.deepEqual(m.planIntake("contact", { listingId: ID, specialist: "jojo" }), { kind: "plain" });
  assert.deepEqual(m.planIntake("viewing", { specialist: "jojo" }), { kind: "plain" });
});

test("specialist rpc args drop a null listing title and carry consent", () => {
  const row = { name: "A B", email: "a@b.co", phone: "1", message: null, details: { listing: null } };
  const a = m.specialistRpcArgs(row, "jojo", null, true);
  assert.equal(a.p_specialist_slug, "jojo");
  assert.equal(a.p_consent_followup, true);
  assert.deepEqual(a.p_details, {});
  assert.equal(a.p_message, null);
  const b = m.specialistRpcArgs({ ...row, details: { listing: "Unit 5" } }, "jojo", ID, false);
  assert.deepEqual(b.p_details, { listing: "Unit 5" });
  assert.equal(b.p_listing_id, ID);
});

test("listing rpc args map viewing fields", () => {
  const row = { name: "A B", email: "a@b.co", phone: "1", message: "hi", preferred_viewing_date: "2026-11-01", preferred_contact_method: "Email", details: { listing: "Unit 5" } };
  const a = m.listingRpcArgs(row, ID, "viewing", false);
  assert.equal(a.p_type, "viewing");
  assert.equal(a.p_preferred_viewing_date, "2026-11-01");
  assert.equal(a.p_consent_followup, false);
  assert.deepEqual(a.p_details, { listing: "Unit 5" });
});

test("input error detection", () => {
  assert.equal(m.isInputError({ code: "22023" }), true);
  assert.equal(m.isInputError({ code: "42501" }), false);
  assert.equal(m.isInputError(null), false);
});

test("assignment: only approved specialists, unassign always allowed", () => {
  assert.equal(m.assignmentProblem(null, false), null);
  assert.ok(m.assignmentProblem(null, true));
  assert.ok(m.assignmentProblem({ id: "x", status: "suspended" }, true));
  assert.equal(m.assignmentProblem({ id: "x", status: "approved" }, true), null);
});

test("gap-period lead detection", () => {
  assert.equal(m.isUnassignedSpecialistLead({ details: { source: "specialist-page" }, specialist_id: null }), true);
  assert.equal(m.isUnassignedSpecialistLead({ details: { source: "specialist-page" }, specialist_id: "s" }), false);
  assert.equal(m.isUnassignedSpecialistLead({ details: {}, specialist_id: null }), false);
  assert.equal(m.isUnassignedSpecialistLead({ details: [], specialist_id: null }), false);
});
