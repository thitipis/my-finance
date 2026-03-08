"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  TrendingUp, Shield, AlertTriangle, CheckCircle2, XCircle,
  ChevronRight, RefreshCw, Info,
  Target, Zap, Home, GraduationCap, Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
type RiskLevel = "conservative" | "moderate" | "aggressive";

interface RiskAssessment {
  riskLevel: RiskLevel;
  score: number;
}

interface Goal {
  id: string;
  name: string;
  goalType: string;
  targetAmount: number;
  currentAmount: number;
  monthlyContribution: number;
  annualReturnRate: number;
  projection: {
    progressPercent: number;
    monthsToGoal: number | null;
    projectedValue: number;
    monthlyNeeded: number;
  };
}

interface FinancialProfile {
  annualSalary: number;
  otherIncome: number;
  spouseIncome: number;
  monthlyExpenses: number;
}

interface FinancialPlan {
  currentAge: number;
  retirementAge: number;
}

interface PortfolioAsset {
  id: string;
  assetType: string;
  currentValue: number;
}

// ─── Allocation configs per risk level ───────────────────────────────────────
const ALLOCATIONS: Record<RiskLevel, {
  conservative: { label: string; pct: number; color: string; bg: string; funds: { name: string; type: string; taxBenefit: string | null }[] }[];
  recommended:  { label: string; pct: number; color: string; bg: string; funds: { name: string; type: string; taxBenefit: string | null }[] }[];
  aggressive:   { label: string; pct: number; color: string; bg: string; funds: { name: string; type: string; taxBenefit: string | null }[] }[];
}> = {
  conservative: {
    conservative: [
      { label: "ตราสารหนี้ / หนี้รัฐ", pct: 60, color: "#6366f1", bg: "bg-indigo-100 text-indigo-700",
        funds: [
          { name: "RMF ตราสารหนี้", type: "RMF", taxBenefit: "ลดหย่อนภาษีสูงสุด 30% ของรายได้" },
          { name: "กองทุนตลาดเงิน", type: "Money Market", taxBenefit: null },
        ]},
      { label: "หุ้นไทย", pct: 25, color: "#10b981", bg: "bg-emerald-100 text-emerald-700",
        funds: [
          { name: "SSF SET50 ETF", type: "SSF", taxBenefit: "ลดหย่อนภาษีสูงสุด 30% ของรายได้" },
        ]},
      { label: "เงินสด / สภาพคล่อง", pct: 15, color: "#f59e0b", bg: "bg-amber-100 text-amber-700",
        funds: [
          { name: "กองทุนตลาดเงิน / ออมทรัพย์", type: "Savings", taxBenefit: null },
        ]},
    ],
    recommended: [
      { label: "ตราสารหนี้ / หนี้รัฐ", pct: 70, color: "#6366f1", bg: "bg-indigo-100 text-indigo-700",
        funds: [
          { name: "RMF ตราสารหนี้", type: "RMF", taxBenefit: "ลดหย่อนภาษีสูงสุด 30% ของรายได้" },
          { name: "กองทุนพันธบัตรรัฐบาล", type: "Bond Fund", taxBenefit: null },
        ]},
      { label: "หุ้นไทย", pct: 20, color: "#10b981", bg: "bg-emerald-100 text-emerald-700",
        funds: [
          { name: "SSF กองทุนหุ้นไทย", type: "SSF", taxBenefit: "ลดหย่อนภาษีสูงสุด 30% ของรายได้" },
        ]},
      { label: "เงินสด", pct: 10, color: "#f59e0b", bg: "bg-amber-100 text-amber-700",
        funds: [
          { name: "กองทุนตลาดเงิน", type: "Money Market", taxBenefit: null },
        ]},
    ],
    aggressive: [
      { label: "ตราสารหนี้", pct: 55, color: "#6366f1", bg: "bg-indigo-100 text-indigo-700",
        funds: [
          { name: "RMF ตราสารหนี้", type: "RMF", taxBenefit: "ลดหย่อนภาษีสูงสุด 30% ของรายได้" },
        ]},
      { label: "หุ้น", pct: 35, color: "#10b981", bg: "bg-emerald-100 text-emerald-700",
        funds: [
          { name: "SSF หุ้นไทย + ต่างประเทศ", type: "SSF", taxBenefit: "ลดหย่อนภาษีสูงสุด 30% ของรายได้" },
        ]},
      { label: "เงินสด", pct: 10, color: "#f59e0b", bg: "bg-amber-100 text-amber-700",
        funds: [
          { name: "กองทุนตลาดเงิน", type: "Money Market", taxBenefit: null },
        ]},
    ],
  },
  moderate: {
    conservative: [
      { label: "ตราสารหนี้", pct: 50, color: "#6366f1", bg: "bg-indigo-100 text-indigo-700",
        funds: [
          { name: "RMF ตราสารหนี้", type: "RMF", taxBenefit: "ลดหย่อนภาษีสูงสุด 30% ของรายได้" },
          { name: "กองทุนพันธบัตรรัฐบาล", type: "Bond Fund", taxBenefit: null },
        ]},
      { label: "หุ้นไทย", pct: 35, color: "#10b981", bg: "bg-emerald-100 text-emerald-700",
        funds: [
          { name: "SSF SET50 ETF", type: "SSF", taxBenefit: "ลดหย่อนภาษีสูงสุด 30% ของรายได้" },
          { name: "RMF หุ้นไทย", type: "RMF", taxBenefit: "ลดหย่อนภาษีสูงสุด 30% ของรายได้" },
        ]},
      { label: "หุ้นต่างประเทศ", pct: 5, color: "#8b5cf6", bg: "bg-violet-100 text-violet-700",
        funds: [
          { name: "RMF Global Equity", type: "RMF", taxBenefit: "ลดหย่อนภาษีสูงสุด 30% ของรายได้" },
        ]},
      { label: "เงินสด", pct: 10, color: "#f59e0b", bg: "bg-amber-100 text-amber-700",
        funds: [
          { name: "กองทุนตลาดเงิน", type: "Money Market", taxBenefit: null },
        ]},
    ],
    recommended: [
      { label: "หุ้นไทย", pct: 35, color: "#10b981", bg: "bg-emerald-100 text-emerald-700",
        funds: [
          { name: "SSF SET50 ETF", type: "SSF", taxBenefit: "ลดหย่อนภาษีสูงสุด 30% ของรายได้" },
          { name: "RMF หุ้นไทย", type: "RMF", taxBenefit: "ลดหย่อนภาษีสูงสุด 30% ของรายได้" },
        ]},
      { label: "หุ้นต่างประเทศ", pct: 20, color: "#8b5cf6", bg: "bg-violet-100 text-violet-700",
        funds: [
          { name: "SSF กองทุนต่างประเทศ (S&P500/Global)", type: "SSF", taxBenefit: "ลดหย่อนภาษีสูงสุด 30% ของรายได้" },
        ]},
      { label: "ตราสารหนี้", pct: 35, color: "#6366f1", bg: "bg-indigo-100 text-indigo-700",
        funds: [
          { name: "RMF ตราสารหนี้", type: "RMF", taxBenefit: "ลดหย่อนภาษีสูงสุด 30% ของรายได้" },
          { name: "กองทุนพันธบัตรรัฐบาล", type: "Bond Fund", taxBenefit: null },
        ]},
      { label: "เงินสด", pct: 10, color: "#f59e0b", bg: "bg-amber-100 text-amber-700",
        funds: [
          { name: "กองทุนตลาดเงิน", type: "Money Market", taxBenefit: null },
        ]},
    ],
    aggressive: [
      { label: "หุ้นไทย", pct: 40, color: "#10b981", bg: "bg-emerald-100 text-emerald-700",
        funds: [
          { name: "SSF SET50 ETF", type: "SSF", taxBenefit: "ลดหย่อนภาษีสูงสุด 30% ของรายได้" },
          { name: "RMF หุ้นไทย", type: "RMF", taxBenefit: "ลดหย่อนภาษีสูงสุด 30% ของรายได้" },
        ]},
      { label: "หุ้นต่างประเทศ", pct: 35, color: "#8b5cf6", bg: "bg-violet-100 text-violet-700",
        funds: [
          { name: "SSF S&P500 / Global ETF", type: "SSF", taxBenefit: "ลดหย่อนภาษีสูงสุด 30% ของรายได้" },
          { name: "RMF Global Equity", type: "RMF", taxBenefit: "ลดหย่อนภาษีสูงสุด 30% ของรายได้" },
        ]},
      { label: "ตราสารหนี้", pct: 15, color: "#6366f1", bg: "bg-indigo-100 text-indigo-700",
        funds: [
          { name: "RMF ตราสารหนี้", type: "RMF", taxBenefit: "ลดหย่อนภาษีสูงสุด 30% ของรายได้" },
        ]},
      { label: "ทางเลือก / สินค้าโภคภัณฑ์", pct: 10, color: "#ef4444", bg: "bg-red-100 text-red-700",
        funds: [
          { name: "กองทุนทอง / REITs", type: "Alternative", taxBenefit: null },
        ]},
    ],
  },
  aggressive: {
    conservative: [
      { label: "หุ้นไทย", pct: 40, color: "#10b981", bg: "bg-emerald-100 text-emerald-700",
        funds: [
          { name: "SSF SET50 ETF", type: "SSF", taxBenefit: "ลดหย่อนภาษีสูงสุด 30% ของรายได้" },
        ]},
      { label: "หุ้นต่างประเทศ", pct: 25, color: "#8b5cf6", bg: "bg-violet-100 text-violet-700",
        funds: [
          { name: "RMF Global Equity", type: "RMF", taxBenefit: "ลดหย่อนภาษีสูงสุด 30% ของรายได้" },
        ]},
      { label: "ตราสารหนี้", pct: 25, color: "#6366f1", bg: "bg-indigo-100 text-indigo-700",
        funds: [
          { name: "RMF ตราสารหนี้", type: "RMF", taxBenefit: "ลดหย่อนภาษีสูงสุด 30% ของรายได้" },
        ]},
      { label: "เงินสด", pct: 10, color: "#f59e0b", bg: "bg-amber-100 text-amber-700",
        funds: [
          { name: "กองทุนตลาดเงิน", type: "Money Market", taxBenefit: null },
        ]},
    ],
    recommended: [
      { label: "หุ้นไทย", pct: 40, color: "#10b981", bg: "bg-emerald-100 text-emerald-700",
        funds: [
          { name: "SSF SET50 ETF", type: "SSF", taxBenefit: "ลดหย่อนภาษีสูงสุด 30% ของรายได้" },
          { name: "RMF หุ้นไทย", type: "RMF", taxBenefit: "ลดหย่อนภาษีสูงสุด 30% ของรายได้" },
        ]},
      { label: "หุ้นต่างประเทศ", pct: 40, color: "#8b5cf6", bg: "bg-violet-100 text-violet-700",
        funds: [
          { name: "SSF S&P500 / Global ETF", type: "SSF", taxBenefit: "ลดหย่อนภาษีสูงสุด 30% ของรายได้" },
          { name: "RMF Global Equity", type: "RMF", taxBenefit: "ลดหย่อนภาษีสูงสุด 30% ของรายได้" },
        ]},
      { label: "ทางเลือก / สินค้าโภคภัณฑ์", pct: 15, color: "#ef4444", bg: "bg-red-100 text-red-700",
        funds: [
          { name: "กองทุนทอง / REITs", type: "Alternative", taxBenefit: null },
        ]},
      { label: "เงินสด", pct: 5, color: "#f59e0b", bg: "bg-amber-100 text-amber-700",
        funds: [
          { name: "กองทุนตลาดเงิน", type: "Money Market", taxBenefit: null },
        ]},
    ],
    aggressive: [
      { label: "หุ้นไทย", pct: 35, color: "#10b981", bg: "bg-emerald-100 text-emerald-700",
        funds: [
          { name: "SSF SET50 / Mid-Small Cap", type: "SSF", taxBenefit: "ลดหย่อนภาษีสูงสุด 30% ของรายได้" },
        ]},
      { label: "หุ้นต่างประเทศ", pct: 45, color: "#8b5cf6", bg: "bg-violet-100 text-violet-700",
        funds: [
          { name: "SSF S&P500 + Nasdaq", type: "SSF", taxBenefit: "ลดหย่อนภาษีสูงสุด 30% ของรายได้" },
          { name: "RMF Global Equity", type: "RMF", taxBenefit: "ลดหย่อนภาษีสูงสุด 30% ของรายได้" },
        ]},
      { label: "ทางเลือก / สินค้าโภคภัณฑ์", pct: 15, color: "#ef4444", bg: "bg-red-100 text-red-700",
        funds: [
          { name: "กองทุนทอง / Crypto Fund / REITs", type: "Alternative", taxBenefit: null },
        ]},
      { label: "เงินสด", pct: 5, color: "#f59e0b", bg: "bg-amber-100 text-amber-700",
        funds: [
          { name: "กองทุนตลาดเงิน", type: "Money Market", taxBenefit: null },
        ]},
    ],
  },
};

