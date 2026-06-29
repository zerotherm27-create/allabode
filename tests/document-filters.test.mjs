import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadDocumentFiltersModule() {
  const file = path.join(__dirname, "..", "lib", "portal", "document-filters.ts");
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

test("filters documents by month and year", async () => {
  const { filterByMonthYear } = await loadDocumentFiltersModule();
  const docs = [
    { id: "jan-2026", date: "2026-01-31" },
    { id: "feb-2026", date: "2026-02-28" },
    { id: "jan-2025", date: "2025-01-31" },
  ];

  assert.deepEqual(
    filterByMonthYear(docs, (doc) => doc.date, "01", "2026").map((doc) => doc.id),
    ["jan-2026"],
  );
});

test("archives documents by year newest first", async () => {
  const { archiveByYear } = await loadDocumentFiltersModule();
  const docs = [
    { id: "old", date: "2025-12-31" },
    { id: "new", date: "2026-01-31" },
  ];

  assert.deepEqual(
    archiveByYear(docs, (doc) => doc.date).map((group) => [group.year, group.items.map((doc) => doc.id)]),
    [["2026", ["new"]], ["2025", ["old"]]],
  );
});
