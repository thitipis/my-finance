import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const PlanSchema = z.object({
  // Step 1
  currentAge:      z.coerce.number().int().min(18).max(80).optional(),
  maritalStatus:   z.string().optional(),
  numChildrenPlan: z.coerce.number().int().min(0).optional(),
  // Step 2
  retirementAge:          z.coerce.number().int().min(40).max(80).optional(),
  monthlyRetirementNeeds: z.coerce.number().min(0).optional(),
  hasHomeGoal:            z.boolean().optional(),
  homePurchaseYears:      z.coerce.number().int().min(1).optional(),
  homeBudget:             z.coerce.number().min(0).optional(),
  hasCarGoal:             z.boolean().optional(),
  carPurchaseYears:       z.coerce.number().int().min(1).optional(),
  carBudget:              z.coerce.number().min(0).optional(),
  hasEducationGoal:       z.boolean().optional(),
  educationYears:         z.coerce.number().int().min(1).optional(),
  educationBudget:        z.coerce.number().min(0).optional(),
  emergencyFundMonths:    z.coerce.number().int().min(1).max(24).optional(),
  // Step 3
  monthlyInvestable:    z.coerce.number().min(0).optional(),
  currentSavings:       z.coerce.number().min(0).optional(),
  expectedReturn:       z.coerce.number().min(0).max(30).optional(),
  inflationRate:        z.coerce.number().min(0).max(20).optional(),
  targetWealthOverride: z.coerce.number().min(0).nullable().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plan = await prisma.financialPlan.findUnique({ where: { userId: session.user.id } });
  return NextResponse.json({ data: plan ?? null });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = PlanSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.issues }, { status: 400 });

  const plan = await prisma.financialPlan.upsert({
    where:  { userId: session.user.id },
    update: parsed.data,
    create: { userId: session.user.id, ...parsed.data },
  });

  return NextResponse.json({ data: plan });
}
