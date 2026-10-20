import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { specialistSlugFromHost } from "@/lib/team/host";

const MAIN_ORIGIN = "https://allabodeph.com";

// Paths the original matcher covered (everything else only reaches here for specialist hosts).
const AUTH_PATH = /^\/(admin|dashboard|portal)(\/|$)/;

const PASS_THROUGH =
  /^\/(_next\/|_vercel\/|favicon\.ico$|robots\.txt$|sitemap\.xml$|manifest\.webmanifest$|logo\/|icon|apple-icon)/;
const HAS_EXTENSION = /\.[a-z0-9]+$/i;

function mainOrigin(host: string): string {
  // Local testing: <slug>.localhost:3000 -> http://localhost:3000. Otherwise a FIXED origin.
  if (/\.localhost(:\d+)?$/i.test(host)) {
    const port = host.match(/:(\d+)$/)?.[1];
    return `http://localhost${port ? `:${port}` : ""}`;
  }
  return MAIN_ORIGIN;
}

function handleSpecialistHost(request: NextRequest, slug: string, host: string) {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/") {
    const target = request.nextUrl.clone();
    target.pathname = `/team/${slug}`;
    return NextResponse.rewrite(target);
  }
  if (pathname === `/team/${slug}` || PASS_THROUGH.test(pathname) || HAS_EXTENSION.test(pathname)) {
    return NextResponse.next();
  }
  return NextResponse.redirect(`${mainOrigin(host)}${pathname}${search}`, 307);
}

export async function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const slug = specialistSlugFromHost(host);
  if (slug) return handleSpecialistHost(request, slug, host);

  const { pathname } = request.nextUrl;
  // Only reached for non-specialist hosts via the subdomain matcher (e.g. a
  // reserved subdomain): behave exactly as if the original matcher skipped it.
  if (pathname !== "/" && !AUTH_PATH.test(pathname)) return NextResponse.next();

  if (pathname === "/" && request.nextUrl.searchParams.has("code")) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/auth/callback";
    return NextResponse.redirect(redirect);
  }

  if (pathname === "/" && request.nextUrl.searchParams.has("token_hash")) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/auth/callback";
    return NextResponse.redirect(redirect);
  }

  return updateSession(request);
}

// Auth routes run on every host. The last entry additionally matches ALL paths,
// but only for `<label>.allabodeph.com` / `<label>.localhost` hosts (www and the
// apex never match), so specialist subdomains can be rewritten/redirected.
export const config = {
  matcher: [
    "/",
    "/admin/:path*",
    "/dashboard/:path*",
    "/portal/:path*",
    "/portal",
    {
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      has: [{ type: "host", value: "(?!www\\.)[a-z0-9-]+\\.(allabodeph\\.com|localhost)(:\\d+)?" }],
    },
  ],
};
