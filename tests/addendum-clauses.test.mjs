import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function compile(relPath, rewrites = {}) {
  const source = fs.readFileSync(path.join(__dirname, "..", relPath), "utf8");
  let out = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  // The clause modules import each other through the "@/" path alias, which a
  // data: URL import can't resolve — swap each specifier for its compiled dep.
  for (const [specifier, url] of Object.entries(rewrites)) {
    out = out.replaceAll(`"${specifier}"`, `"${url}"`);
  }
  return `data:text/javascript;base64,${Buffer.from(out).toString("base64")}`;
}

async function loadAddendumClauses() {
  const amountWords = compile("lib/pm/amount-words.ts");
  const tenancyClauses = compile("lib/pm/tenancy-clauses.ts", {
    "@/lib/pm/amount-words": amountWords,
  });
  const addendumClauses = compile("lib/pm/addendum-clauses.ts", {
    "@/lib/pm/amount-words": amountWords,
    "@/lib/pm/tenancy-clauses": tenancyClauses,
  });
  return import(addendumClauses);
}

function baseTerms(overrides = {}) {
  return {
    parentType: "tenancy",
    parentSnapshot: {
      contractTitle: "Tenancy Agreement",
      referenceCode: "TA-1A2B3C4D",
      agreementDate: "2026-01-15",
      propertyDescription: "Unit 12B, Avida Tower",
    },
    effectiveDate: "2026-08-01",
    newStartDate: null,
    newEndDate: null,
    feeItems: [],
    partyChanges: [],
    amendedClauses: [],
    ...overrides,
  };
}

test("an addendum with no amendments prints only the six always-on sections", async () => {
  const m = await loadAddendumClauses();
  const t = baseTerms();
  const s = m.addendumSectionNumbers(t);

  assert.equal(s.term, null);
  assert.equal(s.fees, null);
  assert.equal(s.parties, null);
  assert.equal(s.provisions, null);
  // Ratification follows Effectivity directly when nothing optional is set.
  assert.deepEqual(
    [s.original, s.effectivity, s.ratification, s.conflict, s.entire, s.governingLaw],
    [1, 2, 3, 4, 5, 6],
  );

  const clauses = m.buildAddendumClauses(t);
  assert.equal(clauses.length, 6);
  assert.deepEqual(clauses.map((c) => c.no), [1, 2, 3, 4, 5, 6]);
  // No empty headings, and every clause carries content.
  for (const c of clauses) {
    assert.ok(c.title.length > 0, `clause ${c.no} has a title`);
    assert.ok(c.paras.length > 0, `clause ${c.no} has paragraphs`);
  }
});

test("a term-only addendum renumbers the trailing sections", async () => {
  const m = await loadAddendumClauses();
  const t = baseTerms({ newStartDate: "2026-08-01", newEndDate: "2027-07-31" });
  const s = m.addendumSectionNumbers(t);

  assert.equal(s.term, 3);
  assert.equal(s.fees, null);
  assert.equal(s.ratification, 4);
  assert.equal(s.governingLaw, 7);

  const clauses = m.buildAddendumClauses(t);
  assert.deepEqual(clauses.map((c) => c.no), [1, 2, 3, 4, 5, 6, 7]);
  const term = clauses.find((c) => c.no === 3);
  assert.equal(term.title, "AMENDMENT OF TERM");
  // Sub-clause numbers must track the section number, not a hardcoded 3.
  assert.equal(term.paras[0].sub, "3.1");
  assert.equal(term.paras[1].sub, "3.2");
  // Effectivity cross-references the term section by its actual number.
  const effectivity = clauses.find((c) => c.no === 2);
  assert.match(effectivity.paras[1].text, /Section 3 below/);
});

