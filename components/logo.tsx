import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({
  variant = "color",
  className = "",
}: {
  variant?: "color" | "white";
  className?: string;
}) {
  const src = variant === "white" ? "/logo/logo-2-white.png" : "/logo/logo-primary.png";
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
        className={cn("h-10 w-auto", className)}
      />
    </Link>
  );
}
