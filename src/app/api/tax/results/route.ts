import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const SaveTaxResultSchema = z.object({
  taxYearId: z.string().uuid(),
  inputSnapshot: z.record(z.string(), z.unknown()),
  totalIncome: z.number().min(0),
  totalDeductions: z.number().min(0),
  netIncome: z.number().min(0),
  taxOwed: z.number().min(0),
  withheldTax: z.number().min(0),
  taxRefund: z.number(),        // positive = refund, negative = must pay more
  effectiveRate: z.number().min(0).max(100),
  marginalRate: z.number().min(0).max(100),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const results = await prisma.taxResult.findMany({
    where: { userId: session.user.id },
    include: { taxYear: { select: { year: true, labelTh: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: results });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = SaveTaxResultSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.issues }, { status: 400 });
  }

  const result = await prisma.taxResult.create({
    data: {
      userId: session.user.id,
      ...parsed.data,
      inputSnapshot: parsed.data.inputSnapshot as Prisma.InputJsonValue,
    },
    include: { taxYear: { select: { year: true, labelTh: true } } },
  });

  return NextResponse.json({ data: result }, { status: 201 });
}
