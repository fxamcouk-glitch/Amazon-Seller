import { NextResponse } from "next/server";
import { hasDatabase, getDb } from "../db";
import { PrismaReplayStore, PrismaThrottleStore } from "./prisma-stores";
import { MemoryReplayStore, MemoryThrottleStore, type ReplayStore, type ThrottleStore } from "./throttle";

// A redirect with a relative address. The app sits behind Cloudflare and the host, so it cannot
// always tell its own public address; the browser resolves a relative one correctly.
export const redirectTo = (path: string, status: 303 | 307 = 303): NextResponse => new NextResponse(null, { status, headers: { Location: path } });

const globalForAuth = globalThis as unknown as { authMemory?: { throttle: ThrottleStore; replay: ReplayStore } };

// The database keeps the attempt counts and used codes when there is one (so they survive restarts and
// are shared if the app ever runs twice). Without a database (local development) they live in memory.
export function authStores(): { throttle: ThrottleStore; replay: ReplayStore } {
  if (hasDatabase()) {
    const db = getDb();
    return { throttle: new PrismaThrottleStore(db), replay: new PrismaReplayStore(db) };
  }
  globalForAuth.authMemory ??= { throttle: new MemoryThrottleStore(), replay: new MemoryReplayStore() };
  return globalForAuth.authMemory;
}

export type AuthEventKind = "login_success" | "login_failure" | "login_blocked" | "logout" | "setup_view";

// A short sign-in log for the owner (see the Security page). Never allowed to break a sign-in.
export async function recordAuthEvent(kind: AuthEventKind, ip: string): Promise<void> {
  try {
    if (!hasDatabase()) {
      console.info(`[auth] ${kind} from ${ip}`);
      return;
    }
    const db = getDb();
    await db.authEvent.create({ data: { kind, ip } });
    if (kind === "login_success") {
      await db.authEvent.deleteMany({ where: { at: { lt: new Date(Date.now() - 90 * 24 * 3600 * 1000) } } });
    }
  } catch (error) {
    console.error("Could not record sign-in event:", error);
  }
}

export function allowedOrigins(requestUrl: string): string[] {
  const origins = [new URL(requestUrl).origin];
  const site = process.env.SITE_URL?.trim();
  if (site) {
    try {
      origins.push(new URL(site).origin);
    } catch {
      /* ignore a malformed SITE_URL here; the site address check elsewhere reports it */
    }
  }
  return origins;
}
