import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadListingCategoryModule() {
  const file = path.join(__dirname, "..", "lib", "listing-category.ts");
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

test("combined listing category matches sale and rent markets", async () => {
  const { listingMarkets, listingMatchesMarket } = await loadListingCategoryModule();

  assert.deepEqual(listingMarkets("For Sale and For Lease"), ["For Sale", "For Rent"]);
  assert.equal(listingMatchesMarket("For Sale and For Lease", "For Sale"), true);
  assert.equal(listingMatchesMarket("For Sale and For Lease", "For Rent"), true);
});

test("listing category labels and filters stay user friendly", async () => {
  const { listingStatusLabel, listingTypeLabels } = await loadListingCategoryModule();

  assert.equal(listingStatusLabel("For Lease"), "For Rent");
  assert.equal(listingStatusLabel("For Sale and For Lease"), "For Sale & For Rent");
  assert.deepEqual(listingTypeLabels("For Sale and For Lease", "Long-term"), ["For Sale", "Long-term"]);
});
