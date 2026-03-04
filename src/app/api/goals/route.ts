import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { projectGoal } from "@/services/goal-engine.service";

const CreateGoalSchema = z.object({
  name: z.string().min(1),
  goalType: z.enum(["retirement", "emergency_fund", "investment", "home_car", "education", "custom"]),
  targetAmount: z.number().positive(),
  currentAmount: z.number().min(0).default(0),
  monthlyContribution: z.number().min(0),
  annualReturnRate: z.number().min(0).max(100),
  targetDate: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const goals = await prisma.goal.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  const withProjection = goals.map((g) => {
    const proj = projectGoal(
      Number(g.targetAmount),
      Number(g.currentAmount),
      Number(g.monthlyContribution),
      Number(g.annualReturnRate),
    );
    return { ...g, projection: proj };
  });

  return NextResponse.json({ data: withProjection });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateGoalSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.issues }, { status: 400 });

  const { targetDate, ...rest } = parsed.data;
  const goal = await prisma.goal.create({
    data: {
      ...rest,
      userId: session.user.id,
      targetDate: targetDate ? new Date(targetDate) : null,
    },
  });

  return NextResponse.json({ data: goal }, { status: 201 });
}
