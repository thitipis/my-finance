import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

function isAdmin(req: NextRequest) {
  return req.headers.get("x-admin-key") === process.env.ADMIN_SECRET_KEY;
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const years = await prisma.taxYear.findMany({
    include: {
      taxBrackets: { orderBy: { sortOrder: "asc" } },
      personalAllowance: true,
      deductionLimits: {
        include: { deductionType: true },
      },
    },
    orderBy: { year: "desc" },
  });

  return NextResponse.json({ data: years });
}

const TaxYearToggleSchema = z.object({
  yearId: z.string(),
  isActive: z.boolean(),
});

export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = TaxYearToggleSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.issues }, { status: 400 });

  const year = await prisma.taxYear.update({
    where: { id: parsed.data.yearId },
    data: { isActive: parsed.data.isActive },
  });

  return NextResponse.json({ data: year });
}
