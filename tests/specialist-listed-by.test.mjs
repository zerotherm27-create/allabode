import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const { specialistPhotoUrl, initialsOf } = await loadTs("lib/team/queries.ts");

const ID = "0b9c1f4e-1a2b-4c3d-8e9f-0123456789ab";

test("photo url builds the public bucket url", () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co/";
  assert.equal(
    specialistPhotoUrl(`${ID}/portrait.jpg`),
    `https://abc.supabase.co/storage/v1/object/public/specialist-photos/${ID}/portrait.jpg`,
  );
});

test("photo url rejects anything but {uuid}/portrait.jpg", () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
  for (const bad of [null, undefined, "", "portrait.jpg", `${ID}/other.jpg`, `../${ID}/portrait.jpg`, `${ID}/portrait.jpg?x=1`, `${ID}/../portrait.jpg`]) {
    assert.equal(specialistPhotoUrl(bad), null);
  }
});

test("photo url is null without a base url", () => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  assert.equal(specialistPhotoUrl(`${ID}/portrait.jpg`), null);
});

test("initials", () => {
  assert.equal(initialsOf("Maria Santos"), "MS");
  assert.equal(initialsOf("  maria  de la cruz "), "MC");
  assert.equal(initialsOf("Cher"), "C");
  assert.equal(initialsOf("(Jo) Reyes"), "JR");
  assert.equal(initialsOf(""), "");
  assert.equal(initialsOf(null), "");
  assert.equal(initialsOf("- -"), "");
});
