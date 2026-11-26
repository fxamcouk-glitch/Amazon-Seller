import { describe, expect, it, vi } from "vitest";
import { authEnv, loadAuthConfig, isValidTotpSecret } from "./config";
import { attemptLogin, safeEqual } from "./login";
import { clientIp, isSameOrigin, safeNext } from "./redirect";
import { MAX_SESSION_SECONDS, createSessionToken, sessionCookieName, verifySessionToken } from "./session";
import { LIMIT_ALL_CLIENTS, LIMIT_PER_CLIENT, MemoryReplayStore, MemoryThrottleStore, WINDOW_MS, admit } from "./throttle";
import { currentCode, matchTotp, newTotpSecret, totpUri } from "./totp";

const SECRET = "s".repeat(40);
const T0 = 1_800_000_000_000;

describe("session tokens", () => {
  it("round-trips a valid token", async () => {
    const token = await createSessionToken(SECRET, 3600, T0);
    expect(await verifySessionToken(SECRET, token, T0 + 1000)).toMatchObject({ v: 1, iat: T0 / 1000, exp: T0 / 1000 + 3600 });
  });

  it("rejects a token after it expires, and one signed with a different secret", async () => {
    const token = await createSessionToken(SECRET, 3600, T0);
    expect(await verifySessionToken(SECRET, token, T0 + 3600_000)).toBeNull();
    expect(await verifySessionToken(SECRET, token, T0 + 3599_000)).not.toBeNull();
    expect(await verifySessionToken("t".repeat(40), token, T0)).toBeNull();
  });

  it("rejects tampering with the payload or the signature", async () => {
    const token = await createSessionToken(SECRET, 3600, T0);
    const [body, sig] = token.split(".");
    const forgedBody = btoa(JSON.stringify({ v: 1, iat: T0 / 1000, exp: T0 / 1000 + 999_999, n: "x" })).replace(/=+$/, "");
    expect(await verifySessionToken(SECRET, `${forgedBody}.${sig}`, T0)).toBeNull();
    expect(await verifySessionToken(SECRET, `${body}.${sig.slice(0, -2)}AA`, T0)).toBeNull();
    expect(await verifySessionToken(SECRET, `${body}.`, T0)).toBeNull();
  });

  it("rejects garbage without throwing", async () => {
    for (const bad of [undefined, "", "abc", "a.b.c", "....", "%%%.%%%", "x".repeat(2000), "e30.e30"]) {
      expect(await verifySessionToken(SECRET, bad, T0)).toBeNull();
    }
  });

  it("caps how long a session can last", async () => {
    const token = await createSessionToken(SECRET, 10 * MAX_SESSION_SECONDS, T0);
    const payload = await verifySessionToken(SECRET, token, T0);
    expect(payload!.exp - payload!.iat).toBe(MAX_SESSION_SECONDS);
  });

  it("gives every session a different token and uses the protected cookie name in production", async () => {
    expect(await createSessionToken(SECRET, 60, T0)).not.toBe(await createSessionToken(SECRET, 60, T0));
    expect(sessionCookieName(true)).toMatch(/^__Host-/);
    expect(sessionCookieName(false)).not.toMatch(/^__Host-/);
  });
});

