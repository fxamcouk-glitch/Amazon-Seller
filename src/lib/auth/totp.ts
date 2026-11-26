import { Secret, TOTP } from "otpauth";

// Google Authenticator (and Microsoft Authenticator, Authy, 1Password and so on) all use the same
// standard: 6 digits, 30 seconds, SHA-1. Nothing else would work with Google Authenticator.
export const TOTP_PERIOD_SECONDS = 30;
export const ISSUER = "The Cable Store";

const make = (secretBase32: string, label = "dashboard") =>
  new TOTP({ issuer: ISSUER, label, algorithm: "SHA1", digits: 6, period: TOTP_PERIOD_SECONDS, secret: Secret.fromBase32(secretBase32) });

export const newTotpSecret = (): string => new Secret({ size: 20 }).base32; // 160 bits

export const totpUri = (secretBase32: string): string => make(secretBase32).toString();

// The code an authenticator app shows at the given moment (used by tests and the setup helper).
export const currentCode = (secretBase32: string, nowMs: number = Date.now()): string => make(secretBase32).generate({ timestamp: nowMs });

// Checks a typed code. One step either side of now is accepted, so a slow typist or a phone clock
// that is a few seconds out still works. Returns the 30-second step that matched, which the caller
// records so the same code cannot be used again.
export function matchTotp(secretBase32: string, input: string, nowMs: number = Date.now()): { step: number } | null {
  const token = input.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(token)) return null;
  try {
    const delta = make(secretBase32).validate({ token, window: 1, timestamp: nowMs });
    return delta === null ? null : { step: Math.floor(nowMs / 1000 / TOTP_PERIOD_SECONDS) + delta };
  } catch {
    return null;
  }
}
