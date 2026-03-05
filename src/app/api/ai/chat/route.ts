import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isFeatureEnabled } from "@/services/feature-flag.service";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

const MessageSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    }),
  ).min(1),
});

const TONE_INSTRUCTIONS: Record<number, string> = {
  1: "ตอบด้วยน้ำเสียงอบอุ่น ให้กำลังใจ และเป็นมิตรมาก ใช้ภาษาง่ายๆ ชวนคุย",
  2: "ตอบด้วยน้ำเสียงเป็นมิตร สุภาพ และให้ความมั่นใจ",
  3: "ตอบด้วยน้ำเสียงเป็นมืออาชีพ สมดุลระหว่างความเป็นมิตรและตรงไปตรงมา",
  4: "ตอบตรงประเด็น กระชับ เน้นข้อเท็จจริงและตัวเลข ใช้ภาษาที่ชัดเจน",
  5: "ตอบตรงๆ ไม่อ้อมค้อม ชี้จุดที่ต้องปรับปรุงโดยตรง ไม่จำเป็นต้องปลอบใจ",
};

type FProfile = Awaited<ReturnType<typeof prisma.financialProfile.findUnique>>;
type FRisk   = Awaited<ReturnType<typeof prisma.riskAssessment.findUnique>>;

function buildFinancialContext(profile: FProfile, risk: FRisk): string {
  if (!profile && !risk) return "ยังไม่มีข้อมูลโปรไฟล์การเงินของผู้ใช้";

  const fmt = (n: number) => n.toLocaleString("th-TH");
  const lines: string[] = ["=== ข้อมูลการเงินของผู้ใช้ ==="];

  if (risk) {
    const riskLabel = { conservative: "ระมัดระวัง", moderate: "ปานกลาง", aggressive: "เชิงรุก" }[risk.riskLevel];
    lines.push(`ระดับความเสี่ยง: ${riskLabel} (คะแนน ${risk.score}/100)`);
  }

  if (profile) {
    const filingMap: Record<string, string> = {
      single: "โสด",
      married_no_income: "สมรส (คู่สมรสไม่มีรายได้)",
      married_separate: "สมรส (ยื่นแยก)",
      married_joint: "สมรส (ยื่นรวม)",
    };
    lines.push(`สถานะการยื่นภาษี: ${filingMap[profile.filingStatus] ?? profile.filingStatus}`);
    lines.push(`บุตร: ${profile.numChildren} คน | บิดามารดา: ${profile.numParents} คน | ผู้พิการ/ทุพพลภาพ: ${profile.numDisabledDependents} คน`);

    const annualIncome = Number(profile.annualSalary) + Number(profile.bonus) + Number(profile.otherIncome);
    if (annualIncome > 0) {
      lines.push(`รายได้รวมต่อปี: ${fmt(annualIncome)} บาท (เงินเดือน ${fmt(Number(profile.annualSalary))} + โบนัส ${fmt(Number(profile.bonus))} + อื่นๆ ${fmt(Number(profile.otherIncome))})`);
    }
    if (Number(profile.spouseIncome) > 0) lines.push(`รายได้คู่สมรส: ${fmt(Number(profile.spouseIncome))} บาท/ปี`);
    if (Number(profile.withheldTax) > 0) lines.push(`ภาษีหักณที่จ่าย: ${fmt(Number(profile.withheldTax))} บาท`);
    if (Number(profile.socialSecurity) > 0) lines.push(`ประกันสังคม: ${fmt(Number(profile.socialSecurity))} บาท/ปี`);
    if (Number(profile.providentFundAmount) > 0) lines.push(`กองทุนสำรองเลี้ยงชีพ (PVD): ${fmt(Number(profile.providentFundAmount))} บาท/ปี`);
    if (Number(profile.monthlyExpenses) > 0) lines.push(`ค่าใช้จ่ายต่อเดือน: ${fmt(Number(profile.monthlyExpenses))} บาท`);
    if (Number(profile.emergencyFundAmount) > 0) lines.push(`เงินสำรองฉุกเฉิน: ${fmt(Number(profile.emergencyFundAmount))} บาท`);
    if (Number(profile.totalDebt) > 0) lines.push(`หนี้สินรวม: ${fmt(Number(profile.totalDebt))} บาท (ผ่อน ${fmt(Number(profile.monthlyDebtPayment))} บาท/เดือน)`);

    const ins: string[] = [];
    if (Number(profile.lifeInsurancePremium) > 0) ins.push(`ชีวิต ${fmt(Number(profile.lifeInsurancePremium))}`);
    if (Number(profile.healthInsurancePremium) > 0) ins.push(`สุขภาพ ${fmt(Number(profile.healthInsurancePremium))}`);
    if (Number(profile.annuityInsurancePremium) > 0) ins.push(`บำนาญ ${fmt(Number(profile.annuityInsurancePremium))}`);
    if (Number(profile.spouseLifeInsurancePremium) > 0) ins.push(`ชีวิตคู่สมรส ${fmt(Number(profile.spouseLifeInsurancePremium))}`);
    if (ins.length > 0) lines.push(`เบี้ยประกัน (บาท/ปี): ${ins.join(", ")}`);

    const inv: string[] = [];
    if (Number(profile.rmfAmount) > 0) inv.push(`RMF ${fmt(Number(profile.rmfAmount))}`);
    if (Number(profile.ssfAmount) > 0) inv.push(`SSF ${fmt(Number(profile.ssfAmount))}`);
    if (Number(profile.thaiEsgAmount) > 0) inv.push(`Thai ESG ${fmt(Number(profile.thaiEsgAmount))}`);
    if (Number(profile.ltfAmount) > 0) inv.push(`LTF ${fmt(Number(profile.ltfAmount))}`);
    if (inv.length > 0) lines.push(`การลงทุนลดหย่อนภาษี (บาท/ปี): ${inv.join(", ")}`);
  }

  lines.push("=== สิ้นสุดข้อมูลโปรไฟล์ ===");
  return lines.join("\n");
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tier = (session.user as { tier?: string }).tier ?? "free";
  const allowed = await isFeatureEnabled("ai_chat", tier as "free" | "premium");
  if (!allowed) return NextResponse.json({ error: "Premium feature" }, { status: 403 });

  const body = await req.json();
  const parsed = MessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.issues }, { status: 400 });
  }

  const { messages } = parsed.data;

  // Fetch all user context in parallel
  const [adminPromptRow, profile, riskAssessment, aiSettings] = await Promise.all([
    prisma.adminPrompt.findUnique({ where: { key: "main_system_prompt" } }),
    prisma.financialProfile.findUnique({ where: { userId: session.user.id } }),
    prisma.riskAssessment.findUnique({ where: { userId: session.user.id } }),
    prisma.aiSettings.findUnique({ where: { userId: session.user.id } }),
  ]);

  const toneLevel = aiSettings?.toneLevel ?? 3;
  const toneInstruction = TONE_INSTRUCTIONS[toneLevel] ?? TONE_INSTRUCTIONS[3];
  const riskLevel = riskAssessment?.riskLevel ?? null;
  const riskInstruction = riskLevel
    ? `เมื่อเสนอทางเลือก ให้ไฮไลต์ตัวเลือกที่เหมาะกับระดับความเสี่ยง "${riskLevel}" ของผู้ใช้เป็นตัวเลือก "แนะนำ" แต่ยังต้องแสดงตัวเลือกอื่นๆ ครบถ้วน (ระมัดระวัง/ปานกลาง/เชิงรุก) พร้อมคำอธิบายสั้นๆ`
    : "เสนอทางเลือกหลายระดับความเสี่ยงให้ครบถ้วน (ระมัดระวัง / ปานกลาง / เชิงรุก)";

  const basePrompt = adminPromptRow?.content ?? "คุณคือ MyFinance AI ที่ปรึกษาการเงินส่วนตัวสัญชาติไทย";
  const customAddition = aiSettings?.customPrompt ? `\nบริบทเพิ่มเติมจากผู้ใช้: ${aiSettings.customPrompt}` : "";

  const systemPrompt = [
    basePrompt,
    `\nสไตล์การตอบ: ${toneInstruction}`,
    riskInstruction,
    buildFinancialContext(profile, riskAssessment),
    customAddition,
  ].join("\n\n").trim();

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const fullHistory = [
    { role: "user" as const, parts: [{ text: systemPrompt }] },
    { role: "model" as const, parts: [{ text: "เข้าใจแล้วครับ พร้อมให้คำแนะนำด้านการเงินส่วนตัวครับ" }] },
    ...history,
  ];

  const chat = model.startChat({ history: fullHistory });
  const lastMessage = messages[messages.length - 1].content;
  const result = await chat.sendMessage(lastMessage);
  const reply = result.response.text();

  try {
    await prisma.usageEvent.create({
      data: {
        userId: session.user.id,
        eventType: "AI_CHAT",
        metadata: { messageCount: messages.length, toneLevel },
      },
    });
  } catch { /* non-fatal */ }

  return NextResponse.json({ reply });
}
