import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForDb = globalThis as unknown as { prisma?: PrismaClient };

export function createDb(connectionString: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

// One shared client per server process. In development Next reloads modules, so the client is
// kept on globalThis to avoid opening a new connection pool on every reload.
export function getDb(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  globalForDb.prisma ??= createDb(url);
  return globalForDb.prisma;
}

export const hasDatabase = (): boolean => Boolean(process.env.DATABASE_URL);
