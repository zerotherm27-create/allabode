import test from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./helpers/load-ts.mjs";

const { parseProperty } = await loadTs("lib/leads/property-message.ts");

test("splits bold labels into facts and ## into sections with bullets", () => {
  const p = parseProperty(
    "**Location:** Chimes Greenhills, San Juan **Floor:** 37th floor **Bedrooms:** 2\n## Building Amenities\nResidents enjoy:\n* Gym\n* Pool\n## Location Highlights\n* Near mall",
  );
  assert.deepEqual(p.facts.map((f) => [f.label, f.value]), [
    ["Location", "Chimes Greenhills, San Juan"],
    ["Floor", "37th floor"],
    ["Bedrooms", "2"],
  ]);
  assert.equal(p.sections[0].title, "Building Amenities");
  assert.equal(p.sections[0].text, "Residents enjoy:");
  assert.deepEqual(p.sections[0].items, ["Gym", "Pool"]);
  assert.deepEqual(p.sections[1].items, ["Near mall"]);
});

test("plain text stays an intro and empty input is safe", () => {
  assert.equal(parseProperty("Nice 2BR near the mall").intro, "Nice 2BR near the mall");
  assert.deepEqual(parseProperty(null), { facts: [], intro: "", sections: [] });
});

test("whitespace-collapsed bullets still split", () => {
  const p = parseProperty("Intro ## Amenities Pool * Gym * Sky lounge");
  assert.deepEqual(p.sections[0].items, ["Gym", "Sky lounge"]);
});
