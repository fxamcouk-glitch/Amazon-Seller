import { NextResponse, type NextRequest } from "next/server";
import { authEnv, loadAuthConfig } from "@/lib/auth/config";
import { isSameOrigin } from "@/lib/auth/redirect";
import { sessionCookieName, verifySessionToken } from "@/lib/auth/session";

const CHANGING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Guards the dashboard and its API. A request gets through only with a valid signed session cookie
// (made by signing in with password and authenticator code). Fails closed: in production a server
// without sign-in set up refuses the dashboard instead of leaving it open.
export async function proxy(request: NextRequest) {
  const config = loadAuthConfig(authEnv());
  if (config.mode === "open") return NextResponse.next(); // development with nothing configured

  const { pathname, search } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");
  const json = (status: number, error: string) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
  // The proxy runtime only accepts an absolute address here (a bare "/login" makes it throw).
  const toLogin = (next?: string) => {
    const target = new URL(next ? `/login?next=${encodeURIComponent(next)}` : "/login", request.nextUrl);
    const response = NextResponse.redirect(target, 307);
    response.headers.set("Cache-Control", "no-store");
    return response;
  };

  if (config.mode === "unconfigured") return new NextResponse("The dashboard is not configured.", { status: 503, headers: { "Cache-Control": "no-store" } });
  if (config.mode === "setup-needed") return isApi ? json(503, "Sign-in is not set up yet.") : toLogin();

  // Changes must come from our own pages, never from another website.
  const origins = [request.nextUrl.origin];
  try {
    if (process.env.SITE_URL) origins.push(new URL(process.env.SITE_URL).origin);
  } catch {
    /* a malformed SITE_URL is reported elsewhere */
  }
  if (CHANGING.has(request.method) && !isSameOrigin({ origin: request.headers.get("origin"), secFetchSite: request.headers.get("sec-fetch-site") }, origins)) {
    return json(403, "Request refused.");
  }

  const token = request.cookies.get(sessionCookieName(process.env.NODE_ENV === "production"))?.value;
  if (await verifySessionToken(config.sessionSecret, token)) {
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "private, no-store"); // signed-in pages are never kept by shared caches
    return response;
  }
  return isApi ? json(401, "Sign in required.") : toLogin(pathname + search);
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
