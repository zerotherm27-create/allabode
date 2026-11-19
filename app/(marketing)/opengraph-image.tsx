import { ImageResponse } from "next/og";
import fs from "fs";
import path from "path";
import { site } from "@/lib/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${site.name} — ${site.tagline}`;

const read = (file: string) =>
  fs.readFileSync(path.join(process.cwd(), file)).toString("base64");

/** Default social-share image for every marketing page (Facebook, LinkedIn,
 *  Slack, WhatsApp, etc.). Photo background (public/og/og-bg.jpg) with a navy
 *  scrim on the left so the logo + copy stay legible; logo and text are live,
 *  never baked into the photo. Pages can still set their own openGraph
 *  title/description. */
export default async function Image() {
  const logo = read("public/logo/logo-2-white.png");
  const bg = read("public/og/og-bg.jpg");
  const services = site.descriptor.split("|").map((s) => s.trim());

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          backgroundColor: "#0a2540",
        }}
      >
        <img
          src={`data:image/jpeg;base64,${bg}`}
          alt=""
          width={1200}
          height={630}
          style={{ position: "absolute", top: 0, left: 0, objectFit: "cover" }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundImage:
              "linear-gradient(90deg, rgba(10,37,64,0.92) 0%, rgba(10,37,64,0.7) 42%, rgba(10,37,64,0) 72%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 8,
            backgroundColor: "#b4975a",
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "64px 72px",
            width: 700,
            height: "100%",
          }}
        >
          <img
            src={`data:image/png;base64,${logo}`}
            alt=""
            width={380}
            height={102}
            style={{ objectFit: "contain" }}
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 64,
                lineHeight: 1.05,
                color: "#ffffff",
                fontWeight: 700,
                letterSpacing: -1,
              }}
            >
              {site.tagline}
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                marginTop: 26,
                width: 560,
                fontSize: 24,
                color: "#d4b97c",
                fontWeight: 700,
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              {services.map((s) => (
                <span key={s} style={{ marginRight: 28, marginBottom: 8 }}>
                  {s}
                </span>
              ))}
            </div>
            <div style={{ marginTop: 20, fontSize: 24, color: "rgba(255,255,255,0.75)" }}>
              {site.domain}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
