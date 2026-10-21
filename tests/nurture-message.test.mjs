import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const { parseToken, unsubscribeUrls, listUnsubscribeHeaders, buildFollowupMessage, tagValue, maskEmail, clip, NURTURE_FROM_ADDRESS } =
  await loadTs("lib/nurture/message.ts");
const { buildResendPayload } = await loadTs("lib/email.ts");
const { formatFromAddress } = await loadTs("lib/email-address.ts");

const TOKEN = "0f8fad5b-d9cb-469f-a165-70867728950e";
const rendered = { subject: "Hi", html: "<p>h</p>", text: "h" };

test("parseToken accepts only uuids", () => {
  assert.equal(parseToken(TOKEN.toUpperCase()), TOKEN);
  assert.equal(parseToken(` ${TOKEN} `), TOKEN);
  for (const bad of ["", "abc", `${TOKEN}x`, "../etc", null, 42, `${TOKEN}/../x`]) assert.equal(parseToken(bad), null);
});

test("unsubscribeUrls builds page + one-click urls, refuses bad input", () => {
  assert.deepEqual(unsubscribeUrls("https://allabodeph.com/", TOKEN), {
    pageUrl: `https://allabodeph.com/unsubscribe/${TOKEN}`,
    oneClickUrl: `https://allabodeph.com/api/unsubscribe/${TOKEN}`,
  });
  assert.equal(unsubscribeUrls("https://allabodeph.com", "nope"), null);
  assert.equal(unsubscribeUrls("", TOKEN), null);
});

test("List-Unsubscribe headers follow RFC 8058", () => {
  assert.deepEqual(listUnsubscribeHeaders("https://a.co/u"), {
    "List-Unsubscribe": "<https://a.co/u>",
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  });
  assert.equal(listUnsubscribeHeaders("https://a.co/u", "u@a.co")["List-Unsubscribe"], "<https://a.co/u>, <mailto:u@a.co?subject=unsubscribe>");
});

test("lead email: to lead, reply-to specialist, one-click headers, tags -> Resend payload", () => {
  const msg = buildFollowupMessage({
    audience: "lead",
    from: formatFromAddress("Jo Cruz", NURTURE_FROM_ADDRESS),
    leadEmail: " lead@example.com ",
    specialistEmail: "jo@example.com",
    rendered,
    templateKey: "day-3_viewing",
    oneClickUrl: `https://allabodeph.com/api/unsubscribe/${TOKEN}`,
  });
  const p = buildResendPayload(msg);
  assert.equal(p.from, '"Jo Cruz via All Abode" <hello@mail.allabodeph.com>');
  assert.equal(p.to, "lead@example.com");
  assert.equal(p.reply_to, "jo@example.com");
  assert.equal(p.text, "h");
  assert.deepEqual(p.headers, {
    "List-Unsubscribe": `<https://allabodeph.com/api/unsubscribe/${TOKEN}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  });
  assert.deepEqual(p.tags, [
    { name: "category", value: "lead_followup" },
    { name: "template", value: "day-3_viewing" },
    { name: "audience", value: "lead" },
  ]);
});

test("specialist reminder: to specialist, no reply-to, no unsubscribe headers", () => {
  const msg = buildFollowupMessage({
    audience: "specialist",
    from: formatFromAddress("", NURTURE_FROM_ADDRESS),
    leadEmail: "lead@example.com",
    specialistEmail: "jo@example.com",
    rendered,
    templateKey: "day1",
    oneClickUrl: "https://x/u",
  });
  const p = buildResendPayload(msg);
  assert.equal(p.to, "jo@example.com");
  assert.equal(p.from, '"All Abode" <hello@mail.allabodeph.com>');
  assert.equal("reply_to" in p, false);
  assert.equal("headers" in p, false);
});

test("from name cannot break the header", () => {
  assert.equal(formatFromAddress('Evil" <x@y.z>\r\nBcc: a', NURTURE_FROM_ADDRESS), '"Evil x@y.z Bcc: a via All Abode" <hello@mail.allabodeph.com>');
});

test("helpers: tagValue, maskEmail, clip", () => {
  assert.equal(tagValue("a b.c"), "a_b_c");
  assert.equal(tagValue(""), "none");
  assert.equal(maskEmail("john@example.com"), "j***@example.com");
  assert.equal(maskEmail("nope"), "***");
  assert.equal(clip("x".repeat(600)).length, 500);
});
