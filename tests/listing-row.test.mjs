import test from "node:test";
import assert from "node:assert/strict";
import { loadTs } from "./helpers/load-ts.mjs";

const { listingRow, specialistListingRow, SPECIALIST_STATUSES, slugify } = await loadTs(
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

test("specialistListingRow strips privileged fields and Published status", () => {
  const row = specialistListingRow(
    form({
      title: "A",
      is_featured: "on",
      specialist_id: "other",
      approval_status: "approved",
      unit_id: "x",
      status: "Published",
    })
  );
  for (const k of ["is_featured", "specialist_id", "approval_status", "unit_id"]) {
    assert.equal(k in row, false, k);
  }
  assert.equal(row.status, "Draft");
});

test("specialistListingRow keeps allowed statuses and defaults title", () => {
  assert.equal(specialistListingRow(form({ status: "Sold" })).status, "Sold");
  const row = specialistListingRow(form({}));
  assert.equal(row.title, "Untitled");
  assert.equal(row.slug, "untitled");
  assert.deepEqual([...SPECIALIST_STATUSES], ["Draft", "Available", "Reserved", "Leased", "Sold", "Archived"]);
});
