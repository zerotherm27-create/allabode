import type { CSSProperties } from "react";

type IconProps = {
  /** Material Symbols Outlined ligature name, e.g. "search", "home_work". */
  name: string;
  className?: string;
  /** Font size in px (drives the glyph size via font-size). */
  size?: number;
  /** Fill 0 (outlined) or 1 (filled). */
  fill?: 0 | 1;
  /** Optical weight 100–700. */
  weight?: number;
  "aria-hidden"?: boolean;
};

/**
 * Thin wrapper over Material Symbols Outlined (loaded in app/layout.tsx).
 * Inherits `currentColor`, so colour it with text-* utilities on a parent.
 */
export function Icon({
  name,
  className,
  size = 24,
  fill = 0,
  weight = 400,
  "aria-hidden": ariaHidden = true,
}: IconProps) {
  const style: CSSProperties = {
    fontSize: size,
    lineHeight: 1,
    fontVariationSettings: `'FILL' ${fill}, 'wght' ${weight}, 'GRAD' 0, 'opsz' ${size}`,
  };
  return (
    <span
      aria-hidden={ariaHidden}
      className={`material-symbols-outlined select-none${className ? ` ${className}` : ""}`}
      style={style}
    >
      {name}
    </span>
  );
}
