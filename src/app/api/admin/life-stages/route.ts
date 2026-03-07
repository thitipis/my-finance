import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function isAdmin(req: NextRequest) {
  return req.headers.get("x-admin-key") === process.env.ADMIN_SECRET_KEY;
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const stages = await prisma.lifeStageTemplate.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json({ data: stages });
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { ageFrom, ageTo, titleTh, descriptionTh, icon, allocEquity, allocBond, allocCash, colorHex, sortOrder } = body;

  if (!ageFrom || !ageTo || !titleTh || !descriptionTh || !icon) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const stage = await prisma.lifeStageTemplate.create({
    data: {
      ageFrom: Number(ageFrom),
      ageTo: Number(ageTo),
      titleTh: String(titleTh),
      descriptionTh: String(descriptionTh),
      icon: String(icon),
      allocEquity: Number(allocEquity ?? 70),
      allocBond: Number(allocBond ?? 20),
      allocCash: Number(allocCash ?? 10),
      colorHex: String(colorHex ?? "#6366f1"),
      sortOrder: Number(sortOrder ?? 0),
    },
  });

  return NextResponse.json({ data: stage });
}

export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { id, ...rest } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (rest.ageFrom !== undefined) update.ageFrom = Number(rest.ageFrom);
  if (rest.ageTo !== undefined) update.ageTo = Number(rest.ageTo);
  if (rest.titleTh !== undefined) update.titleTh = String(rest.titleTh);
  if (rest.descriptionTh !== undefined) update.descriptionTh = String(rest.descriptionTh);
  if (rest.icon !== undefined) update.icon = String(rest.icon);
  if (rest.allocEquity !== undefined) update.allocEquity = Number(rest.allocEquity);
  if (rest.allocBond !== undefined) update.allocBond = Number(rest.allocBond);
  if (rest.allocCash !== undefined) update.allocCash = Number(rest.allocCash);
  if (rest.colorHex !== undefined) update.colorHex = String(rest.colorHex);
  if (rest.isActive !== undefined) update.isActive = Boolean(rest.isActive);
  if (rest.sortOrder !== undefined) update.sortOrder = Number(rest.sortOrder);

  const stage = await prisma.lifeStageTemplate.update({ where: { id }, data: update });
  return NextResponse.json({ data: stage });
}

export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await prisma.lifeStageTemplate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
