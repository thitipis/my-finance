import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateSchema = z.object({
  name:         z.string().min(1).max(80),
  group:        z.enum(["thai", "international", "other"]),
  emoji:        z.string().min(1).max(8).default("💰"),
  currentValue: z.coerce.number().min(0).default(0),
  isBuiltIn:    z.boolean().default(false),
  sortOrder:    z.coerce.number().int().default(0),
});

// Built-in assets seeded on first fetch
const BUILT_INS: Omit<z.infer<typeof CreateSchema>, "currentValue">[] = [
  { name: "หุ้นไทย (SET/MAI)",      group: "thai",          emoji: "🇹🇭", isBuiltIn: true, sortOrder: 0 },
  { name: "กองทุนรวมในประเทศ",      group: "thai",          emoji: "🏦", isBuiltIn: true, sortOrder: 1 },
  { name: "หุ้นต่างประเทศ (US/EU)", group: "international", emoji: "🌎", isBuiltIn: true, sortOrder: 0 },
  { name: "ETF",                     group: "international", emoji: "📊", isBuiltIn: true, sortOrder: 1 },
  { name: "Crypto",                  group: "international", emoji: "₿",  isBuiltIn: true, sortOrder: 2 },
  { name: "ทองคำ",                   group: "other",         emoji: "🏅", isBuiltIn: true, sortOrder: 0 },
  { name: "อื่น ๆ (REITs / Bond)",  group: "other",         emoji: "🏢", isBuiltIn: true, sortOrder: 1 },
];

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  let assets = await prisma.portfolioAsset.findMany({
    where: { userId },
    orderBy: [{ group: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });

  // Auto-seed built-ins for new users
  if (assets.length === 0) {
    await prisma.portfolioAsset.createMany({
      data: BUILT_INS.map(a => ({ ...a, userId, currentValue: 0 })),
    });
    assets = await prisma.portfolioAsset.findMany({
      where: { userId },
      orderBy: [{ group: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    });
  }

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
