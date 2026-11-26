import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { WINDOW_MS, type ReplayStore, type Slot, type ThrottleStore } from "./throttle";

export class PrismaThrottleStore implements ThrottleStore {
  constructor(private readonly db: PrismaClient) {}

  // One INSERT ... ON CONFLICT statement does the whole read-modify-write inside the database, so
  // simultaneous attempts are counted one after another rather than overwriting each other.
  async take(key: string, nowMs: number): Promise<Slot> {
    const now = new Date(nowMs);
    const cutoff = new Date(nowMs - WINDOW_MS);
    const rows = await this.db.$queryRaw<{ count: number; windowStart: Date }[]>(Prisma.sql`
      INSERT INTO "AuthThrottle" ("key", "count", "windowStart") VALUES (${key}, 1, ${now})
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "AuthThrottle"."windowStart" <= ${cutoff} THEN 1 ELSE "AuthThrottle"."count" + 1 END,
        "windowStart" = CASE WHEN "AuthThrottle"."windowStart" <= ${cutoff} THEN ${now} ELSE "AuthThrottle"."windowStart" END
      RETURNING "count", "windowStart"`);
    return { count: Number(rows[0].count), windowStart: rows[0].windowStart.getTime() };
  }

  async clear(key: string): Promise<void> {
    await this.db.authThrottle.deleteMany({ where: { key } });
  }
}

export class PrismaReplayStore implements ReplayStore {
  constructor(private readonly db: PrismaClient) {}

  async claim(step: number): Promise<boolean> {
    await this.db.authState.createMany({ data: [{ key: "lastTotpStep", intValue: 0 }], skipDuplicates: true });
    // Only one caller can move the stored step forward, so a code used twice is accepted once.
    const { count } = await this.db.authState.updateMany({ where: { key: "lastTotpStep", intValue: { lt: step } }, data: { intValue: step } });
    return count === 1;
  }
}
