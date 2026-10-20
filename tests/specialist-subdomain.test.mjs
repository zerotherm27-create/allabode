import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const { validateSubdomain } = await loadTs("lib/team/subdomain.ts");

test("accepts a plain subdomain", () => {
  assert.deepEqual(validateSubdomain("ram"), { ok: true, value: "ram" });
});

test("trims and lowercases", () => {
  assert.deepEqual(validateSubdomain(" Ram "), { ok: true, value: "ram" });
});

test("rejects invalid shapes", () => {
  for (const bad of ["ab", "-ram", "ram-", "r am", "rám", "a".repeat(31)]) {
    assert.equal(validateSubdomain(bad).ok, false, bad);
  }
});

test("rejects reserved names", () => {
  for (const name of ["www", "admin", "api", "portal"]) {
    const r = validateSubdomain(name);
    assert.equal(r.ok, false);
    assert.match(r.error, new RegExp(`${name}.*reserved`, "i"));
  }
});
