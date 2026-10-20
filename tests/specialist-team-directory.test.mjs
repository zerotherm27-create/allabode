import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const { seededRng, shuffled } = await loadTs("lib/team/shuffle.ts");
const { isValidSpecialistSlug, metaDescription } = await loadTs("lib/team/queries.ts");

test("seededRng is deterministic and within [0, 1)", () => {
  const a = seededRng(42);
  const b = seededRng(42);
  const seqA = Array.from({ length: 20 }, () => a());
  const seqB = Array.from({ length: 20 }, () => b());
  assert.deepEqual(seqA, seqB);
  for (const n of seqA) assert.ok(n >= 0 && n < 1);
  assert.notDeepEqual(seqA, Array.from({ length: 20 }, ((r) => () => r())(seededRng(43))));
});

test("shuffled keeps every item, does not mutate, and is deterministic for a seed", () => {
  const input = Array.from({ length: 12 }, (_, i) => i);
  const copy = [...input];
  const out = shuffled(input, seededRng(7));
  assert.deepEqual(input, copy);
  assert.deepEqual([...out].sort((a, b) => a - b), copy);
  assert.deepEqual(out, shuffled(input, seededRng(7)));
  assert.notDeepEqual(out, copy);
});

test("shuffled handles empty and single-item lists", () => {
  assert.deepEqual(shuffled([]), []);
  assert.deepEqual(shuffled(["a"], seededRng(1)), ["a"]);
});

test("shuffled can produce different orders across seeds", () => {
  const input = ["a", "b", "c", "d", "e", "f"];
  const orders = new Set(
    [1, 2, 3, 4, 5, 6, 7, 8].map((s) => shuffled(input, seededRng(s)).join("")),
  );
  assert.ok(orders.size > 1);
});

test("isValidSpecialistSlug matches the DB subdomain shape", () => {
  for (const ok of ["ram", "ram-santos", "a1b", "x".repeat(30)]) {
    assert.equal(isValidSpecialistSlug(ok), true, ok);
  }
  for (const bad of ["", "ab", "-ram", "ram-", "Ram", "ram_s", "ram santos", "x".repeat(31), "../etc", "ram/../x", null, undefined, 5]) {
    assert.equal(isValidSpecialistSlug(bad), false, String(bad));
  }
});

test("metaDescription prefers the tagline, falls back to bio, then the fallback", () => {
  assert.equal(metaDescription("  Condo   specialist  ", "long bio", "fb"), "Condo specialist");
  assert.equal(metaDescription(null, "Bio\nwith\nlines", "fb"), "Bio with lines");
  assert.equal(metaDescription("", "  ", "fb"), "fb");
  assert.equal(metaDescription(undefined, undefined, "fb"), "fb");
});

test("metaDescription trims long text at a word boundary within the limit", () => {
  const bio = "word ".repeat(100);
  const out = metaDescription(null, bio, "fb");
  assert.ok(out.length <= 155, String(out.length));
  assert.ok(out.endsWith("…"));
  assert.ok(!out.includes("wor…"));
  const noSpaces = metaDescription(null, "x".repeat(300), "fb");
  assert.equal(noSpaces.length, 155);
});
