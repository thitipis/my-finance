import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface Recommendation {
  type: string;
  titleTh: string;
  priority: "critical" | "high" | "medium" | "low";
  reason: string;
  suggestedAmount?: string;
  riskLevels: string[];  // which risk profiles this applies to
  highlighted: boolean;  // true if matches user's risk profile
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [profile, riskAssessment, insuranceData] = await Promise.all([
    prisma.financialProfile.findUnique({ where: { userId: session.user.id } }),
    prisma.riskAssessment.findUnique({ where: { userId: session.user.id } }),
    prisma.insuranceData.findUnique({ where: { userId: session.user.id } }),
  ]);

  const riskLevel = riskAssessment?.riskLevel ?? "moderate";
  const monthlyIncome = profile
    ? Number(profile.annualSalary) / 12 + Number(profile.bonus) / 12
    : 0;
  const annualIncome = profile
    ? Number(profile.annualSalary) + Number(profile.bonus) + Number(profile.otherIncome)
    : 0;
  const numDependents = profile
    ? profile.numChildren + profile.numParents + profile.numDisabledDependents
    : 0;

  const recommendations: Recommendation[] = [];

  // 1. Life insurance
  const lifeCurrentCoverage = Number(insuranceData?.lifeCoverageAmount ?? 0);
  const lifeRecommendedCoverage = monthlyIncome * 12 * 10; // 10x annual income rule
  if (lifeCurrentCoverage < lifeRecommendedCoverage && annualIncome > 0) {
    recommendations.push({
      type: "life",
      titleTh: "ประกันชีวิต",
      priority: numDependents > 0 ? "critical" : "high",
      reason: numDependents > 0
        ? `คุณมีผู้พึ่งพา ${numDependents} คน ทุนประกันชีวิตควรอยู่ที่ ${lifeRecommendedCoverage.toLocaleString("th-TH")} บาท (10 เท่าของรายได้ต่อปี)`
        : `แนะนำทุนประกันชีวิต ${lifeRecommendedCoverage.toLocaleString("th-TH")} บาท เพื่อปกป้องภาระทางการเงิน`,
      suggestedAmount: `${lifeRecommendedCoverage.toLocaleString("th-TH")} บาท`,
      riskLevels: ["conservative", "moderate", "aggressive"],
      highlighted: true,
    });
  }

  // 2. Health insurance
  const hasHealth = Number(profile?.healthInsurancePremium ?? 0) > 0 || Number(insuranceData?.healthCoveragePerYear ?? 0) > 0;
  if (!hasHealth) {
    recommendations.push({
      type: "health",
      titleTh: "ประกันสุขภาพ",
      priority: "critical",
      reason: "ยังไม่ตรวจพบประกันสุขภาพ ควรมีเพื่อลดความเสี่ยงค่าใช้จ่ายในการรักษาพยาบาลยามฉุกเฉิน",
      suggestedAmount: "เบี้ย 10,000–30,000 บาท/ปี ขึ้นอยู่กับอายุและความคุ้มครอง",
      riskLevels: ["conservative", "moderate", "aggressive"],
      highlighted: true,
    });
  }

  // 3. Critical illness — recommended for moderate/conservative
  if (!insuranceData?.hasCriticalIllness) {
    recommendations.push({
      type: "critical_illness",
      titleTh: "ประกันโรคร้ายแรง",
      priority: riskLevel === "conservative" ? "high" : "medium",
      reason: "ประกันโรคร้ายแรงช่วยรองรับค่าใช้จ่ายก้อนใหญ่จากโรคมะเร็ง หัวใจ และอัมพาต",
      suggestedAmount: "ทุนประกัน 1,000,000 บาทขึ้นไป",
      riskLevels: ["conservative", "moderate"],
      highlighted: riskLevel !== "aggressive",
    });
  }

  // 4. Accident insurance
  if (!insuranceData?.hasAccidentInsurance) {
    recommendations.push({
      type: "accident",
      titleTh: "ประกันอุบัติเหตุ (PA)",
      priority: "medium",
      reason: "ประกันอุบัติเหตุมีเบี้ยถูก แต่คุ้มครองสูง เหมาะสำหรับผู้ที่เดินทางบ่อย",
      suggestedAmount: "เบี้ยประมาณ 1,500–3,000 บาท/ปี",
      riskLevels: ["conservative", "moderate", "aggressive"],
      highlighted: riskLevel === "moderate",
    });
  }

  // 5. Disability insurance
  if (!insuranceData?.hasDisabilityInsurance && annualIncome > 0) {
    recommendations.push({
      type: "disability",
      titleTh: "ประกันทุพพลภาพ / ประกันรายได้",
      priority: riskLevel === "conservative" ? "high" : "low",
      reason: "ปกป้องรายได้กรณีไม่สามารถทำงานได้ สำคัญโดยเฉพาะสำหรับผู้ที่เป็นหัวหน้าครอบครัว",
      suggestedAmount: "ควรคุ้มครอง 60–70% ของรายได้เดือนละ",
      riskLevels: ["conservative"],
      highlighted: riskLevel === "conservative",
    });
  }

  // 6. Annuity (retirement) — for conservative/moderate
  const hasAnnuity = Number(profile?.annuityInsurancePremium ?? 0) > 0;
  if (!hasAnnuity && riskLevel !== "aggressive") {
    recommendations.push({
      type: "annuity",
      titleTh: "ประกันบำนาญ / แบบสะสมทรัพย์",
      priority: "low",
      reason: "ช่วยกระจายความเสี่ยงในการวางแผนเกษียณ และลดหย่อนภาษีได้ (หักได้สูงสุด 200,000 บาท/ปี)",
      suggestedAmount: "เบี้ย 50,000–200,000 บาท/ปี ตามความต้องการลดหย่อน",
      riskLevels: ["conservative", "moderate"],
      highlighted: riskLevel === "conservative",
    });
  }

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return NextResponse.json({
    data: {
      recommendations,
      riskLevel,
      profile: profile ? {
        annualIncome,
        numDependents,
        hasHealthInsurance: hasHealth,
      } : null,
    },
  });
}
