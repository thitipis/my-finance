import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
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

const SYSTEM_PROMPT = `คุณคือ MyFinance AI Advisor ผู้เชี่ยวชาญด้านภาษีเงินได้บุคคลธรรมดาของประเทศไทย (ภงด.91) และการวางแผนการเงินส่วนตัว คุณให้คำปรึกษาด้านการลดหย่อนภาษี เป้าหมายการเงิน การลงทุน (RMF, SSF, กองทุนสำรองเลี้ยงชีพ) และประกันชีวิต ตอบด้วยภาษาที่เป็นมิตร เข้าใจง่าย และให้ข้อมูลที่ถูกต้องตามกฎหมายภาษีไทย ห้ามให้คำแนะนำด้านกฎหมายหรือการลงทุนเฉพาะตัว`;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tier = (session.user as { tier?: string }).tier ?? "free";
  const allowed = await isFeatureEnabled("ai_advisor", tier as "free" | "premium");
  if (!allowed) return NextResponse.json({ error: "Premium feature" }, { status: 403 });

  const body = await req.json();
  const parsed = MessageSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.issues }, { status: 400 });

  const { messages } = parsed.data;

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  // Build Gemini history (all except last message)
  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  // Prepend system prompt as first user/model turn
  const fullHistory = [
    { role: "user" as const, parts: [{ text: SYSTEM_PROMPT }] },
    { role: "model" as const, parts: [{ text: "เข้าใจแล้วครับ ยินดีให้คำแนะนำด้านภาษีและการเงินส่วนตัวสำหรับคนไทยครับ" }] },
    ...history,
  ];

  const chat = model.startChat({ history: fullHistory });
  const lastMessage = messages[messages.length - 1].content;
  const result = await chat.sendMessage(lastMessage);
  const reply = result.response.text();

  // Log usage event
  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.usageEvent.create({
      data: {
        userId: session.user.id,
        eventType: "AI_CHAT",
        metadata: { messageCount: messages.length },
      },
    });
  } catch { /* non-fatal */ }

  return NextResponse.json({ reply });
}
