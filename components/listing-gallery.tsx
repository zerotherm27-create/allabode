"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Icon } from "@/components/icon";

type GalleryImage = { url: string; alt: string | null };

export function ListingGallery({
  images,
  title,
  gradient,
  children,
}: {
  images: GalleryImage[];
  title: string;
  gradient: string;
  /** Overlay content (e.g. the "Back to listings" link), rendered on top of the gallery. */
  children?: ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const shouldReduceMotion = useReducedMotion();

  if (images.length === 0) {
    return (
      <div className="relative isolate">
        <div className={`aspect-[4/3] max-h-[75vh] w-full bg-gradient-to-br ${gradient} sm:aspect-[3/2]`} />
        <div className="pointer-events-none absolute inset-0 opacity-30 [background:radial-gradient(120%_120%_at_80%_0%,rgba(180,151,90,0.35),transparent_55%)]" />
        {children}
      </div>
    );
  }

  const visibleThumbs = images.slice(0, 4);
  const remaining = images.length - visibleThumbs.length;

  function go(delta: number) {
    setIndex((i) => (i + delta + images.length) % images.length);
  }

  return (
    <div className="relative isolate aspect-[4/3] max-h-[75vh] w-full overflow-hidden bg-navy sm:aspect-[3/2]">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={index}
          className="absolute inset-0"
          initial={{ opacity: shouldReduceMotion ? 1 : 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: shouldReduceMotion ? 1 : 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.35, ease: "easeInOut" }}
        >
          <Image
            src={images[index].url}
            alt={images[index].alt ?? title}
            fill
            priority={index === 0}
            sizes="100vw"
            className="object-cover"
          />
        </motion.div>
      </AnimatePresence>
      <div className="pointer-events-none absolute inset-0 opacity-30 [background:radial-gradient(120%_120%_at_80%_0%,rgba(180,151,90,0.35),transparent_55%)]" />

      {images.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            onClick={() => go(-1)}
            className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-navy/60 text-white backdrop-blur-md transition-colors hover:bg-navy-700"
          >
            <Icon name="chevron_left" size={24} />
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={() => go(1)}
            className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-navy/60 text-white backdrop-blur-md transition-colors hover:bg-navy-700"
          >
            <Icon name="chevron_right" size={24} />
          </button>
        </>
      )}

      {images.length > 1 && (
        <div className="absolute bottom-16 left-4 flex gap-2 sm:bottom-20">
          {visibleThumbs.map((img, i) => (
            <motion.button
              key={img.url}
              type="button"
              aria-label={`View photo ${i + 1} of ${images.length}`}
              aria-current={index === i}
              onClick={() => setIndex(i)}
              whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
              className={`relative h-14 w-20 overflow-hidden rounded-md border-2 sm:h-16 sm:w-24 ${
                index === i ? "border-gold" : "border-white/70"
              }`}
            >
              <Image src={img.url} alt="" fill sizes="100px" className="object-cover" />
            </motion.button>
          ))}
          {remaining > 0 && (
            <button
              type="button"
              aria-label={`View all ${images.length} photos`}
              onClick={() => setIndex(visibleThumbs.length)}
              className="flex h-14 w-20 items-center justify-center rounded-md border-2 border-white/70 bg-navy/70 text-sm font-semibold text-white backdrop-blur-md sm:h-16 sm:w-24"
            >
              +{remaining}
            </button>
          )}
        </div>
      )}

      {children}
    </div>
  );
}
