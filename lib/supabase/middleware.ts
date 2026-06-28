import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session on each request and guards `/admin/*`.
 * Unauthenticated visitors to admin pages are redirected to /admin/login.
 * If Supabase env vars are absent, requests pass through untouched.
 */
export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAdminLogin = path.startsWith("/admin/login");

  // Admin area: staff only. Unauthenticated/non-staff → admin login.
  if (path.startsWith("/admin") && !isAdminLogin && !user) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/admin/login";
    return NextResponse.redirect(redirect);
  }

  if (path.startsWith("/admin") && user) {
    const { data: isStaff } = await supabase.rpc("is_staff");
    if (!isStaff && !isAdminLogin) {
      const redirect = request.nextUrl.clone();
      redirect.pathname = "/admin/login";
      return NextResponse.redirect(redirect);
    }
    if (!isStaff) return response;
  }

  if (isAdminLogin && user) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/admin";
    return NextResponse.redirect(redirect);
  }

  // Portal dashboards: any signed-in user. Unauthenticated → portal login.
  // Per-page guards (getCurrentRole) enforce the specific owner/tenant role.
  if (path.startsWith("/dashboard") && !user) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/portal/login";
    return NextResponse.redirect(redirect);
  }

  // Portal signup: already signed in → portal index (role-routes from there).
  // Portal login stays accessible so staff/admin users can switch into an
  // owner or tenant account without being bounced back to /admin.
  if (path === "/portal/signup" && user) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/portal";
    return NextResponse.redirect(redirect);
  }

  // Portal index: not signed in → login.
  if (path === "/portal" && !user) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/portal/login";
    return NextResponse.redirect(redirect);
  }

  return response;
}
