import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = await req.json();
  const { age, eventYear, eventType, impact, title, description } = body;

  if (!age || !eventYear || !eventType || !title) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const event = await prisma.lineageEvent.create({
    data: {
      userId,
      age: Number(age),
      eventYear: Number(eventYear),
      eventType: String(eventType),
      impact: String(impact ?? "neutral"),
      title: String(title).slice(0, 255),
      description: description ? String(description) : null,
      isAuto: false,
      isAI: false,
    },
  });

  return NextResponse.json({ data: event });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const event = await prisma.lineageEvent.findUnique({ where: { id } });
  if (!event || event.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.lineageEvent.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
