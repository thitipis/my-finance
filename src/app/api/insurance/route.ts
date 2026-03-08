import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const InsuranceSchema = z.object({
  // Premiums (for tax deduction)
  lifeInsurancePremium: z.number().min(0).default(0),
  healthInsurancePremium: z.number().min(0).default(0),
  parentHealthInsurancePremium: z.number().min(0).default(0),
  annuityInsurancePremium: z.number().min(0).default(0),
  spouseLifeInsurancePremium: z.number().min(0).default(0),
  // Coverage details (for recommendation engine)
  lifeCoverageAmount: z.number().min(0).optional(),
  healthCoveragePerYear: z.number().min(0).optional(),
  parentHealthCoveragePerYear: z.number().min(0).optional(),
  annuityCoverageAmount: z.number().min(0).optional(),
  spouseLifeCoverageAmount: z.number().min(0).optional(),
  hasAccidentInsurance: z.boolean().optional(),
  hasCriticalIllness: z.boolean().optional(),
  hasDisabilityInsurance: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const record = await prisma.insuranceData.findUnique({ where: { userId: session.user.id } });
  return NextResponse.json({ data: record });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = InsuranceSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.issues }, { status: 400 });

  const record = await prisma.insuranceData.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...parsed.data },
    update: parsed.data,
  });

  return NextResponse.json({ data: record });
}
