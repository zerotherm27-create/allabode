import { protos } from "@google-analytics/data";
import { getGaClient, getPropertyId } from "@/lib/google-analytics/client";
import type { AnalyticsSummary, RankedItem } from "@/lib/analytics/aggregate";

type IRunReportResponse = protos.google.analytics.data.v1beta.IRunReportResponse;

const RANGE_DAYS: Record<string, number> = { "24h": 1, "7d": 7, "30d": 30, "90d": 90 };
const TOP_N = 8;
// GA4's batchRunReports caps a single call at 5 requests.
const BATCH_LIMIT = 5;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function startDateFor(days: number): string {
  return days <= 1 ? "today" : `${days - 1}daysAgo`;
}

function dim(row: protos.google.analytics.data.v1beta.IRow, index: number): string {
  return row.dimensionValues?.[index]?.value ?? "(not set)";
}

function metric(row: protos.google.analytics.data.v1beta.IRow, index: number): number {
  return Number(row.metricValues?.[index]?.value ?? 0);
}

function rankFromReport(report: IRunReportResponse | undefined, total: number): RankedItem[] {
  const rows = report?.rows ?? [];
  return rows.map((row) => {
    const count = metric(row, 0);
    return { label: dim(row, 0), count, pct: total > 0 ? (count / total) * 100 : 0 };
  });
}

export async function shapeGoogleAnalyticsSummary(range: string): Promise<AnalyticsSummary> {
  const days = RANGE_DAYS[range] ?? RANGE_DAYS["7d"];
  const dateRanges = [{ startDate: startDateFor(days), endDate: "today" }];

  const client = getGaClient();
  const propertyName = `properties/${getPropertyId()}`;

  // Indices below (0-8) are relied on when reading the flattened `reports` result.
  const requests: protos.google.analytics.data.v1beta.IRunReportRequest[] = [
    // 0: totals
    {
      dateRanges,
      metrics: [
        { name: "sessions" },
        { name: "screenPageViews" },
        { name: "bounceRate" },
        { name: "averageSessionDuration" },
      ],
    },
    // 1: timeseries
    {
      dateRanges,
      dimensions: [{ name: "date" }],
      metrics: [{ name: "sessions" }, { name: "screenPageViews" }],
      orderBys: [{ dimension: { dimensionName: "date" } }],
    },
    // 2: device type
    {
      dateRanges,
      dimensions: [{ name: "deviceCategory" }],
      metrics: [{ name: "sessions" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: TOP_N,
    },
    // 3: operating system
    {
      dateRanges,
      dimensions: [{ name: "operatingSystem" }],
      metrics: [{ name: "sessions" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: TOP_N,
    },
    // 4: browser
    {
      dateRanges,
      dimensions: [{ name: "browser" }],
      metrics: [{ name: "sessions" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: TOP_N,
    },
    // 5: top pages
    {
      dateRanges,
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "screenPageViews" }],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: TOP_N,
    },
    // 6: top countries
    {
      dateRanges,
      dimensions: [{ name: "country" }],
      metrics: [{ name: "sessions" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: TOP_N,
    },
    // 7: top regions (country + region)
    {
      dateRanges,
      dimensions: [{ name: "country" }, { name: "region" }],
      metrics: [{ name: "sessions" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: TOP_N,
    },
    // 8: traffic sources
    {
      dateRanges,
      dimensions: [{ name: "sessionDefaultChannelGroup" }],
      metrics: [{ name: "sessions" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: TOP_N,
    },
  ];

  const batches = await Promise.all(
    chunk(requests, BATCH_LIMIT).map(async (requestsChunk) => {
      const [batch] = await client.batchRunReports({ property: propertyName, requests: requestsChunk });
      return batch.reports ?? [];
    })
  );
  const reports = batches.flat();
  const totalsRow = reports[0]?.rows?.[0];
  const sessions = totalsRow ? metric(totalsRow, 0) : 0;
  const pageviews = totalsRow ? metric(totalsRow, 1) : 0;
  const bounceRate = totalsRow ? metric(totalsRow, 2) * 100 : 0;
  const avgDurationSeconds = totalsRow ? Math.round(metric(totalsRow, 3)) : 0;

  const timeseries = (reports[1]?.rows ?? []).map((row) => ({
    date: `${dim(row, 0).slice(0, 4)}-${dim(row, 0).slice(4, 6)}-${dim(row, 0).slice(6, 8)}`,
    sessions: metric(row, 0),
    pageviews: metric(row, 1),
  }));

  const topRegions: RankedItem[] = (reports[7]?.rows ?? []).map((row) => {
    const country = dim(row, 0);
    const region = dim(row, 1);
    const count = metric(row, 0);
    const label = region !== "(not set)" ? `${region}, ${country}` : country;
    return { label, count, pct: sessions > 0 ? (count / sessions) * 100 : 0 };
  });

  return {
    totals: { sessions, pageviews, avgDurationSeconds, bounceRate },
    timeseries,
    breakdowns: {
      deviceType: rankFromReport(reports[2], sessions),
      os: rankFromReport(reports[3], sessions),
      browser: rankFromReport(reports[4], sessions),
      topPages: rankFromReport(reports[5], pageviews),
      topCountries: rankFromReport(reports[6], sessions),
      topRegions,
      trafficSources: rankFromReport(reports[8], sessions),
    },
  };
}
