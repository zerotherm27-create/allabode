import test from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./helpers/load-ts.mjs";

const { isSpecialistSiteOrigin: o, specialistHostAction: act } = await loadTs("lib/team/host.ts");
const lead = await loadTs("lib/leads/specialist-lead.ts");
const { isValidSpecialistSlug } = await loadTs("lib/team/queries.ts");

test("specialist origins are trusted on the parsed hostname", () => {
  assert.equal(o("https://jojo.allabodeph.com", true), true);
  assert.equal(o("https://ana-maria.allabodeph.com", true), true);
  assert.equal(o("http://jojo.localhost:3000", false), true);
});

test("lookalike and malformed origins are rejected", () => {
  for (const bad of [
    "https://evil-allabodeph.com",
    "https://allabodeph.com.evil.com",
    "https://jojo.allabodeph.com.evil.com",
    "https://jojo.allabodeph.com@evil.com",
    "https://evil.com#.jojo.allabodeph.com",
    "https://evil.com/.jojo.allabodeph.com",
    "https://jojo.allabodeph.com/path",
    "https://jojo.allabodeph.com:8443",
    "https://user:pw@jojo.allabodeph.com",
    "https://admin.allabodeph.com",
    "https://www.allabodeph.com",
    "https://allabodeph.com",
    "https://a.b.allabodeph.com",
    "https://jojo.allabodeph.com.",
    "ftp://jojo.allabodeph.com",
    "https://jojo.localhost:3000",
    "null",
    "",
    null,
    undefined,
  ]) assert.equal(o(bad, false), false, String(bad));
});

test("http is never accepted for allabodeph.com; localhost only outside production", () => {
  assert.equal(o("http://jojo.allabodeph.com", true), false);
  assert.equal(o("http://jojo.allabodeph.com", false), false);
  assert.equal(o("http://jojo.localhost:3000", true), false);
  assert.equal(o("http://admin.localhost:3000", false), false);
});

test("specialist host routing: only the exact lead endpoint passes through", () => {
  assert.equal(act("/", "jojo"), "rewrite");
  assert.equal(act("/team/jojo", "jojo"), "next");
  assert.equal(act("/api/leads", "jojo"), "next");
  assert.equal(act("/_next/static/x.js", "jojo"), "next");
  assert.equal(act("/logo/logo.png", "jojo"), "next");
  for (const p of ["/api/leads/", "/api/leads/x", "/api/leadsx", "/api/site/visit", "/api", "/admin", "/team/ana", "/listings", "/team"]) {
    assert.equal(act(p, "jojo"), "redirect", p);
  }
});

test("specialist slug parsing matches the shared slug rule", () => {
  for (const v of ["jojo", "ana-maria", "a1b", "JoJo", "-ab", "ab-", "a", "x_y", "a.b", "", 7, null, {}, "jojo\n"]) {
    assert.equal(lead.parseSpecialistSlug(v) !== null, isValidSpecialistSlug(v), String(v));
  }
});

test("tagging uses only the verified specialist and keeps the row shape", () => {
  const row = { type: "inquiry", name: "Ana", message: "Hi", details: { listing: null } };
  assert.equal(lead.tagSpecialistInquiry(row, null), row);
  const tagged = lead.tagSpecialistInquiry(row, { slug: "jojo", name: "Jojo Cruz" });
  assert.deepEqual(tagged, {
    type: "inquiry",
    name: "Ana",
    message: "Hi",
    details: { source: "specialist-page", specialistSlug: "jojo", specialistName: "Jojo Cruz" },
  });
  assert.equal("listing" in tagged.details, false);
});

test("admin source label guards types", () => {
  assert.equal(lead.specialistSourceLabel({ source: "specialist-page", specialistName: "Jojo" }), "Source: specialist page — Jojo");
  assert.equal(lead.specialistSourceLabel({ source: "specialist-page", specialistName: 5 }), "Source: specialist page");
  for (const d of [null, undefined, [], "x", { listing: "A" }, { source: "other", specialistName: "Jojo" }]) {
    assert.equal(lead.specialistSourceLabel(d), null);
  }
});

test("escapeHtml neutralises markup", () => {
  assert.equal(lead.escapeHtml(`<script>alert("x")</script>&'`), "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;&amp;&#39;");
  assert.equal(lead.escapeHtml(null), "");
});

test("notification email escapes every lead field and keeps line breaks", () => {
  const { subject, html } = lead.buildSpecialistLeadEmail({
    specialistName: "Jojo\r\nBcc: x@evil.com",
    name: "<script>alert(1)</script>",
    email: `a"onmouseover="x@e.com`,
    phone: "<b>0917</b>",
    message: "Line 1\nLine 2\r\n<img src=x onerror=alert(1)>",
    adminUrl: "https://allabodeph.com/admin/inquiries",
  });
  assert.equal(subject.includes("\n") || subject.includes("\r"), false);
  assert.match(subject, /^New message for Jojo Bcc: x@evil\.com from the website$/);
  assert.equal(html.includes("<script>"), false);
  assert.equal(html.includes("<img"), false);
  assert.equal(html.includes("<b>0917"), false);
  assert.equal(html.includes(`a"onmouseover`), false);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /Line 1<br>Line 2<br>&lt;img/);
  assert.match(html, /href="https:\/\/allabodeph\.com\/admin\/inquiries"/);
});

test("admin link is omitted unless it is a plain http(s) URL", () => {
  const base = { specialistName: "Jojo", name: "Ana", email: "a@b.co", phone: null, message: null };
  for (const adminUrl of [undefined, null, "", "javascript:alert(1)", `https://x.com/"><script>`]) {
    assert.equal(lead.buildSpecialistLeadEmail({ ...base, adminUrl }).html.includes("href="), false, String(adminUrl));
  }
});