const EXPECTED_RETURN: Record<RiskLevel, Record<"conservative" | "recommended" | "aggressive", number>> = {
  conservative: { conservative: 3.5, recommended: 4.5, aggressive: 6.0 },
  moderate:     { conservative: 5.0, recommended: 7.0, recommended2: 9.0, aggressive: 9.0 } as never,
  aggressive:   { conservative: 7.0, recommended: 10.0, aggressive: 12.0 },
};

// fix moderate separately
const EXPECTED_RETURN_MODERATE = { conservative: 5.0, recommended: 7.0, aggressive: 9.0 };

function getExpectedReturn(riskLevel: RiskLevel, mode: "conservative" | "recommended" | "aggressive"): number {
  if (riskLevel === "moderate") return EXPECTED_RETURN_MODERATE[mode];
  return EXPECTED_RETURN[riskLevel][mode];
}

const RISK_META: Record<RiskLevel, { label: string; color: string; bg: string; defaultMode: "recommended" }> = {
  conservative: { label: "Conservative (ความเสี่ยงต่ำ)", color: "text-blue-600", bg: "bg-blue-50 border-blue-200", defaultMode: "recommended" },
  moderate:     { label: "Moderate (ความเสี่ยงปานกลาง)", color: "text-violet-600", bg: "bg-violet-50 border-violet-200", defaultMode: "recommended" },
  aggressive:   { label: "Aggressive (ความเสี่ยงสูง)", color: "text-red-600", bg: "bg-red-50 border-red-200", defaultMode: "recommended" },
};

