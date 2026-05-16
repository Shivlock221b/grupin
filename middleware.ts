import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const adminSessionCookieName = "grupin_admin_keyword_session";

function getAdminPortalPath() {
  const raw = process.env.ADMIN_PORTAL_PATH?.trim() || "/grupin-admin-vault";
  const withSlash = raw.startsWith("/") ? raw : `/${raw}`;
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, "") : "/grupin-admin-vault";
}

type CookieToSet = {
  name: string;
  value: string;
  options?: {
    domain?: string;
    expires?: Date;
    httpOnly?: boolean;
    maxAge?: number;
    path?: string;
    sameSite?: "lax" | "strict" | "none" | boolean;
    secure?: boolean;
  };
};

export async function middleware(request: NextRequest) {
  const adminPortalPath = getAdminPortalPath();
  const pathname = request.nextUrl.pathname;
  const hasAdminSessionCookie = Boolean(request.cookies.get(adminSessionCookieName)?.value);

  if (pathname === adminPortalPath || pathname.startsWith(`${adminPortalPath}/`)) {
    const suffix = pathname.slice(adminPortalPath.length);
    const internalPath = !suffix || suffix === "/" ? "/admin/login" : `/admin${suffix}`;

    if (internalPath !== "/admin/login" && !hasAdminSessionCookie) {
      return NextResponse.rewrite(new URL("/admin/login", request.url));
    }

    return NextResponse.rewrite(new URL(internalPath, request.url));
  }

  if (pathname.startsWith("/admin")) {
    if (hasAdminSessionCookie) {
      const publicUrl = new URL(`${adminPortalPath}${pathname.slice("/admin".length) || "/dashboard"}`, request.url);
      publicUrl.search = request.nextUrl.search;
      return NextResponse.redirect(publicUrl);
    }

    return NextResponse.rewrite(new URL("/_not-found", request.url));
  }

  if (pathname.startsWith("/api/admin") && !hasAdminSessionCookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const response = NextResponse.next({
    request,
  });

  if (!pathname.startsWith("/partner") && pathname !== "/auth/callback") {
    return response;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (
    request.nextUrl.pathname.startsWith("/partner") &&
    !user
  ) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/partner/:path*", "/api/admin/:path*", "/auth/callback", "/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
