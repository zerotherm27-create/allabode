import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function loadApplianceBrandCatalogModule() {
  const file = path.join(__dirname, "..", "lib", "pm", "appliance-brand-catalog.ts");
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

test("appliance brand catalog maps free-text particulars to useful categories", async () => {
  const { applianceCategoryForParticulars } = await loadApplianceBrandCatalogModule();

  assert.equal(applianceCategoryForParticulars("Aircon"), "air_conditioner");
  assert.equal(applianceCategoryForParticulars("Kitchen refrigerator"), "refrigerator");
  assert.equal(applianceCategoryForParticulars("Smart TV"), "television");
  assert.equal(applianceCategoryForParticulars("Unknown item"), "others");
});

test("appliance brand catalog returns curated fallback brand options", async () => {
  const { applianceBrandOptionsForParticulars, DEFAULT_APPLIANCE_BRAND_OPTIONS } = await loadApplianceBrandCatalogModule();

  assert.ok(applianceBrandOptionsForParticulars(DEFAULT_APPLIANCE_BRAND_OPTIONS, "Aircon").includes("Carrier"));
  assert.ok(applianceBrandOptionsForParticulars(DEFAULT_APPLIANCE_BRAND_OPTIONS, "Rice cooker").includes("Panasonic"));
  assert.ok(applianceBrandOptionsForParticulars(DEFAULT_APPLIANCE_BRAND_OPTIONS, "Random appliance").includes("Samsung"));
});
