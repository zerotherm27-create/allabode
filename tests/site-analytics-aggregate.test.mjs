import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadAggregateModule() {
  const file = path.join(__dirname, "..", "lib", "analytics", "aggregate.ts");
  const source = fs.readFileSync(file, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
}

function session(overrides = {}) {
  return {
    id: "s1",
    created_at: "2026-09-10T04:00:00.000Z", // ~12:00 PHT
    last_seen_at: "2026-09-10T04:00:00.000Z",
    duration_seconds: 60,
    landing_path: "/",
    page_count: 1,
    device_type: "desktop",
    os: "macOS",
    browser: "Chrome",
    country: "PH",
    region: "Metro Manila",
    city: "Makati",
    referrer: null,
    utm_source: null,
    ...overrides,
  };
}

test("bounce rate counts only single-pageview sessions", async () => {
  const { aggregateAnalytics } = await loadAggregateModule();
  const sessions = [
    session({ id: "a", page_count: 1 }),
    session({ id: "b", page_count: 1 }),
    session({ id: "c", page_count: 3 }),
  ];
  const start = new Date("2026-09-10T00:00:00.000Z");
  const end = new Date("2026-09-10T23:59:59.000Z");

  const result = aggregateAnalytics(sessions, [], start, end);

  assert.equal(result.totals.sessions, 3);
  assert.equal(result.totals.bounceRate, (2 / 3) * 100);
});

test("region breakdown combines region and country, skipping unknowns", async () => {
  const { aggregateAnalytics } = await loadAggregateModule();
  const sessions = [
    session({ id: "a", region: "Metro Manila", country: "PH" }),
    session({ id: "b", region: "Metro Manila", country: "PH" }),
    session({ id: "c", region: "Cebu", country: "PH" }),
    session({ id: "d", region: null, country: null }),
  ];
  const start = new Date("2026-09-10T00:00:00.000Z");
  const end = new Date("2026-09-10T23:59:59.000Z");

  const result = aggregateAnalytics(sessions, [], start, end);

  assert.deepEqual(
    result.breakdowns.topRegions.map((r) => r.label),
    ["Metro Manila, PH", "Cebu, PH"]
  );
  assert.equal(result.breakdowns.topRegions[0].count, 2);
});

test("traffic source falls back from utm_source to referrer hostname to direct", async () => {
  const { aggregateAnalytics } = await loadAggregateModule();
  const sessions = [
    session({ id: "a", utm_source: "newsletter", referrer: null }),
    session({ id: "b", utm_source: null, referrer: "https://www.google.com/search?q=all+abode" }),
    session({ id: "c", utm_source: null, referrer: null }),
  ];
  const start = new Date("2026-09-10T00:00:00.000Z");
  const end = new Date("2026-09-10T23:59:59.000Z");

  const result = aggregateAnalytics(sessions, [], start, end);
  const labels = result.breakdowns.trafficSources.map((s) => s.label).sort();

  assert.deepEqual(labels, ["direct", "google.com", "newsletter"]);
});

test("timeseries buckets pageviews by day in the business timezone", async () => {
  const { aggregateAnalytics } = await loadAggregateModule();
  // 2026-09-10T16:30:00Z is already 2026-09-11 early morning in Asia/Manila (UTC+8).
  const pageviews = [{ session_id: "a", path: "/", occurred_at: "2026-09-10T16:30:00.000Z" }];
  const start = new Date("2026-09-10T00:00:00.000Z");
  const end = new Date("2026-09-11T23:59:59.000Z");

  const result = aggregateAnalytics([], pageviews, start, end);
  const bucket = result.timeseries.find((d) => d.date === "2026-09-11");

  assert.ok(bucket, "expected a 2026-09-11 bucket in Asia/Manila time");
  assert.equal(bucket.pageviews, 1);
});
