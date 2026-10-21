import test from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./helpers/load-ts.mjs";

const v = await loadTs("lib/nurture/override-validate.ts");
const { MERGE_FIELDS, renderTemplate } = await loadTs("lib/nurture/render.ts");

const UNSUB = "https://allabodeph.com/unsubscribe/11111111-1111-4111-8111-111111111111";
const footer = {
  companyName: "All Abode Property Solutions",
  legalName: "All Abode Brokerage and Valuation OPC",
  address: "Makati City, Philippines",
  phone: "+63 917 159 6808",
  email: "info@allabodeph.com",
  siteUrl: "https://allabodeph.com",
  unsubscribeUrl: UNSUB,
  reason: "You contacted us.",
};
const good = { subject: "Hi {{lead_first_name}}", body: "Hello {{lead_first_name}},\n\nIt's {{specialist_name}}." };

test("a valid override is accepted and trimmed", () => {
  const r = v.parseOverrideInput({ subject: "  Hi {{ lead_first_name }}  ", body: "\r\nHello\r\n\r\nBye\r\n" }, MERGE_FIELDS);
  assert.equal(r.ok, true);
  assert.equal(r.value.subject, "Hi {{ lead_first_name }}");
  assert.equal(r.value.body, "Hello\n\nBye");
});

test("unknown merge fields are rejected (not just warned)", () => {
  const r = v.parseOverrideInput({ ...good, body: "Hi {{pet_name}} and {{unsubscribe_url}}" }, MERGE_FIELDS);
  assert.equal(r.ok, false);
  assert.match(r.errors.body, /\{\{pet_name\}\}/);
  assert.match(r.errors.body, /\{\{unsubscribe_url\}\}/);
  const s = v.parseOverrideInput({ ...good, subject: "Hi {{nope}}" }, MERGE_FIELDS);
  assert.equal(s.ok, false);
  assert.match(s.errors.subject, /nope/);
});

test("broken placeholders are rejected", () => {
  assert.equal(v.parseOverrideInput({ ...good, body: "Hi {{lead_first_name" }, MERGE_FIELDS).ok, false);
  assert.equal(v.parseOverrideInput({ ...good, subject: "Hi }}" }, MERGE_FIELDS).ok, false);
});

test("CR or LF in the subject is rejected", () => {
  for (const subject of ["Hi\r\nBcc: x@y.z", "Hi\nthere", "Hi\rthere"]) {
    const r = v.parseOverrideInput({ ...good, subject }, MERGE_FIELDS);
    assert.equal(r.ok, false, JSON.stringify(subject));
    assert.ok(r.errors.subject);
  }
});

test("length limits: subject 150, body 3000", () => {
  assert.equal(v.OVERRIDE_SUBJECT_MAX, 150);
  assert.equal(v.OVERRIDE_BODY_MAX, 3000);
  assert.equal(v.parseOverrideInput({ ...good, subject: "a".repeat(150) }, MERGE_FIELDS).ok, true);
  assert.equal(v.parseOverrideInput({ ...good, subject: "a".repeat(151) }, MERGE_FIELDS).ok, false);
  assert.equal(v.parseOverrideInput({ ...good, body: "b".repeat(3000) }, MERGE_FIELDS).ok, true);
  assert.equal(v.parseOverrideInput({ ...good, body: "b".repeat(3001) }, MERGE_FIELDS).ok, false);
});

