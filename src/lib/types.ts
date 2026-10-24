export type Channel = "amazon" | "shopify" | "website";

export const CHANNELS: { id: Channel; label: string }[] = [
  { id: "amazon", label: "Amazon" },
  { id: "shopify", label: "Shopify" },
  { id: "website", label: "Website" },
];

export type DailyStat = {
  date: string; // YYYY-MM-DD
  channel: Channel;
  revenuePence: number;
  orders: number;
  units: number;
  sessions: number;
};

export type ChannelSummary = {
  channel: Channel;
  revenuePence: number;
  orders: number;
  units: number;
  sessions: number;
  conversionRate: number; // orders / sessions, 0..1
  averageOrderPence: number;
};

export type Listing = {
  sku: string;
  name: string;
  channel: Channel;
  title: string;
  bullets: string[];
  description: string;
  backendKeywords: string;
  targetKeywords: string[]; // search phrases to rank for, most important first
};
