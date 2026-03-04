import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ApiResponse } from "@/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ year: string }> }
) {
  try {
    const { year: yearStr } = await params;
    const year = parseInt(yearStr, 10);
    if (isNaN(year)) {
      return NextResponse.json<ApiResponse>({ success: false, error: "INVALID_YEAR" }, { status: 400 });
    }

    const taxYear = await prisma.taxYear.findFirst({
      where: { year, isActive: true },
      include: {
        taxBrackets: { orderBy: { sortOrder: "asc" } },
        personalAllowance: true,
        deductionLimits: {
          where: { isActive: true },
          include: { deductionType: { select: { id: true, code: true, nameTh: true, nameEn: true, descriptionTh: true, descriptionEn: true, sortOrder: true } } },
          orderBy: { deductionType: { sortOrder: "asc" } },
        },
      },
    });

    if (!taxYear) {
      return NextResponse.json<ApiResponse>({ success: false, error: "TAX_YEAR_NOT_ACTIVE" }, { status: 404 });
    }

    const data = {
      year: taxYear.year,
      brackets: taxYear.taxBrackets.map((b) => ({
        minIncome: Number(b.minIncome),
        maxIncome: b.maxIncome ? Number(b.maxIncome) : null,
        rate: Number(b.rate),
      })),
      personalAllowances: taxYear.personalAllowance
        ? {
            selfAmount: Number(taxYear.personalAllowance.selfAmount),
            spouseAmount: Number(taxYear.personalAllowance.spouseAmount),
            childAmountPerChild: Number(taxYear.personalAllowance.childAmountPerChild),
            parentAmountPerParent: Number(taxYear.personalAllowance.parentAmountPerParent),
            maxParents: taxYear.personalAllowance.maxParents,
            expenseDeductionRate: Number(taxYear.personalAllowance.expenseDeductionRate),
            expenseDeductionMax: Number(taxYear.personalAllowance.expenseDeductionMax),
          }
        : null,
      deductionTypes: taxYear.deductionLimits.map((dl) => ({
        id: dl.deductionType.id,
        code: dl.deductionType.code,
        nameTh: dl.deductionType.nameTh,
        nameEn: dl.deductionType.nameEn,
        descriptionTh: dl.deductionType.descriptionTh,
        descriptionEn: dl.deductionType.descriptionEn,
        maxAmount: dl.maxAmount ? Number(dl.maxAmount) : null,
        maxRateOfIncome: dl.maxRateOfIncome ? Number(dl.maxRateOfIncome) : null,
        combinedCapGroup: dl.combinedCapGroup,
        combinedCapAmount: dl.combinedCapAmount ? Number(dl.combinedCapAmount) : null,
      })),
    };

    return NextResponse.json<ApiResponse>({ success: true, data });
  } catch (error) {
    console.error("[tax/config]", error);
    return NextResponse.json<ApiResponse>({ success: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
