import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

test("specialist may follow next paths under /dashboard/specialist", async () => {
  const { resolvePostAuthRedirect } = await loadTs("lib/auth/destination.ts");
  assert.equal(
    resolvePostAuthRedirect("specialist", "/dashboard/specialist/listings", "/dashboard/specialist"),
    "/dashboard/specialist/listings"
  );
});

test("specialist cannot follow next into other areas", async () => {
  const { resolvePostAuthRedirect } = await loadTs("lib/auth/destination.ts");
  for (const next of ["/admin", "/dashboard/owner", "/dashboard/tenant"]) {
    assert.equal(
      resolvePostAuthRedirect("specialist", next, "/dashboard/specialist"),
      "/dashboard/specialist"
    );
  }
});

test("other roles cannot follow next into /dashboard/specialist", async () => {
  const { resolvePostAuthRedirect } = await loadTs("lib/auth/destination.ts");
  for (const role of ["staff", "owner", "tenant", null]) {
    assert.equal(resolvePostAuthRedirect(role, "/dashboard/specialist", "/x"), "/x");
  }
});

test("any verified session may continue to /auth/set-password (invitation links)", async () => {
  const { resolvePostAuthRedirect } = await loadTs("lib/auth/destination.ts");
  for (const role of ["specialist", "owner", "tenant", "staff", null]) {
    assert.equal(resolvePostAuthRedirect(role, "/auth/set-password", "/x"), "/auth/set-password");
  }
  assert.equal(resolvePostAuthRedirect("specialist", "/auth/set-password/../../admin", "/x"), "/x");
});
