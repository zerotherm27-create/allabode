import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function load() {
  const source = fs.readFileSync(path.join(__dirname, "..", "lib/pm/authority-to-sell-clauses.ts"), "utf8");
  const out = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(out).toString("base64")}`);
}

const property = { propertyType: "Condominium", location: "Makati City", titleNo: "CCT-123", area: "45 sqm" };
const terms = {
  authorityType: "exclusive",
  grossPrice: "5000000",
  minPrice: "4800000",
  paymentTerms: ["cash", "others"],
  paymentOther: "Pag-IBIG",
  commissionPct: "5",
  periodLength: "6",
  periodUnit: "months",
  periodStart: "2026-11-01",
  periodEnd: "2027-04-30",
  protectionDays: "90",
  terminationNoticeDays: "30",
  executionPlace: "Makati City",
};

const text = (sections) =>
  sections.map((s) => [s.heading, ...s.blocks.map((b) => JSON.stringify(b))].join("\n")).join("\n");

test("broker details are the fixed company defaults", async () => {
  const { BROKER, DEFAULT_COMMISSION_PCT } = await load();
  assert.equal(BROKER.prcLicenseNo, "0035712");
  assert.equal(BROKER.ptrNo, "2948777");
  assert.equal(BROKER.dhsudRegNo, "NCR-B-10104");
  assert.equal(BROKER.contactNo, "0993 523 4099");
  assert.equal(DEFAULT_COMMISSION_PCT, 5);
});

test("builds all 11 numbered sections in order", async () => {
  const { buildAtsSections } = await load();
  const sections = buildAtsSections(property, terms);
  assert.equal(sections.length, 11);
  sections.forEach((s, i) => assert.ok(s.heading.startsWith(`${i + 1}. `)));
});

test("fills in the owner's terms", async () => {
  const { buildAtsSections } = await load();
  const t = text(buildAtsSections(property, terms));
  assert.match(t, /Gross Selling Price: PHP 5,000,000/);
  assert.match(t, /Minimum Acceptable Price \(if applicable\): PHP 4,800,000/);
  assert.match(t, /5% of the Gross Selling Price/);
  assert.match(t, /6 months, commencing on November 1, 2026 and ending on April 30, 2027/);
  assert.match(t, /protection period of 90 days/);
  assert.match(t, /By either party with 30 days written notice/);
  assert.match(t, /Others: Pag-IBIG/);
});

test("only the chosen authority type is checked", async () => {
  const { buildAtsSections } = await load();
  const authority = buildAtsSections(property, terms)[2].blocks.find((b) => b.type === "checks");
  assert.deepEqual(authority.items.map((i) => i.checked), [true, false]);
  const other = buildAtsSections(property, { ...terms, authorityType: "non_exclusive" })[2].blocks.find((b) => b.type === "checks");
  assert.deepEqual(other.items.map((i) => i.checked), [false, true]);
});

test("payment term checkboxes follow the selection", async () => {
  const { buildAtsSections } = await load();
  const checks = buildAtsSections(property, terms)[3].blocks.find((b) => b.type === "checks");
  assert.deepEqual(checks.items.map((i) => i.checked), [true, false, false, true]);
});

test("empty terms keep printable blanks", async () => {
  const { buildAtsSections } = await load();
  const t = text(buildAtsSections({}, {}));
  assert.match(t, /Gross Selling Price: PHP __________/);
  assert.match(t, /_____% of the Gross Selling Price/);
});

test("atsTermsError flags each missing requirement", async () => {
  const { atsTermsError } = await load();
  assert.equal(atsTermsError(property, terms, "2026-10-24"), null);
  assert.match(atsTermsError({}, terms, "2026-10-24"), /property type/);
  assert.match(atsTermsError(property, { ...terms, authorityType: "" }, "2026-10-24"), /type of authority/);
  assert.match(atsTermsError(property, { ...terms, grossPrice: "" }, "2026-10-24"), /gross selling price/);
  assert.match(atsTermsError(property, { ...terms, paymentTerms: [] }, "2026-10-24"), /payment term/);
  assert.match(atsTermsError(property, { ...terms, commissionPct: "0" }, "2026-10-24"), /commission/);
  assert.match(atsTermsError(property, { ...terms, periodEnd: "2026-01-01" }, "2026-10-24"), /end after/);
  assert.match(atsTermsError(property, terms, null), /signing date/);
});
