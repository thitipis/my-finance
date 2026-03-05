import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const RiskAssessmentSchema = z.object({
  answers: z.array(z.object({
    questionId: z.string(),
    answer: z.string(),
    score: z.number().int().min(0).max(10),
  })).min(1),
  score: z.number().int().min(0),
  riskLevel: z.enum(["conservative", "moderate", "aggressive"]),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const assessment = await prisma.riskAssessment.findUnique({
    where: { userId: session.user.id },
  });
  return NextResponse.json({ data: assessment ?? null });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = RiskAssessmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.issues }, { status: 400 });
  }

  const assessment = await prisma.riskAssessment.upsert({
    where: { userId: session.user.id },
    update: {
      answers: parsed.data.answers,
      score: parsed.data.score,
      riskLevel: parsed.data.riskLevel,
      takenAt: new Date(),
    },
    create: {
      userId: session.user.id,
      answers: parsed.data.answers,
      score: parsed.data.score,
      riskLevel: parsed.data.riskLevel,
    },
  });

  return NextResponse.json({ data: assessment });
}
