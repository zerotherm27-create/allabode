import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/" && request.nextUrl.searchParams.has("code")) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/auth/callback";
    return NextResponse.redirect(redirect);
  }

  if (request.nextUrl.pathname === "/" && request.nextUrl.searchParams.has("token_hash")) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/auth/callback";
    return NextResponse.redirect(redirect);
  }

  return updateSession(request);
}

// Run on admin + portal + dashboard routes — the public marketing site is unaffected.
export const config = {
  matcher: ["/", "/admin/:path*", "/dashboard/:path*", "/portal/:path*", "/portal"],
};
