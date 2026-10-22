import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./helpers/load-ts.mjs";

const { buildOnboarding } = await loadTs("lib/team/onboarding.ts");

const full = {
  photoPath: "a.jpg",
  tagline: "Hi",
  bio: "About me",
  areas: ["Makati"],
  specialties: ["Condos"],
  languages: ["English"],
  yearsExperience: 3,
  hasPublicContact: true,
  hasFollowUpSettings: true,
  listingCount: 2,
  submittedOrApprovedListingCount: 1,
  subdomain: "chel",
  status: "approved",
};
const byId = (g, id) => g.steps.find((s) => s.id === id);

test("empty snapshot: nothing done, first step is next, optional steps excluded", () => {
  const g = buildOnboarding({});
  assert.equal(g.steps.length, 8);
  assert.deepEqual(g.steps.map((s) => s.id), ["portrait", "about", "details", "contact", "follow-ups", "listing", "share", "leads"]);
  assert.equal(g.done, 0);
  assert.equal(g.total, 6);
  assert.equal(g.nextStepId, "portrait");
  assert.equal(byId(g, "contact").state, "optional");
  assert.equal(byId(g, "leads").state, "optional");
  assert.equal(g.complete, false);
});

test("fully set up: all required done, no next step", () => {
  const g = buildOnboarding(full);
  assert.equal(g.done, 6);
  assert.equal(g.total, 6);
  assert.equal(g.complete, true);
  assert.equal(g.nextStepId, null);
  assert.equal(byId(g, "contact").state, "done");
});

test("optional contact step does not change the totals", () => {
  const g = buildOnboarding({ ...full, hasPublicContact: false });
  assert.equal(g.done, 6);
  assert.equal(g.total, 6);
  assert.equal(byId(g, "contact").state, "optional");
});

test("tagline alone is not enough for the About step; blank strings count as empty", () => {
  assert.equal(byId(buildOnboarding({ tagline: "x", bio: "  " }), "about").state, "todo");
  assert.equal(byId(buildOnboarding({ areas: [" "], specialties: ["a"], languages: ["b"] }), "details").state, "todo");
});

test("listing step: drafts do not count, submitted does", () => {
  const draft = buildOnboarding({ ...full, listingCount: 1, submittedOrApprovedListingCount: 0 });
  assert.equal(byId(draft, "listing").state, "todo");
  assert.equal(byId(draft, "listing").ctaLabel, "Finish and submit your listing");
  assert.equal(draft.nextStepId, "listing");
  assert.equal(byId(buildOnboarding({ ...full, listingCount: 0, submittedOrApprovedListingCount: 0 }), "listing").href, "/dashboard/specialist/listings/new");
});

test("share step links to the live page only when approved with a subdomain", () => {
  const live = byId(buildOnboarding(full), "share");
  assert.equal(live.state, "done");
  assert.equal(live.href, "https://chel.allabodeph.com");
  assert.deepEqual(live.links.map((l) => l.href), ["https://chel.allabodeph.com", "https://allabodeph.com/team/chel"]);
  const pending = byId(buildOnboarding({ ...full, status: "pending" }), "share");
  assert.equal(pending.links, undefined);
  const none = byId(buildOnboarding({ ...full, subdomain: null }), "share");
  assert.equal(none.state, "todo");
});

test("copy never uses the word agent and every step is complete", () => {
  for (const st of buildOnboarding(full).steps) {
    assert.ok(st.title && st.why && st.howLong && st.href && st.ctaLabel && st.detail.length >= 2);
    assert.doesNotMatch(JSON.stringify(st), /\bagents?\b/i);
  }
});
