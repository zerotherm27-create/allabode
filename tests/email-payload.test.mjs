import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const { buildResendPayload, parseResendId, DEFAULT_FROM } = await loadTs("lib/email.ts");

test("default payload is unchanged and omits optional keys", () => {
  const p = buildResendPayload({ to: "a@b.co", subject: "S", html: "<p>x</p>" });
  assert.deepEqual(Object.keys(p), ["from", "to", "subject", "html"]);
  assert.equal(p.from, DEFAULT_FROM);
});

test("optional fields map to Resend field names", () => {
  const p = buildResendPayload({
    to: "a@b.co", subject: "S", html: "h", from: '"X via All Abode" <x@allabodeph.com>',
    replyTo: "r@b.co", text: "plain", tags: [{ name: "k", value: "v" }],
    headers: { "List-Unsubscribe": "<https://e.co/u>", "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
  });
  assert.equal(p.from, '"X via All Abode" <x@allabodeph.com>');
  assert.equal(p.reply_to, "r@b.co");
  assert.equal(p.text, "plain");
  assert.deepEqual(p.tags, [{ name: "k", value: "v" }]);
  assert.equal(p.headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
  assert.ok(!("replyTo" in p));
});

test("empty headers/tags are omitted", () => {
  const p = buildResendPayload({ to: "a@b.co", subject: "S", html: "h", headers: {}, tags: [] });
  assert.ok(!("headers" in p) && !("tags" in p));
});

test("parseResendId is defensive", () => {
  assert.equal(parseResendId('{"id":"abc-123"}'), "abc-123");
  assert.equal(parseResendId(""), undefined);
  assert.equal(parseResendId("not json"), undefined);
  assert.equal(parseResendId("null"), undefined);
  assert.equal(parseResendId('{"id":5}'), undefined);
});
