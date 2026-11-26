// Limits sign-in attempts. Each attempt takes one slot from a fixed window *before* the password is
// checked, so many guesses sent at the same instant still only get a limited number of tries.

export const WINDOW_MS = 15 * 60 * 1000;
export const LIMIT_PER_CLIENT = 5;
export const LIMIT_ALL_CLIENTS = 40; // a backstop against guessing spread over many addresses

export type Slot = { count: number; windowStart: number };

export interface ThrottleStore {
  // Atomically counts one attempt for the key and returns the count in the current window.
  take(key: string, nowMs: number): Promise<Slot>;
  clear(key: string): Promise<void>;
}

export class MemoryThrottleStore implements ThrottleStore {
  private slots = new Map<string, Slot>();
  async take(key: string, nowMs: number): Promise<Slot> {
    const current = this.slots.get(key);
    const next: Slot = !current || current.windowStart <= nowMs - WINDOW_MS ? { count: 1, windowStart: nowMs } : { count: current.count + 1, windowStart: current.windowStart };
    this.slots.set(key, next);
    return next;
  }
  async clear(key: string): Promise<void> {
    this.slots.delete(key);
  }
}

export type Admission = { allowed: true } | { allowed: false; retryAfterSeconds: number };

export async function admit(store: ThrottleStore, clientKey: string, nowMs: number): Promise<Admission> {
  const [client, all] = await Promise.all([store.take(`client:${clientKey}`, nowMs), store.take("all", nowMs)]);
  const over = [
    client.count > LIMIT_PER_CLIENT ? client.windowStart + WINDOW_MS : 0,
    all.count > LIMIT_ALL_CLIENTS ? all.windowStart + WINDOW_MS : 0,
  ].filter(Boolean);
  if (over.length === 0) return { allowed: true };
  return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((Math.max(...over) - nowMs) / 1000)) };
}

export async function forgive(store: ThrottleStore, clientKey: string): Promise<void> {
  await Promise.all([store.clear(`client:${clientKey}`), store.clear("all")]);
}

// Replay protection: remembers the newest authenticator step that was accepted.
export interface ReplayStore {
  claim(step: number): Promise<boolean>; // true only for a step newer than every earlier one
}

export class MemoryReplayStore implements ReplayStore {
  private last = 0;
  async claim(step: number): Promise<boolean> {
    if (step <= this.last) return false;
    this.last = step;
    return true;
  }
}
