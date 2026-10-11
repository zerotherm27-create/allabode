import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadModule() {
  const file = path.join(__dirname, "..", "lib", "admin", "action-items.ts");
  const compiled = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
}

const base = (party, over = {}) => ({
  party,
  today: "2026-10-11",
  person: { id: "p1", auth_user_id: "u1", spa_authorization_received: true },
  invoices: [], payments: [], leases: [], deposits: [], tickets: [], workOrders: [],
  statements: [], quotations: [], contracts: [], documents: [], notifications: [],
  ...over,
});

test("overdue invoice with a balance is flagged for the tenant", async () => {
  const { deriveActionItems } = await loadModule();
  const items = deriveActionItems(base("tenant", {
    invoices: [
      { id: "i1", invoice_number: "INV-1", status: "overdue", total_amount: 10000, amount_paid: 4000, due_date: "2026-10-01", issued_at: null, created_at: "2026-09-20" },
      { id: "i2", invoice_number: "INV-2", status: "paid", total_amount: 500, amount_paid: 500, due_date: "2026-09-01", issued_at: null, created_at: "2026-08-20" },
    ],
  }));
  assert.equal(items.length, 1);
  assert.equal(items[0].side, "tenant");
  assert.equal(items[0].severity, "overdue");
  assert.match(items[0].title, /₱6,000/);
});

test("owner-side invoices are attributed to the landlord", async () => {
  const { deriveActionItems } = await loadModule();
  const [item] = deriveActionItems(base("owner", {
    invoices: [{ id: "i1", invoice_number: "INV-9", status: "issued", total_amount: 100, amount_paid: 0, due_date: "2026-11-01", issued_at: null, created_at: "2026-10-01" }],
  }));
  assert.equal(item.side, "landlord");
  assert.equal(item.severity, "due");
});

test("contract awaiting signature: sent → signer, signed-by-one → countersign; stale sent is overdue", async () => {
  const { deriveActionItems } = await loadModule();
  const mk = (id, type, status, created_at) => ({ id, type, href: `/c/${id}`, detail: id, status, statusLabel: status, created_at, signed_at: null });
  const items = deriveActionItems(base("tenant", {
    contracts: [
      mk("a", "tenancy", "sent", "2026-10-10"),
      mk("b", "tenancy", "tenant_signed", "2026-10-01"),
      mk("c", "pm", "sent", "2026-09-01"),
      mk("d", "tenancy", "completed", "2026-09-01"),
      mk("e", "tenancy", "draft", "2026-09-01"),
    ],
  }));
  const byId = Object.fromEntries(items.map((i) => [i.id, i]));
  assert.equal(items.length, 3);
  assert.equal(byId["ctr-tenancy-a"].side, "tenant");
  assert.equal(byId["ctr-tenancy-a"].severity, "due");
  assert.equal(byId["ctr-tenancy-b"].side, "landlord");
  assert.equal(byId["ctr-pm-c"].side, "landlord");
  assert.equal(byId["ctr-pm-c"].severity, "overdue");
});

test("lease ending soon is for both parties; deposit held after lease end is for staff", async () => {
  const { deriveActionItems } = await loadModule();
  const items = deriveActionItems(base("tenant", {
    leases: [
      { id: "l1", status: "active", start_date: "2025-10-01", end_date: "2026-11-15", rent_amount: 1, unitLabel: "U1" },
      { id: "l2", status: "ended", start_date: "2024-10-01", end_date: "2025-10-01", rent_amount: 1, unitLabel: "U2" },
      { id: "l3", status: "active", start_date: "2025-10-01", end_date: "2027-10-01", rent_amount: 1, unitLabel: "U3" },
    ],
    deposits: [{ id: "d1", lease_id: "l2", status: "held", amount_held: 20000 }],
  }));
  assert.deepEqual(items.map((i) => [i.id, i.side]).sort(), [["dep-d1", "staff"], ["lease-l1", "both"]]);
});

test("ticket side follows who it is waiting on; closed tickets are ignored", async () => {
  const { deriveActionItems } = await loadModule();
  const t = (id, status, sla = null) => ({ id, ticket_number: id, subject: "s", status, sla_due_at: sla, created_at: "2026-10-01" });
  const items = deriveActionItems(base("tenant", {
    tickets: [t("a", "waiting_on_tenant"), t("b", "waiting_on_owner"), t("c", "in_progress", "2026-10-05"), t("d", "closed")],
  }));
  const side = Object.fromEntries(items.map((i) => [i.id, i.side]));
  assert.deepEqual(side, { "tk-a": "tenant", "tk-b": "landlord", "tk-c": "staff" });
  assert.equal(items.find((i) => i.id === "tk-c").severity, "overdue");
});

test("account setup nags: unlinked portal, missing SPA (owner only)", async () => {
  const { deriveActionItems } = await loadModule();
  const owner = deriveActionItems(base("owner", { person: { id: "p", auth_user_id: null, spa_authorization_received: false } }));
  assert.deepEqual(owner.map((i) => i.id).sort(), ["portal", "spa"]);
  const tenant = deriveActionItems(base("tenant", { person: { id: "p", auth_user_id: null } }));
  assert.deepEqual(tenant.map((i) => i.id), ["portal"]);
});

test("items sort overdue → due → info and countBySide tallies", async () => {
  const { deriveActionItems, countBySide } = await loadModule();
  const items = deriveActionItems(base("tenant", {
    person: { id: "p", auth_user_id: null },
    invoices: [
      { id: "i1", invoice_number: "A", status: "issued", total_amount: 1, amount_paid: 0, due_date: "2026-12-01", issued_at: null, created_at: "x" },
      { id: "i2", invoice_number: "B", status: "overdue", total_amount: 1, amount_paid: 0, due_date: "2026-09-01", issued_at: null, created_at: "x" },
    ],
  }));
  assert.deepEqual(items.map((i) => i.severity), ["overdue", "due", "info"]);
  assert.deepEqual(countBySide(items), { tenant: 2, landlord: 0, staff: 1, both: 0 });
});

test("buildActivity merges sources newest first and respects the limit", async () => {
  const { buildActivity } = await loadModule();
  const ev = buildActivity(base("tenant", {
    invoices: [{ id: "i1", invoice_number: "A", status: "issued", total_amount: 5, amount_paid: 0, due_date: "2026-12-01", issued_at: "2026-10-02T00:00:00Z", created_at: "2026-10-01T00:00:00Z" }],
    payments: [{ id: "p1", amount: 5, status: "verified", method: "gcash", received_at: "2026-10-05", created_at: "x", receipt_pdf_path: null }],
    documents: [{ id: "d1", title: "ID", document_type: "id", created_at: "2026-09-01T00:00:00Z" }],
  }), 2);
  assert.equal(ev.length, 2);
  assert.equal(ev[0].kind, "payment");
  assert.equal(ev[1].kind, "invoice");
});
