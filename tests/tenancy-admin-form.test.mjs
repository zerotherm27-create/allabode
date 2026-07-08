import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function loadTenancyAdminFormModule() {
  const file = path.join(__dirname, "..", "lib", "tenancy", "admin-form.ts");
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

test("admin tenancy form starts with one occupant slot", async () => {
  const { adminOccupantsInitial } = await loadTenancyAdminFormModule();

  assert.deepEqual(adminOccupantsInitial(null), [""]);
  assert.deepEqual(adminOccupantsInitial(["Tenant", "", "Partner"]), ["Tenant", "Partner"]);
});

test("admin tenancy form parses only filled inventory rows", async () => {
  const { parseInventoryJson } = await loadTenancyAdminFormModule();

  assert.deepEqual(
    parseInventoryJson(JSON.stringify([
      { quantity: "1", particulars: "Aircon", brand: "Daikin", remarks: "Clean" },
      { quantity: "2", particulars: "   ", brand: "Ignored", remarks: "Ignored" },
      { quantity: "", particulars: "Keys", brand: "", remarks: "" },
    ])),
    [
      { quantity: "1", particulars: "Aircon", brand: "Daikin", remarks: "Clean" },
      { quantity: "", particulars: "Keys", brand: "", remarks: "" },
    ],
  );
});