const GOAL_ICON: Record<string, React.ElementType> = {
  retirement: TrendingUp,
  emergency_fund: Shield,
  home_car: Home,
  education: GraduationCap,
  investment: Zap,
  custom: Star,
};

const GOAL_COLOR: Record<string, string> = {
  retirement: "#6366f1",
  emergency_fund: "#f59e0b",
  home_car: "#3b82f6",
  education: "#8b5cf6",
  investment: "#10b981",
  custom: "#64748b",
};

function thb(v: number) {
  return v >= 1_000_000
    ? `${(v / 1_000_000).toFixed(2)}ล้าน ฿`
    : v >= 1_000
    ? `${(v / 1_000).toFixed(0)}K ฿`
    : `${v.toFixed(0)} ฿`;
}

// ─── Readiness Item ───────────────────────────────────────────────────────────
function ReadinessRow({ ok, label, value, href }: {
  ok: boolean; label: string; value: string; href?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3 px-4 py-2.5 rounded-xl border", ok ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50")}>
      {ok
        ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
        : <XCircle className="h-4 w-4 text-red-400 shrink-0" />}
      <div className="flex-1 min-w-0">
        <span className="text-xs font-semibold text-slate-700">{label}</span>
        {ok
          ? <span className="ml-2 text-xs text-slate-500">{value}</span>
          : href
            ? <Link href={href} className="ml-2 text-xs text-violet-600 hover:underline font-medium">→ กรอกข้อมูล</Link>
            : <span className="ml-2 text-xs text-red-500">{value}</span>}
      </div>
    </div>
  );
}

