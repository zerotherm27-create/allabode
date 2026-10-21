import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const { formatFromAddress, isLikelyEmail } = await loadTs("lib/email-address.ts");

test("formats a normal name", () => {
  assert.equal(formatFromAddress("Maria Santos", "m@allabodeph.com"), '"Maria Santos via All Abode" <m@allabodeph.com>');
});

test("strips CR/LF header injection", () => {
  const out = formatFromAddress("Evil\r\nBcc: victim@x.co", "m@allabodeph.com");
  assert.ok(!/[\r\n]/.test(out));
  assert.equal(out, '"Evil Bcc: victim@x.co via All Abode" <m@allabodeph.com>');
});

test("strips quotes and angle brackets, collapses whitespace", () => {
  const out = formatFromAddress('  Ann "The <Best>"   \\ Lee ', "m@allabodeph.com");
  assert.equal(out, '"Ann The Best Lee via All Abode" <m@allabodeph.com>');
});

test("caps the name at 70 chars and handles empty", () => {
  const out = formatFromAddress("x".repeat(200), "m@allabodeph.com");
  assert.equal(out, `"${"x".repeat(70)} via All Abode" <m@allabodeph.com>`);
  assert.equal(formatFromAddress("  <>  ", "m@allabodeph.com"), '"All Abode" <m@allabodeph.com>');
});

test("isLikelyEmail", () => {
  assert.ok(isLikelyEmail("a.b+c@example.co.ph"));
  for (const bad of ["", "a@b", "a b@c.co", "a@b.co\nBcc: x@y.co", "<a@b.co>", "a@b.co, c@d.co", "@b.co", null, 5])
    assert.ok(!isLikelyEmail(bad), String(bad));
});
