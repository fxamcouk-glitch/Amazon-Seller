// SAMPLE DATA ONLY. Placeholder numbers so the dashboard can be built and reviewed
// before the Amazon, Shopify and website integrations exist. Replace via src/lib/data.ts.
import type { DailyStat, Listing } from "./types";

const DAYS = 30;
const END = new Date("2026-10-23T00:00:00Z");

// Deterministic wobble so server and client renders agree and tests are stable.
function wobble(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const PROFILE = {
  amazon: { orders: 9, aov: 1450, sessions: 190 },
  shopify: { orders: 4, aov: 1890, sessions: 120 },
  website: { orders: 1, aov: 1700, sessions: 60 },
} as const;

export function sampleDailyStats(): DailyStat[] {
  const rows: DailyStat[] = [];
  for (let d = DAYS - 1; d >= 0; d--) {
    const date = new Date(END.getTime() - d * 86_400_000).toISOString().slice(0, 10);
    (Object.keys(PROFILE) as (keyof typeof PROFILE)[]).forEach((channel, c) => {
      const p = PROFILE[channel];
      const f = 0.6 + wobble(d * 3 + c) * 0.8;
      const orders = Math.round(p.orders * f);
      const units = Math.round(orders * (1.2 + wobble(d + c * 7) * 0.5));
      rows.push({
        date,
        channel,
        orders,
        units,
        revenuePence: Math.round(orders * p.aov * (0.9 + wobble(d * 5 + c) * 0.2)),
        sessions: Math.round(p.sessions * f),
      });
    });
  }
  return rows;
}

export function sampleListings(): Listing[] {
  return [
    {
      sku: "FBC-3C-075-3M-BLK",
      name: "Fabric braided 3-core cable, 0.75mm², 3m, black",
      channel: "amazon",
      title:
        "Black Fabric Braided Cable 3 Core 0.75mm Flex 3 Metre - Vintage Textile Lamp Lead for Pendant Lights, Table Lamps and Rewiring",
      bullets: [
        "BRAIDED FABRIC FINISH - woven textile sleeve over three-core flex gives a classic vintage look.",
        "3 CORE 0.75MM - live, neutral and earth for Class 1 lighting and small appliances.",
        "3 METRE LENGTH - ready cut for lamps, pendants and DIY rewires.",
        "EASY TO STRIP - flexible PVC core insulation.",
        "SOLD BY THE CABLE STORE - UK based, fast dispatch.",
      ],
      description:
        "Fabric braided three core cable in black. Suitable for lamp rewires and pendant lights. Check your fitting's rating before use and have installation work done by a competent person.",
      backendKeywords: "electrical wire textile lighting rewire antique retro lamp cord",
      targetKeywords: ["braided lamp cable", "fabric lamp flex", "3 core braided cable", "pendant light cable"],
    },
    {
      sku: "FBC-3C-075-3M-GLD",
      name: "Fabric braided 3-core cable, 0.75mm², 3m, gold",
      channel: "amazon",
      title: "Gold Braided Cable 3 Core",
      bullets: ["Gold fabric braid", "3 core 0.75mm"],
      description: "",
      backendKeywords: "",
      targetKeywords: ["gold braided cable", "braided lamp cable"],
    },
    {
      sku: "FBC-3C-075-5M-BLK",
      name: "Fabric braided 3-core cable, 0.75mm², 5m, black",
      channel: "amazon",
      title:
        "Black Fabric Braided Cable 3 Core 0.75mm Flex 5 Metre Vintage Textile Lamp Lead Pendant Light Cable Rewire Kit Braided Cord",
      bullets: [
        "BRAIDED FABRIC - classic woven look.",
        "3 CORE 0.75MM - live, neutral and earth.",
        "5 METRE - extra length for hanging pendants.",
        "FLEXIBLE - easy to route and strip.",
        "UK SELLER - dispatched from the UK.",
      ],
      description: "Five metres of black fabric braided three core flex for pendant lights and lamps.",
      backendKeywords: "braided electrical wire textile lighting rewire antique retro lamp cord cable flex lead",
      targetKeywords: ["braided lamp cable", "5 metre pendant cable", "fabric lamp flex"],
    },
  ];
}
