import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Simple admin auth — checks X-Admin-Key header
function isAdmin(req: NextRequest) {
  const key = req.headers.get("x-admin-key");
  return key === process.env.ADMIN_SECRET_KEY;
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const flags = await prisma.featureFlag.findMany({ orderBy: { key: "asc" } });
  return NextResponse.json({ data: flags });
}

const UpdateFlagSchema = z.object({
  key: z.string().min(1),
  freeEnabled: z.boolean(),
  premiumEnabled: z.boolean(),
  description: z.string().optional(),
});

export async function PUT(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = UpdateFlagSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.issues }, { status: 400 });

  const { key, ...rest } = parsed.data;
  const flag = await prisma.featureFlag.upsert({
    where: { key },
    create: { key, ...rest },
    update: rest,
  });

  // Invalidate feature flag cache
  const { invalidateFlagCache } = await import("@/services/feature-flag.service");
  invalidateFlagCache();

  return NextResponse.json({ data: flag });
}
