export type SessionRow = {
  id: string;
  created_at: string;
  last_seen_at: string;
  duration_seconds: number;
  landing_path: string;
  page_count: number;
  device_type: string;
  os: string | null;
  browser: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  referrer: string | null;
  utm_source: string | null;
};

export type PageviewRow = {
  session_id: string;
  path: string;
  occurred_at: string;
};

export type RankedItem = { label: string; count: number; pct: number };

export type AnalyticsSummary = {
  totals: {
    sessions: number;
    pageviews: number;
    avgDurationSeconds: number;
    bounceRate: number;
  };
  timeseries: { date: string; sessions: number; pageviews: number }[];
  breakdowns: {
    deviceType: RankedItem[];
    os: RankedItem[];
    browser: RankedItem[];
    topPages: RankedItem[];
    topCountries: RankedItem[];
    topRegions: RankedItem[];
    trafficSources: RankedItem[];
  };
};

const BUSINESS_TIMEZONE = "Asia/Manila";
const TOP_N = 8;

/** Day-bucket key in the business timezone — a deliberate hardcode rather
 *  than a general timezone system, since this is a single-region site. */
function dayKey(iso: string, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date(iso)); // "YYYY-MM-DD"
}

function rank(counts: Map<string, number>, total: number, limit = TOP_N): RankedItem[] {
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count, pct: total > 0 ? (count / total) * 100 : 0 }));
}

function bump(counts: Map<string, number>, key: string | null | undefined) {
  if (!key) return;
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

function trafficSourceFor(row: SessionRow): string {
  if (row.utm_source) return row.utm_source;
  if (row.referrer) {
    try {
      const hostname = new URL(row.referrer).hostname.replace(/^www\./, "");
      if (hostname) return hostname;
    } catch {
      // fall through to "direct"
    }
  }
  return "direct";
}

export function aggregateAnalytics(
  sessions: SessionRow[],
  pageviews: PageviewRow[],
  rangeStart: Date,
  rangeEnd: Date,
  timeZone: string = BUSINESS_TIMEZONE
): AnalyticsSummary {
  const totalSessions = sessions.length;
  const totalPageviews = pageviews.length;

  const avgDurationSeconds =
    totalSessions > 0
      ? Math.round(sessions.reduce((sum, s) => sum + s.duration_seconds, 0) / totalSessions)
      : 0;
  const bounced = sessions.filter((s) => s.page_count === 1).length;
  const bounceRate = totalSessions > 0 ? (bounced / totalSessions) * 100 : 0;

  // ---- time series (one bucket per calendar day in range, in order) ----
  const dayBuckets = new Map<string, { sessions: number; pageviews: number }>();
  for (let cursor = new Date(rangeStart); cursor <= rangeEnd; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    dayBuckets.set(dayKey(cursor.toISOString(), timeZone), { sessions: 0, pageviews: 0 });
  }
  for (const s of sessions) {
    const key = dayKey(s.created_at, timeZone);
    const bucket = dayBuckets.get(key);
    if (bucket) bucket.sessions += 1;
  }
  for (const p of pageviews) {
    const key = dayKey(p.occurred_at, timeZone);
    const bucket = dayBuckets.get(key);
    if (bucket) bucket.pageviews += 1;
  }
  const timeseries = Array.from(dayBuckets.entries()).map(([date, v]) => ({ date, ...v }));

  // ---- breakdowns ----
  const deviceCounts = new Map<string, number>();
  const osCounts = new Map<string, number>();
  const browserCounts = new Map<string, number>();
  const countryCounts = new Map<string, number>();
  const regionCounts = new Map<string, number>();
  const sourceCounts = new Map<string, number>();

  for (const s of sessions) {
    bump(deviceCounts, s.device_type);
    bump(osCounts, s.os);
    bump(browserCounts, s.browser);
    bump(countryCounts, s.country);
    bump(regionCounts, s.region ? (s.country ? `${s.region}, ${s.country}` : s.region) : null);
    bump(sourceCounts, trafficSourceFor(s));
  }

  const pageCounts = new Map<string, number>();
  for (const p of pageviews) bump(pageCounts, p.path);

  return {
    totals: {
      sessions: totalSessions,
      pageviews: totalPageviews,
      avgDurationSeconds,
      bounceRate,
    },
    timeseries,
    breakdowns: {
      deviceType: rank(deviceCounts, totalSessions),
      os: rank(osCounts, totalSessions),
      browser: rank(browserCounts, totalSessions),
      topPages: rank(pageCounts, totalPageviews),
      topCountries: rank(countryCounts, totalSessions),
      topRegions: rank(regionCounts, totalSessions),
      trafficSources: rank(sourceCounts, totalSessions),
    },
  };
}
