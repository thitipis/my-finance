import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const FinancialProfileSchema = z.object({
  // Personal
  filingStatus: z.enum(["single", "married_no_income", "married_separate", "married_joint"]).optional(),
  numChildren: z.coerce.number().int().min(0).optional(),
  numParents: z.coerce.number().int().min(0).max(2).optional(),
  numDisabledDependents: z.coerce.number().int().min(0).optional(),
  // Income
  annualSalary: z.coerce.number().min(0).optional(),
  bonus: z.coerce.number().min(0).optional(),
  otherIncome: z.coerce.number().min(0).optional(),
  spouseIncome: z.coerce.number().min(0).optional(),
  withheldTax: z.coerce.number().min(0).optional(),
  taxRefundAmount: z.coerce.number().min(0).optional(),
  dividendIncome: z.coerce.number().min(0).optional(),
  // Payroll
  socialSecurity: z.coerce.number().min(0).optional(),
  providentFundRate: z.coerce.number().min(0).max(15).optional(),
  providentFundAmount: z.coerce.number().min(0).optional(),
  // Insurance premiums
  lifeInsurancePremium: z.coerce.number().min(0).optional(),
  healthInsurancePremium: z.coerce.number().min(0).optional(),
  parentHealthInsurancePremium: z.coerce.number().min(0).optional(),
  annuityInsurancePremium: z.coerce.number().min(0).optional(),
  spouseLifeInsurancePremium: z.coerce.number().min(0).optional(),
  // Investment deductions (annual contributions)
  ltfAmount: z.coerce.number().min(0).optional(),
  rmfAmount: z.coerce.number().min(0).optional(),
  ssfAmount: z.coerce.number().min(0).optional(),
  thaiEsgAmount: z.coerce.number().min(0).optional(),
  // Personal investment portfolio (current market value)
  goldAmount: z.coerce.number().min(0).optional(),
  cryptoAmount: z.coerce.number().min(0).optional(),
  etfAmount: z.coerce.number().min(0).optional(),
  thaiStockAmount: z.coerce.number().min(0).optional(),
  foreignStockAmount: z.coerce.number().min(0).optional(),
  otherInvestAmount: z.coerce.number().min(0).optional(),
  // Liabilities
  totalDebt: z.coerce.number().min(0).optional(),
  monthlyDebtPayment: z.coerce.number().min(0).optional(),
  debtInterestRate: z.coerce.number().min(0).max(100).optional(),
  // Emergency fund
  emergencyFundAmount: z.coerce.number().min(0).optional(),
  monthlyExpenses: z.coerce.number().min(0).optional(),
  // Savings
  cashOnHand: z.coerce.number().min(0).optional(),
  savingsDeposit: z.coerce.number().min(0).optional(),
  fixedDeposit: z.coerce.number().min(0).optional(),
  monthlySavingsGoal: z.coerce.number().min(0).optional(),
  // Monthly budget breakdown
  budgetHousing: z.coerce.number().min(0).optional(),
  budgetFood: z.coerce.number().min(0).optional(),
  budgetTransport: z.coerce.number().min(0).optional(),
  budgetUtilities: z.coerce.number().min(0).optional(),
  budgetHealthcare: z.coerce.number().min(0).optional(),
  budgetEntertainment: z.coerce.number().min(0).optional(),
  budgetEducation: z.coerce.number().min(0).optional(),
  budgetPersonalCare: z.coerce.number().min(0).optional(),
  budgetOther: z.coerce.number().min(0).optional(),
  // Monthly investment targets
  monthlyInvestTax: z.coerce.number().min(0).optional(),
  monthlyInvestPersonal: z.coerce.number().min(0).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.financialProfile.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json({ data: profile ?? null });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = FinancialProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.issues }, { status: 400 });
  }

  const profile = await prisma.financialProfile.upsert({
    where: { userId: session.user.id },
    update: parsed.data,
    create: { userId: session.user.id, ...parsed.data },
  });

  return NextResponse.json({ data: profile });
}
