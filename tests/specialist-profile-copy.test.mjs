import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./helpers/load-ts.mjs";

const { composeIntro, joinList, PROCESS_STEPS, FIRM_POINTS } = await loadTs("lib/team/profile-copy.ts");

const base = { name: "Maria Santos", areas: [], specialties: [], languages: [], yearsExperience: null };

test("joinList uses a serial comma", () => {
  assert.equal(joinList([]), "");
  assert.equal(joinList(["Makati"]), "Makati");
  assert.equal(joinList(["Makati", "BGC"]), "Makati and BGC");
  assert.equal(joinList(["Makati", "BGC", "Rockwell"]), "Makati, BGC, and Rockwell");
});

test("composeIntro with only a name is still a full sentence", () => {
  assert.equal(composeIntro(base), "Maria Santos is a property specialist with All Abode Property Solutions.");
});

test("composeIntro includes areas and specialties when present", () => {
  assert.equal(
    composeIntro({ ...base, areas: ["Makati", "BGC"], specialties: ["leasing"] }),
    "Maria Santos is a property specialist with All Abode Property Solutions, working across Makati and BGC and helping clients with leasing.",
  );
  assert.match(composeIntro({ ...base, specialties: ["selling"] }), /Solutions, helping clients with selling\.$/);
});

test("composeIntro adds years and languages as a second sentence, omitting what is missing", () => {
  assert.match(
    composeIntro({ ...base, yearsExperience: 7, languages: ["English", "Filipino"] }),
    /\. Maria has 7 years of experience in real estate and works in English and Filipino\.$/,
  );
  assert.match(composeIntro({ ...base, yearsExperience: 1 }), /Maria has 1 year of experience in real estate\.$/);
  assert.match(composeIntro({ ...base, languages: ["English"] }), /Maria works in English\.$/);
  assert.doesNotMatch(composeIntro({ ...base, yearsExperience: 0 }), /experience/);
});

test("firm-level copy has no figures, broker names or licence numbers", () => {
  assert.equal(PROCESS_STEPS.length, 4);
  for (const { title, body } of [...PROCESS_STEPS, ...FIRM_POINTS]) {
    assert.doesNotMatch(`${title} ${body}`, /\d/);
    assert.doesNotMatch(`${title} ${body}`, /broker\b|licen[cs]e no/i);
  }
});
