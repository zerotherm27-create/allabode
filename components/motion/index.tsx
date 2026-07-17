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

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

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
      viewport={{ once: true, amount: 0.15 }}
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
