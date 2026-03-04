import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function isAdmin(req: NextRequest) {
  return req.headers.get("x-admin-key") === process.env.ADMIN_SECRET_KEY;
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [totalUsers, premiumUsers, usageEvents] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { tier: "premium" } }),
    prisma.usageEvent.groupBy({
      by: ["eventType"],
      _count: { eventType: true },
    }),
  ]);

  // Last 30 days new users
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const newUsers30d = await prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } });

  // Top deductions used (from usage events)
  const taxCalcEvents = await prisma.usageEvent.count({ where: { eventType: "TAX_CALCULATE" } });
  const aiChatEvents = await prisma.usageEvent.count({ where: { eventType: "AI_CHAT" } });

  return NextResponse.json({
    data: {
      totalUsers,
      premiumUsers,
      freeUsers: totalUsers - premiumUsers,
      newUsers30d,
      taxCalcEvents,
      aiChatEvents,
      usageByType: usageEvents.map(e => ({ type: e.eventType, count: e._count.eventType })),
    },
  });
}
