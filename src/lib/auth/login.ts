import { timingSafeEqual, createHmac } from "node:crypto";
import type { AuthConfig } from "./config";
import { createSessionToken } from "./session";
import { admit, forgive, type ReplayStore, type ThrottleStore } from "./throttle";
import { matchTotp } from "./totp";

type Ready = Extract<AuthConfig, { mode: "ready" }>;

export type LoginOutcome =
  | { kind: "ok"; token: string; maxAgeSeconds: number }
  | { kind: "invalid" }
  | { kind: "blocked"; retryAfterSeconds: number };

// Constant-time comparison that does not reveal the length: both sides are hashed first.
export function safeEqual(a: string, b: string): boolean {
  const key = "compare";
  return timingSafeEqual(createHmac("sha256", key).update(a).digest(), createHmac("sha256", key).update(b).digest());
}

// The one place that decides whether a sign-in succeeds. A person is let in only with the right
// password AND a current authenticator code that has not been used before, and only while they are
// within the attempt limit. Both checks always run, and every failure looks the same, so the answer
// never reveals which part was wrong.
export async function attemptLogin(
  deps: { config: Ready; throttle: ThrottleStore; replay: ReplayStore; now?: () => number },
  input: { password: string; code: string; clientKey: string },
): Promise<LoginOutcome> {
  const now = (deps.now ?? Date.now)();
  const admission = await admit(deps.throttle, input.clientKey, now);
  if (!admission.allowed) return { kind: "blocked", retryAfterSeconds: admission.retryAfterSeconds };

  const passwordOk = safeEqual(input.password.slice(0, 500), deps.config.password);
  const match = matchTotp(deps.config.totpSecret, input.code, now);
  if (!passwordOk || !match) return { kind: "invalid" };

  // Claimed last, and only when everything else is right, so a wrong password cannot use up a code.
  if (!(await deps.replay.claim(match.step))) return { kind: "invalid" };

  await forgive(deps.throttle, input.clientKey);
  const token = await createSessionToken(deps.config.sessionSecret, deps.config.sessionSeconds, now);
  return { kind: "ok", token, maxAgeSeconds: deps.config.sessionSeconds };
}
