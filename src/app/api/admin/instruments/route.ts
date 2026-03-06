import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY ?? "change-me";

function checkAdmin(req: NextRequest) {
  return req.headers.get("x-admin-key") === ADMIN_KEY;
}

const CreateSchema = z.object({
  assetType: z.string().min(1),
  ticker:    z.string().min(1).max(40).transform(v => v.toUpperCase()),
  nameTh:    z.string().optional(),
  nameEn:    z.string().optional(),
  exchange:  z.string().optional(),
  provider:  z.string().optional(),
  sector:    z.string().optional(),
});

// GET /api/admin/instruments?type=thai_stock&q=PTT&page=1
export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const type   = searchParams.get("type") ?? undefined;
  const q      = (searchParams.get("q") ?? "").trim();
  const page   = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit  = 50;
  const skip   = (page - 1) * limit;

  const where = {
    ...(type ? { assetType: type } : {}),
    ...(q ? {
      OR: [
        { ticker: { contains: q, mode: "insensitive" as const } },
        { nameTh: { contains: q, mode: "insensitive" as const } },
        { nameEn: { contains: q, mode: "insensitive" as const } },
      ],
    } : {}),
  };

  const [instruments, total] = await Promise.all([
    (prisma as any).instrumentCatalog.findMany({
      where, skip, take: limit,
      orderBy: [{ assetType: "asc" }, { ticker: "asc" }],
    }),
    (prisma as any).instrumentCatalog.count({ where }),
  ]);

  return NextResponse.json({ data: instruments, total, page, pages: Math.ceil(total / limit) });
}

// POST /api/admin/instruments  — add or upsert a single instrument
export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.issues }, { status: 400 });

  const inst = await (prisma as any).instrumentCatalog.upsert({
    where: { assetType_ticker: { assetType: parsed.data.assetType, ticker: parsed.data.ticker } },
    update: parsed.data,
    create: parsed.data,
  });

  return NextResponse.json({ data: inst }, { status: 201 });
}

// PATCH /api/admin/instruments  body: { id, isActive? }
export async function PATCH(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, isActive } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const inst = await (prisma as any).instrumentCatalog.update({
    where: { id },
    data: { isActive },
  });

  return NextResponse.json({ data: inst });
}

// DELETE /api/admin/instruments?id=xxx
export async function DELETE(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await (prisma as any).instrumentCatalog.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
