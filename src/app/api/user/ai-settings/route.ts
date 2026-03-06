import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const AiSettingsSchema = z.object({
  toneLevel:     z.number().int().min(1).max(5).optional(),
  customPrompt:  z.string().max(1000).nullable().optional(),
  aiProvider:    z.enum(["gemini", "openai", "ollama"]).optional(),
  aiModel:       z.string().max(100).optional(),
  apiToken:      z.string().max(500).nullable().optional(),
  ollamaBaseUrl: z.string().url().max(300).nullable().optional(),
});

/** Mask an API token — show only last 4 chars */
function maskToken(token: string | null | undefined): string | null {
  if (!token) return null;
  if (token.length <= 4) return "****";
  return `****${token.slice(-4)}`;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await prisma.aiSettings.findUnique({
    where: { userId: session.user.id },
  });

  const defaults = {
    toneLevel: 3,
    customPrompt: null,
    aiProvider: "gemini",
    aiModel: "gemini-2.0-flash",
    hasToken: false,
    apiTokenMasked: null,
    ollamaBaseUrl: "http://localhost:11434",
  };

  if (!settings) return NextResponse.json({ data: defaults });

  return NextResponse.json({
    data: {
      toneLevel:      settings.toneLevel,
      customPrompt:   settings.customPrompt,
      aiProvider:     settings.aiProvider,
      aiModel:        settings.aiModel,
      hasToken:       !!settings.apiToken,
      apiTokenMasked: maskToken(settings.apiToken),
      ollamaBaseUrl:  settings.ollamaBaseUrl ?? "http://localhost:11434",
    },
  });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = AiSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.issues }, { status: 400 });
  }

  const settings = await prisma.aiSettings.upsert({
    where:  { userId: session.user.id },
    update: parsed.data,
    create: { userId: session.user.id, ...parsed.data },
  });

  return NextResponse.json({
    data: {
      toneLevel:      settings.toneLevel,
      customPrompt:   settings.customPrompt,
      aiProvider:     settings.aiProvider,
      aiModel:        settings.aiModel,
      hasToken:       !!settings.apiToken,
      apiTokenMasked: maskToken(settings.apiToken),
      ollamaBaseUrl:  settings.ollamaBaseUrl ?? "http://localhost:11434",
    },
  });
}
