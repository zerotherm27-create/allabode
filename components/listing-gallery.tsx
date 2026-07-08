"use client";

import { useEffect, useState, type ReactNode } from "react";
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
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!lightboxOpen) return;

    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setLightboxOpen(false);
      if (event.key === "ArrowLeft") {
        setIndex((i) => (images.length > 0 ? (i - 1 + images.length) % images.length : 0));
      }
      if (event.key === "ArrowRight") {
        setIndex((i) => (images.length > 0 ? (i + 1 + images.length) % images.length : 0));
      }
    }
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [lightboxOpen, images.length]);

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
    <>
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
        <button
          type="button"
          aria-label={`Open photo ${index + 1} of ${images.length}`}
          onClick={() => setLightboxOpen(true)}
          className="absolute inset-0 cursor-zoom-in"
        />
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
                onClick={() => {
                  setIndex(visibleThumbs.length);
                  setLightboxOpen(true);
                }}
                className="flex h-14 w-20 items-center justify-center rounded-md border-2 border-white/70 bg-navy/70 text-sm font-semibold text-white backdrop-blur-md sm:h-16 sm:w-24"
              >
                +{remaining}
              </button>
            )}
          </div>
        )}

        {children}
      </div>

      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`${title} photo gallery`}
            className="fixed inset-0 z-[100] flex flex-col bg-navy/95 text-white"
            initial={{ opacity: shouldReduceMotion ? 1 : 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: shouldReduceMotion ? 1 : 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
          >
            <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
              <p className="text-sm font-medium text-white/80">
                Photo {index + 1} of {images.length}
              </p>
              <button
                type="button"
                aria-label="Close photo gallery"
                onClick={() => setLightboxOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20"
              >
                <Icon name="close" size={24} />
              </button>
            </div>

            <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-5 sm:px-8">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={`lightbox-${index}`}
                  className="relative h-full max-h-[calc(100dvh-8.5rem)] w-full"
                  initial={{ opacity: shouldReduceMotion ? 1 : 0, scale: shouldReduceMotion ? 1 : 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: shouldReduceMotion ? 1 : 0, scale: shouldReduceMotion ? 1 : 0.98 }}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.2, ease: "easeOut" }}
                >
                  <Image
                    src={images[index].url}
                    alt={images[index].alt ?? title}
                    fill
                    sizes="100vw"
                    className="object-contain"
                  />
                </motion.div>
              </AnimatePresence>

              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous photo"
                    onClick={() => go(-1)}
                    className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20 sm:left-6"
                  >
                    <Icon name="chevron_left" size={28} />
                  </button>
                  <button
                    type="button"
                    aria-label="Next photo"
                    onClick={() => go(1)}
                    className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20 sm:right-6"
                  >
                    <Icon name="chevron_right" size={28} />
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
