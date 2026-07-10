import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadDeleteErrorsModule() {
  const file = path.join(__dirname, "..", "lib", "admin", "delete-errors.ts");
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

test("owner delete errors explain related records must be removed first", async () => {
  const { blockedDeleteMessage } = await loadDeleteErrorsModule();

  assert.equal(
    blockedDeleteMessage("owners"),
    "This owner still has related properties, documents, statements, or other records. Remove or reassign those records first, then try deleting the owner again.",
  );
});

test("property delete errors explain related records must be removed first", async () => {
  const { blockedDeleteMessage } = await loadDeleteErrorsModule();

  assert.equal(
    blockedDeleteMessage("properties"),
    "This property still has related units, leases, documents, tickets, or financial records. Remove or reassign those records first, then try deleting the property again.",
  );
});
