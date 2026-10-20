import test from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./helpers/load-ts.mjs";

const { specialistSlugFromHost: f } = await loadTs("lib/team/host.ts");
const ds = await loadTs("lib/team/domain-status.ts");

test("specialist subdomains resolve", () => {
  assert.equal(f("jojo.allabodeph.com"), "jojo");
  assert.equal(f("JoJo.AllAbodePH.com"), "jojo");
  assert.equal(f("jojo.allabodeph.com:443"), "jojo");
  assert.equal(f("ana-maria.localhost:3000"), "ana-maria");
  assert.equal(f("abc.other.com", "other.com"), "abc");
});

test("everything else is null", () => {
  for (const h of [
    "allabodeph.com", "www.allabodeph.com", "admin.allabodeph.com", "join.allabodeph.com",
    "a.b.allabodeph.com", "allabode.vercel.app", "jojo.allabode.vercel.app", "jojo.example.com",
    "-ab.allabodeph.com", "ab-.allabodeph.com", "a.allabodeph.com", "x_y.allabodeph.com",
    "localhost:3000", "www.localhost", "", null, undefined,
  ]) assert.equal(f(h), null, String(h));
});

test("domain name + status interpretation", () => {
  assert.equal(ds.specialistDomainName("Jojo"), "jojo.allabodeph.com");
  assert.equal(ds.specialistDomainName("../x"), null);
  assert.deepEqual(ds.interpretAttach(200), { ok: true, status: "attached" });
  assert.deepEqual(ds.interpretAttach(409, "domain_already_in_use"), { ok: true, status: "already-attached" });
  assert.equal(ds.interpretAttach(409, "domain_taken").ok, false);
  assert.equal(ds.interpretAttach(403).ok, false);
  assert.equal(ds.interpretAttach(500).ok, false);
  assert.equal(ds.interpretDetach(404).ok, true);
  assert.equal(ds.interpretDetach(500).ok, false);
  assert.deepEqual(ds.interpretCheck(404, null), { ok: true, attached: false, verified: false });
  assert.deepEqual(ds.interpretCheck(200, { verified: true }), { ok: true, attached: true, verified: true });
  assert.equal(ds.subdomainState(ds.interpretCheck(200, { verified: false })), "waiting");
  assert.equal(ds.subdomainState(ds.interpretCheck(200, { verified: true })), "live");
  assert.equal(ds.subdomainState(ds.interpretCheck(404, null)), "not-attached");
  assert.equal(ds.subdomainState({ ok: false, reason: "not-configured", message: "" }), "not-configured");
});
