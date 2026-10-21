import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./helpers/load-ts.mjs";

const {
  composeIntro,
  joinList,
  aboutFacts,
  aboutIntro,
  aboutParagraphs,
  HERO_COPY,
  ABOUT_COPY,
  ABOUT_VALUES,
  FIRM_COPY,
  LISTINGS_COPY,
  CTA_COPY,
  CONTACT_COPY,
} = await loadTs("lib/team/profile-copy.ts");

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

test("aboutFacts is empty without facts and first-person with them", () => {
  assert.equal(aboutFacts(base), "");
  assert.equal(
    aboutFacts({ ...base, areas: ["Makati", "BGC"], specialties: ["leasing"] }),
    "I work across Makati and BGC, helping clients with leasing.",
  );
  assert.equal(aboutFacts({ ...base, specialties: ["selling"] }), "I help clients with selling.");
  assert.equal(
    aboutFacts({ ...base, yearsExperience: 1, languages: ["English"] }),
    "I have 1 year of experience in real estate and work in English.",
  );
  assert.equal(aboutFacts({ ...base, languages: ["English", "Filipino"] }), "I work in English and Filipino.");
  assert.equal(aboutFacts({ ...base, yearsExperience: 0 }), "");
});

test("aboutParagraphs uses the bio when present, split on blank lines", () => {
  assert.deepEqual(aboutParagraphs({ ...base, bio: "  First.\n\n Second line\nwraps. \n\n\n" }), [
    "First.",
    "Second line\nwraps.",
  ]);
});

test("aboutParagraphs falls back to the default intro and goal, adding facts when known", () => {
  const sparse = aboutParagraphs({ ...base, bio: null });
  assert.equal(sparse.length, 2);
  assert.equal(sparse[0], aboutIntro("Maria Santos"));
  assert.match(sparse[0], /^I'm Maria Santos, an accredited real estate salesperson with All Abode PH\./);
  assert.equal(sparse[1], ABOUT_COPY.goal);
  const rich = aboutParagraphs({ ...base, bio: "   ", areas: ["Makati"] });
  assert.match(rich[0], /investing\. I work across Makati\.$/);
});

test("microsite copy has no figures, broker names, licence numbers or 'agent' wording", () => {
  const strings = [
    ...Object.values(HERO_COPY),
    ...Object.values(ABOUT_COPY),
    ...ABOUT_VALUES.flatMap((v) => [v.title, v.body]),
    FIRM_COPY.eyebrow,
    FIRM_COPY.heading,
    FIRM_COPY.body,
    ...FIRM_COPY.services.flatMap((v) => [v.title, v.body]),
    ...Object.values(LISTINGS_COPY),
    ...Object.values(CTA_COPY),
    ...Object.values(CONTACT_COPY),
    aboutIntro("Maria Santos"),
  ];
  for (const text of strings) {
    assert.doesNotMatch(text, /\d/);
    assert.doesNotMatch(text, /\bbroker\b|licen[cs]e no|\bagents?\b/i);
  }
  assert.equal(ABOUT_VALUES.length, 3);
  assert.equal(FIRM_COPY.services.length, 4);
  for (const svc of FIRM_COPY.services) assert.match(svc.path, /^\/[a-z-/]+$/);
});
