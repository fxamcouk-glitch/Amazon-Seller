import { describe, expect, it } from "vitest";
import { formatPercent, formatPounds, revenueByDay, summariseByChannel } from "./stats";
import type { DailyStat } from "./types";

const stats: DailyStat[] = [
  { date: "2026-10-02", channel: "amazon", revenuePence: 3000, orders: 2, units: 3, sessions: 40 },
  { date: "2026-10-01", channel: "amazon", revenuePence: 1000, orders: 1, units: 1, sessions: 10 },
  { date: "2026-10-01", channel: "shopify", revenuePence: 500, orders: 1, units: 1, sessions: 0 },
];

describe("summariseByChannel", () => {
  it("totals each channel and derives rates", () => {
    const amazon = summariseByChannel(stats).find((s) => s.channel === "amazon")!;
    expect(amazon).toMatchObject({ revenuePence: 4000, orders: 3, sessions: 50, averageOrderPence: 1333 });
    expect(amazon.conversionRate).toBeCloseTo(0.06);
  });

  it("returns zeros, not NaN, for a channel without data", () => {
    const website = summariseByChannel(stats).find((s) => s.channel === "website")!;
    expect(website).toMatchObject({ revenuePence: 0, conversionRate: 0, averageOrderPence: 0 });
  });
});

describe("revenueByDay", () => {
  it("orders days ascending and splits by channel", () => {
    expect(revenueByDay(stats)).toEqual([
      { date: "2026-10-01", byChannel: { amazon: 1000, shopify: 500 } },
      { date: "2026-10-02", byChannel: { amazon: 3000 } },
    ]);
  });
});

describe("formatting", () => {
  it("formats pounds and percentages", () => {
    expect(formatPounds(123456)).toBe("£1,234.56");
    expect(formatPercent(0.0537)).toBe("5.4%");
  });
});
