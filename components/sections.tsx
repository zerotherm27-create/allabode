import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/ui";
import { Icon } from "@/components/icon";
import { founder } from "@/lib/site";
import type { ReactNode } from "react";

type Crumb = { label: string; href?: string };

/** Founder / licensed-professional credibility (brief: Home + About). */
export function FounderSection({
  eyebrow = "Meet the Founder",
  band = false,
}: {
  eyebrow?: string;
  band?: boolean;
}) {
  return (
    <section className={band ? "bg-surface-gray py-section" : "py-section"}>
      <Container className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[0.8fr_1fr]">
        {/* Portrait (real photo if provided, else a branded placeholder) */}
        <div className="relative mx-auto w-full max-w-sm overflow-hidden rounded-lg border border-line">
          <div className="relative aspect-[4/5] bg-gradient-to-br from-navy via-navy-800 to-navy-700">
            {founder.photo ? (
              <Image
                src={founder.photo}
                alt={founder.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-gold">
                <Icon name="person" size={64} />
                <span className="label-caps text-white/70">Founder portrait</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <p className="label-caps text-gold-ink">{eyebrow}</p>
          <h2 className="mt-3 font-display text-3xl font-bold text-navy sm:text-4xl">
            {founder.name}
          </h2>
          <p className="mt-2 font-display text-lg text-navy-700">{founder.title}</p>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate">
            <span className="flex items-center gap-1.5">
              <Icon name="verified" size={18} className="text-gold-ink" />
              {founder.license}
            </span>
            <span className="flex items-center gap-1.5">
              <Icon name="business_center" size={18} className="text-gold-ink" />
              {founder.relationship}
            </span>
          </div>
          <p className="mt-6 max-w-xl leading-relaxed text-slate">{founder.bio}</p>
        </div>
      </Container>
    </section>
  );
}

/** Inner-page hero: navy band with eyebrow, title, optional subtitle/lead,
 *  optional breadcrumbs, and an optional action slot. */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  lead,
  crumbs,
  image,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  /** Alias for subtitle (kept for call-site compatibility). */
  lead?: string;
  crumbs?: Crumb[];
  image?: string;
  children?: ReactNode;
}) {
  const body = subtitle ?? lead;
  return (
    <section className="relative isolate overflow-hidden bg-navy text-white">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-navy via-navy-800 to-navy-700" />
      {image && (
        <div
          className="absolute inset-0 -z-10 bg-cover bg-center opacity-25"
          style={{ backgroundImage: `url(${image})` }}
        />
      )}
      <div className="absolute inset-0 -z-10 opacity-50 [background:radial-gradient(70%_60%_at_88%_10%,rgba(180,151,90,0.25),transparent_60%)]" />
      <Container className="py-20 md:py-28">
        <div className="max-w-3xl">
          {crumbs && crumbs.length > 0 && (
            <nav
              aria-label="Breadcrumb"
              className="mb-6 flex flex-wrap items-center gap-2 text-sm text-white/60"
            >
              {crumbs.map((c, i) => (
                <span key={c.label} className="flex items-center gap-2">
                  {i > 0 && <Icon name="chevron_right" size={16} />}
                  {c.href ? (
                    <Link href={c.href} className="hover:text-gold">
                      {c.label}
                    </Link>
                  ) : (
                    <span className="text-white/80">{c.label}</span>
                  )}
                </span>
              ))}
            </nav>
          )}
          <span className="label-caps inline-block bg-gold/15 px-4 py-1.5 text-gold-soft ring-1 ring-gold/30">
            {eyebrow}
          </span>
          <h1 className="mt-6 font-display text-[2.25rem] font-bold leading-[1.08] tracking-tight sm:text-5xl">
            {title}
          </h1>
          {body && (
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/80">
              {body}
            </p>
          )}
          {children && <div className="mt-9">{children}</div>}
        </div>
      </Container>
    </section>
  );
}

/** Centered or left-aligned section heading: eyebrow + h2 + lead. */
export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = "center",
  invert = false,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  align?: "center" | "left";
  invert?: boolean;
}) {
  return (
    <div
      className={
        align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"
      }
    >
      {eyebrow && (
        <p className={`label-caps ${invert ? "text-gold" : "text-gold-ink"}`}>{eyebrow}</p>
      )}
      <h2
        className={`mt-3 font-display text-3xl font-bold sm:text-4xl ${
          invert ? "text-white" : "text-navy"
        }`}
      >
        {title}
      </h2>
      {lead && (
        <p className={`mt-4 ${invert ? "text-white/70" : "text-slate"}`}>
          {lead}
        </p>
      )}
    </div>
  );
}

/** Bulleted feature row with an icon (used in service lists). */
export function FeatureItem({
  icon,
  title,
  body,
}: {
  icon: string;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-5">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center bg-navy/5 text-navy-700">
        <Icon name={icon} size={26} />
      </span>
      <div>
        <h3 className="font-display text-lg font-semibold text-navy">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-slate">{body}</p>
      </div>
    </div>
  );
}

/** Closing call-to-action band. */
export function CtaBand({
  title,
  body,
  children,
}: {
  title: string;
  body?: string;
  children: ReactNode;
}) {
  return (
    <section className="bg-surface-gray py-section-lg">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold text-navy sm:text-4xl">
            {title}
          </h2>
          {body && <p className="mt-4 text-lg text-slate">{body}</p>}
          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            {children}
          </div>
        </div>
      </Container>
    </section>
  );
}
