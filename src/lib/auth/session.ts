// Signed session tokens. The token is the sign-in proof kept in a cookie: a small JSON payload plus
// an HMAC signature made with SESSION_SECRET, so it cannot be forged or changed without the secret.
// Uses Web Crypto only, so it runs the same in the proxy and in route handlers.

export type SessionPayload = { v: 1; iat: number; exp: number; n: string };

export const MAX_SESSION_SECONDS = 72 * 3600;
const encoder = new TextEncoder();

const toB64Url = (bytes: Uint8Array): string => {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

function fromB64Url(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
  try {
    const bin = atob(text.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(text.length / 4) * 4, "="));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

const hmacKey = (secret: string, usage: "sign" | "verify") =>
  crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [usage]);

export async function createSessionToken(secret: string, ttlSeconds: number, nowMs: number = Date.now()): Promise<string> {
  const ttl = Math.min(Math.max(1, Math.floor(ttlSeconds)), MAX_SESSION_SECONDS);
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const iat = Math.floor(nowMs / 1000);
  const payload: SessionPayload = { v: 1, iat, exp: iat + ttl, n: toB64Url(nonce) };
  const body = toB64Url(encoder.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret, "sign"), encoder.encode(body));
  return `${body}.${toB64Url(new Uint8Array(sig))}`;
}

export async function verifySessionToken(secret: string, token: string | undefined, nowMs: number = Date.now()): Promise<SessionPayload | null> {
  if (!token || token.length > 1024) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, signature] = parts;
  const sig = fromB64Url(signature);
  if (!sig) return null;
  // crypto.subtle.verify compares in constant time.
  const valid = await crypto.subtle.verify("HMAC", await hmacKey(secret, "verify"), sig as BufferSource, encoder.encode(body));
  if (!valid) return null;
  const raw = fromB64Url(body);
  if (!raw) return null;
  let payload: SessionPayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    return null;
  }
  const now = Math.floor(nowMs / 1000);
  if (payload?.v !== 1 || !Number.isInteger(payload.iat) || !Number.isInteger(payload.exp)) return null;
  if (payload.exp <= now) return null; // expired
  if (payload.iat > now + 60) return null; // issued in the future
  if (payload.exp - payload.iat > MAX_SESSION_SECONDS) return null;
  return payload;
}

export const sessionCookieName = (production: boolean): string => (production ? "__Host-cablestore_session" : "cablestore_session");
