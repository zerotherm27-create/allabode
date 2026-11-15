import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

test("in-house lead alerts staff only, never a specialist", async () => {
  const { resolveLeadRecipients } = await loadTs("lib/leads/lead-alerts.ts");
  const out = resolveLeadRecipients({ type: "inquiry", staffUserIds: ["s1", "s2", "s1"], specialistUserId: null });
  assert.deepEqual(out.map((r) => r.userId), ["s1", "s2"]);
  assert.ok(out.every((r) => r.audience === "staff" && r.link === "/admin/inquiries"));
});

test("assigned lead alerts staff plus only that specialist", async () => {
  const { resolveLeadRecipients } = await loadTs("lib/leads/lead-alerts.ts");
  const out = resolveLeadRecipients({ type: "inquiry", staffUserIds: ["s1"], specialistUserId: "sp1" });
  assert.deepEqual(out.map((r) => [r.userId, r.audience, r.link]), [
    ["s1", "staff", "/admin/inquiries"],
    ["sp1", "specialist", "/dashboard/specialist/leads"],
  ]);
});

test("staff links follow the lead type", async () => {
  const { staffLinkForType } = await loadTs("lib/leads/lead-alerts.ts");
  assert.equal(staffLinkForType("appraisal"), "/admin/appraisals");
  assert.equal(staffLinkForType("property-management"), "/admin/leads");
  assert.equal(staffLinkForType("viewing"), "/admin/inquiries");
});

test("alert text marks chat leads and trims long input", async () => {
  const { buildLeadAlert, isChatLead, cleanLeadMessage } = await loadTs("lib/leads/lead-alerts.ts");
  const msg = "[Via website chat] " + "x".repeat(300);
  assert.equal(isChatLead(msg), true);
  assert.equal(isChatLead("hello"), false);
  assert.ok(!cleanLeadMessage(msg).startsWith("["));
  const a = buildLeadAlert({ type: "inquiry", name: "Juan", phone: "0917", message: msg, listing: "Nice Condo", specialistName: "Ana" });
  assert.equal(a.title, "New inquiry via website chat: Nice Condo");
  assert.ok(a.body.startsWith("Juan · 0917 — "));
  assert.ok(a.body.endsWith("(assigned to Ana)"));
  assert.ok(a.body.length < 220);
  assert.equal(buildLeadAlert({ type: "appraisal" }).title, "New appraisal request");
});

test("push endpoints are limited to real browser push services", async () => {
  const { isAllowedPushEndpoint: ok } = await loadTs("lib/push/endpoint.ts");
  assert.equal(ok("https://fcm.googleapis.com/fcm/send/abc"), true);
  assert.equal(ok("https://updates.push.services.mozilla.com/wpush/v2/abc"), true);
  assert.equal(ok("https://web.push.apple.com/abc"), true);
  assert.equal(ok("https://wns2-par02p.notify.windows.com/w/?token=x"), true);
  for (const bad of [
    "http://fcm.googleapis.com/x",
    "https://evil.example.com/x",
    "https://fcm.googleapis.com.evil.com/x",
    "https://evilfcm.googleapis.com.attacker.io/",
    "https://169.254.169.254/latest",
    "https://localhost/x",
    "https://user:pw@fcm.googleapis.com/x",
    "https://fcm.googleapis.com:8443/x",
    "not a url",
    42,
  ]) {
    assert.equal(ok(bad), false, String(bad));
  }
});
