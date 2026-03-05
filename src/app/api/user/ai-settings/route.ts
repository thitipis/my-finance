import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const AiSettingsSchema = z.object({
  toneLevel: z.number().int().min(1).max(5).optional(),
  customPrompt: z.string().max(1000).nullable().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await prisma.aiSettings.findUnique({
    where: { userId: session.user.id },
  });
  return NextResponse.json({ data: settings ?? { toneLevel: 3, customPrompt: null } });
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
    where: { userId: session.user.id },
    update: parsed.data,
    create: { userId: session.user.id, ...parsed.data },
  });

  return NextResponse.json({ data: settings });
}
