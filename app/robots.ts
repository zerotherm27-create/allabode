import type { MetadataRoute } from "next";
import { getPublicSiteUrl } from "@/lib/url";

// The wildcard rule below already allows these implicitly — listed here by
// name so AI crawlers/answer engines are explicitly, intentionally welcomed
// rather than left to an accident of the default. Same allow/disallow as
// everyone else. Update this list as new agents show up.
const AI_USER_AGENTS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "CCBot",
  "Applebot-Extended",
  "meta-externalagent",
];

export default function robots(): MetadataRoute.Robots {
  const base = getPublicSiteUrl();
  const disallow = ["/admin", "/dashboard", "/portal", "/sign", "/api", "/auth"];
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      ...AI_USER_AGENTS.map((userAgent) => ({ userAgent, allow: "/", disallow })),
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
