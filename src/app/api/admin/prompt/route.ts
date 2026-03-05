import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const PROMPT_KEY = "main_system_prompt";

function verifyAdmin(req: NextRequest) {
  const key = req.headers.get("x-admin-key") ?? "";
  return key === process.env.ADMIN_SECRET_KEY;
}

export async function GET(req: NextRequest) {
  if (!verifyAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const prompt = await prisma.adminPrompt.findUnique({ where: { key: PROMPT_KEY } });
  return NextResponse.json({ data: prompt });
}

export async function PUT(req: NextRequest) {
  if (!verifyAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = z.object({ content: z.string().min(1) }).safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.issues }, { status: 400 });
  }

  const prompt = await prisma.adminPrompt.upsert({
    where: { key: PROMPT_KEY },
    update: { content: parsed.data.content, updatedBy: "admin" },
    create: { key: PROMPT_KEY, content: parsed.data.content, updatedBy: "admin" },
  });

  return NextResponse.json({ data: prompt });
}
