import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  try {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const [profile, plan, goals, riskAssessment, savedEvents, lifeStages] =
    await Promise.all([
      prisma.financialProfile.findUnique({ where: { userId } }),
      prisma.financialPlan.findUnique({ where: { userId } }),
      prisma.goal.findMany({ where: { userId, isActive: true }, orderBy: { createdAt: "asc" } }),
      prisma.riskAssessment.findUnique({ where: { userId } }),
      prisma.lineageEvent.findMany({
        where: { userId },
        orderBy: { age: "asc" },
      }),
      prisma.lifeStageTemplate.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

  return NextResponse.json({
    profile: profile
      ? {
          annualSalary: profile.annualSalary.toString(),
          monthlyExpenses: profile.monthlyExpenses.toString(),
          monthlyDebtPayment: profile.monthlyDebtPayment.toString(),
          totalDebt: profile.totalDebt.toString(),
          debtInterestRate: profile.debtInterestRate?.toString() ?? "7",
          emergencyFundAmount: profile.emergencyFundAmount.toString(),
          goldAmount: profile.goldAmount.toString(),
          cryptoAmount: profile.cryptoAmount.toString(),
          etfAmount: profile.etfAmount.toString(),
          thaiStockAmount: profile.thaiStockAmount.toString(),
          foreignStockAmount: profile.foreignStockAmount.toString(),
          otherInvestAmount: profile.otherInvestAmount.toString(),
        }
      : {},
    plan: plan
      ? {
          currentAge: plan.currentAge,
          retirementAge: plan.retirementAge,
          monthlyRetirementNeeds: plan.monthlyRetirementNeeds?.toString() ?? "0",
          currentSavings: plan.currentSavings?.toString() ?? "0",
          inflationRate: plan.inflationRate?.toString() ?? "3",
        }
      : null,
    goals: goals.map((g: typeof goals[0]) => ({
      id: g.id,
      name: g.name,
      goalType: g.goalType,
      targetAmount: Number(g.targetAmount),
      currentAmount: Number(g.currentAmount),
      targetDate: g.targetDate?.toISOString() ?? null,
    })),
    riskLevel: riskAssessment?.riskLevel ?? "moderate",
    savedEvents: savedEvents.map((e: typeof savedEvents[0]) => ({
      id: e.id,
      age: e.age,
      eventYear: e.eventYear,
      eventType: e.eventType,
      impact: e.impact,
      title: e.title,
      description: e.description,
      isAuto: e.isAuto,
      isAI: e.isAI,
    })),
    lifeStages: lifeStages.map((s: typeof lifeStages[0]) => ({
      id: s.id,
      ageFrom: s.ageFrom,
      ageTo: s.ageTo,
      titleTh: s.titleTh,
      descriptionTh: s.descriptionTh,
      icon: s.icon,
      allocEquity: s.allocEquity,
      allocBond: s.allocBond,
      allocCash: s.allocCash,
      colorHex: s.colorHex,
    })),
  });
  } catch (err) {
    console.error("[/api/lineage] Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
