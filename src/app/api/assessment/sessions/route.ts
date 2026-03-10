import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const VALID_TYPES = ["risk", "personality", "knowledge", "goals"] as const;

const SaveSessionSchema = z.object({
  type: z.enum(VALID_TYPES),
  score: z.number().int().min(0),
  maxScore: z.number().int().min(0),
  result: z.record(z.string(), z.unknown()),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  const where = {
    userId: session.user.id,
    ...(type && VALID_TYPES.includes(type as typeof VALID_TYPES[number]) ? { type } : {}),
  };

  const sessions = await prisma.assessmentSession.findMany({
    where,
    orderBy: { takenAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ data: sessions });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = SaveSessionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.issues }, { status: 400 });

  const record = await prisma.assessmentSession.create({
    data: {
      userId: session.user.id,
      type: parsed.data.type,
      score: parsed.data.score,
      maxScore: parsed.data.maxScore,
      result: parsed.data.result as Record<string, string>,
    },
  });

  return NextResponse.json({ data: record }, { status: 201 });
}
