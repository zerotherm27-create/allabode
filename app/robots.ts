import type { MetadataRoute } from "next";
import { getPublicSiteUrl } from "@/lib/url";

export default function robots(): MetadataRoute.Robots {
  const base = getPublicSiteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/dashboard", "/portal", "/sign", "/api", "/auth"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
