import { CHANNELS, type ChannelSummary, type DailyStat } from "./types";

export function summariseByChannel(stats: DailyStat[]): ChannelSummary[] {
  return CHANNELS.map(({ id }) => {
    const rows = stats.filter((s) => s.channel === id);
    const revenuePence = sum(rows, "revenuePence");
    const orders = sum(rows, "orders");
    const sessions = sum(rows, "sessions");
    return {
      channel: id,
      revenuePence,
      orders,
      units: sum(rows, "units"),
      sessions,
      conversionRate: sessions > 0 ? orders / sessions : 0,
      averageOrderPence: orders > 0 ? Math.round(revenuePence / orders) : 0,
    };
  });
}

export function revenueByDay(stats: DailyStat[]): { date: string; byChannel: Record<string, number> }[] {
  const days = new Map<string, Record<string, number>>();
  for (const s of stats) {
    const day = days.get(s.date) ?? {};
    day[s.channel] = (day[s.channel] ?? 0) + s.revenuePence;
    days.set(s.date, day);
  }
  return [...days.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, byChannel]) => ({ date, byChannel }));
}

export function formatPounds(pence: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
}

export function formatPercent(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

function sum(rows: DailyStat[], key: "revenuePence" | "orders" | "units" | "sessions"): number {
  return rows.reduce((total, r) => total + r[key], 0);
}
