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
  // Investment deductions
  ltfAmount: z.coerce.number().min(0).optional(),
  rmfAmount: z.coerce.number().min(0).optional(),
  ssfAmount: z.coerce.number().min(0).optional(),
  thaiEsgAmount: z.coerce.number().min(0).optional(),
  // Liabilities
  totalDebt: z.coerce.number().min(0).optional(),
  monthlyDebtPayment: z.coerce.number().min(0).optional(),
  // Emergency fund
  emergencyFundAmount: z.coerce.number().min(0).optional(),
  monthlyExpenses: z.coerce.number().min(0).optional(),
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
