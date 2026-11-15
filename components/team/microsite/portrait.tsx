import Image from "next/image";
import { Skyline } from "@/components/team/microsite/skyline";
import { initialsOf } from "@/lib/team/queries";

/**
 * The specialist's portrait filling its (relative, sized) parent, or without a
 * photo a composed navy initials plate so a sparse profile still reads as
 * deliberate. `compact` drops the skyline and shrinks the initials for the
 * small identity-band thumbnail.
 */
export function MicrositePortrait({
  name,
  photoUrl,
  sizes,
  priority = false,
  compact = false,
}: {
  name: string;
  photoUrl: string | null;
  sizes: string;
  priority?: boolean;
  compact?: boolean;
}) {
  if (photoUrl) {
    return (
      // Overwritten in place at a fixed storage path, so it bypasses the image
      // optimizer (same reasoning as SpecialistPortrait / ListedBy).
      <Image
        src={photoUrl}
        alt={`Portrait of ${name}`}
        fill
        sizes={sizes}
        unoptimized
        priority={priority}
        className="object-cover object-top"
      />
    );
  }
  return (
    <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-navy-800 via-navy-700 to-navy-600">
      {!compact && <Skyline className="absolute inset-x-0 bottom-0 h-1/2 w-full text-white/10" />}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={`font-display font-bold tracking-tight text-gold-soft ${
            compact ? "text-2xl" : "text-7xl lg:text-8xl"
          }`}
        >
          {initialsOf(name)}
        </span>
      </div>
    </div>
  );
}
