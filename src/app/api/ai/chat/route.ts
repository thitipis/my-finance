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
  responseLength: z.enum(["short", "medium", "long"]).optional(),
});

const RESPONSE_LENGTH_INSTRUCTIONS: Record<string, string> = {
  short:  "⚡ ตอบสั้นกระชับ ไม่เกิน 5 ประโยคหรือ 3 bullet ห้ามขยายความเกินความจำเป็น",
  medium: "📝 ตอบในความยาวปานกลาง อธิบายประเด็นสำคัญ ใช้ตัวเลขและ bullet ได้",
  long:   "📚 ตอบละเอียดครบถ้วน อธิบายทุกประเด็น พร้อมตัวอย่างตัวเลข และ step-by-step",
};

const TONE_INSTRUCTIONS: Record<number, string> = {
  1: "ตอบด้วยน้ำเสียงอบอุ่น ให้กำลังใจ และเป็นมิตรมาก ใช้ภาษาง่ายๆ ชวนคุย",
  2: "ตอบด้วยน้ำเสียงเป็นมิตร สุภาพ และให้ความมั่นใจ",
  3: "ตอบด้วยน้ำเสียงเป็นมืออาชีพ สมดุลระหว่างความเป็นมิตรและตรงไปตรงมา",
  4: "ตอบตรงประเด็น กระชับ เน้นข้อเท็จจริงและตัวเลข ใช้ภาษาที่ชัดเจน",
  5: "ตอบตรงๆ ไม่อ้อมค้อม ชี้จุดที่ต้องปรับปรุงโดยตรง ไม่จำเป็นต้องปลอบใจ",
};

// Topic-guard injected into every system prompt
const FINANCIAL_ONLY_RULE = `
⚠️ กฎบังคับ: คุณต้องตอบเฉพาะคำถามที่เกี่ยวข้องกับการเงินส่วนตัว การลงทุน ภาษีอากร ประกันภัย และการวางแผนการเงินเท่านั้น
หากผู้ใช้ถามเรื่องที่ไม่เกี่ยวกับการเงิน ให้ปฏิเสธอย่างสุภาพและขอให้กลับมาถามเรื่องการเงินส่วนตัวแทน ห้ามตอบเรื่องอื่น`.trim();

type FProfile = Awaited<ReturnType<typeof prisma.financialProfile.findUnique>>;
type FRisk    = Awaited<ReturnType<typeof prisma.riskAssessment.findUnique>>;
type FPlan    = Awaited<ReturnType<typeof prisma.financialPlan.findUnique>>;

