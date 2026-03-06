import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const PatchSchema = z.object({
  name:          z.string().min(1).max(120).optional(),
  emoji:         z.string().min(1).max(8).optional(),
  currentValue:  z.coerce.number().min(0).optional(),
  units:         z.coerce.number().min(0).optional().nullable(),
  avgCostPerUnit:z.coerce.number().min(0).optional().nullable(),
  expectedReturn:z.coerce.number().min(0).max(100).optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const asset = await prisma.portfolioAsset.findUnique({ where: { id } });
  if (!asset || asset.userId !== session.user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });

  const updated = await prisma.portfolioAsset.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const asset = await prisma.portfolioAsset.findUnique({ where: { id } });
  if (!asset || asset.userId !== session.user.id)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Built-in assets: just zero out, don't delete
  if (asset.isBuiltIn) {
    const zeroed = await prisma.portfolioAsset.update({
      where: { id },
      data: { currentValue: 0 },
    });
    return NextResponse.json({ data: zeroed });
  }

  await prisma.portfolioAsset.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