describe("loadAuthConfig", () => {
  const totp = newTotpSecret();
  const ready = { ADMIN_PASSWORD: "pw", ADMIN_TOTP_SECRET: totp, SESSION_SECRET: SECRET };

  it("is open only in development with nothing set", () => {
    expect(loadAuthConfig({ NODE_ENV: "development" })).toEqual({ mode: "open" });
    expect(loadAuthConfig({ NODE_ENV: "production" })).toEqual({ mode: "unconfigured" });
    // Anything unexpected fails closed, including a setting that could not be read at all.
    for (const odd of [{}, { NODE_ENV: "" }, { NODE_ENV: "test" }, { NODE_ENV: "staging" }, { NODE_ENV: "Development" }]) {
      expect(loadAuthConfig(odd)).toEqual({ mode: "unconfigured" });
    }
    expect(loadAuthConfig({ NODE_ENV: "production", ADMIN_PASSWORD: "  " })).toEqual({ mode: "unconfigured" });
  });

  it("asks for setup until the authenticator and session secrets are both valid", () => {
    expect(loadAuthConfig({ ADMIN_PASSWORD: "pw" })).toEqual({ mode: "setup-needed", missing: ["ADMIN_TOTP_SECRET", "SESSION_SECRET"] });
    expect(loadAuthConfig({ ...ready, SESSION_SECRET: "short" })).toEqual({ mode: "setup-needed", missing: ["SESSION_SECRET"] });
    expect(loadAuthConfig({ ...ready, ADMIN_TOTP_SECRET: "not base32!" })).toEqual({ mode: "setup-needed", missing: ["ADMIN_TOTP_SECRET"] });
    expect(loadAuthConfig({ ...ready, ADMIN_TOTP_SECRET: "ABCD" })).toMatchObject({ mode: "setup-needed" });
  });

  it("is ready with everything set, with a 12-hour default session and a clamped override", () => {
    expect(loadAuthConfig({ ...ready, NODE_ENV: "production" })).toMatchObject({ mode: "ready", sessionSeconds: 12 * 3600 });
    expect(loadAuthConfig({ ...ready, SESSION_HOURS: "2" })).toMatchObject({ sessionSeconds: 2 * 3600 });
    expect(loadAuthConfig({ ...ready, SESSION_HOURS: "9999" })).toMatchObject({ sessionSeconds: 72 * 3600 });
    expect(loadAuthConfig({ ...ready, SESSION_HOURS: "0" })).toMatchObject({ sessionSeconds: 3600 });
    expect(loadAuthConfig({ ...ready, SESSION_HOURS: "abc" })).toMatchObject({ sessionSeconds: 12 * 3600 });
  });

  it("validates authenticator secrets", () => {
    expect(isValidTotpSecret(totp)).toBe(true);
    expect(isValidTotpSecret("")).toBe(false);
    expect(isValidTotpSecret("1".repeat(32))).toBe(false);
  });
});

describe("authEnv", () => {
  it("reads each setting by name from the environment", () => {
    vi.stubEnv("ADMIN_PASSWORD", "pw");
    vi.stubEnv("NODE_ENV", "development");
    expect(authEnv()).toMatchObject({ ADMIN_PASSWORD: "pw", NODE_ENV: "development" });
    expect(Object.keys(authEnv()).sort()).toEqual(["ADMIN_PASSWORD", "ADMIN_TOTP_SECRET", "NODE_ENV", "SESSION_HOURS", "SESSION_SECRET"]);
    vi.unstubAllEnvs();
  });
});

