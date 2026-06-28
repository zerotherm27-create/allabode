import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadPendingSignupsModule() {
  const file = path.join(__dirname, "..", "lib", "auth", "pending-signups.ts");
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

test("buildPendingSignups returns auth users with no staff, owner, or tenant link", async () => {
  const { buildPendingSignups } = await loadPendingSignupsModule();

  const pending = buildPendingSignups({
    authUsers: [
      {
        id: "auth-google",
        email: "new@example.com",
        created_at: "2026-06-26T19:25:37.210882Z",
        app_metadata: { providers: ["google"] },
        email_confirmed_at: "2026-06-26T19:25:37.210882Z",
        user_metadata: { full_name: "New Google User" },
      },
      {
        id: "auth-owner",
        email: "owner@example.com",
        created_at: "2026-06-23T01:14:45.32654Z",
        app_metadata: { providers: ["email"] },
        email_confirmed_at: "2026-06-23T01:14:45.32654Z",
        user_metadata: {},
      },
      {
        id: "auth-staff",
        email: "staff@example.com",
        created_at: "2026-06-22T12:53:52.756961Z",
        app_metadata: { providers: ["email"] },
        email_confirmed_at: "2026-06-22T12:53:52.756961Z",
        user_metadata: {},
      },
    ],
    owners: [{ id: "owner-row", email: "owner@example.com", auth_user_id: "auth-owner" }],
    tenants: [],
    staff: [{ id: "auth-staff", email: "staff@example.com" }],
  });

  assert.deepEqual(pending, [
    {
      id: "auth-google",
      email: "new@example.com",
      displayName: "New Google User",
      providers: ["google"],
      confirmed: true,
      createdAt: "2026-06-26T19:25:37.210882Z",
    },
  ]);
});

