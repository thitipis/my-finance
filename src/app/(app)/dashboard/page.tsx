"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Calculator,
  Target,
  Shield,
  MessageSquareText,
  TrendingUp,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Database,
} from "lucide-react";

interface Goal {
  id: string;
  name: string;
  goalType: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string | null;
}

interface TaxResult {
  id: string;
  taxOwed: number;
  taxRefund: number;
  effectiveRate: number;
  withheldTax: number;
  createdAt: string;
  taxYear: { year: number; labelTh: string };
}

interface FinancialProfile {
  annualSalary: number;
  monthlyExpenses: number;
  emergencyFundAmount: number;
  monthlyDebtPayment: number;
  rmfAmount: number;
  ssfAmount: number;
  providentFundAmount: number;
  lifeInsurancePremium: number;
  healthInsurancePremium: number;
}

interface RiskAssessment {
  riskLevel: "conservative" | "moderate" | "aggressive";
  score: number;
}

const riskInfo = {
  conservative: { label: "ระมัดระวัง", color: "text-blue-600" },
  moderate: { label: "ปานกลาง", color: "text-amber-600" },
  aggressive: { label: "เชิงรุก", color: "text-green-600" },
};

function calcProgress(current: number, target: number) {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

function calcHealthScore(profile: FinancialProfile | null): number {
  if (!profile) return 0;
  let score = 0;

  // Emergency fund (max 25): ideal = 6 months
  const monthlyExp = Number(profile.monthlyExpenses);
  if (monthlyExp > 0) {
    const months = Number(profile.emergencyFundAmount) / monthlyExp;
    score += Math.min(25, Math.round((months / 6) * 25));
  }

  // Debt ratio (max 25): 0 debt = 25, >50% income = 0
  const monthlyIncome = Number(profile.annualSalary) / 12;
  if (monthlyIncome > 0) {
    const debtRatio = Number(profile.monthlyDebtPayment) / monthlyIncome;
    score += Math.max(0, Math.round((1 - debtRatio * 2) * 25));
  } else if (Number(profile.monthlyDebtPayment) === 0) {
    score += 25;
  }

  // Insurance (max 25): life + health = full score
  const hasLife = Number(profile.lifeInsurancePremium) > 0;
  const hasHealth = Number(profile.healthInsurancePremium) > 0;
  score += (hasLife ? 12 : 0) + (hasHealth ? 13 : 0);

  // Investment/savings (max 25): 15% of income = full score
  const annualIncome = Number(profile.annualSalary);
  if (annualIncome > 0) {
    const invested = Number(profile.rmfAmount) + Number(profile.ssfAmount) + Number(profile.providentFundAmount);
    const rate = invested / annualIncome;
    score += Math.min(25, Math.round((rate / 0.15) * 25));
  }

  return Math.min(100, score);
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const userName = session?.user?.name ?? session?.user?.email ?? "คุณ";

  const [goals, setGoals]             = useState<Goal[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [latestTax, setLatestTax]     = useState<TaxResult | null>(null);
  const [taxLoading, setTaxLoading]   = useState(true);
  const [profile, setProfile]         = useState<FinancialProfile | null>(null);
  const [risk, setRisk]               = useState<RiskAssessment | null>(null);

  useEffect(() => {
    // Load all dashboard data in parallel
    Promise.all([
      fetch("/api/goals").then(r => r.json()),
      fetch("/api/tax/results").then(r => r.json()),
      fetch("/api/user/financial-profile").then(r => r.json()),
      fetch("/api/user/risk-assessment").then(r => r.json()),
    ]).then(([goalsRes, taxRes, profRes, riskRes]) => {
      setGoals(Array.isArray(goalsRes) ? goalsRes.slice(0, 3) : []);
      setGoalsLoading(false);
      const results: TaxResult[] = taxRes.data ?? [];
      setLatestTax(results[0] ?? null);
      setTaxLoading(false);
      if (profRes.data) setProfile(profRes.data);
      if (riskRes.data) setRisk(riskRes.data);
    }).catch(() => {
      setGoalsLoading(false);
      setTaxLoading(false);
    });
  }, []);

  const healthScore = calcHealthScore(profile);
  const healthLabel = healthScore >= 75 ? "ดีมาก" : healthScore >= 50 ? "ปานกลาง" : healthScore >= 25 ? "ควรปรับปรุง" : "ต้องการความสนใจ";
  const healthColor = healthScore >= 75 ? "text-green-600" : healthScore >= 50 ? "text-amber-600" : "text-red-500";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">สวัสดี, {userName} 👋</h1>
        <p className="text-muted-foreground text-sm">สรุปสถานะการเงินของคุณ — ปีภาษี 2025</p>
      </div>

      {/* Health Score */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            คะแนนสุขภาพการเงิน
          </CardTitle>
          {risk && (
            <span className={`text-xs font-medium ${riskInfo[risk.riskLevel].color}`}>
              ความเสี่ยง: {riskInfo[risk.riskLevel].label}
            </span>
          )}
        </CardHeader>
        <CardContent>
          {profile ? (
            <>
              <div className="flex items-end gap-2 mb-2">
                <span className={`text-5xl font-bold ${healthColor}`}>{healthScore}</span>
                <span className="text-muted-foreground mb-1">/ 100 — {healthLabel}</span>
              </div>
              <Progress value={healthScore} className="h-2 mb-3" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground">
                <span>🏦 เงินสำรอง</span>
                <span>💳 ภาระหนี้</span>
                <span>🛡️ ประกัน</span>
                <span>📈 การลงทุน</span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-5xl font-bold text-muted-foreground">—</span>
              <div>
                <p className="text-sm text-muted-foreground mb-2">กรอกข้อมูลการเงินเพื่อดูคะแนน</p>
                <Button size="sm" variant="outline" asChild>
                  <Link href="/my-data">กรอกข้อมูลของฉัน →</Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: "/my-data",   icon: Database,          label: "ข้อมูลของฉัน",     color: "text-primary" },
          { href: "/tax",       icon: Calculator,        label: "คำนวณภาษี",         color: "text-blue-500" },
          { href: "/goals",     icon: Target,            label: "เป้าหมายการเงิน",   color: "text-emerald-500" },
          { href: "/ai-chat",   icon: MessageSquareText, label: "AI ที่ปรึกษา",      color: "text-purple-500" },
        ].map(({ href, icon: Icon, label, color }) => (
          <Link key={href} href={href}>
            <Card className="hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer">
              <CardContent className="flex flex-col items-center justify-center gap-2 py-5">
                <Icon className={`h-7 w-7 ${color}`} />
                <span className="text-sm font-medium text-center">{label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Tax CTA + Goals side by side */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Tax Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="h-4 w-4 text-blue-500" />
              สรุปภาษี 2025
            </CardTitle>
          </CardHeader>
          <CardContent>
            {taxLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : latestTax ? (
              <div className="space-y-3">
                <div className={`flex items-start gap-2 p-3 rounded-lg ${Number(latestTax.taxRefund) >= 0 ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                  {Number(latestTax.taxRefund) >= 0
                    ? <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                    : <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                  }
                  <div>
                    <p className={`font-semibold text-sm ${Number(latestTax.taxRefund) >= 0 ? "text-green-700" : "text-red-600"}`}>
                      {Number(latestTax.taxRefund) >= 0
                        ? `คืนภาษี ฿${Number(latestTax.taxRefund).toLocaleString("th-TH")}`
                        : `ต้องจ่ายเพิ่ม ฿${Math.abs(Number(latestTax.taxRefund)).toLocaleString("th-TH")}`
                      }
                    </p>
                    <p className="text-xs text-muted-foreground">อัตราภาษีที่แท้จริง {Number(latestTax.effectiveRate).toFixed(2)}%</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><p className="text-muted-foreground text-xs">ภาษีที่ต้องจ่าย</p><p className="font-medium">฿{Number(latestTax.taxOwed).toLocaleString("th-TH")}</p></div>
                  <div><p className="text-muted-foreground text-xs">ปีภาษี</p><p className="font-medium">{latestTax.taxYear.labelTh}</p></div>
                </div>
                <p className="text-xs text-muted-foreground">คำนวณเมื่อ {new Date(latestTax.createdAt).toLocaleDateString("th-TH")}</p>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href="/tax">คำนวณใหม่ →</Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <Calculator className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลการคำนวณภาษี</p>
                <Button size="sm" asChild>
                  <Link href="/tax">คำนวณภาษีเลย →</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Goals Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-emerald-500" />
              เป้าหมายการเงิน
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {goalsLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : goals.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <Target className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">ยังไม่มีเป้าหมาย — เริ่มสร้างเป้าหมายแรกของคุณ</p>
                <Button size="sm" asChild>
                  <Link href="/goals">สร้างเป้าหมาย</Link>
                </Button>
              </div>
            ) : (
              <>
                {goals.map((goal) => {
                  const pct = calcProgress(goal.currentAmount, goal.targetAmount);
                  return (
                    <div key={goal.id} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{goal.name}</span>
                        <span className="text-muted-foreground">{pct}%</span>
                      </div>
                      <Progress value={pct} />
                      <p className="text-xs text-muted-foreground">
                        ฿{Number(goal.currentAmount).toLocaleString("th-TH")} / ฿{Number(goal.targetAmount).toLocaleString("th-TH")}
                      </p>
                    </div>
                  );
                })}
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href="/goals">ดูเป้าหมายทั้งหมด →</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Insurance + Risk prompt */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <Shield className="h-8 w-8 text-amber-500 shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-sm">วิเคราะห์ประกันของคุณ</p>
              <p className="text-xs text-muted-foreground">ตรวจสอบช่องว่างด้านความคุ้มครองตามโปรไฟล์ของคุณ</p>
            </div>
            <Button size="sm" variant="outline" asChild>
              <Link href="/insurance">ดู →</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-purple-500 shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-sm">
                {risk ? `ระดับความเสี่ยง: ${riskInfo[risk.riskLevel].label}` : "ยังไม่ได้ประเมินความเสี่ยง"}
              </p>
              <p className="text-xs text-muted-foreground">
                {risk ? "คลิกเพื่อทำแบบประเมินใหม่" : "ทำแบบประเมินเพื่อรับคำแนะนำที่แม่นยำขึ้น"}
              </p>
            </div>
            <Button size="sm" variant="outline" asChild>
              <Link href="/my-data?tab=risk">{risk ? "ทบทวน" : "เริ่มเลย"} →</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