describe("authenticator codes", () => {
  const secret = newTotpSecret();

  it("makes a 32-character key and an authenticator-app link", () => {
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    const uri = totpUri(secret);
    expect(uri).toMatch(/^otpauth:\/\/totp\//);
    expect(uri).toContain(`secret=${secret}`);
    expect(uri).toContain("algorithm=SHA1");
    expect(uri).toContain("digits=6");
    expect(uri).toContain("period=30");
  });

  it("accepts the current code and one step either side, but not two", () => {
    const step = Math.floor(T0 / 1000 / 30);
    expect(matchTotp(secret, currentCode(secret, T0), T0)).toEqual({ step });
    expect(matchTotp(secret, currentCode(secret, T0 - 30_000), T0)).toEqual({ step: step - 1 });
    expect(matchTotp(secret, currentCode(secret, T0 + 30_000), T0)).toEqual({ step: step + 1 });
    expect(matchTotp(secret, currentCode(secret, T0 - 90_000), T0)).toBeNull();
    expect(matchTotp(secret, currentCode(secret, T0 + 90_000), T0)).toBeNull();
  });

  it("tolerates spaces but rejects anything that is not six digits", () => {
    const code = currentCode(secret, T0);
    expect(matchTotp(secret, `${code.slice(0, 3)} ${code.slice(3)}`, T0)).not.toBeNull();
    for (const bad of ["", "12345", "1234567", "abcdef", "12 34 5a", `${code}x`]) expect(matchTotp(secret, bad, T0)).toBeNull();
    expect(matchTotp("not a secret", "123456", T0)).toBeNull();
  });
});

describe("attempt limiter", () => {
  it("allows five tries per client, then blocks until the window ends", async () => {
    const store = new MemoryThrottleStore();
    for (let i = 0; i < LIMIT_PER_CLIENT; i++) expect((await admit(store, "1.2.3.4", T0 + i)).allowed).toBe(true);
    const blocked = await admit(store, "1.2.3.4", T0 + 10_000);
    expect(blocked).toMatchObject({ allowed: false });
    expect(!blocked.allowed && blocked.retryAfterSeconds).toBeGreaterThan(14 * 60);
    expect((await admit(store, "5.6.7.8", T0 + 10_000)).allowed).toBe(true); // other clients are unaffected
    expect((await admit(store, "1.2.3.4", T0 + WINDOW_MS + 1)).allowed).toBe(true); // a fresh window
  });

  it("has a backstop against guessing spread across many addresses", async () => {
    const store = new MemoryThrottleStore();
    let blockedAt = -1;
    for (let i = 0; i < LIMIT_ALL_CLIENTS + 5; i++) {
      if (!(await admit(store, `10.0.0.${i}`, T0)).allowed && blockedAt < 0) blockedAt = i;
    }
    expect(blockedAt).toBe(LIMIT_ALL_CLIENTS);
  });

  it("counts simultaneous attempts correctly", async () => {
    const store = new MemoryThrottleStore();
    const results = await Promise.all(Array.from({ length: 50 }, () => admit(store, "9.9.9.9", T0)));
    expect(results.filter((r) => r.allowed)).toHaveLength(LIMIT_PER_CLIENT);
  });
});

describe("attemptLogin", () => {
  const totpSecret = newTotpSecret();
  const config = loadAuthConfig({ ADMIN_PASSWORD: "correct horse", ADMIN_TOTP_SECRET: totpSecret, SESSION_SECRET: SECRET, NODE_ENV: "production" });
  if (config.mode !== "ready") throw new Error("test config not ready");
  const world = () => ({ config, throttle: new MemoryThrottleStore(), replay: new MemoryReplayStore(), now: () => T0 });
  const good = { password: "correct horse", code: currentCode(totpSecret, T0), clientKey: "1.1.1.1" };

  it("lets the right password and a current code in, with a verifiable session", async () => {
    const out = await attemptLogin(world(), good);
    expect(out.kind).toBe("ok");
    if (out.kind === "ok") {
      expect(await verifySessionToken(SECRET, out.token, T0)).not.toBeNull();
      expect(out.maxAgeSeconds).toBe(12 * 3600);
    }
  });

  it("refuses a wrong password, a wrong code, or both, with the same answer", async () => {
    for (const input of [{ ...good, password: "wrong" }, { ...good, code: "000000" }, { ...good, password: "wrong", code: "000000" }, { ...good, password: "", code: "" }]) {
      expect(await attemptLogin(world(), input)).toEqual({ kind: "invalid" });
    }
  });

  it("refuses a code that was already used, even with the right password", async () => {
    const w = world();
    expect((await attemptLogin(w, good)).kind).toBe("ok");
    expect(await attemptLogin(w, { ...good, clientKey: "2.2.2.2" })).toEqual({ kind: "invalid" });
  });

  it("does not use up a code when the password is wrong", async () => {
    const w = world();
    expect(await attemptLogin(w, { ...good, password: "wrong" })).toEqual({ kind: "invalid" });
    expect((await attemptLogin(w, good)).kind).toBe("ok");
  });

  it("blocks after five failures, even for the correct password and code", async () => {
    const w = world();
    for (let i = 0; i < LIMIT_PER_CLIENT; i++) expect(await attemptLogin(w, { ...good, password: "wrong" })).toEqual({ kind: "invalid" });
    const blocked = await attemptLogin(w, good);
    expect(blocked).toMatchObject({ kind: "blocked" });
  });

  it("forgives earlier mistakes after a successful sign-in", async () => {
    const w = world();
    for (let i = 0; i < 3; i++) await attemptLogin(w, { ...good, password: "wrong" });
    expect((await attemptLogin(w, good)).kind).toBe("ok");
    const w2 = { ...w, now: () => T0 + 60_000 };
    for (let i = 0; i < LIMIT_PER_CLIENT; i++) expect(await attemptLogin(w2, { ...good, code: "000000" })).toEqual({ kind: "invalid" });
  });

  it("only one of many simultaneous correct sign-ins can use the same code", async () => {
    const w = world();
    const results = await Promise.all(Array.from({ length: 5 }, () => attemptLogin(w, good)));
    expect(results.filter((r) => r.kind === "ok")).toHaveLength(1);
  });
});

describe("safeEqual", () => {
  it("compares without caring about length", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
    expect(safeEqual("", "")).toBe(true);
  });
});

