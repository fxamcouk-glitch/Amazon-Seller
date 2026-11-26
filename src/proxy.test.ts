import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { proxy } from "./proxy";
import { createSessionToken, sessionCookieName } from "@/lib/auth/session";
import { newTotpSecret } from "@/lib/auth/totp";

const SESSION_SECRET = "s".repeat(40);
const TOTP = newTotpSecret();

function env(vars: Record<string, string>) {
  for (const k of ["ADMIN_PASSWORD", "ADMIN_TOTP_SECRET", "SESSION_SECRET", "SESSION_HOURS", "SITE_URL", "NODE_ENV"]) vi.stubEnv(k, "");
  for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v);
}
const ready = (extra: Record<string, string> = {}) => env({ ADMIN_PASSWORD: "pw", ADMIN_TOTP_SECRET: TOTP, SESSION_SECRET, NODE_ENV: "production", SITE_URL: "https://www.example.com", ...extra });

const req = (path: string, init: { method?: string; headers?: Record<string, string>; cookie?: string } = {}) =>
  new NextRequest(`https://www.example.com${path}`, { method: init.method ?? "GET", headers: { ...(init.cookie ? { cookie: init.cookie } : {}), ...init.headers } });
const passes = (res: Response) => res.headers.get("x-middleware-next") === "1";
const cookieFor = async (ttl = 3600, secret = SESSION_SECRET, now = Date.now()) => `${sessionCookieName(true)}=${await createSessionToken(secret, ttl, now)}`;

afterEach(() => vi.unstubAllEnvs());

describe("proxy", () => {
  it("leaves the dashboard open in development when nothing is configured", async () => {
    env({ NODE_ENV: "development" });
    expect(passes(await proxy(req("/admin")))).toBe(true);
  });

  it("refuses the dashboard when the environment cannot be read at all", async () => {
    env({});
    expect((await proxy(req("/admin"))).status).toBe(503);
  });

  it("refuses the dashboard in production with no password set", async () => {
    env({ NODE_ENV: "production" });
    expect((await proxy(req("/admin"))).status).toBe(503);
    expect((await proxy(req("/api/admin/products", { method: "POST" }))).status).toBe(503);
  });

  it("sends pages to the sign-in page, and refuses the API, until two-step sign-in is set up", async () => {
    env({ ADMIN_PASSWORD: "pw", NODE_ENV: "production" });
    const page = await proxy(req("/admin"));
    expect(page.status).toBe(307);
    expect(new URL(page.headers.get("location")!).pathname + new URL(page.headers.get("location")!).search).toBe("/login");
    expect((await proxy(req("/api/admin/orders/1/invoice"))).status).toBe(503);
  });

  it("sends a signed-out visitor to sign in and remembers where they were going", async () => {
    ready();
    const res = await proxy(req("/admin/products?filter=a b"));
    expect(res.status).toBe(307);
    const where = new URL(res.headers.get("location")!);
    expect(where.pathname + where.search).toBe(`/login?next=${encodeURIComponent("/admin/products?filter=a%20b")}`);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("answers the API with 401 and no redirect when signed out", async () => {
    ready();
    const res = await proxy(req("/api/admin/products", { method: "GET" }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Sign in required." });
  });

  it("lets a valid session through and stops shared caches keeping the page", async () => {
    ready();
    const res = await proxy(req("/admin/orders", { cookie: await cookieFor() }));
    expect(passes(res)).toBe(true);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
  });

  it("refuses expired, forged and wrong-secret sessions", async () => {
    ready();
    expect((await proxy(req("/admin", { cookie: await cookieFor(60, SESSION_SECRET, Date.now() - 3600_000) }))).status).toBe(307);
    expect((await proxy(req("/admin", { cookie: await cookieFor(3600, "x".repeat(40)) }))).status).toBe(307);
    expect((await proxy(req("/admin", { cookie: `${sessionCookieName(true)}=forged.value` }))).status).toBe(307);
    expect((await proxy(req("/admin", { cookie: `cablestore_session=${(await cookieFor()).split("=")[1]}` }))).status).toBe(307); // the unprotected cookie name is not accepted in production
  });

  it("refuses changes sent from another website, even with a valid session", async () => {
    ready();
    const cookie = await cookieFor();
    const bad: Record<string, string>[] = [{ origin: "https://evil.example" }, { origin: "null" }, { "sec-fetch-site": "cross-site" }];
    for (const headers of bad) {
      expect((await proxy(req("/api/admin/products", { method: "POST", cookie, headers }))).status).toBe(403);
    }
    expect(passes(await proxy(req("/api/admin/products", { method: "POST", cookie, headers: { origin: "https://www.example.com" } })))).toBe(true);
    expect(passes(await proxy(req("/api/admin/products", { method: "PUT", cookie, headers: { "sec-fetch-site": "same-origin" } })))).toBe(true);
  });

  it("does not apply the cross-site check to reads", async () => {
    ready();
    expect(passes(await proxy(req("/admin", { cookie: await cookieFor(), headers: { "sec-fetch-site": "cross-site" } })))).toBe(true);
  });
});
