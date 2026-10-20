import assert from "node:assert/strict";
import test from "node:test";
import { loadTs } from "./helpers/load-ts.mjs";

const { licenseLine } = await loadTs("lib/team/license.ts");

test("own licence", () => {
  assert.equal(licenseLine({ licenseMode: "own", licenseNo: "123456" }, null), "PRC License No. 123456");
});

test("own licence without number is null", () => {
  assert.equal(licenseLine({ licenseMode: "own", licenseNo: null }, null), null);
});

test("accredited under broker", () => {
  assert.equal(
    licenseLine(
      { licenseMode: "accredited", licenseNo: null },
      { name: "Aremchel M. Cruzado", licenseNo: "0001234" },
    ),
    "Accredited under Aremchel M. Cruzado, PRC Lic. No. 0001234",
  );
});

test("accredited without broker is null", () => {
  assert.equal(licenseLine({ licenseMode: "accredited", licenseNo: null }, null), null);
});
