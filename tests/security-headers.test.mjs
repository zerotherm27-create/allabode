import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function loadNextConfig() {
  const file = path.join(__dirname, "..", "next.config.ts");
  const source = fs.readFileSync(file, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const m = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
  return m.default;
}

test("X-Frame-Options must stay SAMEORIGIN, not DENY", async () => {
  // The invoice/statement/document-preview pages embed the app's own PDF
  // routes in an <iframe>. DENY blocks same-origin framing too, which
  // breaks those previews (they render as a blocked/refused-to-connect
  // frame) even though the PDF itself is fine.
  const config = await loadNextConfig();
  const rules = await config.headers();
  const baseline = rules.find((r) => r.source === "/(.*)");
  const frameOptions = baseline?.headers.find((h) => h.key === "X-Frame-Options");
  assert.equal(frameOptions?.value, "SAMEORIGIN");
});
