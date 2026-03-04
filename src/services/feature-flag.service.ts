import { prisma } from "@/lib/prisma";
import type { FeatureFlagKey, Tier } from "@/types";

// Simple in-memory cache to avoid DB round-trip on every request
let cache: Map<string, { freeEnabled: boolean; premiumEnabled: boolean }> | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute

async function loadFlags() {
  const now = Date.now();
  if (cache && now < cacheExpiry) return cache;

  const flags = await prisma.featureFlag.findMany();
  cache = new Map(
    flags.map((f) => [f.key, { freeEnabled: f.freeEnabled, premiumEnabled: f.premiumEnabled }])
  );
  cacheExpiry = now + CACHE_TTL_MS;
  return cache;
}

export async function isFeatureEnabled(key: FeatureFlagKey, tier: Tier): Promise<boolean> {
  const flags = await loadFlags();
  const flag = flags.get(key);
  if (!flag) return false;
  return tier === "premium" ? flag.premiumEnabled : flag.freeEnabled;
}

export function invalidateFlagCache() {
  cache = null;
  cacheExpiry = 0;
}
