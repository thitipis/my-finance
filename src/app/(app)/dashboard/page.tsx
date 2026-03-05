"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Calculator, Target, Shield, TrendingUp, Loader2, AlertCircle, CheckCircle2,
  MapPin, Wallet, Banknote, HeartPulse, ClipboardList, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Goal { id: string; name: string; targetAmount: number; currentAmount: number; }

interface TaxResult {
  id: string; taxOwed: number; taxRefund: number; effectiveRate: number;
  withheldTax: number; createdAt: string; taxYear: { year: number; labelTh: string };
}

interface FinancialProfile {
  annualSalary: number; bonus: number; otherIncome: number;
  monthlyExpenses: number; monthlyDebtPayment: number;
  emergencyFundAmount: number; totalDebt: number;
  rmfAmount: number; ssfAmount: number; thaiEsgAmount: number; ltfAmount: number;
  providentFundAmount: number;
  lifeInsurancePremium: number; healthInsurancePremium: number;
  parentHealthInsurancePremium: number; annuityInsurancePremium: number;
}

interface RiskAssessment { riskLevel: "conservative" | "moderate" | "aggressive"; score: number; }

interface FinancialPlan {
  currentAge: number | null; retirementAge: number | null;
  monthlyRetirementNeeds: number | null; monthlyInvestable: number | null;
  currentSavings: number | null; expectedReturn: number | null;
  inflationRate: number | null; targetWealthOverride: number | null;
  hasHomeGoal: boolean; hasCarGoal: boolean; hasEducationGoal: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const thb = (n: number) => `฿${Math.round(n).toLocaleString("th-TH")}`;
const thbM = (n: number) => n >= 1_000_000 ? `฿${(n / 1_000_000).toFixed(1)}M` : thb(n);

function calcFV(pv: number, r: number, n: number, pmt: number): number {
  if (n <= 0) return pv;
  if (Math.abs(r) < 1e-9) return pv + pmt * n;
  const g = (1 + r) ** n;
  return pv * g + pmt * (g - 1) / r;
}

function planProjection(p: FinancialPlan) {
  if (!p.currentAge || !p.retirementAge) return null;
  const years = Math.max(1, p.retirementAge - p.currentAge);
  const r = (1 + Number(p.expectedReturn ?? 7) / 100) ** (1 / 12) - 1;
  const inflation = Number(p.inflationRate ?? 3) / 100;
  const monthlyNeeds = Number(p.monthlyRetirementNeeds ?? 0);
  const pv = Number(p.currentSavings ?? 0);
  const pmt = Number(p.monthlyInvestable ?? 0);
  const projected = calcFV(pv, r, years * 12, pmt);
  const corpus = p.targetWealthOverride
    ? Number(p.targetWealthOverride)
    : monthlyNeeds > 0 ? (monthlyNeeds * 12 * (1 + inflation) ** years) / 0.04 : 0;
  const pct = corpus > 0 ? Math.min(100, Math.round((projected / corpus) * 100)) : 100;
  return { projected, corpus, pct, onTrack: projected >= corpus, years };
}

interface PillarScore { label: string; score: number; max: number; icon: string; tip?: string; }

function calcPillars(profile: FinancialProfile | null): PillarScore[] {
  if (!profile) return [];
  const monthlyExp = Number(profile.monthlyExpenses);
  const monthlyIncome = (Number(profile.annualSalary) + Number(profile.bonus) + Number(profile.otherIncome)) / 12;
  const annualIncome = Number(profile.annualSalary) + Number(profile.bonus) + Number(profile.otherIncome);

  // Emergency fund pillar (25 pts)
  const efMonths = monthlyExp > 0 ? Number(profile.emergencyFundAmount) / monthlyExp : 0;
  const efScore  = Math.min(25, Math.round((efMonths / 6) * 25));
  const efTip    = efMonths < 3 ? "ควรเพิ่มเป็น 6 เดือน" : efMonths < 6 ? "ใกล้ถึงเป้า 6 เดือนแล้ว" : "ดีมาก!";

  // Debt pillar (25 pts)
  const dti = monthlyIncome > 0 ? Number(profile.monthlyDebtPayment) / monthlyIncome : 0;
  const debtScore = Number(profile.monthlyDebtPayment) === 0 ? 25 : Math.max(0, Math.round((1 - dti * 2) * 25));
  const debtTip = dti === 0 ? "ไม่มีหนี้ ดีเยี่ยม!" : dti < 0.3 ? `DTI ${(dti*100).toFixed(0)}% — อยู่ในเกณฑ์ดี` : dti < 0.5 ? `DTI ${(dti*100).toFixed(0)}% — ควรลดหนี้` : `DTI ${(dti*100).toFixed(0)}% — สูงเกินไป`;

  // Insurance pillar (25 pts)
  const hasLife   = Number(profile.lifeInsurancePremium) > 0;
  const hasHealth = Number(profile.healthInsurancePremium) > 0;
  const insScore  = (hasLife ? 12 : 0) + (hasHealth ? 13 : 0);
  const insTip = !hasLife && !hasHealth ? "ยังไม่มีประกันใดเลย" : !hasLife ? "ยังขาดประกันชีวิต" : !hasHealth ? "ยังขาดประกันสุขภาพ" : "ครอบคลุมหลัก ✓";

  // Investment pillar (25 pts)
  const invested = Number(profile.rmfAmount) + Number(profile.ssfAmount) + Number(profile.thaiEsgAmount) + Number(profile.ltfAmount) + Number(profile.providentFundAmount);
  const investScore = annualIncome > 0 ? Math.min(25, Math.round((invested / annualIncome / 0.15) * 25)) : 0;
  const investTip = annualIncome > 0
    ? `${((invested / annualIncome) * 100).toFixed(1)}% ของรายได้ (เป้า 15%)`
    : "กรอกรายได้เพื่อคำนวณ";

  return [
    { label: "เงินสำรองฉุกเฉิน", score: efScore,    max: 25, icon: "🏦", tip: efTip },
    { label: "ภาระหนี้สิน",      score: debtScore,  max: 25, icon: "💳", tip: debtTip },
    { label: "ความคุ้มครองประกัน", score: insScore,  max: 25, icon: "🛡️", tip: insTip },
    { label: "การออมและลงทุน",    score: investScore,max: 25, icon: "📈", tip: investTip },
  ];
}

const riskInfo = {
  conservative: { label: "ระมัดระวัง", color: "text-blue-600", badge: "bg-blue-100 text-blue-700" },
  moderate:     { label: "ปานกลาง",   color: "text-amber-600", badge: "bg-amber-100 text-amber-700" },
  aggressive:   { label: "เชิงรุก",   color: "text-emerald-600", badge: "bg-emerald-100 text-emerald-700" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatRow({ label, value, sub, accent = false }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="flex justify-between items-start">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="text-right">
        <span className={cn("text-sm font-semibold tabular-nums", accent && "text-primary")}>{value}</span>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: session } = useSession();
  const userName = session?.user?.name?.split(" ")[0] ?? "คุณ";

  const [goals,   setGoals]   = useState<Goal[]>([]);
  const [tax,     setTax]     = useState<TaxResult | null>(null);
  const [profile, setProfile] = useState<FinancialProfile | null>(null);
  const [risk,    setRisk]    = useState<RiskAssessment | null>(null);
  const [plan,    setPlan]    = useState<FinancialPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/goals").then(r => r.json()),
      fetch("/api/tax/results").then(r => r.json()),
      fetch("/api/user/financial-profile").then(r => r.json()),
      fetch("/api/user/risk-assessment").then(r => r.json()),
      fetch("/api/user/financial-plan").then(r => r.json()),
    ]).then(([goalsRes, taxRes, profRes, riskRes, planRes]) => {
      setGoals(Array.isArray(goalsRes) ? goalsRes.slice(0, 3) : []);
      const results: TaxResult[] = taxRes.data ?? [];
      setTax(results[0] ?? null);
      if (profRes.data) setProfile(profRes.data);
      if (riskRes.data) setRisk(riskRes.data);
      if (planRes.data) setPlan(planRes.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const pillars    = calcPillars(profile);
  const healthScore = pillars.reduce((s, p) => s + p.score, 0);
  const healthLabel = healthScore >= 80 ? "แข็งแกร่ง" : healthScore >= 60 ? "ดี" : healthScore >= 40 ? "ปานกลาง" : "ต้องปรับปรุง";
  const healthColor = healthScore >= 80 ? "text-emerald-600" : healthScore >= 60 ? "text-blue-600" : healthScore >= 40 ? "text-amber-600" : "text-red-500";
  const healthRingColor = healthScore >= 80 ? "stroke-emerald-500" : healthScore >= 60 ? "stroke-blue-500" : healthScore >= 40 ? "stroke-amber-500" : "stroke-red-500";

  const proj = plan ? planProjection(plan) : null;

  // Cash flow
  const monthlyIncome = profile ? (Number(profile.annualSalary) + Number(profile.bonus) + Number(profile.otherIncome)) / 12 : 0;
  const monthlyExp    = profile ? Number(profile.monthlyExpenses) : 0;
  const monthlyDebt   = profile ? Number(profile.monthlyDebtPayment) : 0;
  const monthlyFree   = monthlyIncome - monthlyExp - monthlyDebt;

  // Insurance totals
  const totalPremium = profile
    ? Number(profile.lifeInsurancePremium) + Number(profile.healthInsurancePremium)
      + Number(profile.parentHealthInsurancePremium) + Number(profile.annuityInsurancePremium)
    : 0;

  // Investment totals
  const totalInvest = profile
    ? Number(profile.rmfAmount) + Number(profile.ssfAmount) + Number(profile.thaiEsgAmount)
      + Number(profile.ltfAmount) + Number(profile.providentFundAmount)
    : 0;

  if (loading) return (
    <div className="flex items-center justify-center h-72">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-5 max-w-3xl">

      {/* ── Greeting ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">สวัสดี, {userName} 👋</h1>
          <p className="text-sm text-muted-foreground mt-0.5">รายงานสุขภาพการเงินของคุณ</p>
        </div>
        {risk && (
          <span className={cn("text-xs font-semibold px-3 py-1.5 rounded-full", riskInfo[risk.riskLevel].badge)}>
            ความเสี่ยง: {riskInfo[risk.riskLevel].label}
          </span>
        )}
      </div>

      {/* ── Health Score (Doctor's Checkup Card) ── */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-stretch">
            {/* Score circle */}
            <div className="flex flex-col items-center justify-center gap-1 px-6 py-5 bg-muted/40 border-r shrink-0 w-36">
              <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/30" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none" strokeWidth="3.5"
                  strokeDasharray={`${healthScore} ${100 - healthScore}`}
                  strokeLinecap="round"
                  className={healthRingColor}
                />
              </svg>
              <span className={cn("text-3xl font-bold leading-none -mt-14", healthColor)}>{healthScore}</span>
              <span className="text-xs text-muted-foreground mt-10">/ 100</span>
              <span className={cn("text-xs font-semibold mt-0.5", healthColor)}>{healthLabel}</span>
            </div>

            {/* Pillars breakdown */}
            <div className="flex-1 p-4 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  <HeartPulse className="h-4 w-4 text-rose-500" /> คะแนนสุขภาพการเงิน
                </p>
                <Link href="/my-data" className="text-xs text-primary hover:underline">อัปเดตข้อมูล →</Link>
              </div>
              {!profile ? (
                <p className="text-sm text-muted-foreground py-4 text-center">กรอกข้อมูลใน <Link href="/my-data" className="text-primary underline">ข้อมูลของฉัน</Link> เพื่อดูผล</p>
              ) : (
                pillars.map(pillar => (
                  <div key={pillar.label} className="space-y-0.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">{pillar.icon} {pillar.label}</span>
                      <span className="font-medium tabular-nums">{pillar.score}/{pillar.max}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={(pillar.score / pillar.max) * 100} className="h-1.5 flex-1" />
                      {pillar.tip && <span className="text-xs text-muted-foreground whitespace-nowrap">{pillar.tip}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Cash Flow ── */}
      {profile && monthlyIncome > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Banknote className="h-4 w-4 text-blue-500" /> กระแสเงินสดต่อเดือน
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <div className="flex flex-col items-center">
                <span className="text-xs text-muted-foreground">รายได้</span>
                <span className="font-bold text-blue-600">{thb(monthlyIncome)}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex flex-col items-center">
                <span className="text-xs text-muted-foreground">รายจ่าย</span>
                <span className="font-semibold text-amber-600">−{thb(monthlyExp)}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex flex-col items-center">
                <span className="text-xs text-muted-foreground">ผ่อนหนี้</span>
                <span className="font-semibold text-amber-600">−{thb(monthlyDebt)}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex flex-col items-center">
                <span className="text-xs text-muted-foreground">คงเหลือลงทุนได้</span>
                <span className={cn("font-bold text-base", monthlyFree >= 0 ? "text-emerald-600" : "text-red-500")}>
                  {monthlyFree >= 0 ? "" : "−"}{thb(Math.abs(monthlyFree))}
                </span>
              </div>
            </div>
            {monthlyFree < 0 && (
              <p className="text-xs text-red-500 mt-2">⚠️ รายจ่ายและหนี้มากกว่ารายได้ — ควรปรับแผนการเงิน</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── 2-col: Insurance + Investment ── */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Insurance */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2"><Shield className="h-4 w-4 text-rose-500" />ความคุ้มครองประกัน</span>
              <Link href="/insurance" className="text-xs font-normal text-primary hover:underline">วิเคราะห์ →</Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 space-y-2">
            {!profile ? (
              <p className="text-xs text-muted-foreground">—</p>
            ) : (
              <>
                <StatRow label="เบี้ยประกันรวม/ปี" value={thb(totalPremium)} />
                <StatRow label="ประกันชีวิต" value={Number(profile.lifeInsurancePremium) > 0 ? "✓ มี" : "✗ ยังไม่มี"} accent={Number(profile.lifeInsurancePremium) > 0} />
                <StatRow label="ประกันสุขภาพ" value={Number(profile.healthInsurancePremium) > 0 ? "✓ มี" : "✗ ยังไม่มี"} accent={Number(profile.healthInsurancePremium) > 0} />
                {totalPremium === 0 && (
                  <p className="text-xs text-amber-600 mt-1">⚠️ ยังไม่มีประกัน — <Link href="/insurance" className="underline">ดูคำแนะนำ</Link></p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Investment */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-purple-500" />การออมและลงทุน</span>
              <Link href="/my-data?tab=investment" className="text-xs font-normal text-primary hover:underline">แก้ไข →</Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 space-y-2">
            {!profile ? (
              <p className="text-xs text-muted-foreground">—</p>
            ) : (
              <>
                <StatRow label="ลงทุนรวม/ปี (ลดหย่อนภาษี)" value={thb(totalInvest)} accent={totalInvest > 0} />
                {monthlyIncome > 0 && (
                  <StatRow label="% ของรายได้" value={`${((totalInvest / (monthlyIncome * 12)) * 100).toFixed(1)}%`} sub="เป้า 15%" />
                )}
                <StatRow label="เงินสำรองฉุกเฉิน" value={thb(Number(profile.emergencyFundAmount))} />
                {totalInvest === 0 && (
                  <p className="text-xs text-amber-600 mt-1">⚠️ ยังไม่มีการลงทุน — <Link href="/ai-chat" className="underline">ปรึกษา AI</Link></p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Debt & Emergency ── */}
      {profile && (Number(profile.totalDebt) > 0 || Number(profile.emergencyFundAmount) > 0) && (
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Wallet className="h-4 w-4 text-amber-500" /> หนี้สิน & เงินสำรอง
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <StatRow label="หนี้สินรวม" value={thb(Number(profile.totalDebt))} />
                <StatRow label="DTI (ผ่อน/รายได้)" value={monthlyIncome > 0 ? `${((monthlyDebt / monthlyIncome) * 100).toFixed(1)}%` : "—"} />
              </div>
              <div className="space-y-2">
                <StatRow label="เงินสำรองฉุกเฉิน" value={thb(Number(profile.emergencyFundAmount))} />
                <StatRow label="ครอบคลุม"
                  value={monthlyExp > 0 ? `${(Number(profile.emergencyFundAmount) / monthlyExp).toFixed(1)} เดือน` : "—"}
                  sub="เป้า 6 เดือน"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Financial Plan ── */}
      <Card className={proj
        ? proj.onTrack ? "border-emerald-300 bg-gradient-to-br from-emerald-50/60 to-transparent dark:from-emerald-950/10"
          : "border-amber-300 bg-gradient-to-br from-amber-50/60 to-transparent dark:from-amber-950/10"
        : ""}>
        <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MapPin className="h-4 w-4 text-indigo-500" /> แผนการเงินส่วนตัว
          </CardTitle>
          <Button size="sm" variant="outline" asChild>
            <Link href="/financial-plan">{plan ? "ปรับแผน →" : "สร้างแผน →"}</Link>
          </Button>
        </CardHeader>
        <CardContent className="pb-4">
          {!plan || !proj ? (
            <p className="text-sm text-muted-foreground">ยังไม่มีแผนการเงิน — กำหนดเป้าหมายเกษียณและการลงทุน</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className={cn("font-semibold flex items-center gap-1", proj.onTrack ? "text-emerald-600" : "text-amber-600")}>
                  {proj.onTrack ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  {proj.onTrack ? "อยู่ในเส้นทาง" : "ต้องปรับแผน"}
                </span>
                <span className="text-xs text-muted-foreground">เกษียณอายุ {plan.retirementAge} ปี · อีก {proj.years} ปี</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>ความคืบหน้าสู่เป้าหมาย</span>
                  <span className="font-semibold text-foreground">{proj.pct}%</span>
                </div>
                <Progress value={proj.pct} className="h-2" />
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm pt-1">
                <div><p className="text-xs text-muted-foreground">ความมั่งคั่งที่คาด</p><p className="font-bold text-blue-600">{thbM(proj.projected)}</p></div>
                <div><p className="text-xs text-muted-foreground">เป้า corpus</p><p className="font-bold">{thbM(proj.corpus)}</p></div>
                <div><p className="text-xs text-muted-foreground">ออม/เดือน</p><p className="font-bold">{thb(Number(plan.monthlyInvestable ?? 0))}</p></div>
              </div>
              {(plan.hasHomeGoal || plan.hasCarGoal || plan.hasEducationGoal) && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {plan.hasHomeGoal && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">🏠 บ้าน</span>}
                  {plan.hasCarGoal  && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">🚗 รถ</span>}
                  {plan.hasEducationGoal && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">🎓 การศึกษา</span>}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Tax + Goals ── */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Tax */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2"><Calculator className="h-4 w-4 text-blue-500" />สรุปภาษี</span>
              <Link href="/tax" className="text-xs font-normal text-primary hover:underline">คำนวณใหม่ →</Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {!tax ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <p className="text-sm text-muted-foreground">ยังไม่ได้คำนวณภาษี</p>
                <Button size="sm" asChild><Link href="/tax">คำนวณภาษีเลย →</Link></Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold",
                  Number(tax.taxRefund) >= 0 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200")}>
                  {Number(tax.taxRefund) >= 0
                    ? <CheckCircle2 className="h-4 w-4 shrink-0" />
                    : <AlertCircle className="h-4 w-4 shrink-0" />}
                  {Number(tax.taxRefund) >= 0
                    ? `คืนภาษี ${thb(Number(tax.taxRefund))}`
                    : `ต้องจ่ายเพิ่ม ${thb(Math.abs(Number(tax.taxRefund)))}`}
                </div>
                <StatRow label="ภาษีที่ต้องจ่าย" value={thb(Number(tax.taxOwed))} />
                <StatRow label="อัตราภาษีจริง" value={`${Number(tax.effectiveRate).toFixed(2)}%`} />
                <StatRow label="ปีภาษี" value={tax.taxYear.labelTh} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Goals */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2"><Target className="h-4 w-4 text-emerald-500" />เป้าหมายการเงิน</span>
              <Link href="/goals" className="text-xs font-normal text-primary hover:underline">ดูทั้งหมด →</Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 space-y-3">
            {goals.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <p className="text-sm text-muted-foreground">ยังไม่มีเป้าหมาย</p>
                <Button size="sm" asChild><Link href="/goals">สร้างเป้าหมาย</Link></Button>
              </div>
            ) : goals.map(g => {
              const pct = Number(g.targetAmount) > 0 ? Math.min(100, Math.round((Number(g.currentAmount) / Number(g.targetAmount)) * 100)) : 0;
              return (
                <div key={g.id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium truncate max-w-[140px]">{g.name}</span>
                    <span className="text-muted-foreground">{pct}%</span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                  <p className="text-xs text-muted-foreground">{thb(Number(g.currentAmount))} / {thb(Number(g.targetAmount))}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* ── Quick links row ── */}
      <div className="flex flex-wrap gap-2 pt-1 border-t">
        {[
          { href: "/tools/risk", icon: ClipboardList, label: "ประเมินความเสี่ยง" },
          { href: "/insurance",  icon: Shield,        label: "วิเคราะห์ประกัน"  },
          { href: "/ai-chat",    icon: TrendingUp,    label: "AI ที่ปรึกษา"     },
        ].map(({ href, icon: Icon, label }) => (
          <Button key={href} variant="outline" size="sm" asChild>
            <Link href={href}><Icon className="h-3.5 w-3.5 mr-1.5" />{label}</Link>
          </Button>
        ))}
      </div>

    </div>
  );
}

