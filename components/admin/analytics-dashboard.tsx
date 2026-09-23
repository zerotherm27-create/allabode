"use client";

import { useEffect, useState } from "react";
import { StatCard } from "@/components/admin/shell";
import { RankedBarList } from "@/components/admin/ranked-bar-list";
import { AnalyticsTimeseriesChart } from "@/components/admin/analytics-timeseries-chart";
import type { AnalyticsSummary } from "@/lib/analytics/aggregate";

const RANGES = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
] as const;

const SOURCES = [
  {
    value: "site",
    label: "Site Analytics",
    endpoint: "/api/admin/analytics",
    description: "Anonymous visitor activity on the public site — first-party, no third-party service.",
    notConfigured: "Site analytics is not configured — add SUPABASE_SERVICE_ROLE_KEY to enable this panel.",
  },
  {
    value: "google",
    label: "Google Analytics",
    endpoint: "/api/admin/google-analytics",
    description: "Live data from Google Analytics (GA4).",
    notConfigured:
      "Google Analytics is not configured — add GOOGLE_ANALYTICS_SERVICE_ACCOUNT_KEY and GA4_PROPERTY_ID to enable this panel.",
  },
] as const;

type Range = (typeof RANGES)[number]["value"];
type Source = (typeof SOURCES)[number]["value"];

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export function AnalyticsDashboard() {
  const [range, setRange] = useState<Range>("7d");
  const [source, setSource] = useState<Source>("site");
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [loading, setLoading] = useState(true);

  const activeSource = SOURCES.find((s) => s.value === source)!;

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- range/source changed, refetch: resetting loading/error state is the point
    setLoading(true);
    setError(null);
    setNotConfigured(false);
    fetch(`${activeSource.endpoint}?range=${range}`)
      .then((res) => {
        if (res.status === 503) throw new Error("not-configured");
        if (!res.ok) throw new Error("Failed to load analytics.");
        return res.json();
      })
      .then((json: AnalyticsSummary) => {
        if (!cancelled) setData(json);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        if (err.message === "not-configured") {
          setNotConfigured(true);
          setData(null);
        } else {
          setError("Couldn't load analytics — try again shortly.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range, activeSource.endpoint]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy">Analytics</h1>
          <p className="mt-1 text-sm text-slate">{activeSource.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-full border border-line bg-surface p-1">
            {SOURCES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setSource(s.value)}
                aria-pressed={source === s.value}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  source === s.value
                    ? "bg-navy text-white"
                    : "text-slate hover:text-navy"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="flex rounded-full border border-line bg-surface p-1">
            {RANGES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRange(r.value)}
                aria-pressed={range === r.value}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  range === r.value
                    ? "bg-navy text-white"
                    : "text-slate hover:text-navy"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {notConfigured && (
        <p className="mt-6 rounded-md border border-line bg-surface px-4 py-3 text-sm text-slate">
          {activeSource.notConfigured}
        </p>
      )}

      {error && (
        <p role="alert" className="mt-6 rounded-md bg-error-bg px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}

      {!notConfigured && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Visitors" value={loading ? "—" : (data?.totals.sessions ?? 0).toLocaleString()} icon="group" />
            <StatCard label="Pageviews" value={loading ? "—" : (data?.totals.pageviews ?? 0).toLocaleString()} icon="visibility" />
            <StatCard
              label="Avg. session"
              value={loading ? "—" : formatDuration(data?.totals.avgDurationSeconds ?? 0)}
              icon="schedule"
            />
            <StatCard
              label="Bounce rate"
              value={loading ? "—" : `${(data?.totals.bounceRate ?? 0).toFixed(0)}%`}
              icon="logout"
            />
          </div>

          <div className="mt-6">
            <AnalyticsTimeseriesChart data={data?.timeseries ?? []} />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <RankedBarList title="Top pages" items={data?.breakdowns.topPages ?? []} />
            <RankedBarList title="Top countries" items={data?.breakdowns.topCountries ?? []} />
            <RankedBarList title="Top regions" items={data?.breakdowns.topRegions ?? []} />
            <RankedBarList title="Device type" items={data?.breakdowns.deviceType ?? []} />
            <RankedBarList title="Operating system" items={data?.breakdowns.os ?? []} />
            <RankedBarList title="Browser" items={data?.breakdowns.browser ?? []} />
            <RankedBarList title="Traffic sources" items={data?.breakdowns.trafficSources ?? []} />
          </div>
        </>
      )}
    </div>
  );
}
