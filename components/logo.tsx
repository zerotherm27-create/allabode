import Link from "next/link";
import Image from "next/image";

export function Logo({
  variant = "color",
  className = "",
}: {
  variant?: "color" | "white";
  className?: string;
}) {
  const src = variant === "white" ? "/logo/logo-2-white.png" : "/logo/logo-primary.png";
  const sizeClass = variant === "white" ? "h-14" : "h-10";
  return (
    <Link
      href="/"
      aria-label="All Abode Property Solutions home"
      className="inline-flex items-center"
    >
      <Image
        src={src}
        alt="All Abode Property Solutions"
        width={180}
        height={56}
        priority
        className={`${sizeClass} w-auto ${className}`}
      />
    </Link>
  );
}
