import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isFeatureEnabled } from "@/services/feature-flag.service";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tier = (session.user as { tier?: string }).tier ?? "free";
  const allowed = await isFeatureEnabled("ai_tax_advice", tier as "free" | "premium");
  if (!allowed) return NextResponse.json({ error: "Premium feature" }, { status: 403 });

  const body = await req.json();
  const { taxResult, year } = body as { taxResult: Record<string, unknown>; year: number };

  // Fetch any existing insurance data to enrich context
  const insurance = await prisma.insuranceData.findUnique({ where: { userId: session.user.id } });

  const prompt = `วิเคราะห์ผลการคำนวณภาษีดังนี้:
ปีภาษี: ${year} (ปีงบประมาณ ${year + 543} พ.ศ.)
ภาษีที่ต้องชำระ/ขอคืน: ${JSON.stringify(taxResult)}
ข้อมูลประกัน: ${insurance ? JSON.stringify(insurance) : "ไม่มีข้อมูล"}

กรุณาวิเคราะห์:
1. สรุปสถานการณ์ภาษีโดยรวม
2. รายการลดหย่อนที่ยังใช้สิทธิ์ได้เพิ่มเติม
3. คำแนะนำเฉพาะเจาะจง 3 ข้อที่ควรทำก่อนสิ้นปี
4. ประมาณภาษีที่จะประหยัดได้

ตอบเป็นภาษาไทย กระชับ ชัดเจน และแยกเป็นหัวข้อ`;

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent(prompt);
  const advice = result.response.text();

  await prisma.usageEvent.create({
    data: {
      userId: session.user.id,
      eventType: "AI_TAX_ADVICE",
      metadata: { year },
    },
  });

  return NextResponse.json({ advice });
}
