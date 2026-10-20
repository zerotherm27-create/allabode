import test from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./helpers/load-ts.mjs";

const { listingRow, specialistListingRow, specialistListingSlug, SPECIALIST_STATUSES, slugify } = await loadTs(
  "lib/admin/listing-row.ts"
);

function form(entries) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
}

test("listingRow parses amenities, dates and featured flag", () => {
  const row = listingRow(
    form({ title: "A", amenities: "Pool, Gym ,", availability_date: "2026-13-45", is_featured: "on" })
  );
  assert.deepEqual(row.amenities, ["Pool", "Gym"]);
  assert.equal(row.availability_date, null);
  assert.equal(row.is_featured, true);
});

test("slugify", () => {
  assert.equal(slugify("  Hello, World! "), "hello-world");
});

const PRIVATE_KEYS = [
  "is_featured", "specialist_id", "approval_status", "unit_id", "slug",
  "owner_name", "owner_contact", "internal_notes", "private_address",
];

test("specialistListingRow strips privileged and staff-only fields", () => {
  const entries = {
    title: "A",
    is_featured: "on",
    specialist_id: "other",
    approval_status: "approved",
    unit_id: "x",
    slug: "custom",
    owner_name: "Seller",
    owner_contact: "0917",
    internal_notes: "secret",
    private_address: "1 Hidden St",
    status: "Available",
  };
  for (const mode of ["create", "update"]) {
    const row = specialistListingRow(form(entries), mode);
    for (const k of PRIVATE_KEYS) assert.equal(k in row, false, `${mode}: ${k}`);
    assert.equal(row.title, "A");
    assert.equal(row.status, "Available");
  }
});

test("specialistListingRow: Published or missing status falls back on create, is left alone on update", () => {
  assert.equal(specialistListingRow(form({ title: "A", status: "Published" }), "create").status, "Draft");
  assert.equal(specialistListingRow(form({ title: "A" }), "create").status, "Draft");
  assert.equal("status" in specialistListingRow(form({ title: "A", status: "Published" }), "update"), false);
  assert.equal("status" in specialistListingRow(form({ title: "A" })), false);
});

test("specialistListingRow keeps allowed statuses and defaults title", () => {
  assert.equal(specialistListingRow(form({ status: "Sold" })).status, "Sold");
  const row = specialistListingRow(form({}), "create");
  assert.equal(row.title, "Untitled");
  assert.deepEqual([...SPECIALIST_STATUSES], ["Draft", "Available", "Reserved", "Leased", "Sold", "Archived"]);
});

test("specialistListingSlug derives from the title and avoids route collisions", () => {
  assert.equal(specialistListingSlug("2BR Condo in BGC!"), "2br-condo-in-bgc");
  assert.equal(specialistListingSlug(""), "listing");
  assert.equal(specialistListingSlug("Parking"), "parking-listing");
  assert.equal(specialistListingSlug("Lots"), "lots-listing");
  assert.equal(specialistListingSlug("2BR Condo", "a1b2c3"), "2br-condo-a1b2c3");
});
