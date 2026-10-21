import test from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./helpers/load-ts.mjs";

const m = await loadTs("lib/admin/follow-up-templates.ts");
const FIELDS = ["lead_first_name", "specialist_name", "personal_note", "listing_title"];
const good = {
  template_key: "day-3_viewing",
  name: "Viewing offer",
  subject: "Hi {{lead_first_name}}",
  body: "Hello {{lead_first_name}},\n\nFrom {{specialist_name}}.",
  delay_days: "3",
  position: "30",
  audience: "lead",
  is_active: "on",
};

test("extractFields / unknownFields", () => {
  assert.deepEqual(m.extractFields("{{ A }} and {{a}} {{b_2}}"), ["a", "b_2"]);
  assert.deepEqual(m.unknownFields("{{lead_first_name}} {{nope}} {{Nope}}", FIELDS), ["nope"]);
});

test("hasMalformedPlaceholder", () => {
  assert.equal(m.hasMalformedPlaceholder("ok {{lead_first_name}}"), false);
  assert.equal(m.hasMalformedPlaceholder("bad {{lead_first_name"), true);
  assert.equal(m.hasMalformedPlaceholder("bad }} here"), true);
});

test("parseTemplateInput accepts a valid template", () => {
  const r = m.parseTemplateInput(good, FIELDS);
  assert.equal(r.ok, true);
  assert.equal(r.value.delay_days, 3);
  assert.equal(r.value.position, 30);
  assert.equal(r.value.is_active, true);
  assert.deepEqual(r.warnings, []);
});

test("unknown merge fields warn but do not block", () => {
  const r = m.parseTemplateInput({ ...good, body: "Hi {{lead_first_name}} {{pet_name}}" }, FIELDS);
  assert.equal(r.ok, true);
  assert.match(r.warnings[0], /\{\{pet_name\}\}/);
});

test("key, name, subject, body, delay, audience are validated", () => {
  const r = m.parseTemplateInput(
    { ...good, template_key: "Bad Key", name: "", subject: "a\nb", body: "  ", delay_days: "366", audience: "x" },
    FIELDS,
  );
  assert.equal(r.ok, false);
  for (const k of ["template_key", "name", "subject", "body", "delay_days", "audience"]) assert.ok(r.errors[k], k);
});

test("length limits", () => {
  assert.equal(m.parseTemplateInput({ ...good, subject: "a".repeat(200) }, FIELDS).ok, true);
  assert.match(m.parseTemplateInput({ ...good, subject: "a".repeat(201) }, FIELDS).errors.subject, /200/);
  assert.equal(m.parseTemplateInput({ ...good, body: "a".repeat(20000) }, FIELDS).ok, true);
  assert.match(m.parseTemplateInput({ ...good, body: "a".repeat(20001) }, FIELDS).errors.body, /20,000/);
  assert.match(m.parseTemplateInput({ ...good, name: "n".repeat(121) }, FIELDS).errors.name, /120/);
});

test("delay and position must be whole numbers", () => {
  assert.equal(m.parseTemplateInput({ ...good, delay_days: "1.5" }, FIELDS).ok, false);
  assert.equal(m.parseTemplateInput({ ...good, delay_days: "-1" }, FIELDS).ok, false);
  assert.equal(m.parseTemplateInput({ ...good, delay_days: "0" }, FIELDS).ok, true);
  assert.equal(m.parseTemplateInput({ ...good, position: "abc" }, FIELDS).ok, false);
  assert.equal(m.parseTemplateInput({ ...good, position: "" }, FIELDS).value.position, 0);
});

test("key is not required when editing; is_active defaults off", () => {
  const r = m.parseTemplateInput({ ...good, template_key: undefined, is_active: undefined }, FIELDS, { requireKey: false });
  assert.equal(r.ok, true);
  assert.equal(r.value.is_active, false);
});

test("parseLogFilters is defensive", () => {
  const id = "123e4567-e89b-12d3-a456-426614174000";
  assert.deepEqual(m.parseLogFilters({ status: "sent", specialist: id, page: "3" }), { status: "sent", specialistId: id, page: 3 });
  assert.deepEqual(m.parseLogFilters({ status: "x", specialist: "no", page: "-2" }), { status: null, specialistId: null, page: 1 });
  assert.equal(m.parseLogFilters({ page: ["2", "9"] }).page, 2);
});

test("pageRange / totalPages / summariseStatuses", () => {
  assert.deepEqual(m.pageRange(1), { from: 0, to: 24 });
  assert.deepEqual(m.pageRange(3), { from: 50, to: 74 });
  assert.equal(m.totalPages(0), 1);
  assert.equal(m.totalPages(26), 2);
  assert.deepEqual(m.summariseStatuses([{ status: "sent" }, { status: "sent" }, { status: "failed" }, { status: "weird" }]), {
    queued: 0, sent: 2, skipped: 0, failed: 1,
  });
});

test("describeSkipReason and describeNurtureFlags", () => {
  assert.equal(m.describeSkipReason("stage_changed"), "Lead moved on from New");
  assert.equal(m.describeSkipReason("some_new_code"), "some new code");
  assert.equal(m.describeSkipReason(null), "");
  assert.deepEqual(m.describeNurtureFlags("dry_run").dryRun, "on");
  assert.equal(m.describeNurtureFlags("live").enabled, "on");
  assert.equal(m.describeNurtureFlags("disabled").enabled, "off");
});
