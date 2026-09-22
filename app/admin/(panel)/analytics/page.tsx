import { AnalyticsDashboard } from "@/components/admin/analytics-dashboard";

export const metadata = { title: "Site Analytics", robots: { index: false } };

export default function AdminAnalyticsPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <AnalyticsDashboard />
    </div>
  );
}
