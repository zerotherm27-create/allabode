import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/* ---- Container: brand 1280px grid with responsive gutters ---- */
export function Container({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`container-site${className ? ` ${className}` : ""}`}>
      {children}
    </div>
  );
}

/* ---- Button: brand variants, renders <Link> when href is set ---- */
type Variant = "primary" | "secondary" | "ghost" | "ghost-light" | "gold";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 label-caps text-center cursor-pointer rounded-lg transition-all duration-[var(--dur-mid)] ease-[var(--ease-out)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed";

const variants: Record<Variant, string> = {
  // Solid navy, white label — the workhorse CTA
  primary: "bg-navy text-white hover:bg-navy-800",
  // Transparent with gold label + border — premium secondary (light-surface default)
  secondary: "border border-gold-ink text-gold-ink hover:bg-gold-ink hover:text-white",
  // Navy outline on light surfaces
  ghost: "border border-navy text-navy hover:bg-navy hover:text-white",
  // Glassy outline for dark/photographic backgrounds
  "ghost-light": "border border-white/30 bg-white/10 text-white backdrop-blur-md hover:bg-white/20",
  // Warm gold fill — for highest-priority CTAs (List Your Property)
  gold: "bg-gold text-navy hover:bg-gold-bright",
};

const sizes: Record<Size, string> = {
  md: "px-6 py-3 text-caps",
  lg: "px-8 py-4 text-caps",
};

type ButtonOwnProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
};

type ButtonProps = ButtonOwnProps &
  (
    | ({ href: string } & Omit<ComponentProps<typeof Link>, "href" | "className">)
    | ({ href?: undefined } & Omit<ComponentProps<"button">, "className">)
  );

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  const cls = `${base} ${variants[variant]} ${sizes[size]}${className ? ` ${className}` : ""}`;
  if ("href" in props && props.href) {
    const { href, ...rest } = props;
    return (
      <Link href={href} className={cls} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} {...(props as ComponentProps<"button">)}>
      {children}
    </button>
  );
}
