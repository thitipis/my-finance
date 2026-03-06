import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/instruments?q=PTT&type=thai_stock&limit=10
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q     = (searchParams.get("q") ?? "").trim();
  const type  = searchParams.get("type") ?? undefined;
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "12"), 50);

  const results = await (prisma as any).instrumentCatalog.findMany({
    where: {
      isActive: true,
      ...(type ? { assetType: type } : {}),
      ...(q
        ? {
            OR: [
              { ticker:  { contains: q, mode: "insensitive" } },
              { nameTh:  { contains: q, mode: "insensitive" } },
              { nameEn:  { contains: q, mode: "insensitive" } },
              { exchange:{ contains: q, mode: "insensitive" } },
              { provider:{ contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ assetType: "asc" }, { ticker: "asc" }],
    take: limit,
    select: {
      id: true, assetType: true, ticker: true, nameTh: true, nameEn: true,
      exchange: true, provider: true, sector: true,
    },
  });

  return NextResponse.json({ data: results });
}
