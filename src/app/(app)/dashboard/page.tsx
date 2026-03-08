"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Calculator, Target, Shield, TrendingUp, Loader2, AlertCircle, CheckCircle2,
  MapPin, Wallet, Banknote, HeartPulse, ClipboardList, Sparkles,
  ArrowUpRight, ArrowDownRight, PiggyBank, BarChart3, Lightbulb,
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
  emergencyFundAmount: number; totalDebt: number; debtInterestRate: number;
  rmfAmount: number; ssfAmount: number; thaiEsgAmount: number; ltfAmount: number;
  providentFundAmount: number;
  lifeInsurancePremium: number; healthInsurancePremium: number;
  parentHealthInsurancePremium: number; annuityInsurancePremium: number;
  goldAmount: number; cryptoAmount: number; etfAmount: number;
  thaiStockAmount: number; foreignStockAmount: number; otherInvestAmount: number;
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
const thbM = (n: number) =>
  n >= 1_000_000 ? `฿${(n / 1_000_000).toFixed(1)}M` :
  n >= 100_000   ? `฿${(n / 1_000).toFixed(0)}K`     : thb(n);
const pct = (a: number, b: number) => b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0;

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
  const progress = corpus > 0 ? Math.min(100, Math.round((projected / corpus) * 100)) : 100;
  return { projected, corpus, pct: progress, onTrack: projected >= corpus, years };
}

interface PillarScore { label: string; score: number; max: number; icon: string; tip?: string; }

function calcPillars(profile: FinancialProfile | null): PillarScore[] {
  if (!profile) return [];
  const monthlyExp    = Number(profile.monthlyExpenses);
  const monthlyIncome = (Number(profile.annualSalary) + Number(profile.bonus) + Number(profile.otherIncome)) / 12;
  const annualIncome  = Number(profile.annualSalary) + Number(profile.bonus) + Number(profile.otherIncome);

  const efMonths   = monthlyExp > 0 ? Number(profile.emergencyFundAmount) / monthlyExp : 0;
  const efScore    = Math.min(25, Math.round((efMonths / 6) * 25));
  const efTip      = efMonths < 3 ? "ควรสะสมให้ถึง 6 เดือน" : efMonths < 6 ? "ใกล้ถึงเป้า 6 เดือนแล้ว" : "ครบตามมาตรฐาน ✓";

  const dti        = monthlyIncome > 0 ? Number(profile.monthlyDebtPayment) / monthlyIncome : 0;
  const debtScore  = Number(profile.monthlyDebtPayment) === 0 ? 25 : Math.max(0, Math.round((1 - dti * 2) * 25));
  const debtTip    = dti === 0 ? "ไม่มีหนี้ ดีเยี่ยม!" : dti < 0.3 ? `DTI ${(dti*100).toFixed(0)}% — ดี` : dti < 0.5 ? `DTI ${(dti*100).toFixed(0)}% — ควรลดหนี้` : `DTI ${(dti*100).toFixed(0)}% — สูงเกินไป`;

  const hasLife    = Number(profile.lifeInsurancePremium) > 0;
  const hasHealth  = Number(profile.healthInsurancePremium) > 0;
  const insScore   = (hasLife ? 12 : 0) + (hasHealth ? 13 : 0);
  const insTip     = !hasLife && !hasHealth ? "ยังไม่มีประกันใดเลย" : !hasLife ? "ขาดประกันชีวิต" : !hasHealth ? "ขาดประกันสุขภาพ" : "ครอบคลุมหลัก ✓";

  const invested     = Number(profile.rmfAmount) + Number(profile.ssfAmount) + Number(profile.thaiEsgAmount) + Number(profile.ltfAmount) + Number(profile.providentFundAmount);
  const investScore  = annualIncome > 0 ? Math.min(25, Math.round((invested / annualIncome / 0.15) * 25)) : 0;
  const investTip    = annualIncome > 0 ? `${((invested / annualIncome) * 100).toFixed(1)}% ของรายได้ (เป้า 15%)` : "กรอกรายได้เพื่อคำนวณ";

  return [
    { label: "เงินสำรองฉุกเฉิน",   score: efScore,    max: 25, icon: "🏦", tip: efTip },
    { label: "ภาระหนี้สิน",         score: debtScore,  max: 25, icon: "💳", tip: debtTip },
    { label: "ความคุ้มครองประกัน",  score: insScore,   max: 25, icon: "🛡️", tip: insTip },
    { label: "การออมและลงทุน",      score: investScore,max: 25, icon: "📈", tip: investTip },
  ];
}

