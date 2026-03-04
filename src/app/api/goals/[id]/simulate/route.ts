import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { simulateGoal, projectGoal } from "@/services/goal-engine.service";

const SimulateSchema = z.object({
  newMonthlyContribution: z.number().min(0),
  newAnnualReturnRate: z.number().min(0).max(100).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const goal = await prisma.goal.findFirst({ where: { id, userId: session.user.id } });
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = SimulateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.issues }, { status: 400 });

  const { newMonthlyContribution, newAnnualReturnRate } = parsed.data;
  const originalProjection = projectGoal(
    Number(goal.targetAmount),
    Number(goal.currentAmount),
    Number(goal.monthlyContribution),
    Number(goal.annualReturnRate),
  );

  const result = simulateGoal(
    Number(goal.targetAmount),
    Number(goal.currentAmount),
    newMonthlyContribution,
    newAnnualReturnRate ?? Number(goal.annualReturnRate),
    originalProjection,
  );

  return NextResponse.json({ data: result });
}
