import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

// Run on admin + portal + dashboard routes — the public marketing site is unaffected.
export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*", "/portal/:path*", "/portal"],
};
