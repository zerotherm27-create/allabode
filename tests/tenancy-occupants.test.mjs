import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function loadTenancyClausesModule() {
  const file = path.join(__dirname, "..", "lib", "pm", "tenancy-clauses.ts");
  const source = fs.readFileSync(file, "utf8").replace(
    'import { numberToWords, pesoAmountFigures } from "@/lib/pm/amount-words";',
    'const numberToWords = (value) => String(value); const pesoAmountFigures = (value) => String(value);',
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
}

const baseTerms = {
  propertyDetails: {},
  leaseMonths: null,
  leaseStartDate: null,
  leaseEndDate: null,
  rentAmount: null,
  rentAmountWords: null,
  advanceDepositAmount: null,
  advanceDepositWords: null,
  depositAmount: null,
  depositAmountWords: null,
  rentDueDay: null,
};

test("tenancy occupant clause renders only named occupants", async () => {
  const { buildTenancyClausesAfterTables } = await loadTenancyClausesModule();

  const clauses = buildTenancyClausesAfterTables({
    ...baseTerms,
    occupants: ["Tenant", "Partner"],
  });
  const occupantClause = clauses.find((clause) => clause.no === 5);
  const lines = occupantClause?.paras[0]?.numbered ?? [];

  assert.deepEqual(lines.map((line) => line.text), ["Tenant", "Partner"]);
});

test("tenancy occupant clause renders one blank line when no occupants are named", async () => {
  const { buildTenancyClausesAfterTables, BLANK } = await loadTenancyClausesModule();

  const clauses = buildTenancyClausesAfterTables({
    ...baseTerms,
    occupants: [],
  });
  const occupantClause = clauses.find((clause) => clause.no === 5);
  const lines = occupantClause?.paras[0]?.numbered ?? [];

  assert.deepEqual(lines.map((line) => line.text), [BLANK]);
});

test("additional occupants must each have an uploaded ID", async () => {
  const file = path.join(__dirname, "..", "lib", "signing", "form-helpers.ts");
  const compiled = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const { missingAdditionalOccupantIdNames } = await import(
    `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
  );
  const up = (occupantIndex) => ({ occupantIndex, occupantName: "x", path: "p" });

  assert.deepEqual(missingAdditionalOccupantIdNames(["Tenant", "Partner"], []), ["Partner"]);
  assert.deepEqual(missingAdditionalOccupantIdNames(["Tenant", "", "Child"], [up(1)]), ["Child"]);
  assert.deepEqual(missingAdditionalOccupantIdNames(["Tenant", "", "Child"], [up(2)]), []);
  assert.deepEqual(missingAdditionalOccupantIdNames(["Tenant"], []), []);
});
