import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const {
  ACCREDITATION_LABEL,
  ACCREDITATION_LABELS,
  ACCREDITATION_TYPES,
  accreditationLabel,
  parseAccreditation,
  specialistTitleLine,
  storedDesignation,
  validateTitle,
  DESIGNATION_MAX,
} = await loadTs("lib/team/license.ts");

test("the default accreditation is the fixed salesperson label", () => {
  assert.equal(ACCREDITATION_LABEL, "Accredited real estate salesperson");
  assert.equal(specialistTitleLine(), ACCREDITATION_LABEL);
  assert.equal(specialistTitleLine(null), ACCREDITATION_LABEL);
  assert.equal(specialistTitleLine("nonsense"), ACCREDITATION_LABEL);
});

test("each accreditation type has its own label", () => {
  assert.equal(accreditationLabel("sales_partner"), "Accredited sales partner");
  assert.equal(accreditationLabel("marketing_partner"), "Accredited marketing partner");
  assert.equal(parseAccreditation("sales_partner"), "sales_partner");
  assert.equal(parseAccreditation(undefined), "salesperson");
});

test("no label names a broker or a licence number", () => {
  for (const t of ACCREDITATION_TYPES) {
    assert.doesNotMatch(ACCREDITATION_LABELS[t], /broker|PRC|Lic\.|\d/i);
  }
});

test("storedDesignation trims, collapses spaces and treats blanks as none", () => {
  assert.equal(storedDesignation("  Senior   Property Consultant "), "Senior Property Consultant");
  assert.equal(storedDesignation("   "), null);
  assert.equal(storedDesignation(null), null);
  assert.equal(storedDesignation(42), null);
});

test("validateTitle accepts a custom designation and one of three accreditations", () => {
  const r = validateTitle({ designation: " Marketing  Partner ", accreditation: "marketing_partner" });
  assert.deepEqual(r, { ok: true, value: { designation: "Marketing Partner", accreditation: "marketing_partner" } });
  const blank = validateTitle({ designation: "", accreditation: "salesperson" });
  assert.deepEqual(blank, { ok: true, value: { designation: null, accreditation: "salesperson" } });
});

test("validateTitle rejects an unknown accreditation, an over-long or markup designation", () => {
  assert.equal(validateTitle({ designation: "", accreditation: "broker" }).ok, false);
  assert.equal(validateTitle({ designation: "", accreditation: undefined }).ok, false);
  const long = validateTitle({ designation: "x".repeat(DESIGNATION_MAX + 1), accreditation: "salesperson" });
  assert.ok(!long.ok && long.errors.designation);
  const markup = validateTitle({ designation: "<b>Boss</b>", accreditation: "salesperson" });
  assert.ok(!markup.ok && markup.errors.designation);
});
