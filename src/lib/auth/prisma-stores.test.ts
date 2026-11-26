import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createDb } from "../db";
import { PrismaReplayStore, PrismaThrottleStore } from "./prisma-stores";
import { LIMIT_PER_CLIENT, WINDOW_MS, admit } from "./throttle";

// Runs only when TEST_DATABASE_URL points at a disposable Postgres database.
const url = process.env.TEST_DATABASE_URL;
const db = url ? createDb(url) : undefined;
const T0 = 1_800_000_000_000;

describe.skipIf(!db)("login protection stores (Postgres)", () => {
  const throttle = new PrismaThrottleStore(db!);
  const replay = new PrismaReplayStore(db!);

  beforeEach(async () => {
    await db!.authThrottle.deleteMany();
    await db!.authState.deleteMany();
  });
  afterAll(async () => db?.$disconnect());

  it("counts attempts in a window and starts a fresh window after it ends", async () => {
    expect((await throttle.take("k", T0)).count).toBe(1);
    expect((await throttle.take("k", T0 + 1000)).count).toBe(2);
    expect((await throttle.take("k", T0 + 2000)).windowStart).toBe(T0);
    const fresh = await throttle.take("k", T0 + WINDOW_MS + 1);
    expect(fresh).toEqual({ count: 1, windowStart: T0 + WINDOW_MS + 1 });
  });

  it("clears a key", async () => {
    await throttle.take("k", T0);
    await throttle.clear("k");
    expect((await throttle.take("k", T0)).count).toBe(1);
  });

  it("counts 200 simultaneous attempts exactly, so parallel guessing cannot get past the limit", async () => {
    const results = await Promise.all(Array.from({ length: 200 }, () => admit(throttle, "9.9.9.9", T0)));
    expect(results.filter((r) => r.allowed)).toHaveLength(LIMIT_PER_CLIENT);
    expect((await db!.authThrottle.findUniqueOrThrow({ where: { key: "client:9.9.9.9" } })).count).toBe(200);
  });

  it("accepts each authenticator step once, and only moving forward", async () => {
    expect(await replay.claim(100)).toBe(true);
    expect(await replay.claim(100)).toBe(false);
    expect(await replay.claim(99)).toBe(false);
    expect(await replay.claim(101)).toBe(true);
  });

  it("lets only one of many simultaneous uses of the same code through", async () => {
    const results = await Promise.all(Array.from({ length: 25 }, () => replay.claim(500)));
    expect(results.filter(Boolean)).toHaveLength(1);
  });
});