function buildFinancialContext(profile: FProfile, risk: FRisk): string {
  if (!profile && !risk) return "ยังไม่มีข้อมูลโปรไฟล์การเงินของผู้ใช้";

  const fmt = (n: number) => n.toLocaleString("th-TH");
  const lines: string[] = ["=== ข้อมูลการเงินของผู้ใช้ ==="];

  if (risk) {
    const riskLabels: Record<string, string> = { conservative: "ระมัดระวัง", moderate: "ปานกลาง", aggressive: "เชิงรุก" };
    const riskLabel = riskLabels[risk.riskLevel] ?? risk.riskLevel;
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

function buildPlanContext(plan: FPlan): string {
  if (!plan) return "";
  const fmt = (n: number) => n.toLocaleString("th-TH");
  const lines: string[] = ["=== แผนการเงินส่วนตัว ==="];

  if (plan.currentAge && plan.retirementAge) {
    const yearsLeft = plan.retirementAge - plan.currentAge;
    lines.push(`อายุปัจจุบัน: ${plan.currentAge} ปี | เป้าเกษียณ: ${plan.retirementAge} ปี (อีก ${yearsLeft} ปี)`);
  }
  if (plan.monthlyInvestable) {
    lines.push(`เงินลงทุน/ออมได้ต่อเดือน: ${fmt(Number(plan.monthlyInvestable))} บาท`);
  }
  if (plan.currentSavings) {
    lines.push(`เงินออม/ลงทุนปัจจุบัน: ${fmt(Number(plan.currentSavings))} บาท`);
  }
  if (plan.expectedReturn) lines.push(`ผลตอบแทนคาดหวัง: ${plan.expectedReturn}%/ปี`);
  if (plan.inflationRate) lines.push(`เงินเฟ้อที่ใช้คำนวณ: ${plan.inflationRate}%/ปี`);
  if (plan.monthlyRetirementNeeds) {
    lines.push(`ต้องการเงินหลังเกษียณ: ${fmt(Number(plan.monthlyRetirementNeeds))} บาท/เดือน`);
  }

  const goals: string[] = [];
  if (plan.hasHomeGoal && plan.homePurchaseYears) goals.push(`ซื้อบ้าน ${fmt(Number(plan.homeBudget ?? 0))} บาท (อีก ${plan.homePurchaseYears} ปี)`);
  if (plan.hasCarGoal  && plan.carPurchaseYears)  goals.push(`ซื้อรถ ${fmt(Number(plan.carBudget ?? 0))} บาท (อีก ${plan.carPurchaseYears} ปี)`);
  if (plan.hasEducationGoal && plan.educationYears) goals.push(`ทุนการศึกษา ${fmt(Number(plan.educationBudget ?? 0))} บาท (อีก ${plan.educationYears} ปี)`);
  if (goals.length > 0) lines.push(`เป้าหมายชีวิต: ${goals.join(" | ")}`);
  if (plan.emergencyFundMonths) lines.push(`เป้าเงินสำรองฉุกเฉิน: ${plan.emergencyFundMonths} เดือน`);

  lines.push("=== สิ้นสุดแผนการเงิน ===");
  return lines.join("\n");
}

// ─── Streaming provider helpers ──────────────────────────────────────────────

type StreamCtrl = ReadableStreamDefaultController;

async function streamGemini(
  systemPrompt: string,
  messages: { role: string; content: string }[],
  model: string,
  token: string,
  ctrl: StreamCtrl,
  enc: TextEncoder,
): Promise<void> {
  const genAI = new GoogleGenerativeAI(token);
  const geminiModel = genAI.getGenerativeModel({ model });

  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const fullHistory = [
    { role: "user" as const, parts: [{ text: systemPrompt }] },
    { role: "model" as const, parts: [{ text: "เข้าใจแล้วครับ พร้อมให้คำแนะนำด้านการเงินส่วนตัวครับ" }] },
    ...history,
  ];
  const chat = geminiModel.startChat({ history: fullHistory });
  const result = await chat.sendMessageStream(messages[messages.length - 1].content);
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) ctrl.enqueue(enc.encode(text));
  }
}

async function streamOpenAI(
  systemPrompt: string,
  messages: { role: string; content: string }[],
  model: string,
  token: string,
  ctrl: StreamCtrl,
  enc: TextEncoder,
): Promise<void> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify({
      model,
      stream: true,
      messages: [{ role: "system", content: systemPrompt }, ...messages.map(m => ({ role: m.role, content: m.content }))],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } }).error?.message ?? `OpenAI error ${res.status}`);
  }
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n"); buf = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data: ")) continue;
      const data = trimmed.slice(6);
      if (data === "[DONE]") return;
      try {
        const json = JSON.parse(data) as { choices?: { delta?: { content?: string } }[] };
        const content = json.choices?.[0]?.delta?.content;
        if (content) ctrl.enqueue(enc.encode(content));
      } catch { /* partial line */ }
    }
  }
}

