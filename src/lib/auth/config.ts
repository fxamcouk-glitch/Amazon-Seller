import { Secret } from "otpauth";

// What the server is configured to do about sign-in, worked out from environment variables only.
export type AuthConfig =
  | { mode: "open" } // development with nothing set: the dashboard is not protected
  | { mode: "unconfigured" } // production without ADMIN_PASSWORD: the dashboard is refused outright
  | { mode: "setup-needed"; missing: string[] } // password set, but the authenticator or session secret is not
  | { mode: "ready"; password: string; totpSecret: string; sessionSecret: string; sessionSeconds: number };

export const MIN_SESSION_SECRET_LENGTH = 32;
export const DEFAULT_SESSION_HOURS = 12;

export function isValidTotpSecret(value: string): boolean {
  if (!/^[A-Z2-7]+=*$/i.test(value) || value.replace(/=+$/, "").length < 16) return false;
  try {
    return Secret.fromBase32(value).bytes.length >= 10;
  } catch {
    return false;
  }
}

// The settings sign-in depends on, each read by name. In the proxy, `process.env` handed over as a
// whole object arrives empty, which would look like "nothing is configured"; reading each setting by
// name is what works there. Always build the settings with this, never pass `process.env` itself.
export const authEnv = (): Record<string, string | undefined> => ({
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  ADMIN_TOTP_SECRET: process.env.ADMIN_TOTP_SECRET,
  SESSION_SECRET: process.env.SESSION_SECRET,
  SESSION_HOURS: process.env.SESSION_HOURS,
  NODE_ENV: process.env.NODE_ENV,
});

export function loadAuthConfig(env: Record<string, string | undefined>): AuthConfig {
  const get = (name: string) => env[name]?.trim() || undefined;
  const password = get("ADMIN_PASSWORD");
  const totpSecret = get("ADMIN_TOTP_SECRET");
  const sessionSecret = get("SESSION_SECRET");

  // The dashboard is left open only when the app is explicitly running in development. Anything else,
  // including a setting that has gone missing or is unreadable, refuses the dashboard instead.
  if (!password) return env.NODE_ENV === "development" ? { mode: "open" } : { mode: "unconfigured" };

  const missing: string[] = [];
  if (!totpSecret || !isValidTotpSecret(totpSecret)) missing.push("ADMIN_TOTP_SECRET");
  if (!sessionSecret || sessionSecret.length < MIN_SESSION_SECRET_LENGTH) missing.push("SESSION_SECRET");
  if (missing.length > 0) return { mode: "setup-needed", missing };

  const hours = Number(get("SESSION_HOURS") ?? DEFAULT_SESSION_HOURS);
  const clamped = Number.isFinite(hours) ? Math.min(Math.max(hours, 1), 72) : DEFAULT_SESSION_HOURS;
  return { mode: "ready", password: password!, totpSecret: totpSecret!, sessionSecret: sessionSecret!, sessionSeconds: Math.round(clamped * 3600) };
}
