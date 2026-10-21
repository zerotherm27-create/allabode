import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const { isCronAuthorized } = await loadTs("lib/cron.ts");

test("missing secret: denied in production, allowed in dev", () => {
  assert.equal(isCronAuthorized("Bearer x", undefined, true), false);
  assert.equal(isCronAuthorized(null, "", true), false);
  assert.equal(isCronAuthorized(null, undefined, false), true);
});

test("secret set: only the exact Bearer value passes", () => {
  assert.equal(isCronAuthorized("Bearer s3cret", "s3cret", true), true);
  assert.equal(isCronAuthorized("Bearer wrong!", "s3cret", true), false);
  assert.equal(isCronAuthorized("Bearer s3cre", "s3cret", true), false);
  assert.equal(isCronAuthorized("s3cret", "s3cret", true), false);
  assert.equal(isCronAuthorized(null, "s3cret", false), false);
});
