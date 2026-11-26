// Where to send someone after signing in, and whether a request really came from our own pages.

// Only addresses inside the dashboard are allowed, so a crafted sign-in link cannot bounce a person
// to another website after they sign in.
export function safeNext(value: string | null | undefined): string {
  const fallback = "/admin";
  if (!value || value.length > 300 || /[\\\u0000-\u001f\u007f]/.test(value)) return fallback;
  if (!value.startsWith("/admin") || value.includes("//")) return fallback;
  try {
    const url = new URL(value, "http://dashboard.invalid");
    const inside = url.origin === "http://dashboard.invalid" && (url.pathname === "/admin" || url.pathname.startsWith("/admin/"));
    return inside ? `${url.pathname}${url.search}` : fallback;
  } catch {
    return fallback;
  }
}

// Blocks changes sent from another website. Browsers always say where a form or fetch came from; a
// request that comes from somewhere else is refused. Tools like curl send neither header and are allowed.
export function isSameOrigin(headers: { origin?: string | null; secFetchSite?: string | null }, allowedOrigins: string[]): boolean {
  if (headers.origin) return allowedOrigins.includes(headers.origin);
  if (headers.secFetchSite) return headers.secFetchSite === "same-origin" || headers.secFetchSite === "none";
  return true;
}

// The visitor's address, for rate limiting only. Cloudflare's header is trusted first; the host should
// only accept traffic that has come through Cloudflare.
export function clientIp(headers: Headers): string {
  const raw = (headers.get("cf-connecting-ip") ?? headers.get("x-forwarded-for")?.split(",")[0] ?? "").trim();
  // Anything that is not shaped like an address shares one "unknown" bucket rather than being trusted.
  const looksLikeAddress = /^[0-9a-fA-F:.]{2,45}$/.test(raw) && (raw.includes(".") || raw.includes(":"));
  return looksLikeAddress ? raw : "unknown";
}
