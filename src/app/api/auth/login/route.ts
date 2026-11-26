import { NextResponse } from "next/server";
import { authEnv, loadAuthConfig } from "@/lib/auth/config";
import { allowedOrigins, authStores, recordAuthEvent, redirectTo } from "@/lib/auth/http";
import { attemptLogin } from "@/lib/auth/login";
import { clientIp, isSameOrigin, safeNext } from "@/lib/auth/redirect";
import { sessionCookieName } from "@/lib/auth/session";

// Signs the owner in. Takes the password and the 6-digit authenticator code from the sign-in form.
export async function POST(request: Request) {
  const config = loadAuthConfig(authEnv());
  if (config.mode !== "ready") return redirectTo("/login?error=notready");
  if (!isSameOrigin({ origin: request.headers.get("origin"), secFetchSite: request.headers.get("sec-fetch-site") }, allowedOrigins(request.url))) {
    return new NextResponse("Request refused.", { status: 403 });
  }

  const form = await request.formData().catch(() => null);
  const field = (name: string) => (typeof form?.get(name) === "string" ? (form!.get(name) as string) : "");
  const next = safeNext(field("next"));
  const back = (query: string) => redirectTo(`/login?${query}&next=${encodeURIComponent(next)}`);

  const ip = clientIp(request.headers);
  const outcome = await attemptLogin({ config, ...authStores() }, { password: field("password"), code: field("code"), clientKey: ip });

  if (outcome.kind === "blocked") {
    await recordAuthEvent("login_blocked", ip);
    return back(`error=blocked&wait=${Math.ceil(outcome.retryAfterSeconds / 60)}`);
  }
  if (outcome.kind === "invalid") {
    await recordAuthEvent("login_failure", ip);
    return back("error=invalid");
  }

  await recordAuthEvent("login_success", ip);
  const response = redirectTo(next);
  const production = process.env.NODE_ENV === "production";
  response.cookies.set(sessionCookieName(production), outcome.token, {
    httpOnly: true, // page scripts can never read it
    secure: production, // only ever sent over https
    sameSite: "strict", // never sent with a request started by another website
    path: "/",
    maxAge: outcome.maxAgeSeconds,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
