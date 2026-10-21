import { test } from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./helpers/load-ts.mjs";

const m = await loadTs("lib/team/public-contact.ts");

const val = (r) => (r.ok ? r.value : `ERR:${r.error}`);

test("phone: blank is null", () => {
  assert.equal(val(m.normalizePhone("")), null);
  assert.equal(val(m.normalizePhone("   ")), null);
  assert.equal(val(m.normalizePhone(undefined)), null);
});

test("phone: PH forms normalise to +63", () => {
  assert.equal(val(m.normalizePhone("0917 123 4567")), "+639171234567");
  assert.equal(val(m.normalizePhone("09171234567")), "+639171234567");
  assert.equal(val(m.normalizePhone("+63 917-123-4567")), "+639171234567");
  assert.equal(val(m.normalizePhone("639171234567")), "+639171234567");
  assert.equal(val(m.normalizePhone("917 123 4567")), "+639171234567");
  assert.equal(val(m.normalizePhone("(02) 8123 4567")), "+63281234567");
  assert.equal(val(m.normalizePhone("0065 6123 4567")), "+6561234567");
});

test("phone: international and length bounds", () => {
  assert.equal(val(m.normalizePhone("+65 6123 4567")), "+6561234567");
  assert.ok(!m.normalizePhone("12345").ok);
  assert.ok(!m.normalizePhone("+1234567890123456").ok);
  assert.ok(m.normalizePhone("1234567").ok);
});

test("phone: refuses letters, schemes and CR/LF", () => {
  assert.ok(!m.normalizePhone("call 0917").ok);
  assert.ok(!m.normalizePhone("tel:09171234567").ok);
  assert.ok(!m.normalizePhone("0917\r\n1234567").ok);
  assert.ok(!m.normalizePhone("javascript:alert(1)").ok);
});

test("link builders", () => {
  assert.equal(m.telHref("+639171234567"), "tel:+639171234567");
  assert.equal(m.viberHref("+639171234567"), "viber://chat?number=%2B639171234567");
  assert.equal(m.formatPhone("+639171234567"), "+63 917 123 4567");
  assert.equal(m.formatPhone("+6561234567"), "+6561234567");
});

test("facebook: adds https and accepts known hosts", () => {
  assert.equal(val(m.normalizeFacebookUrl("facebook.com/janedoe")), "https://facebook.com/janedoe");
  assert.equal(val(m.normalizeFacebookUrl("https://www.facebook.com/jane.doe")), "https://www.facebook.com/jane.doe");
  assert.equal(val(m.normalizeFacebookUrl("https://m.facebook.com/x")), "https://m.facebook.com/x");
  assert.equal(val(m.normalizeFacebookUrl("fb.com/x")), "https://fb.com/x");
  assert.equal(val(m.normalizeFacebookUrl("")), null);
});

test("facebook: refuses other hosts and unsafe schemes", () => {
  assert.ok(!m.normalizeFacebookUrl("https://evil.com/facebook.com").ok);
  assert.ok(!m.normalizeFacebookUrl("https://facebook.com.evil.com/x").ok);
  assert.ok(!m.normalizeFacebookUrl("http://facebook.com/x").ok);
  assert.ok(!m.normalizeFacebookUrl("javascript:alert(1)").ok);
  assert.ok(!m.normalizeFacebookUrl("JavaScript:alert(1)//facebook.com").ok);
  assert.ok(!m.normalizeFacebookUrl("data:text/html,hi").ok);
  assert.ok(!m.normalizeFacebookUrl("https://user:pw@facebook.com/x").ok);
  assert.ok(!m.normalizeFacebookUrl("https://facebook.com/x\r\nSet-Cookie: a").ok);
  assert.ok(!m.normalizeFacebookUrl(`https://facebook.com/${"a".repeat(400)}`).ok);
});

test("linkedin: linkedin.com hosts only", () => {
  assert.equal(val(m.normalizeLinkedInUrl("linkedin.com/in/jane")), "https://linkedin.com/in/jane");
  assert.equal(val(m.normalizeLinkedInUrl("https://ph.linkedin.com/in/jane")), "https://ph.linkedin.com/in/jane");
  assert.ok(!m.normalizeLinkedInUrl("https://notlinkedin.com/in/jane").ok);
  assert.ok(!m.normalizeLinkedInUrl("https://facebook.com/jane").ok);
  assert.ok(!m.normalizeLinkedInUrl("data:text/html,x").ok);
});

test("email", () => {
  assert.equal(val(m.normalizePublicEmail(" Jane@Example.com ")), "jane@example.com");
  assert.equal(val(m.normalizePublicEmail("")), null);
  assert.ok(!m.normalizePublicEmail("not-an-email").ok);
  assert.ok(!m.normalizePublicEmail("a@b.com\r\nBcc: x@y.com").ok);
  assert.ok(!m.normalizePublicEmail("mailto:a@b.com").ok);
  assert.ok(!m.normalizePublicEmail("a@b.com, c@d.com").ok);
});

test("parsePublicContact: all blank stores nulls", () => {
  const r = m.parsePublicContact({ phone: "", viber: "", facebook: "", linkedin: "", email: "" });
  assert.deepEqual(r, {
    ok: true,
    value: {
      public_phone: null,
      public_viber: null,
      public_facebook_url: null,
      public_linkedin_url: null,
      public_email: null,
    },
  });
});

test("parsePublicContact: first error wins, labelled", () => {
  const r = m.parsePublicContact({ phone: "", viber: "abc", facebook: "", linkedin: "", email: "" });
  assert.equal(r.ok, false);
  assert.match(r.error, /Viber/);
});

test("safeStoredContact drops values that no longer validate", () => {
  const r = m.safeStoredContact({
    public_phone: "+639171234567",
    public_facebook_url: "javascript:alert(1)",
    public_email: null,
  });
  assert.equal(r.public_phone, "+639171234567");
  assert.equal(r.public_facebook_url, null);
  assert.equal(r.public_email, null);
  assert.equal(r.public_viber, null);
});
