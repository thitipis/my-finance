import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateSchema = z.object({
  assetType:        z.string().min(1).max(40).optional(),
  ticker:           z.string().min(1).max(40).optional(),
  name:             z.string().min(1).max(120),
  group:            z.enum(["thai", "international", "other", "tax"]),
  emoji:            z.string().min(1).max(8).default("💰"),
  currentValue:     z.coerce.number().min(0).default(0),
  annualInvestment: z.coerce.number().min(0).optional().nullable(),
  units:            z.coerce.number().min(0).optional().nullable(),
  avgCostPerUnit:   z.coerce.number().min(0).optional().nullable(),
  isBuiltIn:        z.boolean().default(false),
  sortOrder:        z.coerce.number().int().default(0),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const assets = await prisma.portfolioAsset.findMany({
    where: { userId },
    orderBy: [{ group: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ data: assets });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.issues }, { status: 400 });

  const asset = await prisma.portfolioAsset.create({
    data: { ...parsed.data, userId: session.user.id },
  });

  return NextResponse.json({ data: asset }, { status: 201 });
}
