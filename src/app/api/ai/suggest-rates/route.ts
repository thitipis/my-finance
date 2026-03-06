/**
 * POST /api/ai/suggest-rates
 * Asks the user's configured AI to estimate reasonable annual return % for
 * a list of asset types / investment funds.
 *
 * Body: { assetTypes: string[] }
 * Returns: { rates: Record<string, number> }  e.g. { "thai_stock": 8, "rmf": 6 }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";

const BodySchema = z.object({
  assetTypes: z.array(z.string().min(1)).min(1).max(30),
});

// ─── Label map (Thai context) ──────────────────────────────────────────────────

const ASSET_LABELS: Record<string, string> = {
  thai_stock:    "หุ้นไทย (SET/MAI)",
  thai_fund:     "กองทุนรวมไทย (ตราสารทุน/ผสม)",
  thai_reit:     "REIT ไทย",
  thai_bond:     "พันธบัตรรัฐบาลไทย / หุ้นกู้",
  thai_property: "อสังหาริมทรัพย์ไทย",
  us_stock:      "หุ้นสหรัฐ (S&P500 / NASDAQ)",
  world_etf:     "ETF ทั่วโลก (VT, VXUS, MSCI World)",
  asia_stock:    "หุ้นเอเชีย (จีน ญี่ปุ่น อินเดีย)",
  intl_bond:     "ตราสารหนี้ต่างประเทศ",
  intl_reit:     "REIT ต่างประเทศ (Global REITs)",
  gold:          "ทองคำ",
  crypto:        "คริปโตเคอร์เรนซี (Bitcoin, Ethereum)",
  deposit:       "เงินฝากประจำ / ตั๋วแลกเงิน",
  commodity:     "สินค้าโภคภัณฑ์ (น้ำมัน เงิน ทองแดง)",
  startup:       "หุ้นนอกตลาด / Private Equity",
  custom:        "สินทรัพย์อื่น ๆ (ทั่วไป)",
  // Tax funds
  rmf:           "RMF (Retirement Mutual Fund)",
  ssf:           "SSF (Super Savings Fund)",
  thai_esg:      "Thai ESG Fund",
  ltf:           "LTF (Long Term Equity Fund)",
  provident_fund:"กองทุนสำรองเลี้ยงชีพ (PVD)",
};

// ─── Provider helpers (subset — only need text generation) ────────────────────

async function callGemini(prompt: string, model: string, token: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(token);
  const m = genAI.getGenerativeModel({ model });
  const result = await m.generateContent(prompt);
  return result.response.text();
}

async function callOpenAI(prompt: string, model: string, token: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) throw new Error(`OpenAI error ${res.status}`);
  const data = await res.json() as { choices: { message: { content: string } }[] };
  return data.choices[0]?.message?.content ?? "";
}

async function callOllama(prompt: string, model: string, baseUrl: string): Promise<string> {
  const url = `${baseUrl.replace(/\/$/, "")}/api/chat`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], stream: false }),
  });
  if (!res.ok) throw new Error(`Ollama error ${res.status} — is the server running at ${baseUrl}?`);
  const data = await res.json() as { message?: { content?: string } };
  return data.message?.content ?? "";
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });

  const { assetTypes } = parsed.data;
  const aiSettings = await prisma.aiSettings.findUnique({ where: { userId: session.user.id } });

  const provider   = aiSettings?.aiProvider    ?? "gemini";
  const modelName  = aiSettings?.aiModel       ?? "gemini-2.0-flash";
  const userToken  = aiSettings?.apiToken      ?? null;
  const ollamaBase = aiSettings?.ollamaBaseUrl ?? process.env.OLLAMA_BASE_URL ?? "http://ollama:11434";

  // Build the prompt — ask for JSON output of rates
  const assetList = assetTypes
    .map((t: string) => `- ${t}: ${ASSET_LABELS[t] ?? t}`)
    .join("\n");

  const prompt = `คุณเป็นที่ปรึกษาการเงินส่วนตัวชาวไทยที่มีความเชี่ยวชาญด้านการลงทุน

จงประมาณ **ผลตอบแทนคาดหวังต่อปี (Expected Annual Return %)** ที่สมเหตุสมผลสำหรับสินทรัพย์ต่อไปนี้ในบริบทตลาดไทยและโลก โดยใช้ข้อมูลผลตอบแทนย้อนหลัง 10-20 ปีและ consensus ของนักวิเคราะห์:

${assetList}

กฎ:
1. ตอบเฉพาะ JSON เท่านั้น ไม่มี markdown code block ไม่มีคำอธิบายอื่น
2. Format: {"<asset_code>": <number>, ...}  เช่น {"thai_stock": 8.5, "gold": 4}
3. ใช้ตัวเลขทศนิยม 1 ตำแหน่ง เป็น % ต่อปี (ไม่ใช่ทศนิยม เช่น 8.5 ไม่ใช่ 0.085)
4. สำหรับสินทรัพย์ที่ผันผวนสูง (crypto) ให้ระบุค่า Conservative estimate ไม่ใช่ค่าในช่วงบูม
5. ตอบ JSON เท่านั้น ห้ามมีข้อความอื่น

ตอบ:`;

  let rawReply: string;
  try {
    if (provider === "openai") {
      if (!userToken) return NextResponse.json({ error: "กรุณาใส่ OpenAI API Key ในการตั้งค่า" }, { status: 400 });
      rawReply = await callOpenAI(prompt, modelName, userToken);
    } else if (provider === "ollama") {
      rawReply = await callOllama(prompt, modelName, ollamaBase);
    } else {
      const geminiKey = userToken ?? process.env.GEMINI_API_KEY;
      if (!geminiKey) return NextResponse.json({ error: "กรุณาใส่ Gemini API Key" }, { status: 400 });
      rawReply = await callGemini(prompt, modelName, geminiKey);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI unavailable";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  // Parse JSON from reply (strip markdown fences if present)
  const cleaned = rawReply.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
  // Find the first { ... } block
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return NextResponse.json({ error: "AI ไม่ตอบในรูปแบบที่ถูกต้อง ลองอีกครั้ง" }, { status: 422 });

  let rates: Record<string, number>;
  try {
    rates = JSON.parse(jsonMatch[0]);
  } catch {
    return NextResponse.json({ error: "JSON parse error" }, { status: 422 });
  }

  // Sanitize: only keep requested types, clamp 0-50
  const sanitized: Record<string, number> = {};
  for (const key of assetTypes) {
    const v = Number(rates[key]);
    if (!isNaN(v)) sanitized[key] = Math.min(50, Math.max(0, v));
  }

  return NextResponse.json({ rates: sanitized });
}