async function streamOllama(
  systemPrompt: string,
  messages: { role: string; content: string }[],
  model: string,
  baseUrl: string,
  ctrl: StreamCtrl,
  enc: TextEncoder,
): Promise<void> {
  const url = `${baseUrl.replace(/\/$/, "")}/api/chat`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: true,
      messages: [{ role: "system", content: systemPrompt }, ...messages.map(m => ({ role: m.role, content: m.content }))],
    }),
  });
  if (!res.ok) throw new Error(`Ollama error ${res.status} — is the server running at ${baseUrl}?`);
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let outBuf = ""; // batch small tokens for smooth streaming
  const flush = () => { if (outBuf) { ctrl.enqueue(enc.encode(outBuf)); outBuf = ""; } };
  while (true) {
    const { done, value } = await reader.read();
    if (done) { flush(); break; }
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n"); buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const json = JSON.parse(line) as { message?: { content?: string }; done?: boolean };
        if (json.message?.content) {
          outBuf += json.message.content;
          if (outBuf.length >= 15 || /[\n.!?。，,]$/.test(outBuf)) flush();
        }
        if (json.done) { flush(); return; }
      } catch { /* partial line */ }
    }
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

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

  const { messages, responseLength } = parsed.data;
  const lengthInstruction = RESPONSE_LENGTH_INSTRUCTIONS[responseLength ?? "medium"];

  // Fetch all user context in parallel
  const [adminPromptRow, profile, riskAssessment, aiSettings, financialPlan] = await Promise.all([
    prisma.adminPrompt.findUnique({ where: { key: "main_system_prompt" } }),
    prisma.financialProfile.findUnique({ where: { userId: session.user.id } }),
    prisma.riskAssessment.findUnique({ where: { userId: session.user.id } }),
    prisma.aiSettings.findUnique({ where: { userId: session.user.id } }),
    prisma.financialPlan.findUnique({ where: { userId: session.user.id } }),
  ]);

  const toneLevel = aiSettings?.toneLevel ?? 3;
  const toneInstruction = TONE_INSTRUCTIONS[toneLevel] ?? TONE_INSTRUCTIONS[3];
  const riskLevel = riskAssessment?.riskLevel ?? null;
  const riskInstruction = riskLevel
    ? `เมื่อเสนอทางเลือก ให้ไฮไลต์ตัวเลือกที่เหมาะกับระดับความเสี่ยง "${riskLevel}" ของผู้ใช้เป็นตัวเลือก "แนะนำ" แต่ยังต้องแสดงตัวเลือกอื่นๆ ครบถ้วน (ระมัดระวัง/ปานกลาง/เชิงรุก) พร้อมคำอธิบายสั้นๆ`
    : "เสนอทางเลือกหลายระดับความเสี่ยงให้ครบถ้วน (ระมัดระวัง / ปานกลาง / เชิงรุก)";

  const basePrompt = adminPromptRow?.content ?? "คุณคือ MyFinance AI ที่ปรึกษาการเงินส่วนตัวสัญชาติไทย";
  const customAddition = aiSettings?.customPrompt ? `\nบริบทเพิ่มเติมจากผู้ใช้: ${aiSettings.customPrompt}` : "";

  const planContext = buildPlanContext(financialPlan);
  const systemPrompt = [
    basePrompt,
    FINANCIAL_ONLY_RULE,
    `\nสไตล์การตอบ: ${toneInstruction}`,
    `ความยาวคำตอบ: ${lengthInstruction}`,
    riskInstruction,
    buildFinancialContext(profile, riskAssessment),
    planContext,
    customAddition,
  ].filter(Boolean).join("\n\n").trim();

  // Resolve provider settings
  const provider   = aiSettings?.aiProvider    ?? "gemini";
  const modelName  = aiSettings?.aiModel       ?? "gemini-2.0-flash";
  const userToken  = aiSettings?.apiToken      ?? null;
  const ollamaBase = aiSettings?.ollamaBaseUrl ?? process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
  const userId     = session.user.id;

  // Validate tokens before starting the stream (so we can return a proper JSON error)
  if (provider === "openai" && !userToken) {
    return NextResponse.json({ error: "กรุณาใส่ OpenAI API Key ในการตั้งค่า AI ก่อนใช้งาน" }, { status: 400 });
  }
  if (provider === "gemini" && !userToken && !process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "กรุณาใส่ Gemini API Key ในการตั้งค่า AI" }, { status: 400 });
  }

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(ctrl) {
      try {
        if (provider === "openai") {
          await streamOpenAI(systemPrompt, messages, modelName, userToken!, ctrl, enc);
        } else if (provider === "ollama") {
          await streamOllama(systemPrompt, messages, modelName, ollamaBase, ctrl, enc);
        } else {
          const geminiKey = userToken ?? process.env.GEMINI_API_KEY!;
          await streamGemini(systemPrompt, messages, modelName, geminiKey, ctrl, enc);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI";
        ctrl.enqueue(enc.encode(`⚠️ ${msg}`));
      }
      try {
        await prisma.usageEvent.create({
          data: { userId, eventType: "AI_CHAT", metadata: { messageCount: messages.length, toneLevel, provider, model: modelName } },
        });
      } catch { /* non-fatal */ }
      ctrl.close();
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