test("empty, non-string, HTML and control characters are rejected", () => {
  assert.equal(v.parseOverrideInput({ subject: "", body: "x" }, MERGE_FIELDS).ok, false);
  assert.equal(v.parseOverrideInput({ subject: "x", body: "   " }, MERGE_FIELDS).ok, false);
  assert.equal(v.parseOverrideInput({ subject: 1, body: null }, MERGE_FIELDS).ok, false);
  assert.equal(v.parseOverrideInput(null, MERGE_FIELDS).ok, false);
  assert.equal(v.parseOverrideInput({ ...good, body: "<b>hi</b>" }, MERGE_FIELDS).ok, false);
  assert.equal(v.parseOverrideInput({ ...good, body: "x <!-- hide -->" }, MERGE_FIELDS).ok, false);
  assert.equal(v.parseOverrideInput({ ...good, subject: "<a href=x>" }, MERGE_FIELDS).ok, false);
  assert.equal(v.parseOverrideInput({ ...good, body: "bad \u0007 bell" }, MERGE_FIELDS).ok, false);
  // A lone "<" in prose is fine.
  assert.equal(v.parseOverrideInput({ ...good, body: "Budget < 5M and 3 > 2" }, MERGE_FIELDS).ok, true);
});

test("pickTemplateSource: override for customer emails only, else owner's", () => {
  const owner = { subject: "Owner S", body: "Owner B", audience: "lead" };
  const own = { subject: "Mine", body: "My body" };
  assert.deepEqual(v.pickTemplateSource(owner, own, MERGE_FIELDS), { subject: "Mine", body: "My body", fromOverride: true });
  assert.equal(v.pickTemplateSource(owner, null, MERGE_FIELDS).fromOverride, false);
  assert.equal(v.pickTemplateSource({ ...owner, audience: "specialist" }, own, MERGE_FIELDS).fromOverride, false);
  // An invalid stored override falls back to the owner's version.
  const bad = v.pickTemplateSource(owner, { subject: "x\ny", body: "b" }, MERGE_FIELDS);
  assert.deepEqual(bad, { subject: "Owner S", body: "Owner B", fromOverride: false });
});

test("rendered override still carries the unsubscribe link, reason and company footer", () => {
  const src = v.pickTemplateSource(
    { subject: "Owner", body: "Owner", audience: "lead" },
    { subject: "Hi {{lead_first_name}}", body: "Unsubscribe: none\n\n--\nNo footer here" },
    MERGE_FIELDS,
  );
  assert.equal(src.fromOverride, true);
  const r = renderTemplate(src, { lead_first_name: "Ana" }, footer, { linkBodyUrls: false });
  assert.ok(r.html.includes(`href="${UNSUB}"`));
  assert.match(r.html, /Unsubscribe from these emails/);
  assert.match(r.html, /All Abode Property Solutions/);
  assert.match(r.html, /You contacted us\./);
  // The renderer's footer comes after the body in the text twin.
  assert.ok(r.text.trimEnd().endsWith("https://allabodeph.com"));
  assert.ok(r.text.lastIndexOf(`Unsubscribe: ${UNSUB}`) > r.text.indexOf("No footer here"));
});

test("URLs typed in an override body are not linked; merge URL fields still are", () => {
  const r = renderTemplate(
    { subject: "s", body: "Visit https://evil.example/login and {{listing_url}}" },
    { listing_url: "https://allabodeph.com/listings/a" },
    footer,
    { linkBodyUrls: false },
  );
  assert.ok(!r.html.includes('href="https://evil.example/login"'));
  assert.ok(r.html.includes("https://evil.example/login"));
  assert.ok(r.html.includes('href="https://allabodeph.com/listings/a"'));
  // Owner templates keep the old behaviour.
  const o = renderTemplate({ subject: "s", body: "Visit https://allabodeph.com/x" }, {}, footer);
  assert.ok(o.html.includes('href="https://allabodeph.com/x"'));
});

test("isOverrideTableMissing", () => {
  assert.equal(v.isOverrideTableMissing({ code: "42P01" }), true);
  assert.equal(v.isOverrideTableMissing({ code: "PGRST205" }), true);
  assert.equal(
    v.isOverrideTableMissing({ message: "Could not find the table 'public.specialist_template_overrides' in the schema cache" }),
    true,
  );
  assert.equal(v.isOverrideTableMissing({ code: "57014", message: "timeout" }), false);
  assert.equal(v.isOverrideTableMissing(null), false);
});
