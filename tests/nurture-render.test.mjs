import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const { renderTemplate, renderSubject, fillText, firstName, escapeHtml } = await loadTs("lib/nurture/render.ts");

const footer = {
  companyName: "All Abode Property Solutions",
  legalName: "All Abode Brokerage and Valuation OPC",
  address: "Makati City, Philippines",
  phone: "+63 917 159 6808",
  email: "info@allabodeph.com",
  siteUrl: "https://allabodeph.com",
  unsubscribeUrl: "https://allabodeph.com/unsubscribe/11111111-1111-4111-8111-111111111111",
  reason: "You contacted us.",
};

test("merge fields fill subject, html and text", () => {
  const r = renderTemplate(
    { subject: "Hi {{lead_first_name}}, about {{ listing_title }}", body: "Hello {{lead_first_name}},\n\nI'm {{specialist_name}} ({{specialist_phone}})." },
    { lead_first_name: "Ana", listing_title: "Loft A", specialist_name: "Jo Cruz", specialist_phone: "0917" },
    footer,
  );
  assert.equal(r.subject, "Hi Ana, about Loft A");
  assert.match(r.html, /Hello Ana,/);
  assert.match(r.html, /I&#39;m Jo Cruz \(0917\)\./);
  assert.match(r.text, /^Hello Ana,\n\nI'm Jo Cruz \(0917\)\./);
});

test("script injection in values and template is escaped everywhere in html", () => {
  const evil = `<script>alert("x")</script><img src=x onerror=alert(1)>`;
  const r = renderTemplate(
    { subject: "S {{lead_name}}", body: "Dear {{lead_name}}\n\n<b>bold</b> {{personal_note}}" },
    { lead_name: evil, personal_note: `" onmouseover="x` },
    footer,
  );
  assert.ok(!r.html.includes("<script"), "no raw script tag");
  assert.ok(!r.html.includes("<img"), "no raw img tag");
  assert.ok(!r.html.includes("<b>"), "template markup is escaped too");
  assert.ok(r.html.includes("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"));
  assert.ok(r.html.includes("&quot; onmouseover=&quot;x"));
  // text twin keeps the literal characters (it is not HTML)
  assert.ok(r.text.includes(evil));
});

test("unknown fields render empty, known-but-missing fields render empty", () => {
  assert.equal(fillText("a{{nope}}b{{lead_name}}c{{__proto__}}d{{constructor}}", {}), "abcd");
});

test("empty personal-note paragraph is dropped", () => {
  const r = renderTemplate({ subject: "S", body: "One\n\n{{personal_note}}\n\nTwo" }, { personal_note: "" }, footer);
  assert.equal((r.html.match(/<p style="margin:0 0 16px">/g) || []).length, 2);
  assert.match(r.text, /^One\n\nTwo\n/);
});

test("subject is single-line: values cannot add header lines", () => {
  assert.equal(renderSubject("Hi {{lead_name}}", { lead_name: "A\r\nBcc: x@y.z" }), "Hi A Bcc: x@y.z");
});

test("urls are linked; javascript: is not", () => {
  const r = renderTemplate(
    { subject: "S", body: "See {{listing_url}}. Also javascript:alert(1)" },
    { listing_url: "https://allabodeph.com/listings/loft-a?x=1&y=2" },
    footer,
  );
  assert.ok(r.html.includes(`<a href="https://allabodeph.com/listings/loft-a?x=1&amp;y=2" style="color:#0d518c">`));
  assert.ok(r.html.includes("</a>. Also"), "trailing period stays outside the link");
  assert.ok(!r.html.includes(`href="javascript`));
});

test("a quote right after a url ends the link", () => {
  const r = renderTemplate({ subject: "S", body: `"https://a.co/x" ok` }, {}, footer);
  assert.ok(r.html.includes(`&quot;<a href="https://a.co/x" style="color:#0d518c">https://a.co/x</a>&quot; ok`));
});

test("footer has unsubscribe link and company details in html and text", () => {
  const r = renderTemplate({ subject: "S", body: "Body" }, {}, footer);
  assert.ok(r.html.includes(`href="${footer.unsubscribeUrl}"`));
  assert.ok(r.html.includes("All Abode Brokerage and Valuation OPC"));
  assert.ok(r.html.includes("Makati City, Philippines"));
  assert.ok(r.text.includes(`Unsubscribe: ${footer.unsubscribeUrl}`));
  assert.ok(r.text.includes("+63 917 159 6808 · info@allabodeph.com"));
  assert.ok(r.text.includes("You contacted us."));
});

test("internal emails can omit the unsubscribe link", () => {
  const r = renderTemplate({ subject: "S", body: "Body" }, {}, { ...footer, unsubscribeUrl: null });
  assert.ok(!r.html.includes("Unsubscribe"));
  assert.ok(!r.text.includes("Unsubscribe"));
});

test("firstName and escapeHtml", () => {
  assert.equal(firstName("  Maria Clara  Santos "), "Maria");
  assert.equal(firstName(null), "");
  assert.equal(escapeHtml(`<a href="x">'&'</a>`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
});