interface ActionItem { icon: string; text: string; href: string; priority: "high" | "medium" | "low"; }

function buildActionItems(
  profile: FinancialProfile | null,
  plan: FinancialPlan | null,
  proj: ReturnType<typeof planProjection>,
  tax: TaxResult | null,
  monthlyIncome: number,
): ActionItem[] {
  if (!profile) return [];
  const items: ActionItem[] = [];
  const monthlyExp = Number(profile.monthlyExpenses);
  const efMonths   = monthlyExp > 0 ? Number(profile.emergencyFundAmount) / monthlyExp : 0;
  const dti        = monthlyIncome > 0 ? Number(profile.monthlyDebtPayment) / monthlyIncome : 0;
  const hasLife    = Number(profile.lifeInsurancePremium) > 0;
  const hasHealth  = Number(profile.healthInsurancePremium) > 0;
  const annualIncome = monthlyIncome * 12;
  const invested   = Number(profile.rmfAmount) + Number(profile.ssfAmount) + Number(profile.thaiEsgAmount) + Number(profile.ltfAmount) + Number(profile.providentFundAmount);

  if (efMonths < 3)  items.push({ icon: "🏦", text: "สะสมเงินสำรองฉุกเฉินให้ครบ 3 เดือน", href: "/my-data", priority: "high" });
  else if (efMonths < 6) items.push({ icon: "🏦", text: "เพิ่มเงินสำรองฉุกเฉินให้ครบ 6 เดือน", href: "/my-data", priority: "medium" });
  if (!hasLife)  items.push({ icon: "🛡️", text: "ทำประกันชีวิตเพื่อคุ้มครองครอบครัว", href: "/insurance", priority: "high" });
  if (!hasHealth) items.push({ icon: "💊", text: "ทำประกันสุขภาพเพื่อลดความเสี่ยงค่าักษาพยาบาล", href: "/insurance", priority: "high" });
  if (dti > 0.4)  items.push({ icon: "💳", text: `DTI สูงถึง ${(dti*100).toFixed(0)}% — วางแผนชำระหนี้เร่งด่วน`, href: "/financial-plan", priority: "high" });
  if (annualIncome > 0 && invested / annualIncome < 0.1)
    items.push({ icon: "📈", text: "เพิ่มการลงทุนลดหย่อนภาษี (RMF/SSF/กองทุนสำรอง)", href: "/my-data", priority: "medium" });
  if (!plan || !plan.currentAge)
    items.push({ icon: "🗺️", text: "สร้างแผนการเงินและกำหนดเป้าเกษียณ", href: "/financial-plan", priority: "medium" });
  else if (proj && !proj.onTrack)
    items.push({ icon: "⚡", text: "เพิ่มเงินออม/เดือน เพื่อให้ถึงเป้าเกษียณ", href: "/financial-plan", priority: "medium" });
  if (!tax)
    items.push({ icon: "🧾", text: "คำนวณภาษีเพื่อตรวจสอบสิทธิ์คืนภาษี", href: "/tax", priority: "low" });

  return items.slice(0, 5);
}

