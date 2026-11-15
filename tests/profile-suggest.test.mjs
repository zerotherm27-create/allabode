import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const { suggestTagline, suggestBio, suggestBioHeadlines, profileChecklist } = await loadTs("lib/team/profile-suggest.ts");

const GENDERED =
  /\b(he|she|his|hers?|him|himself|herself|mr|mrs|ms|miss|sir|madam|ma'am|salesman|saleswoman|spokesman|spokesperson|chairman|businessman|gentleman|lady|guys?|man|woman|men|women)\b/i;

const long = (n, w = 60) => Array.from({ length: n }, (_, i) => `Place${i}`.padEnd(w, "x"));
const lists = [[], ["Makati"], ["Makati", "BGC"], ["Makati", "BGC", "Ortigas"], long(20)];
const names = ["", "Maria Santos", "Alex", "  Jo   Cruz  ", "x".repeat(120)];
const years = [null, undefined, 0, 1, 12, 80];

function* combos() {
  for (const name of names)
    for (const areas of lists)
      for (const specialties of lists)
        for (const languages of lists)
          for (const y of years) yield { name, areas, specialties, languages, years: y };
}

test("no gendered words and caps across many inputs", () => {
  let n = 0;
  for (const c of combos()) {
    const t = suggestTagline(c);
    const b = suggestBio(c);
    assert.ok(t.length > 0 && t.length <= 140, `tagline length ${t.length}`);
    assert.ok(b.length > 0 && b.length <= 2000, `bio length ${b.length}`);
    assert.doesNotMatch(t, GENDERED);
    assert.doesNotMatch(b, GENDERED);
    n++;
  }
  assert.ok(n > 1000);
});

test("bio never states English or Filipino, but still names other languages", () => {
  for (const languages of [["English"], ["Filipino"], ["English", "Filipino"], ["Tagalog", " english "]]) {
    const b = suggestBio({ name: "A", years: 5, languages });
    assert.doesNotMatch(b, /English|Filipino|Tagalog|speak/i);
  }
  const mixed = suggestBio({ name: "A", languages: ["English", "Mandarin", "Filipino"] });
  assert.match(mixed, /I also speak Mandarin\./);
  assert.doesNotMatch(mixed, /English|Filipino/);
});

test("tagline", () => {
  assert.equal(suggestTagline({ areas: [], specialties: [] }), "Your partner in finding the right space");
  assert.equal(suggestTagline({ areas: ["Makati", "BGC"] }), "Property guidance across Makati and BGC");
  assert.equal(suggestTagline({ specialties: ["Leasing"] }), "Helping clients with Leasing");
});

test("bio includes sentences only when data exists, and never invents years", () => {
  const empty = suggestBio({ name: "Maria Santos" });
  assert.match(empty, /I'm Maria,/);
  assert.doesNotMatch(empty, /year|work with clients|speak|help clients/);
  assert.doesNotMatch(suggestBio({ name: "A", years: 0 }), /year/);
  assert.match(suggestBio({ name: "A", years: 1 }), /1 year of experience/);
  assert.match(suggestBio({ name: "A", years: 5, languages: ["Mandarin", "Cebuano"] }), /5 years of experience in real estate\. I also speak Mandarin and Cebuano\./);
  const full = suggestBio({ name: "A", areas: ["Makati"], specialties: ["Leasing"] });
  assert.match(full, /I help clients with Leasing across Makati\./);
  assert.equal(full.split("\n\n").length, 2);
  assert.doesNotMatch(suggestBio({}), /undefined|null/);
});

test("profileChecklist", () => {
  const none = profileChecklist({});
  assert.equal(none.done, 0);
  assert.equal(none.total, 6);
  assert.equal(none.complete, false);
  const some = profileChecklist({ photoPath: "a/portrait.jpg", tagline: "  ", bio: "x", areas: ["", " "], specialties: ["A"] });
  assert.deepEqual(some.items.filter((i) => i.done).map((i) => i.key), ["photo", "bio", "specialties"]);
  const all = profileChecklist({ photoPath: "p", tagline: "t", bio: "b", areas: ["a"], specialties: ["s"], languages: ["l"] });
  assert.equal(all.complete, true);
});

test("bio headline suggestions: capped, unique, gender-neutral, always four", () => {
  for (const c of combos()) {
    const hs = suggestBioHeadlines(c);
    assert.equal(hs.length, 4);
    assert.equal(new Set(hs.map((h) => h.toLowerCase())).size, 4);
    for (const h of hs) {
      assert.ok(h.length > 0 && h.length <= 80, `headline length ${h.length}`);
      assert.doesNotMatch(h, GENDERED);
      assert.doesNotMatch(h, /[\u2013\u2014]/);
    }
  }
});

test("bio headline suggestions use only the specialist's own data", () => {
  const bare = suggestBioHeadlines({});
  assert.equal(bare[0], "Real estate guidance with a personal touch");
  assert.ok(bare.every((h) => !/\d/.test(h)));
  const rich = suggestBioHeadlines({ name: "Maria Santos", areas: ["Makati", "BGC"], specialties: ["leasing"], years: 7 });
  assert.equal(rich[0], "Your guide to property in Makati and BGC");
  assert.ok(rich.includes("Straight answers on leasing"));
  assert.ok(rich.includes("7 years of helping clients find the right place"));
  assert.ok(!suggestBioHeadlines({ years: 0 }).some((h) => /\d/.test(h)));
  assert.ok(suggestBioHeadlines({ years: 1 }).some((h) => h.startsWith("1 year of")));
});
