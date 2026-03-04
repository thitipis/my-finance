import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { calculateTax } from "@/services/tax-engine.service";
import { prisma } from "@/lib/prisma";
import type { ApiResponse, TaxCalculationInput } from "@/types";

const calculateSchema = z.object({
  year: z.number().int().min(2020).max(2099),
  filingStatus: z.enum(["single", "married_no_income", "married_separate", "married_joint"]),
  annualSalary: z.number().min(0),
  bonus: z.number().min(0).default(0),
  otherIncome: z.number().min(0).default(0),
  spouseIncome: z.number().min(0).default(0),
  withheldTax: z.number().min(0).default(0),
  providentFund: z.number().min(0).default(0),
  socialSecurity: z.number().min(0).default(0),
  numChildren: z.number().int().min(0).default(0),
  numParents: z.number().int().min(0).max(2).default(0),
  deductions: z
    .array(
      z.object({
        deductionTypeId: z.string().uuid(),
        code: z.string(),
        amount: z.number().min(0),
      })
    )
    .default([]),
});

// POST /api/tax/calculate
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse>({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = calculateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "VALIDATION_ERROR", fields: parsed.error.issues.map((e: { message: string }) => e.message) },
        { status: 400 }
      );
    }

    const input: TaxCalculationInput = parsed.data;
    const result = await calculateTax(input);

    // Fire-and-forget usage event
    prisma.usageEvent
      .create({
        data: {
          userId: session.user.id,
          eventType: "tax_calculated",
          metadata: { year: input.year, filingStatus: input.filingStatus },
        },
      })
      .catch(console.error);

    return NextResponse.json<ApiResponse>({ success: true, data: result });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("TAX_YEAR_NOT_ACTIVE")) {
      return NextResponse.json<ApiResponse>({ success: false, error: "TAX_YEAR_NOT_ACTIVE" }, { status: 404 });
    }
    console.error("[tax/calculate]", error);
    return NextResponse.json<ApiResponse>({ success: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