// ─── Allocation Bar ───────────────────────────────────────────────────────────
function AllocationBar({ slices }: { slices: { label: string; pct: number; color: string }[] }) {
  return (
    <div className="flex rounded-full overflow-hidden h-3 w-full gap-0.5">
      {slices.map((s, i) => (
        <div key={i} style={{ width: `${s.pct}%`, background: s.color }} title={`${s.label} ${s.pct}%`} />
      ))}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function InvestmentPlanPage() {
  const [risk,    setRisk]    = useState<RiskAssessment | null>(null);
  const [goals,   setGoals]   = useState<Goal[]>([]);
  const [profile, setProfile] = useState<FinancialProfile | null>(null);
  const [plan,    setPlan]    = useState<FinancialPlan | null>(null);
  const [assets,  setAssets]  = useState<PortfolioAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode,    setMode]    = useState<"conservative" | "recommended" | "aggressive">("recommended");

  useEffect(() => {
    Promise.all([
      fetch("/api/user/risk-assessment").then(r => r.json()),
      fetch("/api/goals").then(r => r.json()),
      fetch("/api/user/financial-profile").then(r => r.json()),
      fetch("/api/user/financial-plan").then(r => r.json()),
      fetch("/api/user/portfolio-assets").then(r => r.json()),
    ]).then(([riskRes, goalsRes, profileRes, planRes, assetsRes]) => {
      setRisk(riskRes.data ?? null);
      setGoals(goalsRes.data ?? []);
      setProfile(profileRes.data ?? null);
      setPlan(planRes.data ?? null);
      setAssets(assetsRes.data ?? []);
    }).finally(() => setLoading(false));
  }, []);

  const monthlyIncome = useMemo(() => {
    if (!profile) return 0;
    return (Number(profile.annualSalary) + Number(profile.otherIncome) + Number(profile.spouseIncome)) / 12;
  }, [profile]);

  const monthlyExpenses = useMemo(() => profile ? Number(profile.monthlyExpenses) : 0, [profile]);
  const monthlySurplus  = useMemo(() => Math.max(0, monthlyIncome - monthlyExpenses), [monthlyIncome, monthlyExpenses]);
  const totalPortfolio  = useMemo(() => assets.reduce((s, a) => s + Number(a.currentValue), 0), [assets]);

  // Readiness checks
  const hasRisk     = !!risk;
  const hasGoals    = goals.length > 0;
  const hasIncome   = monthlyIncome > 0;
  const hasAge      = !!(plan?.currentAge);
  const hasPortfolio = totalPortfolio > 0;
  const readinessScore = [hasRisk, hasGoals, hasIncome, hasAge].filter(Boolean).length;

  const riskLevel = (risk?.riskLevel ?? "moderate") as RiskLevel;
  const allocation = ALLOCATIONS[riskLevel][mode];
  const expectedReturn = getExpectedReturn(riskLevel, mode);
  const riskMeta = RISK_META[riskLevel];

  const currentAge   = plan?.currentAge ?? 30;
  const retirementAge = plan?.retirementAge ?? 60;
  const yearsLeft    = Math.max(0, retirementAge - currentAge);

  // Monthly needed across all goals
  const totalMonthlyNeeded = useMemo(
    () => goals.reduce((s, g) => s + (g.projection?.monthlyNeeded ?? 0), 0),
    [goals]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        <RefreshCw className="h-5 w-5 animate-spin mr-2" /> กำลังโหลด...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">แผนการลงทุน</h1>
        <p className="text-sm text-slate-500 mt-0.5">แผนแนะนำตามความเสี่ยงและเป้าหมายของคุณ</p>
      </div>

      {/* ── Readiness Card ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Info className="h-4 w-4 text-slate-400" />
            ข้อมูลที่ใช้สร้างแผน
          </h2>
          <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full",
            readinessScore === 4 ? "bg-emerald-100 text-emerald-700" :
            readinessScore >= 2 ? "bg-amber-100 text-amber-700" :
            "bg-red-100 text-red-700"
          )}>
            {readinessScore}/4 ข้อมูลพร้อม
          </span>
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          <ReadinessRow ok={hasRisk}   label="ประเมินความเสี่ยง" value={risk ? `${riskMeta.label} (${risk.score}/10)` : ""} href="/assessment/risk" />
          <ReadinessRow ok={hasGoals}  label="เป้าหมายการเงิน"  value={`${goals.length} เป้าหมาย`} href="/lineage" />
          <ReadinessRow ok={hasIncome} label="รายได้ / รายจ่าย" value={hasIncome ? `${thb(monthlyIncome)}/ด. รายได้` : ""} href="/my-data" />
          <ReadinessRow ok={hasAge}    label="อายุ / เกษียณ"    value={hasAge ? `${currentAge} → ${retirementAge} ปี (${yearsLeft} ปี)` : ""} href="/my-data" />
        </div>
        {!hasPortfolio && (
          <p className="mt-3 text-[11px] text-slate-400 flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3 text-amber-400" />
            ยังไม่มีข้อมูลสินทรัพย์ — การวิเคราะห์ Gap จะไม่สมบูรณ์
            <Link href="/my-data" className="text-violet-600 hover:underline ml-1">เพิ่มสินทรัพย์</Link>
          </p>
        )}
      </div>

      {/* ── Risk Level Badge ─────────────────────────────────────────────── */}
      {hasRisk && (
        <div className={cn("rounded-2xl border px-5 py-4 flex items-center gap-4", riskMeta.bg)}>
          <TrendingUp className={cn("h-6 w-6 shrink-0", riskMeta.color)} />
          <div className="flex-1">
            <p className="text-xs text-slate-500 font-medium">ระดับความเสี่ยงของคุณ</p>
            <p className={cn("font-bold text-base", riskMeta.color)}>{riskMeta.label}</p>
          </div>
          <p className="text-2xl font-black text-slate-800">{risk!.score}<span className="text-sm font-medium text-slate-400">/10</span></p>
        </div>
      )}

      {/* ── Monthly Budget ───────────────────────────────────────────────── */}
      {hasIncome && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <h2 className="font-bold text-slate-800 text-sm mb-4">งบประมาณรายเดือน</h2>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">รายได้</p>
              <p className="text-lg font-black text-slate-900 mt-0.5">{thb(monthlyIncome)}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">รายจ่าย</p>
              <p className="text-lg font-black text-slate-900 mt-0.5">{thb(monthlyExpenses)}</p>
            </div>
            <div className={cn("rounded-xl p-3", monthlySurplus >= totalMonthlyNeeded ? "bg-emerald-50" : "bg-amber-50")}>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">ออมได้</p>
              <p className={cn("text-lg font-black mt-0.5", monthlySurplus >= totalMonthlyNeeded ? "text-emerald-600" : "text-amber-600")}>
                {thb(monthlySurplus)}
              </p>
            </div>
          </div>
          {hasGoals && (
            <div className={cn("mt-3 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2",
              monthlySurplus >= totalMonthlyNeeded ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>
              {monthlySurplus >= totalMonthlyNeeded
                ? <CheckCircle2 className="h-3.5 w-3.5" />
                : <AlertTriangle className="h-3.5 w-3.5" />}
              {monthlySurplus >= totalMonthlyNeeded
                ? `เงินออมเพียงพอสำหรับทุกเป้าหมาย (ต้องการ ${thb(totalMonthlyNeeded)}/ด.)`
                : `เงินออมไม่พอ — ต้องการ ${thb(totalMonthlyNeeded)}/ด. แต่มีเพียง ${thb(monthlySurplus)}/ด.`}
            </div>
          )}
        </div>
      )}

      {/* ── Goal Breakdown ───────────────────────────────────────────────── */}
      {hasGoals && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <h2 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
            <Target className="h-4 w-4 text-violet-500" />
            เป้าหมายและการออมที่ต้องการ
          </h2>
          <div className="space-y-2.5">
            {goals.map(g => {
              const IconComp = GOAL_ICON[g.goalType] ?? Star;
              const color = GOAL_COLOR[g.goalType] ?? "#64748b";
              const target = Number(g.targetAmount);
              const current = Number(g.currentAmount);
              const gap = Math.max(0, target - current);
              const monthly = g.projection?.monthlyNeeded ?? Number(g.monthlyContribution);
              const pct = g.projection?.progressPercent ?? 0;
              return (
                <div key={g.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0" style={{ background: `${color}20` }}>
                    <IconComp className="h-4 w-4" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{g.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-slate-800">{thb(monthly)}<span className="text-slate-400 font-normal">/ด.</span></p>
                    {gap > 0 && <p className="text-[10px] text-slate-400">ขาดอีก {thb(gap)}</p>}
                  </div>
                </div>
              );
            })}
            {hasIncome && (
              <div className="flex items-center justify-between px-4 py-2 rounded-xl bg-violet-50 border border-violet-100 mt-1">
                <span className="text-xs font-semibold text-violet-700">รวมต้องออมทุกเป้าหมาย</span>
                <span className="text-sm font-black text-violet-700">{thb(totalMonthlyNeeded)}/ด.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Portfolio comparison tabs ─────────────────────────────────────── */}
      {hasRisk && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="font-bold text-slate-800 text-sm">สัดส่วนการลงทุนแนะนำ</h2>
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
              {([
                { key: "conservative", label: "ปลอดภัย" },
                { key: "recommended",  label: "แนะนำ ✦" },
                { key: "aggressive",   label: "เชิงรุก" },
              ] as const).map(opt => (
                <button key={opt.key} onClick={() => setMode(opt.key)}
                  className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                    mode === opt.key ? "bg-white shadow text-violet-700" : "text-slate-500 hover:text-slate-700")}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {mode === "recommended" && (
            <div className="mb-3 px-3 py-2 bg-violet-50 rounded-xl border border-violet-100 text-xs text-violet-700 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              แผนนี้เหมาะสมที่สุดกับโปรไฟล์ความเสี่ยงของคุณ
            </div>
          )}

          {/* Allocation bar */}
          <AllocationBar slices={allocation} />

          {/* Legend + fund table */}
          <div className="mt-4 space-y-2">
            {allocation.map((slice, i) => (
              <div key={i} className="rounded-xl border border-slate-100 overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50">
                  <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: slice.color }} />
                  <span className="text-xs font-semibold text-slate-700 flex-1">{slice.label}</span>
                  <span className="text-sm font-black text-slate-800">{slice.pct}%</span>
                  {hasIncome && monthlySurplus > 0 && (
                    <span className="text-xs text-slate-400 ml-2">{thb(monthlySurplus * slice.pct / 100)}/ด.</span>
                  )}
                </div>
                <table className="w-full">
                  <tbody className="divide-y divide-slate-50">
                    {slice.funds.map((f, j) => (
                      <tr key={j} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-2 text-xs text-slate-600">{f.name}</td>
                        <td className="px-4 py-2 text-[10px] text-violet-600 font-semibold">{f.type}</td>
                        <td className="px-4 py-2 text-[10px] text-emerald-600 text-right">
                          {f.taxBenefit ?? <span className="text-slate-300">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          {/* Expected return + portfolio comparison table */}
          <div className="mt-5 border-t pt-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">เปรียบเทียบ 3 แผน</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 text-slate-400 font-semibold">รายการ</th>
                    <th className="text-center py-2 text-slate-400 font-semibold">ปลอดภัย</th>
                    <th className="text-center py-2 text-violet-600 font-bold">แนะนำ ✦</th>
                    <th className="text-center py-2 text-slate-400 font-semibold">เชิงรุก</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  <tr>
                    <td className="py-2 text-slate-600">ผลตอบแทนเฉลี่ย/ปี</td>
                    {(["conservative", "recommended", "aggressive"] as const).map(m => (
                      <td key={m} className={cn("py-2 text-center font-bold tabular-nums", m === "recommended" ? "text-violet-700" : "text-slate-700")}>
                        ~{getExpectedReturn(riskLevel, m)}%
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-600">ความผันผวน</td>
                    <td className="py-2 text-center text-blue-600 font-medium">ต่ำ</td>
                    <td className="py-2 text-center text-violet-600 font-bold">ปานกลาง</td>
                    <td className="py-2 text-center text-red-600 font-medium">สูง</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-slate-600">เหมาะกับ</td>
                    <td className="py-2 text-center text-slate-500">รักษาเงินต้น</td>
                    <td className="py-2 text-center text-violet-600 font-bold">โปรไฟล์คุณ</td>
                    <td className="py-2 text-center text-slate-500">เติบโตสูง</td>
                  </tr>
                  {hasIncome && monthlySurplus > 0 && yearsLeft > 0 && (
                    <tr className="bg-slate-50/60">
                      <td className="py-2 text-slate-600">มูลค่าคาดใน {yearsLeft} ปี</td>
                      {(["conservative", "recommended", "aggressive"] as const).map(m => {
                        const r = getExpectedReturn(riskLevel, m) / 100 / 12;
                        const n = yearsLeft * 12;
                        const fv = monthlySurplus * ((Math.pow(1 + r, n) - 1) / r) + totalPortfolio * Math.pow(1 + r * 12, yearsLeft);
                        return (
                          <td key={m} className={cn("py-2 text-center font-bold tabular-nums", m === "recommended" ? "text-violet-700" : "text-slate-700")}>
                            {thb(fv)}
                          </td>
                        );
                      })}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Gap Analysis ─────────────────────────────────────────────────── */}
      {hasPortfolio && hasGoals && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <h2 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Gap Analysis — มีแล้ว vs ต้องการ
          </h2>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] text-slate-400 font-semibold uppercase">พอร์ตปัจจุบัน</p>
              <p className="text-lg font-black text-emerald-600 mt-0.5">{thb(totalPortfolio)}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] text-slate-400 font-semibold uppercase">เป้าหมายรวม</p>
              <p className="text-lg font-black text-slate-800 mt-0.5">
                {thb(goals.reduce((s, g) => s + Number(g.targetAmount), 0))}
              </p>
            </div>
            <div className={cn("rounded-xl p-3",
              totalPortfolio >= goals.reduce((s, g) => s + Number(g.targetAmount), 0) ? "bg-emerald-50" : "bg-red-50")}>
              <p className="text-[10px] text-slate-400 font-semibold uppercase">ขาดอีก</p>
              <p className={cn("text-lg font-black mt-0.5",
                totalPortfolio >= goals.reduce((s, g) => s + Number(g.targetAmount), 0) ? "text-emerald-600" : "text-red-500")}>
                {thb(Math.max(0, goals.reduce((s, g) => s + Number(g.targetAmount), 0) - totalPortfolio))}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────── */}
      {!hasRisk && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 text-center">
          <TrendingUp className="h-10 w-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-semibold mb-1">ยังไม่สามารถสร้างแผนได้</p>
          <p className="text-sm text-slate-400 mb-4">กรุณาทำแบบประเมินความเสี่ยงก่อนเพื่อให้ระบบสร้างแผนที่เหมาะสมกับคุณ</p>
          <Link href="/assessment/risk"
            className="inline-flex items-center gap-2 bg-violet-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-violet-700 transition-all">
            ทำแบบประเมินความเสี่ยง <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
