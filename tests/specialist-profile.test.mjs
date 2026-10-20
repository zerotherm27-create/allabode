import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const { parseList, parseYears, parseDateOnly, portraitError, portraitKey } =
  await loadTs("lib/team/profile.ts");
const want = { width: 800, height: 1000 };

test("parseList trims, dedupes and caps", () => {
  assert.deepEqual(parseList(" Makati, bgc ,, MAKATI\nOrtigas "), ["Makati", "bgc", "Ortigas"]);
  assert.equal(parseList(Array.from({ length: 50 }, (_, i) => `a${i}`).join(",")).length, 20);
  assert.equal(parseList("x".repeat(200))[0].length, 60);
  assert.deepEqual(parseList(""), []);
});

test("parseYears", () => {
  assert.equal(parseYears(""), null);
  assert.equal(parseYears("12"), 12);
  assert.equal(parseYears("81"), undefined);
  assert.equal(parseYears("-1"), undefined);
  assert.equal(parseYears("1.5"), undefined);
});

test("parseDateOnly", () => {
  assert.equal(parseDateOnly(""), null);
  assert.equal(parseDateOnly("2027-02-28"), "2027-02-28");
  assert.equal(parseDateOnly("2027-02-30"), undefined);
  assert.equal(parseDateOnly("02/03/2027"), undefined);
});

test("portraitError", () => {
  const ok = { size: 200000, type: "image/jpeg" };
  assert.equal(portraitError(ok, want, want), null);
  assert.match(portraitError({ ...ok, type: "image/png" }, want, want), /JPEG/);
  assert.match(portraitError({ ...ok, size: 2 * 1024 * 1024 }, want, want), /1\.5 MB/);
  assert.match(portraitError(ok, null, want), /readable/);
  assert.match(portraitError(ok, { width: 0, height: 0 }, want), /readable/);
  assert.match(portraitError(ok, { width: 799, height: 1000 }, want), /800 × 1000/);
  assert.match(portraitError({ size: 0, type: "image/jpeg" }, want, want), /Choose/);
});

test("portraitKey is inside the caller's folder", () => {
  assert.equal(portraitKey("abc"), "abc/portrait.jpg");
});
