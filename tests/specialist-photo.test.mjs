import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const { PHOTO_W, PHOTO_H, computeCenterCrop, jpegDimensions } = await loadTs("lib/team/photo.ts");

test("photo constants are 4:5", () => {
  assert.equal(PHOTO_W, 800);
  assert.equal(PHOTO_H, 1000);
});

test("center crop of a wide image", () => {
  assert.deepEqual(computeCenterCrop(1600, 1000), { x: 400, y: 0, width: 800, height: 1000 });
});

test("center crop of a tall image", () => {
  assert.deepEqual(computeCenterCrop(800, 2000), { x: 0, y: 500, width: 800, height: 1000 });
});

// SOI, JFIF APP0, SOF0 (1x1, one component), EOI
const JPEG_1X1 = new Uint8Array([
  0xff, 0xd8,
  0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
  0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00,
  0xff, 0xd9,
]);

test("reads JPEG dimensions", () => {
  assert.deepEqual(jpegDimensions(JPEG_1X1), { width: 1, height: 1 });
});

test("non-JPEG returns null", () => {
  assert.equal(jpegDimensions(new Uint8Array([1, 2, 3])), null);
});
