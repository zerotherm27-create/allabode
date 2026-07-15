import { ImageResponse } from "next/og";
import fs from "fs";
import path from "path";
import { site } from "@/lib/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${site.name} — ${site.tagline}`;

/** Default social-share image for every marketing page (Facebook, LinkedIn,
 *  Slack, WhatsApp, etc.) — pages don't need their own unless they want to
 *  override this. Individual pages still set their own openGraph title/
 *  description; only the image is shared sitewide via this file convention. */
export default async function Image() {
  const logoBase64 = fs
    .readFileSync(path.join(process.cwd(), "public/logo/logo-2-white.png"))
    .toString("base64");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a2540",
          backgroundImage: "linear-gradient(135deg, #0a2540 0%, #0d3a63 100%)",
        }}
      >
        <img
          src={`data:image/png;base64,${logoBase64}`}
          alt=""
          width={480}
          height={150}
          style={{ objectFit: "contain" }}
        />
        <div
          style={{
            marginTop: 36,
            fontSize: 30,
            color: "#b4975a",
            letterSpacing: 3,
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          {site.descriptor}
        </div>
        <div style={{ marginTop: 18, fontSize: 22, color: "rgba(255,255,255,0.55)" }}>
          {site.domain}
        </div>
      </div>
    ),
    { ...size }
  );
}
