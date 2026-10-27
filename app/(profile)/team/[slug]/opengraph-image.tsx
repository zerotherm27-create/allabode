import { ImageResponse } from "next/og";
import { getPublicSpecialist } from "@/lib/team/public-queries";
import { initialsOf, isValidSpecialistSlug } from "@/lib/team/queries";
import { site } from "@/lib/site";

export const alt = "Property specialist at All Abode Property Solutions";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// next/og renders without the site's CSS, so the brand tokens are written out here
// (navy #0a2540, gold #b4975a, cream #f7f4ee), matching app/globals.css.
const NAVY = "#0a2540";
const GOLD = "#b4975a";
const CREAM = "#f7f4ee";

/** The portrait as a data URI (so a slow or broken photo can never fail the whole image). */
async function portraitDataUri(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "image/jpeg";
    if (!/^image\/(jpeg|png)/.test(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 4_000_000) return null;
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const specialist = isValidSpecialistSlug(slug) ? await getPublicSpecialist(slug) : null;
  const name = specialist?.name ?? site.name;
  const tagline = specialist?.tagline ?? "Property guidance with a personal touch";
  const photo = await portraitDataUri(specialist?.photoUrl ?? null);

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: NAVY, color: "#ffffff" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            flex: 1,
            padding: "56px 56px 48px 64px",
          }}
        >
          <div style={{ display: "flex", color: GOLD, fontSize: 24, letterSpacing: 6, fontWeight: 700 }}>
            PROPERTY SPECIALIST
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: name.length > 22 ? 56 : 72, fontWeight: 700, lineHeight: 1.05 }}>
              {name}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 24,
                fontSize: 32,
                lineHeight: 1.3,
                color: "rgba(255,255,255,0.8)",
                maxWidth: 600,
              }}
            >
              {tagline.length > 90 ? `${tagline.slice(0, 87)}...` : tagline}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", width: 72, height: 4, background: GOLD, marginBottom: 20 }} />
            <div style={{ display: "flex", fontSize: 28, fontWeight: 700 }}>{site.name}</div>
            <div style={{ display: "flex", marginTop: 6, fontSize: 24, color: "rgba(255,255,255,0.7)" }}>
              {site.domain}
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            width: 504,
            height: 630,
            alignItems: "center",
            justifyContent: "center",
            background: CREAM,
          }}
        >
          {photo ? (
            <img src={photo} alt="" width={504} height={630} style={{ width: 504, height: 630, objectFit: "cover", objectPosition: "top" }} />
          ) : (
            <div style={{ display: "flex", fontSize: 160, fontWeight: 700, color: NAVY }}>
              {initialsOf(name) || "AA"}
            </div>
          )}
        </div>
      </div>
    ),
    { ...size },
  );
}
