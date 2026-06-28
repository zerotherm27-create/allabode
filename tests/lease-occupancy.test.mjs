import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadLeaseOccupancyModule() {
  const file = path.join(__dirname, "..", "lib", "pm", "lease-occupancy.ts");
  const source = fs.readFileSync(file, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
}

test("active leases mark their unit occupied", async () => {
  const { leaseOccupiesUnit } = await loadLeaseOccupancyModule();

  assert.equal(leaseOccupiesUnit("active"), true);
  assert.equal(leaseOccupiesUnit("draft"), false);
  assert.equal(leaseOccupiesUnit("ended"), false);
});

test("lease changes resync old and new units without duplicates", async () => {
  const { unitIdsToResyncForLeaseChange } = await loadLeaseOccupancyModule();

  assert.deepEqual(
    unitIdsToResyncForLeaseChange({ previousUnitId: "unit-a", nextUnitId: "unit-b" }),
    ["unit-a", "unit-b"],
  );
  assert.deepEqual(
    unitIdsToResyncForLeaseChange({ previousUnitId: "unit-a", nextUnitId: "unit-a" }),
    ["unit-a"],
  );
  assert.deepEqual(
    unitIdsToResyncForLeaseChange({ previousUnitId: null, nextUnitId: "unit-b" }),
    ["unit-b"],
  );
});
