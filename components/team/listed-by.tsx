import Image from "next/image";
import Link from "next/link";
import type { Listing } from "@/lib/data";
import { initialsOf } from "@/lib/team/queries";

type Specialist = NonNullable<Listing["specialist"]>;

function Avatar({ specialist, px }: { specialist: Specialist; px: number }) {
  const style = { width: px, height: px };
  if (specialist.photoUrl) {
    return (
      // The portrait is overwritten in place at a fixed storage path, so it
      // bypasses the image optimizer (whose long cache TTL would pin a stale
      // photo). It is a ~800x1000 JPEG shown as a small circle.
      <Image
        src={specialist.photoUrl}
        alt=""
        width={px}
        height={px}
        unoptimized
        style={style}
        className="shrink-0 rounded-full bg-surface-gray object-cover object-top"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      style={style}
      className="flex shrink-0 items-center justify-center rounded-full bg-navy font-display text-xs font-semibold text-white"
    >
      {initialsOf(specialist.name)}
    </span>
  );
}

/**
 * "Listed by <specialist>" with a small circular portrait (initials fallback),
 * linking to the specialist's profile. House listings render nothing at
 * size "sm" (cards) and "All Abode Property Solutions" at size "lg" (detail).
 * Rendered as a sibling of the card's own links, never inside them.
 */
export function ListedBy({
  specialist,
  size,
}: {
  specialist?: Listing["specialist"];
  size: "sm" | "lg";
}) {
  if (!specialist) {
    if (size === "sm") return null;
    return (
      <p className="text-sm text-slate">
        Listed by <span className="font-medium text-navy">All Abode Property Solutions</span>
      </p>
    );
  }

  if (size === "sm") {
    return (
      <Link
        href={`/team/${specialist.slug}`}
        className="group/listed -mx-2 mt-1 flex min-h-[44px] min-w-0 items-center gap-2.5 px-2 text-sm text-slate transition-colors hover:text-navy-700"
      >
        <Avatar specialist={specialist} px={28} />
        <span className="min-w-0 truncate">
          Listed by <span className="font-medium text-navy group-hover/listed:text-navy-700">{specialist.name}</span>
        </span>
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Avatar specialist={specialist} px={48} />
      <div className="min-w-0">
        <Link
          href={`/team/${specialist.slug}`}
          className="flex min-h-[44px] items-center text-sm text-slate transition-colors hover:text-navy-700"
        >
          Listed by{" "}
          <span className="font-medium text-navy">{specialist.name}</span>
        </Link>
        {specialist.licenseLine && (
          <p className="text-xs text-slate">{specialist.licenseLine}</p>
        )}
      </div>
    </div>
  );
}
