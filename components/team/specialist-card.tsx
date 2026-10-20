import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { initialsOf } from "@/lib/team/queries";
import type { PublicSpecialist } from "@/lib/team/public-queries";

/** 4:5 portrait with an initials fallback. Shared by the directory card and the profile page. */
export function SpecialistPortrait({
  name,
  photoUrl,
  sizes,
  priority = false,
  className = "",
}: {
  name: string;
  photoUrl: string | null;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div className={`relative aspect-[4/5] overflow-hidden bg-navy ${className}`}>
      {photoUrl ? (
        // The portrait is overwritten in place at a fixed storage path, so it
        // bypasses the image optimizer (its long cache TTL would pin a stale
        // photo) — same approach as ListedBy.
        <Image
          src={photoUrl}
          alt={`Portrait of ${name}`}
          fill
          sizes={sizes}
          unoptimized
          priority={priority}
          className="object-cover object-top"
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex h-full w-full items-center justify-center bg-gradient-to-br from-navy via-navy-800 to-navy-700 font-display text-5xl font-bold text-gold"
        >
          {initialsOf(name)}
        </span>
      )}
    </div>
  );
}

/**
 * Square headshot for the directory: the stored portrait is a tall 4:5 photo, so
 * it is zoomed in on the top of the frame (face and shoulders) instead of
 * showing the whole picture. The full portrait stays on the profile page.
 */
function Headshot({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  return (
    <div className="relative aspect-square overflow-hidden bg-navy">
      {photoUrl ? (
        <Image
          src={photoUrl}
          alt={`Headshot of ${name}`}
          fill
          sizes="(min-width: 1024px) 300px, (min-width: 640px) 33vw, 100vw"
          unoptimized
          className="origin-[50%_14%] scale-[1.45] object-cover object-top transition-transform duration-700 group-hover:scale-[1.52]"
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex h-full w-full items-center justify-center bg-gradient-to-br from-navy via-navy-800 to-navy-700 font-display text-5xl font-bold text-gold"
        >
          {initialsOf(name)}
        </span>
      )}
    </div>
  );
}

/**
 * Directory card. The whole card is one link to the profile (no nested
 * anchors) so the focus ring wraps the card; the "View profile" row is a
 * visual cue and a 44px-high target. Phone/email are private, so there is no
 * tel: link here.
 */
export function SpecialistCard({ specialist }: { specialist: PublicSpecialist }) {
  const areas = specialist.areas.slice(0, 3).join(" · ");
  return (
    <Link
      href={`/team/${specialist.slug}`}
      className="group flex h-full flex-col overflow-hidden border border-line bg-surface transition-shadow duration-[var(--dur-mid)] hover:shadow-[var(--shadow-card)]"
    >
      <Headshot name={specialist.name} photoUrl={specialist.photoUrl} />
      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-display text-lg font-semibold leading-tight text-navy">
          {specialist.name}
        </h3>
        {specialist.tagline && (
          <p className="mt-2 line-clamp-2 text-sm text-slate">{specialist.tagline}</p>
        )}
        {areas && (
          <p className="mt-3 flex items-start gap-1 text-sm text-slate">
            <Icon name="location_on" size={16} className="mt-0.5 shrink-0 text-gold-ink" />
            <span className="min-w-0 break-words">{areas}</span>
          </p>
        )}
        <span className="label-caps mt-auto flex min-h-[44px] items-center gap-2 pt-4 text-navy transition-colors group-hover:text-gold-ink">
          View profile
          <Icon name="arrow_forward" size={16} />
        </span>
      </div>
    </Link>
  );
}