test("all four amendment kinds print in order with correct sub-numbering", async () => {
  const m = await loadAddendumClauses();
  const t = baseTerms({
    newStartDate: "2026-08-01",
    feeItems: [{ label: "Monthly rent", amount: 45000 }],
    partyChanges: [{ action: "add", role: "occupant", name: "Maria Santos" }],
    amendedClauses: [{ ref: "12.3", heading: "Utilities", mode: "replace", newText: "Water is for the Tenant's account." }],
  });
  const s = m.addendumSectionNumbers(t);

  assert.deepEqual([s.term, s.fees, s.parties, s.provisions], [3, 4, 5, 6]);
  assert.deepEqual([s.ratification, s.conflict, s.entire, s.governingLaw], [7, 8, 9, 10]);

  const clauses = m.buildAddendumClauses(t);
  assert.deepEqual(clauses.map((c) => c.no), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

  const fees = clauses.find((c) => c.no === 4);
  assert.deepEqual(fees.paras.map((p) => p.sub), ["4.1", "4.2", "4.3", "4.4"]);
  // The total is spelled out in words and figures.
  assert.match(fees.paras[1].text, /Forty Five Thousand/);
  assert.match(fees.paras[1].text, /45,000\.00/);

  // Each amended provision gets its own numbered sub-clause after the lead-in.
  const provisions = clauses.find((c) => c.no === 6);
  assert.deepEqual(provisions.paras.map((p) => p.sub), ["6.1", "6.2"]);
  assert.equal(provisions.paras[1].subTitle, "Section 12.3 (Utilities).");
  assert.match(provisions.paras[1].text, /deleted in its entirety and replaced/);
});

test("party change wording differs by action", async () => {
  const m = await loadAddendumClauses();
  const t = baseTerms({
    partyChanges: [
      { action: "add", role: "occupant", name: "Ana Cruz" },
      { action: "remove", role: "occupant", name: "Ben Reyes" },
      { action: "substitute", role: "tenant", name: "Carla Lim", outgoingName: "Dino Tan" },
    ],
  });
  const parties = m.buildAddendumClauses(t).find((c) => c.no === m.addendumSectionNumbers(t).parties);
  const lines = parties.paras[0].numbered.map((n) => n.text);

  assert.match(lines[0], /Ana Cruz is hereby added as a registered occupant/);
  assert.match(lines[1], /Ben Reyes is hereby removed as a registered occupant/);
  assert.match(lines[1], /without prejudice to any liability accrued before it/);
  assert.match(lines[2], /Dino Tan is hereby substituted by Carla Lim as a registered tenant/);
});

test("a PM-agreement addendum uses Owner/Manager, never Tenant/Landlord", async () => {
  const m = await loadAddendumClauses();
  const roles = m.addendumRoles("pm");
  assert.deepEqual(roles, { counterparty: "Owner", principal: "Manager" });

  const t = baseTerms({
    parentType: "pm",
    parentSnapshot: { contractTitle: "Property Management Agreement", referenceCode: "AGMT-9F8E7D6C" },
    feeItems: [{ label: "Management fee", amount: 5000 }],
  });
  const recital = m.buildAddendumRecital(t, { name: "All Abode" }, { name: "Juan Dela Cruz" }, "2026-08-01");
  assert.match(recital.landlordLine, /"MANAGER"/);
  assert.match(recital.tenantLine, /"OWNER"/);
  assert.ok(!recital.tenantLine.includes("TENANT"));

  const fees = m.buildAddendumClauses(t).find((c) => c.no === m.addendumSectionNumbers(t).fees);
  assert.match(fees.paras[3].text, /Owner's account/);
  assert.ok(!fees.paras[3].text.includes("Tenant"));

  // Tenant-side parents keep the Landlord/Tenant register.
  assert.deepEqual(m.addendumRoles("tenancy"), { counterparty: "Tenant", principal: "Landlord" });
});

test("the recital identifies the parent contract by title, date and reference", async () => {
  const m = await loadAddendumClauses();
  const t = baseTerms();
  const recital = m.buildAddendumRecital(t, { name: "Jose Rizal" }, { name: "Andres Bonifacio" }, "2026-08-01");

  assert.equal(recital.opener, "KNOW ALL MEN BY THESE PRESENTS:");
  assert.match(recital.intro, /1st day of August 2026/);
  assert.match(recital.whereas[0], /Tenancy Agreement dated January 15, 2026/);
  assert.match(recital.whereas[0], /TA-1A2B3C4D/);
  assert.match(recital.whereas[0], /Unit 12B, Avida Tower/);
  assert.match(recital.whereas[1], /remains in full force and effect/);

  // Section 1 restates the same identity as fielded lines.
  const original = m.buildAddendumClauses(t)[0];
  assert.deepEqual(original.paras[0].fields, [
    ["ORIGINAL AGREEMENT", "Tenancy Agreement"],
    ["DATE EXECUTED", "January 15, 2026"],
    ["REFERENCE NUMBER", "TA-1A2B3C4D"],
    ["PROPERTY", "Unit 12B, Avida Tower"],
  ]);
});

test("an uploaded parent says so in the recital, and changes nothing else", async () => {
  const m = await loadAddendumClauses();
  const uploaded = baseTerms({
    parentSnapshot: { ...baseTerms().parentSnapshot, referenceCode: "", source: "uploaded" },
  });
  const recital = m.buildAddendumRecital(uploaded, { name: "Jose Rizal" }, { name: "Andres Bonifacio" }, "2026-08-01");

  assert.match(recital.whereas[0], /a copy of which is on file with the Company/);
  assert.match(recital.whereas[0], /Tenancy Agreement dated January 15, 2026/);
  // An off-system contract often carries no reference number of its own — it
  // must print a blank line, not "undefined".
  assert.ok(!JSON.stringify(recital).includes("undefined"));

  // A system parent keeps the original wording, ending at the defined term.
  const system = baseTerms();
  const systemRecital = m.buildAddendumRecital(system, { name: "Jose Rizal" }, { name: "Andres Bonifacio" }, "2026-08-01");
  assert.ok(!systemRecital.whereas[0].includes("on file with the Company"));
  assert.match(systemRecital.whereas[0], /\(the "Original Agreement"\);$/);
});

test("provenance does not affect section numbering or Section 1", async () => {
  const m = await loadAddendumClauses();
  const overrides = {
    newStartDate: "2026-08-01",
    feeItems: [{ label: "Monthly rent", amount: 45000 }],
    partyChanges: [{ action: "add", role: "occupant", name: "Maria Santos" }],
    amendedClauses: [{ ref: "12.3", heading: "Utilities", mode: "replace", newText: "Water is for the Tenant's account." }],
  };
  const system = baseTerms(overrides);
  const uploaded = baseTerms({
    ...overrides,
    parentSnapshot: { ...baseTerms().parentSnapshot, source: "uploaded" },
  });

  assert.deepEqual(m.addendumSectionNumbers(uploaded), m.addendumSectionNumbers(system));
  assert.deepEqual(
    m.buildAddendumClauses(uploaded),
    m.buildAddendumClauses(system),
    "the clause body is identical regardless of where the parent came from",
  );
});

test("missing values fall back to blanks rather than printing undefined", async () => {
  const m = await loadAddendumClauses();
  const t = baseTerms({ parentSnapshot: {}, effectiveDate: null });
  const recital = m.buildAddendumRecital(t, {}, {}, null);

  assert.ok(!JSON.stringify(recital).includes("undefined"));
  assert.match(recital.intro, /____ day of ____________ 20__/);

  const clauses = m.buildAddendumClauses(t);
  assert.ok(!JSON.stringify(clauses).includes("undefined"));
  // Parent title falls back to the type's canonical name.
  assert.equal(clauses[0].paras[0].fields[0][1], "Tenancy Agreement");
});
