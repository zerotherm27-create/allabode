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

test("blank or whitespace broker name falls back to the default", () => {
  for (const name of ["", "   "]) {
    assert.equal(
      licenseLine({ licenseMode: "accredited", licenseNo: null }, { name, licenseNo: "0001234" }),
      "Accredited under Aremchel M. Cruzado, PRC Lic. No. 0001234",
    );
  }
});

test("whitespace-only own licence number is null", () => {
  assert.equal(licenseLine({ licenseMode: "own", licenseNo: "   " }, null), null);
});

test("own licence number is trimmed", () => {
  assert.equal(licenseLine({ licenseMode: "own", licenseNo: " 123456 " }, null), "PRC License No. 123456");
});

test("accredited with a blank broker licence number is null", () => {
  assert.equal(
    licenseLine({ licenseMode: "accredited", licenseNo: null }, { name: "X", licenseNo: "  " }),
    null,
  );
});

const { resolveBrokerName, DEFAULT_BROKER_NAME } = await loadTs("lib/team/license.ts");

test("resolveBrokerName trims and falls back", () => {
  assert.equal(DEFAULT_BROKER_NAME, "Aremchel M. Cruzado");
  assert.equal(resolveBrokerName("  Jane Broker "), "Jane Broker");
  assert.equal(resolveBrokerName(""), DEFAULT_BROKER_NAME);
  assert.equal(resolveBrokerName("   "), DEFAULT_BROKER_NAME);
  assert.equal(resolveBrokerName(null), DEFAULT_BROKER_NAME);
  assert.equal(resolveBrokerName(undefined), DEFAULT_BROKER_NAME);
});