describe("safeNext", () => {
  it("keeps addresses inside the dashboard", () => {
    expect(safeNext("/admin")).toBe("/admin");
    expect(safeNext("/admin/products/ABC?x=1")).toBe("/admin/products/ABC?x=1");
  });

  it("falls back to the dashboard for anything that could leave the site", () => {
    for (const bad of [null, undefined, "", "/", "/login", "//evil.com", "/\\evil.com", "https://evil.com/admin", "/admin\r\nSet-Cookie: x=1", "/adminx", "/admin/../..//evil", "/admin//evil.com", "javascript:alert(1)", "/admin%0d%0a", "/".padEnd(400, "a")]) {
      const out = safeNext(bad);
      expect(out === "/admin" || (out.startsWith("/admin") && !out.includes("//") && !out.includes("\\"))).toBe(true);
    }
    expect(safeNext("//evil.com")).toBe("/admin");
    expect(safeNext("/adminx")).toBe("/admin");
    expect(safeNext("https://evil.com/admin")).toBe("/admin");
    expect(safeNext("/admin\r\nSet-Cookie: x=1")).toBe("/admin");
    expect(safeNext("/admin//evil.com")).toBe("/admin");
  });
});

describe("isSameOrigin", () => {
  const allowed = ["https://www.example.com"];
  it("accepts our own pages and refuses other websites", () => {
    expect(isSameOrigin({ origin: "https://www.example.com" }, allowed)).toBe(true);
    expect(isSameOrigin({ origin: "https://evil.com" }, allowed)).toBe(false);
    expect(isSameOrigin({ origin: "null" }, allowed)).toBe(false);
    expect(isSameOrigin({ secFetchSite: "cross-site" }, allowed)).toBe(false);
    expect(isSameOrigin({ secFetchSite: "same-site" }, allowed)).toBe(false);
    expect(isSameOrigin({ secFetchSite: "same-origin" }, allowed)).toBe(true);
    expect(isSameOrigin({}, allowed)).toBe(true); // tools such as curl send neither header
  });
});

describe("clientIp", () => {
  it("prefers Cloudflare's header and strips anything odd", () => {
    expect(clientIp(new Headers({ "cf-connecting-ip": "203.0.113.9", "x-forwarded-for": "1.1.1.1" }))).toBe("203.0.113.9");
    expect(clientIp(new Headers({ "x-forwarded-for": "198.51.100.7, 10.0.0.1" }))).toBe("198.51.100.7");
    expect(clientIp(new Headers({ "x-forwarded-for": "<script>" }))).toBe("unknown");
    expect(clientIp(new Headers({ "x-forwarded-for": "deadbeef" }))).toBe("unknown");
    expect(clientIp(new Headers({ "cf-connecting-ip": "1.2.3.4 evil" }))).toBe("unknown");
    expect(clientIp(new Headers())).toBe("unknown");
    expect(clientIp(new Headers({ "cf-connecting-ip": "2001:db8::1" }))).toBe("2001:db8::1");
  });
});