const riskInfo = {
  conservative: { label: "ระมัดระวัง", color: "text-blue-600",    badge: "bg-blue-100 text-blue-700",    dot: "bg-blue-400"    },
  moderate:     { label: "ปานกลาง",   color: "text-amber-600",   badge: "bg-amber-100 text-amber-700",   dot: "bg-amber-400"   },
  aggressive:   { label: "เชิงรุก",   color: "text-emerald-600", badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-400" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatRow({ label, value, sub, accent = false }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="text-right shrink-0">
        <span className={cn("text-sm font-semibold tabular-nums", accent && "text-primary")}>{value}</span>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

function RatioChip({
  label, value, sub, status,
}: { label: string; value: string; sub?: string; status: "good" | "warn" | "bad" | "neutral" }) {
  const colors = {
    good:    "bg-emerald-50 border-emerald-200 text-emerald-700",
    warn:    "bg-amber-50 border-amber-200 text-amber-700",
    bad:     "bg-red-50 border-red-200 text-red-600",
    neutral: "bg-muted/50 border-muted text-muted-foreground",
  };
  return (
    <div className={cn("rounded-xl border p-3 flex flex-col gap-0.5", colors[status])}>
      <span className="text-[10px] font-medium uppercase tracking-wide opacity-70">{label}</span>
      <span className="text-xl font-bold tabular-nums leading-none">{value}</span>
      {sub && <span className="text-[10px] opacity-70">{sub}</span>}
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

  // ── Derived values ──────────────────────────────────────────────────────────
  const pillars     = calcPillars(profile);
  const healthScore = pillars.reduce((s, p) => s + p.score, 0);
  const healthLabel = healthScore >= 80 ? "แข็งแกร่ง" : healthScore >= 60 ? "ดี" : healthScore >= 40 ? "ปานกลาง" : "ต้องปรับปรุง";
  const healthColor = healthScore >= 80 ? "text-emerald-600" : healthScore >= 60 ? "text-blue-600" : healthScore >= 40 ? "text-amber-600" : "text-red-500";
  const healthRingColor = healthScore >= 80 ? "stroke-emerald-500" : healthScore >= 60 ? "stroke-blue-500" : healthScore >= 40 ? "stroke-amber-500" : "stroke-red-500";

  const proj = plan ? planProjection(plan) : null;

  const annualSalary  = profile ? Number(profile.annualSalary) : 0;
  const annualBonus   = profile ? Number(profile.bonus) : 0;
  const annualOther   = profile ? Number(profile.otherIncome) : 0;
  const annualIncome  = annualSalary + annualBonus + annualOther;
  const monthlyIncome = annualIncome / 12;
  const monthlyExp    = profile ? Number(profile.monthlyExpenses) : 0;
  const monthlyDebt   = profile ? Number(profile.monthlyDebtPayment) : 0;
  const monthlyFree   = monthlyIncome - monthlyExp - monthlyDebt;
  const savingsRate   = monthlyIncome > 0 ? (monthlyFree / monthlyIncome) * 100 : 0;
  const dti           = monthlyIncome > 0 ? (monthlyDebt / monthlyIncome) * 100 : 0;
  const efMonths      = monthlyExp > 0 ? Number(profile?.emergencyFundAmount ?? 0) / monthlyExp : 0;

  // Insurance totals
  const totalPremium = profile
    ? Number(profile.lifeInsurancePremium) + Number(profile.healthInsurancePremium)
      + Number(profile.parentHealthInsurancePremium) + Number(profile.annuityInsurancePremium)
    : 0;

  // Tax-deductible investments
  const taxInvest = profile
    ? Number(profile.rmfAmount) + Number(profile.ssfAmount) + Number(profile.thaiEsgAmount)
      + Number(profile.ltfAmount) + Number(profile.providentFundAmount)
    : 0;

  // Personal portfolio (market value)
  const portfolioAssets = profile ? [
    { label: "ทองคำ",          value: Number(profile.goldAmount),         color: "bg-yellow-400" },
    { label: "คริปโต",         value: Number(profile.cryptoAmount),       color: "bg-orange-400" },
    { label: "ETF/กองทุน",     value: Number(profile.etfAmount),          color: "bg-blue-400"   },
    { label: "หุ้นไทย",        value: Number(profile.thaiStockAmount),    color: "bg-emerald-400" },
    { label: "หุ้นต่างประเทศ", value: Number(profile.foreignStockAmount), color: "bg-purple-400" },
    { label: "อื่นๆ",          value: Number(profile.otherInvestAmount),  color: "bg-slate-400"  },
  ].filter(a => a.value > 0) : [];
  const portfolioTotal = portfolioAssets.reduce((s, a) => s + a.value, 0);

  // Net worth  (liquid/tracked assets: savings + portfolio − debt)
  const emergencyFund = profile ? Number(profile.emergencyFundAmount) : 0;
  const totalDebt     = profile ? Number(profile.totalDebt) : 0;
  const totalAssets   = emergencyFund + taxInvest + portfolioTotal;
  const netWorth      = totalAssets - totalDebt;

  // Debt payoff estimate (months)
  const debtInterestRate = profile ? Number(profile.debtInterestRate ?? 0) : 0;
  let debtPayoffMonths: number | null = null;
  if (totalDebt > 0 && monthlyDebt > 0) {
    const r = debtInterestRate > 0 ? (debtInterestRate / 100) / 12 : 0;
    if (r < 1e-9) {
      debtPayoffMonths = Math.ceil(totalDebt / monthlyDebt);
    } else {
      const n = -Math.log(1 - (r * totalDebt) / monthlyDebt) / Math.log(1 + r);
      debtPayoffMonths = isFinite(n) && n > 0 ? Math.ceil(n) : null;
    }
  }

  // Action items
  const actions = buildActionItems(profile, plan, proj, tax, monthlyIncome);

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
          <p className="text-sm text-muted-foreground mt-0.5">รายงานวิเคราะห์การเงินส่วนตัว</p>
        </div>
        {risk && (
          <span className={cn("text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5", riskInfo[risk.riskLevel].badge)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", riskInfo[risk.riskLevel].dot)} />
            ความเสี่ยง: {riskInfo[risk.riskLevel].label}
          </span>
        )}
      </div>

      {/* ── Net Worth Hero ── */}
      {profile && (
        <Card className="overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 text-white border-0">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">มูลค่าสุทธิ (Net Worth)</p>
                <p className={cn("text-4xl font-bold tabular-nums", netWorth >= 0 ? "text-white" : "text-red-400")}>
                  {netWorth >= 0 ? "" : "−"}{thbM(Math.abs(netWorth))}
                </p>
                <p className="text-xs text-slate-400 mt-1">สินทรัพย์ {thbM(totalAssets)} − หนี้ {thbM(totalDebt)}</p>
              </div>
              <div className="flex flex-col gap-1.5 text-right shrink-0">
                <div className="flex items-center justify-end gap-1.5 text-xs">
                  <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-slate-300">สินทรัพย์</span>
                  <span className="font-semibold text-emerald-400">{thbM(totalAssets)}</span>
                </div>
                <div className="flex items-center justify-end gap-1.5 text-xs">
                  <ArrowDownRight className="h-3.5 w-3.5 text-red-400" />
                  <span className="text-slate-300">หนี้สิน</span>
                  <span className="font-semibold text-red-400">{thbM(totalDebt)}</span>
                </div>
                {debtPayoffMonths !== null && (
                  <p className="text-[10px] text-slate-500 mt-1">ปลดหนี้ภายใน ~{debtPayoffMonths} เดือน</p>
                )}
              </div>
            </div>
            {/* Asset breakdown mini-bar */}
            {totalAssets > 0 && (
              <div className="mt-4 space-y-1.5">
                <div className="flex rounded-full overflow-hidden h-2 gap-px">
                  {emergencyFund > 0 && <div style={{ width: `${pct(emergencyFund, totalAssets)}%` }} className="bg-sky-400" />}
                  {taxInvest > 0     && <div style={{ width: `${pct(taxInvest, totalAssets)}%` }}     className="bg-purple-400" />}
                  {portfolioTotal > 0 && <div style={{ width: `${pct(portfolioTotal, totalAssets)}%` }} className="bg-emerald-400" />}
                </div>
                <div className="flex gap-3 text-[10px] text-slate-400 flex-wrap">
                  {emergencyFund > 0 && <span><span className="inline-block w-2 h-2 rounded-sm bg-sky-400 mr-1" />เงินสำรอง {pct(emergencyFund, totalAssets)}%</span>}
                  {taxInvest > 0     && <span><span className="inline-block w-2 h-2 rounded-sm bg-purple-400 mr-1" />ลดหย่อนภาษี {pct(taxInvest, totalAssets)}%</span>}
                  {portfolioTotal > 0 && <span><span className="inline-block w-2 h-2 rounded-sm bg-emerald-400 mr-1" />พอร์ตส่วนตัว {pct(portfolioTotal, totalAssets)}%</span>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Key Ratios ── */}
      {profile && monthlyIncome > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <RatioChip
            label="อัตราออม"
            value={`${savingsRate.toFixed(0)}%`}
            sub={savingsRate >= 20 ? "ดีมาก ✓" : savingsRate >= 10 ? "ควรเพิ่ม" : "ต่ำเกินไป"}
            status={savingsRate >= 20 ? "good" : savingsRate >= 10 ? "warn" : "bad"}
          />
          <RatioChip
            label="DTI หนี้/รายได้"
            value={`${dti.toFixed(0)}%`}
            sub={dti === 0 ? "ไม่มีหนี้ ✓" : dti < 30 ? "อยู่ในเกณฑ์ดี" : dti < 50 ? "ควรลดหนี้" : "สูงเกินไป"}
            status={dti === 0 ? "good" : dti < 30 ? "good" : dti < 50 ? "warn" : "bad"}
          />
          <RatioChip
            label="เงินสำรอง"
            value={`${efMonths.toFixed(1)} ด.`}
            sub={efMonths >= 6 ? "ครบเกณฑ์ ✓" : efMonths >= 3 ? "เป้า 6 เดือน" : "ต้องเพิ่มด่วน"}
            status={efMonths >= 6 ? "good" : efMonths >= 3 ? "warn" : "bad"}
          />
          <RatioChip
            label="อัตราภาษีจริง"
            value={tax ? `${Number(tax.effectiveRate).toFixed(1)}%` : "—"}
            sub={tax ? tax.taxYear.labelTh : "ยังไม่คำนวณ"}
            status={tax ? (Number(tax.effectiveRate) < 15 ? "good" : Number(tax.effectiveRate) < 25 ? "warn" : "bad") : "neutral"}
          />
        </div>
      )}

      {/* ── Health Score ── */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-stretch">
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
            <div className="flex-1 p-4 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  <HeartPulse className="h-4 w-4 text-rose-500" /> คะแนนสุขภาพการเงิน
                </p>
                <Link href="/my-data" className="text-xs text-primary hover:underline">อัปเดตข้อมูล →</Link>
              </div>
              {!profile ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  กรอกข้อมูลใน <Link href="/my-data" className="text-primary underline">ข้อมูลของฉัน</Link> เพื่อดูผล
                </p>
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
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2"><Banknote className="h-4 w-4 text-blue-500" /> กระแสเงินสดต่อเดือน</span>
              <Link href="/my-data" className="text-xs font-normal text-primary hover:underline">แก้ไข →</Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 space-y-3">
            {/* Stacked bar */}
            <div className="flex rounded-full overflow-hidden h-3 gap-px">
              <div style={{ width: `${pct(monthlyExp, monthlyIncome)}%` }} className="bg-amber-400 min-w-0" title="รายจ่าย" />
              <div style={{ width: `${pct(monthlyDebt, monthlyIncome)}%` }} className="bg-rose-400 min-w-0" title="ผ่อนหนี้" />
              <div style={{ width: `${Math.max(0, pct(monthlyFree, monthlyIncome))}%` }} className="bg-emerald-400 min-w-0" title="คงเหลือ" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              {[
                { label: "รายได้รวม", value: thb(monthlyIncome), color: "text-blue-600 font-bold" },
                { label: `รายจ่าย (${pct(monthlyExp, monthlyIncome)}%)`, value: `−${thb(monthlyExp)}`, color: "text-amber-600" },
                { label: `ผ่อนหนี้ (${pct(monthlyDebt, monthlyIncome)}%)`, value: `−${thb(monthlyDebt)}`, color: "text-rose-500" },
                {
                  label: monthlyFree >= 0 ? `ลงทุนได้ (${pct(monthlyFree, monthlyIncome)}%)` : "ขาดดุล",
                  value: `${monthlyFree >= 0 ? "" : "−"}${thb(Math.abs(monthlyFree))}`,
                  color: monthlyFree >= 0 ? "text-emerald-600 font-bold" : "text-red-500 font-bold",
                },
              ].map(item => (
                <div key={item.label} className="bg-muted/40 rounded-lg p-2">
                  <p className="text-muted-foreground mb-0.5">{item.label}</p>
                  <p className={item.color}>{item.value}</p>
                </div>
              ))}
            </div>
            {monthlyFree < 0 && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                รายจ่ายและหนี้มากกว่ารายได้ — ควรปรับแผนการเงิน
              </p>
            )}
            {monthlyIncome > 0 && annualBonus + annualOther > 0 && (
              <div className="flex gap-3 text-[10px] text-muted-foreground border-t pt-2 mt-1">
                <span className="font-medium">แหล่งรายได้:</span>
                <span>เงินเดือน {pct(annualSalary, annualIncome)}%</span>
                {annualBonus > 0   && <span>โบนัส {pct(annualBonus, annualIncome)}%</span>}
                {annualOther > 0   && <span>อื่นๆ {pct(annualOther, annualIncome)}%</span>}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Portfolio Allocation ── */}
      {portfolioAssets.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-indigo-500" /> พอร์ตการลงทุนส่วนตัว</span>
              <Link href="/my-data" className="text-xs font-normal text-primary hover:underline">แก้ไข →</Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>มูลค่ารวม</span>
              <span className="font-semibold text-foreground">{thbM(portfolioTotal)}</span>
            </div>
            {portfolioAssets.map(asset => (
              <div key={asset.label} className="space-y-0.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{asset.label}</span>
                  <span className="font-medium tabular-nums">{pct(asset.value, portfolioTotal)}% · {thbM(asset.value)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full", asset.color)} style={{ width: `${pct(asset.value, portfolioTotal)}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Financial Plan ── */}
      <Card className={proj
        ? proj.onTrack
          ? "border-emerald-300 bg-gradient-to-br from-emerald-50/60 to-transparent dark:from-emerald-950/10"
          : "border-amber-300 bg-gradient-to-br from-amber-50/60 to-transparent dark:from-amber-950/10"
        : ""}>
        <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MapPin className="h-4 w-4 text-indigo-500" /> แผนการเงิน & เกษียณ
          </CardTitle>
          <Button size="sm" variant="outline" asChild>
            <Link href="/financial-plan">{plan ? "ปรับแผน →" : "สร้างแผน →"}</Link>
          </Button>
        </CardHeader>
        <CardContent className="pb-4">
          {!plan || !proj ? (
            <div className="text-center py-4 space-y-2">
              <p className="text-sm text-muted-foreground">ยังไม่มีแผนการเงิน — กำหนดเป้าหมายเกษียณและการลงทุน</p>
              <Button size="sm" asChild><Link href="/financial-plan">สร้างแผนเลย →</Link></Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className={cn("font-semibold flex items-center gap-1.5", proj.onTrack ? "text-emerald-600" : "text-amber-600")}>
                  {proj.onTrack ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  {proj.onTrack ? "อยู่ในเส้นทาง ✓" : "ต้องเพิ่มการออม"}
                </span>
                <span className="text-xs text-muted-foreground">เกษียณอายุ {plan.retirementAge} ปี · อีก {proj.years} ปี</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>ความคืบหน้าสู่เป้า Retirement Corpus</span>
                  <span className="font-semibold text-foreground">{proj.pct}%</span>
                </div>
                <Progress value={proj.pct} className="h-2.5" />
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm pt-1">
                <div className="bg-muted/40 rounded-lg p-2.5 text-center">
                  <p className="text-[10px] text-muted-foreground">ความมั่งคั่งที่คาด</p>
                  <p className="font-bold text-blue-600 mt-0.5">{thbM(proj.projected)}</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-2.5 text-center">
                  <p className="text-[10px] text-muted-foreground">เป้า Corpus</p>
                  <p className="font-bold mt-0.5">{thbM(proj.corpus)}</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-2.5 text-center">
                  <p className="text-[10px] text-muted-foreground">ออม/เดือน</p>
                  <p className="font-bold mt-0.5">{thb(Number(plan.monthlyInvestable ?? 0))}</p>
                </div>
              </div>
              {(plan.hasHomeGoal || plan.hasCarGoal || plan.hasEducationGoal) && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {plan.hasHomeGoal       && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">🏠 บ้าน</span>}
                  {plan.hasCarGoal        && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">🚗 รถ</span>}
                  {plan.hasEducationGoal  && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">🎓 การศึกษา</span>}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 2-col: Tax + Goals ── */}
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
                  Number(tax.taxRefund) >= 0
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-red-50 text-red-600 border border-red-200")}>
                  {Number(tax.taxRefund) >= 0
                    ? <CheckCircle2 className="h-4 w-4 shrink-0" />
                    : <AlertCircle className="h-4 w-4 shrink-0" />}
                  {Number(tax.taxRefund) >= 0
                    ? `คืนภาษี ${thb(Number(tax.taxRefund))}`
                    : `ต้องจ่ายเพิ่ม ${thb(Math.abs(Number(tax.taxRefund)))}`}
                </div>
                <StatRow label="ภาษีที่ต้องจ่าย"     value={thb(Number(tax.taxOwed))} />
                <StatRow label="อัตราภาษีจริง"         value={`${Number(tax.effectiveRate).toFixed(2)}%`} />
                <StatRow label="ลงทุนลดหย่อน/ปี"       value={thb(taxInvest)} accent={taxInvest > 0} />
                <StatRow label="ปีภาษี"                value={tax.taxYear.labelTh} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Goals */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2"><Target className="h-4 w-4 text-emerald-500" />เป้าหมายการเงิน</span>
              <Link href="/lineage" className="text-xs font-normal text-primary hover:underline">ดูทั้งหมด →</Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 space-y-3">
            {goals.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <p className="text-sm text-muted-foreground">ยังไม่มีเป้าหมาย</p>
                <Button size="sm" asChild><Link href="/lineage">สร้างเป้าหมาย</Link></Button>
              </div>
            ) : goals.map(g => {
              const p = Number(g.targetAmount) > 0 ? Math.min(100, Math.round((Number(g.currentAmount) / Number(g.targetAmount)) * 100)) : 0;
              return (
                <div key={g.id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium truncate max-w-[140px]">{g.name}</span>
                    <span className="text-muted-foreground">{p}%</span>
                  </div>
                  <Progress value={p} className="h-1.5" />
                  <p className="text-xs text-muted-foreground">{thb(Number(g.currentAmount))} / {thb(Number(g.targetAmount))}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* ── Insurance ── */}
      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2"><Shield className="h-4 w-4 text-rose-500" />ความคุ้มครองประกัน</span>
            <Link href="/insurance" className="text-xs font-normal text-primary hover:underline">วิเคราะห์เพิ่มเติม →</Link>
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          {!profile ? (
            <p className="text-xs text-muted-foreground">—</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              {[
                { label: "ประกันชีวิต",    has: Number(profile.lifeInsurancePremium) > 0,   amount: Number(profile.lifeInsurancePremium)   },
                { label: "ประกันสุขภาพ",  has: Number(profile.healthInsurancePremium) > 0,  amount: Number(profile.healthInsurancePremium)  },
                { label: "ประกันบำนาญ",   has: Number(profile.annuityInsurancePremium) > 0, amount: Number(profile.annuityInsurancePremium) },
                { label: "ประกันสุขภาพบิดามารดา", has: Number(profile.parentHealthInsurancePremium) > 0, amount: Number(profile.parentHealthInsurancePremium) },
              ].map(ins => (
                <div key={ins.label} className={cn("rounded-lg border p-2.5", ins.has ? "bg-emerald-50 border-emerald-200" : "bg-muted/40 border-muted")}>
                  <div className="text-base mb-1">{ins.has ? "✓" : "✗"}</div>
                  <div className={cn("font-medium", ins.has ? "text-emerald-700" : "text-muted-foreground")}>{ins.label}</div>
                  {ins.has && <div className="text-[10px] text-muted-foreground mt-0.5">{thb(ins.amount)}/ปี</div>}
                </div>
              ))}
            </div>
          )}
          {profile && totalPremium > 0 && (
            <div className="flex justify-between text-xs text-muted-foreground border-t mt-3 pt-2">
              <span>เบี้ยประกันรวม/ปี</span>
              <span className="font-semibold text-foreground">{thb(totalPremium)}</span>
            </div>
          )}
          {profile && totalPremium === 0 && (
            <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              ยังไม่มีประกันใดเลย — <Link href="/insurance" className="underline">ดูคำแนะนำ</Link>
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Smart Action Items ── */}
      {actions.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/10 dark:border-amber-800">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" /> สิ่งที่ควรทำต่อไป
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4 space-y-2">
            {actions.map((action, i) => (
              <Link key={i} href={action.href} className="flex items-start gap-2.5 group">
                <span className="text-base shrink-0 mt-0.5">{action.icon}</span>
                <span className={cn(
                  "text-sm group-hover:underline",
                  action.priority === "high" ? "font-semibold text-red-700 dark:text-red-400" :
                  action.priority === "medium" ? "font-medium text-amber-700 dark:text-amber-400" :
                  "text-muted-foreground",
                )}>{action.text}</span>
                {action.priority === "high" && (
                  <span className="ml-auto shrink-0 text-[10px] bg-red-100 text-red-600 border border-red-200 px-1.5 py-0.5 rounded-full">ด่วน</span>
                )}
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Quick Links ── */}
      <div className="flex flex-wrap gap-2 pt-1 border-t">
        {[
          { href: "/tools/risk",        icon: ClipboardList, label: "ประเมินความเสี่ยง" },
          { href: "/insurance",         icon: Shield,        label: "วิเคราะห์ประกัน"   },
          { href: "/ai-chat",           icon: Sparkles,      label: "AI ที่ปรึกษา"      },
          { href: "/tools/investment-plan", icon: PiggyBank,  label: "วางแผนลงทุน"      },
          { href: "/tax",               icon: Calculator,    label: "คำนวณภาษี"         },
        ].map(({ href, icon: Icon, label }) => (
          <Button key={href} variant="outline" size="sm" asChild>
            <Link href={href}><Icon className="h-3.5 w-3.5 mr-1.5" />{label}</Link>
          </Button>
        ))}
      </div>

    </div>
  );
}

