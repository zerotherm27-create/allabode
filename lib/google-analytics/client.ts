import { BetaAnalyticsDataClient } from "@google-analytics/data";

export function isGoogleAnalyticsConfigured(): boolean {
  return !!(process.env.GA4_PROPERTY_ID && process.env.GOOGLE_ANALYTICS_SERVICE_ACCOUNT_KEY);
}

export function getPropertyId(): string {
  return process.env.GA4_PROPERTY_ID ?? "";
}

export function getGaClient(): BetaAnalyticsDataClient {
  const keyJson = process.env.GOOGLE_ANALYTICS_SERVICE_ACCOUNT_KEY;
  if (!keyJson) throw new Error("GOOGLE_ANALYTICS_SERVICE_ACCOUNT_KEY not set");

  const key = JSON.parse(keyJson) as {
    client_email: string;
    private_key: string;
  };

  return new BetaAnalyticsDataClient({
    credentials: {
      client_email: key.client_email,
      private_key: key.private_key,
    },
  });
}
