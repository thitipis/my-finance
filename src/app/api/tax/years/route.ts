import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ApiResponse } from "@/types";

export async function GET() {
  try {
    const years = await prisma.taxYear.findMany({
      where: { isActive: true },
      orderBy: { year: "desc" },
      select: { id: true, year: true, labelTh: true, labelEn: true },
    });
    return NextResponse.json<ApiResponse>({ success: true, data: years });
  } catch (error) {
    console.error("[tax/years]", error);
    return NextResponse.json<ApiResponse>({ success: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
