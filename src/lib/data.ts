// The only module the pages read data through. Swap the bodies for Prisma queries
// (see prisma/schema.prisma) when the integrations land; the pages do not change.
import { listingStore } from "./listing-store";
import { sampleDailyStats } from "./sample-data";
import type { DailyStat, Listing } from "./types";

export const USING_SAMPLE_DATA = true;

export async function getDailyStats(): Promise<DailyStat[]> {
  return sampleDailyStats();
}

export async function getListings(): Promise<Listing[]> {
  return listingStore.list();
}
