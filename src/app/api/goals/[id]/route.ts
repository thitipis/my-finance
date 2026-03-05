import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { projectGoal } from "@/services/goal-engine.service";

const UpdateGoalSchema = z.object({
  name: z.string().min(1).optional(),
  goalType: z.enum(["retirement", "emergency_fund", "investment", "home_car", "education", "custom"]).optional(),
  targetAmount: z.number().positive().optional(),
  currentAmount: z.number().min(0).optional(),
  monthlyContribution: z.number().min(0).optional(),
  annualReturnRate: z.number().min(0).max(100).optional(),
  targetDate: z.string().optional().nullable(),
});

async function getGoalOrFail(id: string, userId: string) {
  const goal = await prisma.goal.findFirst({ where: { id, userId } });
  return goal;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const goal = await getGoalOrFail(id, session.user.id);
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const projection = projectGoal(Number(goal.targetAmount), Number(goal.currentAmount), Number(goal.monthlyContribution), Number(goal.annualReturnRate));
  return NextResponse.json({ data: { ...goal, projection } });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const existing = await getGoalOrFail(id, session.user.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = UpdateGoalSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.issues }, { status: 400 });

  const { targetDate, ...rest } = parsed.data;
  const goal = await prisma.goal.update({
    where: { id },
    data: {
      ...rest,
      ...(targetDate !== undefined ? { targetDate: targetDate ? new Date(targetDate) : null } : {}),
    },
  });
  const projection = projectGoal(Number(goal.targetAmount), Number(goal.currentAmount), Number(goal.monthlyContribution), Number(goal.annualReturnRate));
  return NextResponse.json({ data: { ...goal, projection } });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const existing = await getGoalOrFail(id, session.user.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.goal.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
