import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./helpers/load-ts.mjs";

const { specialistProfileSchema } = await loadTs("lib/team/profile-schema.ts");

const base = {
  base: "https://allabodeph.com",
  slug: "jojo",
  name: "Jojo Cruzado",
  description: "Property guidance across Makati",
  photoUrl: "https://cdn.example/portrait.jpg",
  areas: ["Makati"],
  specialties: ["Leasing"],
  languages: ["English", "Filipino"],
  sameAs: ["https://facebook.com/jojo", "https://www.linkedin.com/in/jojo"],
  companyName: "All Abode Property Solutions",
};

test("ProfilePage with a Person pointing at the canonical URL", () => {
  const s = specialistProfileSchema(base);
  assert.equal(s["@type"], "ProfilePage");
  assert.equal(s.url, "https://allabodeph.com/team/jojo");
  assert.equal(s.mainEntity["@type"], "Person");
  assert.equal(s.mainEntity.worksFor.name, "All Abode Property Solutions");
  assert.deepEqual(s.mainEntity.knowsLanguage, ["English", "Filipino"]);
  assert.equal(s.mainEntity.image, base.photoUrl);
});

test("leaves out empty fields and non-https links, and never carries contact details", () => {
  const s = specialistProfileSchema({
    ...base,
    photoUrl: null,
    areas: [],
    specialties: [],
    languages: [],
    sameAs: ["http://insecure.example", null, undefined, "javascript:alert(1)"],
  });
  const p = s.mainEntity;
  for (const k of ["image", "areaServed", "knowsAbout", "knowsLanguage", "sameAs"]) assert.equal(k in p, false, k);
  const json = JSON.stringify(s);
  assert.doesNotMatch(json, /email|telephone|license/i);
});
