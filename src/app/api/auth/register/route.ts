import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { ApiResponse } from "@/types";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().optional(),
  language: z.enum(["th", "en"]).default("th"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "VALIDATION_ERROR", fields: parsed.error.issues.map((e: { message: string }) => e.message) },
        { status: 400 }
      );
    }

    const { email, password, name, language } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "EMAIL_ALREADY_EXISTS" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, name, passwordHash, language },
      select: { id: true, email: true, name: true, tier: true, language: true, createdAt: true },
    });

    return NextResponse.json<ApiResponse>({ success: true, data: user }, { status: 201 });
  } catch (error) {
    console.error("[register]", error);
    return NextResponse.json<ApiResponse>({ success: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
