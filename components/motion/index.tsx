"use client";

/**
 * Shared scroll-reveal animation primitives for the marketing site.
 *
 * Server pages stay server components; these are small client leaves that
 * wrap sections/cards. Transform + opacity only, entrances 150-300ms with
 * ease-out, and `useReducedMotion` collapses everything to instant so the
 * content is never hidden for reduced-motion users.
 */

import { motion, useReducedMotion, type Variants } from "motion/react";
import type { ComponentPropsWithoutRef, ElementType } from "react";
import { useState } from "react";

export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

export const DUR_FAST = 0.15; // matches --dur-fast: 150ms
export const DUR_MID = 0.25; // matches --dur-mid: 250ms

/** Hover/tap scale feedback, reduced-motion-safe. Reused across Button-like elements. */
export function pressable(reduced: boolean) {
  return {
    whileHover: reduced ? undefined : { scale: 1.05 },
    whileTap: reduced ? undefined : { scale: 0.95 },
  };
}

function revealVariants(reduced: boolean, y: number): Variants {
  return {
    hidden: reduced ? { opacity: 1, y: 0 } : { opacity: 0, y },
    visible: {
      opacity: 1,
      y: 0,
      transition: reduced ? { duration: 0 } : { duration: 0.3, ease: EASE_OUT },
    },
  };
}

type RevealProps = {
  /** Rendered element. Defaults to a div. */
  as?: "div" | "section" | "span" | "li" | "ul" | "ol" | "p" | "h2" | "h3";
  /** Entrance travel distance in px (transform only). */
  y?: number;
  /** Delay in seconds, for simple manual sequencing inside a hero. */
  delay?: number;
  className?: string;
  children?: React.ReactNode;
};

/** Fade + rise once when scrolled into view. */
export function Reveal({ as = "div", y = 24, delay = 0, className, children }: RevealProps) {
  const reduced = useReducedMotion() ?? false;
  const Tag = motion[as] as ElementType;
  return (
    <Tag
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.25 }}
      variants={revealVariants(reduced, y)}
      transition={reduced ? { duration: 0 } : { duration: 0.3, ease: EASE_OUT, delay }}
    >
      {children}
    </Tag>
  );
}

type StaggerGroupProps = {
  as?: "div" | "ul" | "ol" | "section";
  /** Seconds between each child's entrance. */
  stagger?: number;
  className?: string;
  children?: React.ReactNode;
} & Pick<ComponentPropsWithoutRef<"div">, "id" | "role" | "aria-label">;

/** Container that staggers its StaggerItem children as it enters the viewport. */
export function StaggerGroup({
  as = "div",
  stagger = 0.08,
  className,
  children,
  ...rest
}: StaggerGroupProps) {
  const reduced = useReducedMotion() ?? false;
  const Tag = motion[as] as ElementType;
  return (
    <Tag
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: "some" }}
      variants={{
        hidden: {},
        visible: {
          transition: reduced ? {} : { staggerChildren: stagger },
        },
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

type StaggerItemProps = {
  as?: "div" | "li" | "span" | "article";
  y?: number;
  className?: string;
  children?: React.ReactNode;
};

/** Child of StaggerGroup; inherits the group's stagger timing via variants. */
export function StaggerItem({ as = "div", y = 20, className, children }: StaggerItemProps) {
  const reduced = useReducedMotion() ?? false;
  const Tag = motion[as] as ElementType;
  return (
    <Tag className={className} variants={revealVariants(reduced, y)}>
      {children}
    </Tag>
  );
}

type AmbientHeroProps = {
  image: string;
  /** CSS background-position keyword(s), e.g. "center" or "top left". */
  position?: string;
  className?: string;
};

/**
 * Slow, looping camera-drift background (aerial-screensaver feel) for a
 * single hero photo. Baseline scale(1.1) leaves headroom so the drift
 * never exposes an edge; the parent must clip with `overflow-hidden`.
 */
export function AmbientHero({ image, position = "center", className }: AmbientHeroProps) {
  const reduced = useReducedMotion() ?? false;
  return (
    <motion.div
      className={className}
      style={{ backgroundImage: `url(${image})`, backgroundPosition: position }}
      initial={{ scale: 1.1, x: "0%", y: "0%" }}
      animate={
        reduced
          ? { scale: 1.08 }
          : {
              scale: [1.1, 1.14, 1.1],
              x: ["0%", "-2.5%", "2%", "0%"],
              y: ["0%", "1.5%", "-1.5%", "0%"],
            }
      }
      transition={
        reduced
          ? { duration: 0 }
          : { duration: 32, repeat: Infinity, repeatType: "mirror", ease: EASE_IN_OUT }
      }
    />
  );
}

type VideoHeroProps = {
  video: string;
  /** Fallback image: used as the <video> poster and as the reduced-motion background. */
  poster?: string;
  posterPosition?: string;
  className?: string;
  onError?: () => void;
};

/**
 * Autoplaying, looping, muted background video for the homepage hero.
 * Reduced-motion users never get a <video> mounted at all — they see the
 * poster image via AmbientHero's frozen treatment instead, reusing that
 * component rather than duplicating a static-frame implementation.
 */
export function VideoHero({ video, poster, posterPosition = "center", className, onError }: VideoHeroProps) {
  const reduced = useReducedMotion() ?? false;

  if (reduced) {
    return poster ? <AmbientHero image={poster} position={posterPosition} className={className} /> : null;
  }

  return (
    <video
      className={className}
      src={video}
      poster={poster || undefined}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      onError={onError}
    />
  );
}

type HeroBackgroundProps = {
  heroImage: string;
  heroImagePosition: string;
  heroVideo: string;
};

/**
 * Homepage hero background stack: video-or-image layer, gold radial glow,
 * left-to-right legibility scrim. Owns the video error-fallback state, which
 * is why this is a client component even though the page itself is a server
 * component. Video takes precedence over the image when both are set; the
 * image doubles as the video's poster and as its load-failure fallback.
 */
export function HeroBackground({ heroImage, heroImagePosition, heroVideo }: HeroBackgroundProps) {
  const [videoFailed, setVideoFailed] = useState(false);
  const showVideo = !!heroVideo && !videoFailed;
  const showImage = !showVideo && !!heroImage;

  return (
    <>
      {showVideo && (
        <VideoHero
          video={heroVideo}
          poster={heroImage}
          posterPosition={heroImagePosition}
          className="absolute inset-0 -z-10 h-full w-full object-cover opacity-30"
          onError={() => setVideoFailed(true)}
        />
      )}
      {showImage && (
        <AmbientHero
          image={heroImage}
          position={heroImagePosition}
          className="absolute inset-0 -z-10 bg-no-repeat bg-cover opacity-30"
        />
      )}
      <div className="absolute inset-0 -z-10 opacity-60 [background:radial-gradient(80%_60%_at_85%_15%,rgba(180,151,90,0.28),transparent_60%)]" />
      {(showVideo || showImage) && (
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-navy/70 via-navy/35 to-transparent sm:from-navy/60 sm:via-navy/20 sm:to-transparent" />
      )}
    </>
  );
}
