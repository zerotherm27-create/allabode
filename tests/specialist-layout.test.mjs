import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./helpers/load-ts.mjs";

const { MICROSITE_LAYOUT_KEYS, MICROSITE_LAYOUTS, DEFAULT_LAYOUT, parseLayout, isMicrositeLayout } =
  await loadTs("lib/team/layout.ts");

test("parseLayout keeps a known key and falls back to the default otherwise", () => {
  assert.equal(DEFAULT_LAYOUT, "signature");
  for (const key of MICROSITE_LAYOUT_KEYS) assert.equal(parseLayout(key), key);
  for (const bad of [null, undefined, "", "Editorial", "signature ", "grid", 3, {}]) {
    assert.equal(parseLayout(bad), DEFAULT_LAYOUT);
  }
});

test("isMicrositeLayout accepts exact keys only", () => {
  assert.equal(isMicrositeLayout("listings"), true);
  assert.equal(isMicrositeLayout("LISTINGS"), false);
  assert.equal(isMicrositeLayout(undefined), false);
});

test("every layout has a name and a description for the picker", () => {
  assert.deepEqual(Object.keys(MICROSITE_LAYOUTS).sort(), [...MICROSITE_LAYOUT_KEYS].sort());
  for (const key of MICROSITE_LAYOUT_KEYS) {
    assert.ok(MICROSITE_LAYOUTS[key].name.length > 0);
    assert.ok(MICROSITE_LAYOUTS[key].description.length > 0);
    assert.doesNotMatch(MICROSITE_LAYOUTS[key].description, /\bagents?\b/i);
  }
});
