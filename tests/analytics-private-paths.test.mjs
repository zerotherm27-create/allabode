import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const { isSecretUrlPath, isPrivateAnalyticsPath } = await loadTs("lib/analytics/private-paths.ts");

test("unsubscribe URLs are secret; others are not", () => {
  assert.equal(isSecretUrlPath("/unsubscribe/0f8fad5b-d9cb-469f-a165-70867728950e"), true);
  assert.equal(isSecretUrlPath("/api/unsubscribe/x"), true);
  assert.equal(isSecretUrlPath("/unsubscribed-news"), false);
  assert.equal(isSecretUrlPath("/listings"), false);
  assert.equal(isSecretUrlPath(null), false);
});

test("first-party tracker also skips admin", () => {
  assert.equal(isPrivateAnalyticsPath("/admin"), true);
  assert.equal(isPrivateAnalyticsPath("/admin/leads"), true);
  assert.equal(isPrivateAnalyticsPath("/administrator"), false);
  assert.equal(isPrivateAnalyticsPath("/unsubscribe/abc"), true);
  assert.equal(isPrivateAnalyticsPath("/"), false);
});
