import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const { ACCREDITATION_LABEL, specialistTitleLine } = await loadTs("lib/team/license.ts");

test("every specialist shows the fixed accreditation label", () => {
  assert.equal(ACCREDITATION_LABEL, "Accredited real estate salesperson");
  assert.equal(specialistTitleLine(), ACCREDITATION_LABEL);
});

test("the label names no broker and no licence number", () => {
  assert.doesNotMatch(specialistTitleLine(), /broker|PRC|Lic\.|\d/i);
});
