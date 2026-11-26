import { NextResponse } from "next/server";
import { allowedOrigins, recordAuthEvent, redirectTo } from "@/lib/auth/http";
import { clientIp, isSameOrigin } from "@/lib/auth/redirect";
import { sessionCookieName } from "@/lib/auth/session";

export async function POST(request: Request) {
  if (!isSameOrigin({ origin: request.headers.get("origin"), secFetchSite: request.headers.get("sec-fetch-site") }, allowedOrigins(request.url))) {
    return new NextResponse("Request refused.", { status: 403 });
  }
  await recordAuthEvent("logout", clientIp(request.headers));
  const response = redirectTo("/login");
  const production = process.env.NODE_ENV === "production";
  response.cookies.set(sessionCookieName(production), "", { httpOnly: true, secure: production, sameSite: "strict", path: "/", maxAge: 0 });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
