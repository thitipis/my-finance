import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY ?? "change-me";

// POST /api/admin/instruments/sync  body: { source: "coingecko" }
// Syncs top 100 coins from CoinGecko free API (no key required)
export async function POST(req: NextRequest) {
  if (req.headers.get("x-admin-key") !== ADMIN_KEY)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { source } = await req.json().catch(() => ({ source: "coingecko" }));

  if (source === "coingecko") {
    const url = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=thb&order=market_cap_desc&per_page=100&page=1";
    const res = await fetch(url, {
      headers: { "Accept": "application/json" },
      next: { revalidate: 0 },
    });

    if (!res.ok) return NextResponse.json({ error: "CoinGecko fetch failed", status: res.status }, { status: 502 });

    const coins: { id: string; symbol: string; name: string }[] = await res.json();

    let upserted = 0;
    const now = new Date();
    for (const coin of coins) {
      const ticker = coin.symbol.toUpperCase();
      await (prisma as any).instrumentCatalog.upsert({
        where: { assetType_ticker: { assetType: "crypto", ticker } },
        update: { nameEn: coin.name, lastSyncedAt: now, isActive: true },
        create: {
          assetType: "crypto",
          ticker,
          nameEn: coin.name,
          exchange: "Crypto",
          lastSyncedAt: now,
        },
      });
      upserted++;
    }

    return NextResponse.json({ success: true, source: "coingecko", upserted });
  }

  return NextResponse.json({ error: "Unknown source. Supported: coingecko" }, { status: 400 });
}
