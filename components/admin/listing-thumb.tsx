import Image from "next/image";
import { Icon } from "@/components/icon";

export type ListingImageRef = { url: string; sort_order: number };

/** First photo by sort order, or undefined. */
export function firstImageUrl(images: ListingImageRef[] | null | undefined): string | undefined {
  return [...(images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0]?.url;
}

/** Small photo so a listing is recognisable at a glance in dashboard tables. */
export function ListingThumb({ url, title }: { url?: string; title: string }) {
  return (
    <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-md bg-surface-gray">
      {url ? (
        <Image src={url} alt={`Photo of ${title}`} fill sizes="80px" className="object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-slate-soft" aria-label="No photo">
          <Icon name="photo_library" size={22} />
        </span>
      )}
    </div>
  );
}
