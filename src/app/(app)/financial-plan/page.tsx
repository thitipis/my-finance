"use client";
import { useState, useEffect } from "react";
import {
  BarChart3, Loader2, TrendingUp, TrendingDown, Banknote,
  ShieldCheck, AlertTriangle, CheckCircle2, AlertCircle,
  Wallet, PiggyBank, Scale, Target, Activity,
  ChevronRight, Flame,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileData {
  annualSalary: number; bonus: number; otherIncome: number;
  monthlyExpenses: number; monthlyDebtPayment: number; totalDebt: number;
  debtInterestRate: number;
  emergencyFundAmount: number;
  rmfAmount: number; ssfAmount: number; thaiEsgAmount: number;
  ltfAmount: number; providentFundAmount: number;
  lifeInsurancePremium: number; healthInsurancePremium: number;
  annuityInsurancePremium: number; withheldTax: number;
}

interface PlanData {
  currentAge: number | null; retirementAge: number | null;
  monthlyRetirementNeeds: number | null; expectedReturn: number | null;
  currentSavings: number | null; monthlyInvestable: number | null;
}

interface RiskData { riskLevel: "conservative" | "moderate" | "aggressive"; }

interface PortfolioAsset {
  id: string; assetType?: string; currentValue: number;
  expectedReturn?: number | null; group?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const thb  = (n: number) => `฿${Math.round(n).toLocaleString("th-TH")}`;
const thbM = (n: number) =>
  n >= 1_000_000 ? `฿${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `฿${(n / 1_000).toFixed(0)}K`
  : thb(n);
const pct = (n: number, total: number) =>
  total > 0 ? `${((n / total) * 100).toFixed(1)}%` : "—";

function getMarginalRate(income: number): number {
  if (income <= 150_000)   return 0;
  if (income <= 300_000)   return 0.05;
  if (income <= 500_000)   return 0.10;
  if (income <= 750_000)   return 0.15;
  if (income <= 1_000_000) return 0.20;
  if (income <= 2_000_000) return 0.25;
  if (income <= 5_000_000) return 0.30;
  return 0.35;
}

function calcFV(pv: number, annualRate: number, years: number, monthlyPmt: number): number {
  if (years <= 0) return pv;
  const r = (1 + annualRate) ** (1 / 12) - 1;
  if (Math.abs(r) < 1e-9) return pv + monthlyPmt * years * 12;
  const g = (1 + r) ** (years * 12);
  return pv * g + monthlyPmt * (g - 1) / r;
}

// ─── UI Components ────────────────────────────────────────────────────────────

type Health = "good" | "warn" | "bad" | "neutral";

const HEALTH_COLOR: Record<Health, string> = {
  good:    "text-emerald-600",
  warn:    "text-amber-600",
  bad:     "text-red-500",
  neutral: "text-muted-foreground",
};
const HEALTH_BG: Record<Health, string> = {
  good:    "bg-emerald-50 border-emerald-200",
  warn:    "bg-amber-50  border-amber-200",
  bad:     "bg-red-50    border-red-200",
  neutral: "bg-muted/40  border-muted",
};

function KpiCard({
  icon: Icon, label, value, sub, health = "neutral", link,
}: {
  icon: React.ElementType; label: string; value: string;
  sub?: string; health?: Health; link?: { href: string; label: string };
}) {
  return (
    <Card className={cn("border", HEALTH_BG[health])}>
      <CardContent className="pt-4 pb-4 flex flex-col gap-1">
        <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
          <Icon className={cn("h-4 w-4 shrink-0", HEALTH_COLOR[health])} />
          {label}
        </div>
        <p className={cn("text-2xl font-bold tabular-nums leading-tight", HEALTH_COLOR[health])}>{value}</p>
        {sub  && <p className="text-xs text-muted-foreground">{sub}</p>}
        {link && (
          <Link href={link.href} className="text-xs text-primary hover:underline flex items-center gap-0.5 mt-0.5">
            {link.label}<ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

function MetricRow({
  label, value, sub, health = "neutral", bar, barMax, link,
}: {
  label: string; value: string; sub?: string;
  health?: Health; bar?: number; barMax?: number;
  link?: { href: string; label: string };
}) {
  const barPct = bar !== undefined && barMax ? Math.min(100, (bar / barMax) * 100) : null;
  return (
    <div className="py-2.5 border-b last:border-0 space-y-1">
      <div className="flex justify-between items-start gap-2">
        <span className="text-xs text-muted-foreground leading-tight">{label}</span>
        <div className="text-right shrink-0">
          <span className={cn("text-sm font-semibold tabular-nums", HEALTH_COLOR[health])}>{value}</span>
          {sub  && <p className="text-[10px] text-muted-foreground">{sub}</p>}
          {link && <Link href={link.href} className="text-[10px] text-primary hover:underline">{link.label} →</Link>}
        </div>
      </div>
      {barPct !== null && (
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div className={cn("h-full rounded-full transition-all",
            health === "good" ? "bg-emerald-500" : health === "warn" ? "bg-amber-400" : health === "bad" ? "bg-red-400" : "bg-primary/60"
          )} style={{ width: `${barPct}%` }} />
        </div>
      )}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, color = "text-foreground" }: { icon: React.ElementType; title: string; color?: string }) {
  return (
    <div className={cn("flex items-center gap-2 font-semibold text-sm mb-3", color)}>
      <Icon className="h-4 w-4 shrink-0" />{title}
    </div>
  );
}

function HealthBadge({ health }: { health: Health }) {
  const styles: Record<Health, string> = {
    good:    "bg-emerald-100 text-emerald-700",
    warn:    "bg-amber-100  text-amber-700",
    bad:     "bg-red-100    text-red-600",
    neutral: "bg-muted      text-muted-foreground",
  };
  const label: Record<Health, string> = { good: "ดี", warn: "พอใช้", bad: "ควรปรับ", neutral: "—" };
  return (
    <span className={cn("inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0", styles[health])}>
      {label[health]}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FinancialAnalysisPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [plan,    setPlan]    = useState<PlanData | null>(null);
  const [risk,    setRisk]    = useState<RiskData | null>(null);
  const [assets,  setAssets]  = useState<PortfolioAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview"|"cashflow"|"investment"|"retirement">("overview");

  useEffect(() => {
    Promise.all([
      fetch("/api/user/financial-profile").then(r => r.json()),
      fetch("/api/user/financial-plan").then(r => r.json()),
      fetch("/api/user/risk-assessment").then(r => r.json()),
      fetch("/api/user/portfolio-assets").then(r => r.json()),
    ]).then(([profRes, planRes, riskRes, portRes]) => {
      if (profRes.data) {
        const d = profRes.data;
        setProfile({
          annualSalary: Number(d.annualSalary ?? 0), bonus: Number(d.bonus ?? 0), otherIncome: Number(d.otherIncome ?? 0),
          monthlyExpenses: Number(d.monthlyExpenses ?? 0), monthlyDebtPayment: Number(d.monthlyDebtPayment ?? 0),
          totalDebt: Number(d.totalDebt ?? 0), debtInterestRate: Number(d.debtInterestRate ?? 0),
          emergencyFundAmount: Number(d.emergencyFundAmount ?? 0),
          rmfAmount: Number(d.rmfAmount ?? 0), ssfAmount: Number(d.ssfAmount ?? 0),
          thaiEsgAmount: Number(d.thaiEsgAmount ?? 0), ltfAmount: Number(d.ltfAmount ?? 0),
          providentFundAmount: Number(d.providentFundAmount ?? 0),
          lifeInsurancePremium: Number(d.lifeInsurancePremium ?? 0),
          healthInsurancePremium: Number(d.healthInsurancePremium ?? 0),
          annuityInsurancePremium: Number(d.annuityInsurancePremium ?? 0),
          withheldTax: Number(d.withheldTax ?? 0),
        });
      }
      if (planRes.data) {
        const d = planRes.data;
        setPlan({
          currentAge: d.currentAge ?? null, retirementAge: d.retirementAge ?? null,
          monthlyRetirementNeeds: Number(d.monthlyRetirementNeeds ?? 0) || null,
          expectedReturn: Number(d.expectedReturn ?? 7),
          currentSavings: Number(d.currentSavings ?? 0),
          monthlyInvestable: Number(d.monthlyInvestable ?? 0) || null,
        });
      }
      if (riskRes.data) setRisk(riskRes.data);
      if (portRes.data && Array.isArray(portRes.data)) {
        setAssets(portRes.data.map((a: PortfolioAsset) => ({
          ...a,
          currentValue: Number(a.currentValue),
          expectedReturn: a.expectedReturn != null ? Number(a.expectedReturn) : null,
        })));
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex justify-center py-24">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  if (!profile) return (
    <div className="max-w-xl mx-auto space-y-4 pt-12 text-center">
      <BarChart3 className="h-12 w-12 text-muted-foreground/30 mx-auto" />
      <h2 className="text-xl font-bold">กรอกข้อมูลก่อนเพื่อดู Financial Analysis</h2>
      <p className="text-muted-foreground text-sm">ระบบจะวิเคราะห์สถานะการเงินจากข้อมูลที่คุณกรอกใน My Data</p>
      <Link href="/my-data" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
        <Banknote className="h-4 w-4" />ไปกรอกข้อมูล My Data →
      </Link>
    </div>
  );

  // ── Derived numbers ──────────────────────────────────────────────────────
  const annualIncome  = profile.annualSalary + profile.bonus + profile.otherIncome;
  const monthlyIncome = annualIncome / 12;
  const monthlyFree   = monthlyIncome - profile.monthlyExpenses - profile.monthlyDebtPayment;
  const marginalRate  = getMarginalRate(annualIncome);
  const expenseRatio  = monthlyIncome > 0 ? profile.monthlyExpenses / monthlyIncome : 0;
  const savingsRate   = monthlyIncome > 0 ? Math.max(0, monthlyFree) / monthlyIncome : 0;
  const dti           = monthlyIncome > 0 ? profile.monthlyDebtPayment / monthlyIncome : 0;
  const efMonths      = profile.monthlyExpenses > 0 ? profile.emergencyFundAmount / profile.monthlyExpenses : null;
  const efTarget      = profile.monthlyExpenses * 6;

  // Tax deduction
  const TAX_FUNDS = [
    { label: "RMF",         val: profile.rmfAmount,               cap: Math.min(annualIncome * 0.30, 500_000) },
    { label: "SSF",         val: profile.ssfAmount,               cap: Math.min(annualIncome * 0.30, 200_000) },
    { label: "Thai ESG",    val: profile.thaiEsgAmount,           cap: Math.min(annualIncome * 0.30, 300_000) },
    { label: "LTF",         val: profile.ltfAmount,               cap: Math.min(annualIncome * 0.30, 500_000) },
    { label: "PVD",         val: profile.providentFundAmount,     cap: Math.min(annualIncome * 0.30, 500_000) },
    { label: "ประกันชีวิต", val: profile.lifeInsurancePremium,    cap: 100_000 },
    { label: "ประกันบำนาญ", val: profile.annuityInsurancePremium, cap: 200_000 },
  ];
  const totalTaxInvested = TAX_FUNDS.reduce((s, f) => s + f.val, 0);
  const totalTaxRoom     = TAX_FUNDS.reduce((s, f) => s + Math.max(0, f.cap - f.val), 0);
  const taxSaving        = Math.round(totalTaxRoom * marginalRate);

  // Portfolio
  const TAX_CODES  = ["rmf","ssf","thai_esg","ltf","provident_fund"];
  const persAssets = assets.filter(a => !TAX_CODES.includes(a.assetType ?? ""));
  const taxAssets  = assets.filter(a =>  TAX_CODES.includes(a.assetType ?? ""));
  const persTotal  = persAssets.reduce((s, a) => s + a.currentValue, 0);
  const taxTotal   = taxAssets.reduce((s, a)  => s + a.currentValue, 0);
  const grandTotal = persTotal + taxTotal;

  const portfolioReturn = persTotal > 0
    ? persAssets.reduce((s, a) => s + a.currentValue * (a.expectedReturn ?? 0), 0) / persTotal
    : null;
  const effectiveReturn = portfolioReturn && portfolioReturn > 0 ? portfolioReturn : null;

  const investRatio = annualIncome > 0 ? totalTaxInvested / annualIncome : 0;
  const netWorth    = grandTotal + profile.emergencyFundAmount - profile.totalDebt;

  // Retirement projection
  const yearsToRetire = plan?.currentAge && plan?.retirementAge
    ? Math.max(0, plan.retirementAge - plan.currentAge) : null;
  let retPct: number | null = null;
  let retProjected: number | null = null;
  let retCorpus: number | null = null;
  if (plan?.currentAge && plan?.retirementAge && plan?.monthlyRetirementNeeds && yearsToRetire && yearsToRetire > 0) {
    const ret  = ((plan.expectedReturn ?? effectiveReturn ?? 7)) / 100;
    const pv   = plan.currentSavings ?? 0;
    const pmt  = plan.monthlyInvestable ?? Math.max(0, monthlyFree * 0.7);
    const proj = calcFV(pv, ret, yearsToRetire, pmt);
    const realNeeds = plan.monthlyRetirementNeeds * Math.pow(1.03, yearsToRetire);
    const corpus    = (realNeeds * 12) / 0.04;
    retPct       = corpus > 0 ? Math.min(100, Math.round((proj / corpus) * 100)) : 100;
    retProjected = proj;
    retCorpus    = corpus;
  }

  // Health signals
  const efHealth:  Health = efMonths === null ? "neutral" : efMonths >= 6 ? "good" : efMonths >= 3 ? "warn" : "bad";
  const dtiHealth: Health = dti === 0 ? "good" : dti < 0.30 ? "good" : dti < 0.50 ? "warn" : "bad";
  const savHealth: Health = savingsRate >= 0.20 ? "good" : savingsRate >= 0.10 ? "warn" : "bad";
  const retHealth: Health = retPct === null ? "neutral" : retPct >= 80 ? "good" : retPct >= 50 ? "warn" : "bad";
  const taxHealth: Health = totalTaxRoom < 5_000 ? "good" : totalTaxRoom < 50_000 ? "warn" : "bad";
  const riskLabel = risk?.riskLevel === "conservative" ? "อนุรักษ์นิยม"
    : risk?.riskLevel === "moderate" ? "สมดุล" : risk?.riskLevel === "aggressive" ? "เชิงรุก" : null;

  // Composite score (0–100)
  let score = 0;
  if (efHealth  === "good") score += 25; else if (efHealth  === "warn") score += 12;
  if (dtiHealth === "good") score += 20; else if (dtiHealth === "warn") score += 10;
  if (savHealth === "good") score += 20; else if (savHealth === "warn") score += 10;
  if (investRatio >= 0.15)  score += 15; else if (investRatio > 0) score += 7;
  if (retHealth  === "good") score += 15; else if (retHealth === "warn") score += 7;
  if (risk) score += 5;
  const scoreHealth: Health = score >= 75 ? "good" : score >= 45 ? "warn" : "bad";
  const scoreLabel = score >= 75 ? "สุขภาพการเงินดี" : score >= 45 ? "พอใช้ได้" : "ต้องปรับปรุง";

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Financial Analysis
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            วิเคราะห์สถานะการเงินปัจจุบัน · คำนวณจากข้อมูล My Data
          </p>
        </div>
        <Link href="/my-data" className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0 mt-1">
          อัปเดตข้อมูล <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Score card */}
        <Card className={cn("col-span-2 sm:col-span-1 border", HEALTH_BG[scoreHealth])}>
          <CardContent className="pt-4 pb-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Activity className={cn("h-3.5 w-3.5", HEALTH_COLOR[scoreHealth])} />
              คะแนนสุขภาพ
            </div>
            <div className="flex items-end gap-2">
              <p className={cn("text-3xl font-black tabular-nums leading-none", HEALTH_COLOR[scoreHealth])}>{score}</p>
              <p className="text-muted-foreground text-xs mb-0.5">/100</p>
            </div>
            <p className={cn("text-xs font-semibold", HEALTH_COLOR[scoreHealth])}>{scoreLabel}</p>
            <Progress value={score} className="h-1.5 mt-1" />
          </CardContent>
        </Card>

        <KpiCard icon={Wallet}      label="รายได้สุทธิ/เดือน" value={thb(monthlyIncome)}
          sub={`ปีละ ${thbM(annualIncome)}`} health="neutral" />
        <KpiCard icon={PiggyBank}   label="เงินออมได้/เดือน"   value={thb(Math.max(0, monthlyFree))}
          sub={`${(savingsRate * 100).toFixed(0)}% ของรายได้`}  health={savHealth}
          link={{ href: "/my-data?tab=income", label: "แก้ไข" }} />
        <KpiCard icon={ShieldCheck} label="กองทุนฉุกเฉิน" value={efMonths !== null ? `${efMonths.toFixed(1)} เดือน` : "—"}
          sub={`${thb(profile.emergencyFundAmount)} / เป้า ${thb(efTarget)}`} health={efHealth}
          link={{ href: "/my-data?tab=debts", label: "อัปเดต" }} />
        <KpiCard icon={Scale}       label="DTI (หนี้/รายได้)"  value={`${(dti * 100).toFixed(0)}%`}
          sub="เป้า < 30%" health={dtiHealth} />
        <KpiCard icon={Target}      label="สินทรัพย์สุทธิ"     value={thbM(Math.abs(netWorth))}
          sub={netWorth >= 0 ? `+${thbM(netWorth)} สินทรัพย์ > หนี้` : "ติดลบ — หนี้เกินสินทรัพย์"} health={netWorth >= 0 ? "good" : "bad"} />
      </div>

      {/* ── Tabs ── */}
      <div className="border-b">
        <div className="flex gap-0 overflow-x-auto">
          {([
            { key: "overview",    label: "ภาพรวม",        icon: Activity },
            { key: "cashflow",    label: "กระแสเงินสด",   icon: Banknote },
            { key: "investment",  label: "การลงทุน",       icon: TrendingUp },
            { key: "retirement",  label: "เกษียณ",         icon: Target },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors",
                activeTab === key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/40"
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab: กระแสเงินสด ── */}
      {activeTab === "cashflow" && (
        <div className="grid lg:grid-cols-2 gap-5">
        {/* ── Cash Flow ── */}
        <Card>
          <CardHeader className="pb-1 pt-4">
            <CardTitle className="text-sm">
              <SectionHeader icon={Banknote} title="กระแสเงินสด (Cash Flow)" color="text-blue-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1.5 text-xs font-semibold text-muted-foreground">รายการ</th>
                  <th className="text-right py-1.5 text-xs font-semibold text-muted-foreground">จำนวน/เดือน</th>
                  <th className="text-right py-1.5 text-xs font-semibold text-muted-foreground hidden sm:table-cell">% รายได้</th>
                  <th className="text-right py-1.5 text-xs font-semibold text-muted-foreground">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                <tr>
                  <td className="py-2 text-xs text-muted-foreground">เงินเดือน</td>
                  <td className="py-2 text-xs font-semibold text-right tabular-nums">{thb(profile.annualSalary / 12)}</td>
                  <td className="py-2 text-xs text-right text-muted-foreground hidden sm:table-cell">{pct(profile.annualSalary, annualIncome)}</td>
                  <td className="py-2 text-right"><HealthBadge health="good" /></td>
                </tr>
                {profile.bonus > 0 && (
                  <tr>
                    <td className="py-2 text-xs text-muted-foreground">โบนัส (เฉลี่ย/เดือน)</td>
                    <td className="py-2 text-xs font-medium text-right tabular-nums">{thb(profile.bonus / 12)}</td>
                    <td className="py-2 text-xs text-right text-muted-foreground hidden sm:table-cell">{pct(profile.bonus, annualIncome)}</td>
                    <td className="py-2 text-right"><HealthBadge health="neutral" /></td>
                  </tr>
                )}
                {profile.otherIncome > 0 && (
                  <tr>
                    <td className="py-2 text-xs text-muted-foreground">รายได้อื่น (เฉลี่ย/เดือน)</td>
                    <td className="py-2 text-xs font-medium text-right tabular-nums">{thb(profile.otherIncome / 12)}</td>
                    <td className="py-2 text-xs text-right text-muted-foreground hidden sm:table-cell">{pct(profile.otherIncome, annualIncome)}</td>
                    <td className="py-2 text-right"><HealthBadge health="neutral" /></td>
                  </tr>
                )}
                <tr className="bg-muted/20">
                  <td className="py-2 text-xs font-semibold">รายได้รวม</td>
                  <td className="py-2 text-xs font-bold text-right tabular-nums">{thb(monthlyIncome)}</td>
                  <td className="py-2 text-xs text-right text-muted-foreground hidden sm:table-cell">100%</td>
                  <td className="py-2 text-right"></td>
                </tr>
                <tr>
                  <td className="py-2 text-xs text-muted-foreground">รายจ่าย</td>
                  <td className={cn("py-2 text-xs font-semibold text-right tabular-nums", HEALTH_COLOR[expenseRatio > 0.70 ? "bad" : expenseRatio > 0.50 ? "warn" : "good"])}>
                    {thb(profile.monthlyExpenses)}
                  </td>
                  <td className="py-2 text-xs text-right text-muted-foreground hidden sm:table-cell">{(expenseRatio * 100).toFixed(0)}%</td>
                  <td className="py-2 text-right"><HealthBadge health={expenseRatio > 0.70 ? "bad" : expenseRatio > 0.50 ? "warn" : "good"} /></td>
                </tr>
                <tr>
                  <td className="py-2 text-xs text-muted-foreground">ผ่อนหนี้</td>
                  <td className={cn("py-2 text-xs font-semibold text-right tabular-nums", HEALTH_COLOR[dtiHealth])}>
                    {profile.monthlyDebtPayment > 0 ? thb(profile.monthlyDebtPayment) : "—"}
                  </td>
                  <td className="py-2 text-xs text-right text-muted-foreground hidden sm:table-cell">
                    {profile.monthlyDebtPayment > 0 ? `${(dti * 100).toFixed(0)}%` : "0%"}
                  </td>
                  <td className="py-2 text-right"><HealthBadge health={dtiHealth} /></td>
                </tr>
                <tr className={cn("border-t-2", HEALTH_BG[savHealth])}>
                  <td className="py-2.5 text-xs font-bold">เงินคงเหลือ / ออม</td>
                  <td className={cn("py-2.5 text-sm font-black text-right tabular-nums", HEALTH_COLOR[savHealth])}>
                    {monthlyFree >= 0 ? thb(monthlyFree) : `−${thb(-monthlyFree)}`}
                  </td>
                  <td className={cn("py-2.5 text-xs font-semibold text-right hidden sm:table-cell", HEALTH_COLOR[savHealth])}>
                    {(savingsRate * 100).toFixed(0)}%{savingsRate >= 0.20 ? " 🎯" : ""}
                  </td>
                  <td className="py-2.5 text-right"><HealthBadge health={savHealth} /></td>
                </tr>
              </tbody>
            </table>
            {/* stacked bar */}
            {monthlyIncome > 0 && (
              <div className="mt-3 pt-2 border-t space-y-1">
                <div className="h-2.5 rounded-full overflow-hidden flex bg-muted">
                  {[
                    { v: profile.monthlyExpenses,    color: "bg-red-400" },
                    { v: profile.monthlyDebtPayment, color: "bg-orange-400" },
                    { v: Math.max(0, monthlyFree),   color: "bg-emerald-400" },
                  ].map((item, i) => item.v > 0 ? (
                    <div key={i} className={cn("h-full", item.color)} style={{ width: `${(item.v / monthlyIncome) * 100}%` }} />
                  ) : null)}
                </div>
                <div className="flex gap-3 flex-wrap">
                  {[["รายจ่าย","bg-red-400"],["ผ่อนหนี้","bg-orange-400"],["ออม","bg-emerald-400"]].map(([l,c]) => (
                    <span key={l} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <span className={cn("inline-block w-2 h-2 rounded-sm", c)} />{l}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Debt & Emergency ── */}
        <Card>
          <CardHeader className="pb-1 pt-4">
            <CardTitle className="text-sm">
              <SectionHeader icon={AlertTriangle} title="ภาระหนี้ & เงินสำรอง" color="text-amber-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1.5 text-xs font-semibold text-muted-foreground">รายการ</th>
                  <th className="text-right py-1.5 text-xs font-semibold text-muted-foreground">ค่า</th>
                  <th className="text-right py-1.5 text-xs font-semibold text-muted-foreground hidden sm:table-cell">เป้าหมาย</th>
                  <th className="text-right py-1.5 text-xs font-semibold text-muted-foreground">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                <tr>
                  <td className="py-2 text-xs text-muted-foreground">กองทุนฉุกเฉิน</td>
                  <td className={cn("py-2 text-xs font-semibold text-right tabular-nums", HEALTH_COLOR[efHealth])}>
                    {thb(profile.emergencyFundAmount)}
                  </td>
                  <td className="py-2 text-xs text-muted-foreground text-right hidden sm:table-cell">
                    {efMonths !== null ? `${efMonths.toFixed(1)}/6 เดือน` : "—"}
                  </td>
                  <td className="py-2 text-right"><HealthBadge health={efHealth} /></td>
                </tr>
                <tr>
                  <td className="py-2 text-xs text-muted-foreground">เป้าหมายสำรอง (6 เดือน)</td>
                  <td className="py-2 text-xs font-medium text-right tabular-nums text-muted-foreground">{thb(efTarget)}</td>
                  <td className="py-2 text-xs text-muted-foreground text-right hidden sm:table-cell">
                    {efMonths !== null
                      ? <div className="inline-flex w-20 h-1.5 bg-muted rounded-full overflow-hidden ml-auto">
                          <div className={cn("h-full rounded-full", efHealth === "good" ? "bg-emerald-500" : efHealth === "warn" ? "bg-amber-400" : "bg-red-400")}
                            style={{ width: `${Math.min(100, ((efMonths ?? 0) / 6) * 100)}%` }} />
                        </div>
                      : null}
                  </td>
                  <td className="py-2 text-right"></td>
                </tr>
                <tr>
                  <td className="py-2 text-xs text-muted-foreground">หนี้สินรวม</td>
                  <td className={cn("py-2 text-xs font-semibold text-right tabular-nums",
                    HEALTH_COLOR[profile.totalDebt === 0 ? "good" : profile.totalDebt > annualIncome * 3 ? "bad" : "warn"])}>
                    {profile.totalDebt > 0 ? thb(profile.totalDebt) : "ไม่มีหนี้ ✓"}
                  </td>
                  <td className="py-2 text-xs text-muted-foreground text-right hidden sm:table-cell">
                    {profile.totalDebt > 0 ? `< ${thbM(annualIncome * 3)}` : ""}
                  </td>
                  <td className="py-2 text-right">
                    <HealthBadge health={profile.totalDebt === 0 ? "good" : profile.totalDebt > annualIncome * 3 ? "bad" : "warn"} />
                  </td>
                </tr>
                {profile.debtInterestRate > 0 && (
                  <tr>
                    <td className="py-2 text-xs text-muted-foreground">ดอกเบี้ยหนี้</td>
                    <td className="py-2 text-xs font-medium text-right tabular-nums">{profile.debtInterestRate.toFixed(1)}%/ปี</td>
                    <td className="py-2 text-xs text-muted-foreground text-right hidden sm:table-cell">
                      ≈ {thb(profile.totalDebt * profile.debtInterestRate / 100)}/ปี
                    </td>
                    <td className="py-2 text-right">
                      <HealthBadge health={effectiveReturn ? (effectiveReturn > profile.debtInterestRate ? "good" : "bad") : "warn"} />
                    </td>
                  </tr>
                )}
                <tr>
                  <td className="py-2 text-xs text-muted-foreground">DTI (ผ่อน/รายได้)</td>
                  <td className={cn("py-2 text-xs font-semibold text-right tabular-nums", HEALTH_COLOR[dtiHealth])}>
                    {dti > 0 ? `${(dti * 100).toFixed(1)}%` : "0% ✓"}
                  </td>
                  <td className="py-2 text-xs text-muted-foreground text-right hidden sm:table-cell">{"< 30%"}</td>
                  <td className="py-2 text-right"><HealthBadge health={dtiHealth} /></td>
                </tr>
                {profile.totalDebt > 0 && profile.monthlyDebtPayment > 0 && (
                  <tr>
                    <td className="py-2 text-xs text-muted-foreground">คาดปลดหนี้ (ประมาณ)</td>
                    <td className="py-2 text-xs font-medium text-right tabular-nums text-muted-foreground">
                      {(() => { const mo = Math.ceil(profile.totalDebt / profile.monthlyDebtPayment); return mo <= 120 ? `${mo} เดือน` : `${(mo/12).toFixed(0)} ปี`; })()}
                    </td>
                    <td className="py-2 text-xs text-muted-foreground text-right hidden sm:table-cell">ไม่รวมดอกเบี้ย</td>
                    <td className="py-2 text-right"><HealthBadge health="neutral" /></td>
                  </tr>
                )}
              </tbody>
            </table>
            {effectiveReturn !== null && profile.debtInterestRate > 0 && (
              <div className={cn(
                "mt-3 rounded-lg px-3 py-2 text-xs font-medium border flex items-center gap-2",
                effectiveReturn > profile.debtInterestRate
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-red-50 border-red-200 text-red-600"
              )}>
                {effectiveReturn > profile.debtInterestRate
                  ? <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                  : <TrendingDown className="h-3.5 w-3.5 shrink-0" />}
                {effectiveReturn > profile.debtInterestRate
                  ? `ผลตอบแทนพอร์ต ${effectiveReturn.toFixed(1)}% > ดอกเบี้ยหนี้ ${profile.debtInterestRate.toFixed(1)}% — การลงทุนคุ้มค่ากว่า`
                  : `ดอกเบี้ยหนี้ ${profile.debtInterestRate.toFixed(1)}% > ผลตอบแทน ${effectiveReturn.toFixed(1)}% — ควรเน้นปิดหนี้ก่อน`}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      )}

      {/* ── Tab: การลงทุน ── */}
      {activeTab === "investment" && (
        <div className="grid lg:grid-cols-2 gap-5">
        {/* ── Portfolio / Investment ── */}
        <Card>
          <CardHeader className="pb-1 pt-4">
            <CardTitle className="text-sm">
              <SectionHeader icon={TrendingUp} title="การลงทุน & พอร์ตโฟลิโอ" color="text-emerald-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1.5 text-xs font-semibold text-muted-foreground">รายการ</th>
                  <th className="text-right py-1.5 text-xs font-semibold text-muted-foreground">มูลค่า</th>
                  <th className="text-right py-1.5 text-xs font-semibold text-muted-foreground hidden sm:table-cell">สัดส่วน</th>
                  <th className="text-right py-1.5 text-xs font-semibold text-muted-foreground">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {grandTotal > 0 ? (
                  <>
                    {persTotal > 0 && (
                      <tr>
                        <td className="py-2 text-xs text-muted-foreground">พอร์ตส่วนตัว</td>
                        <td className="py-2 text-xs font-semibold text-right tabular-nums">{thbM(persTotal)}</td>
                        <td className="py-2 text-xs text-right text-muted-foreground hidden sm:table-cell">{pct(persTotal, grandTotal)}</td>
                        <td className="py-2 text-right"><HealthBadge health="neutral" /></td>
                      </tr>
                    )}
                    {taxTotal > 0 && (
                      <tr>
                        <td className="py-2 text-xs text-muted-foreground">กองทุนภาษี (NAV)</td>
                        <td className="py-2 text-xs font-semibold text-right tabular-nums">{thbM(taxTotal)}</td>
                        <td className="py-2 text-xs text-right text-muted-foreground hidden sm:table-cell">{pct(taxTotal, grandTotal)}</td>
                        <td className="py-2 text-right"><HealthBadge health="neutral" /></td>
                      </tr>
                    )}
                    <tr className="bg-muted/20">
                      <td className="py-2 text-xs font-bold">พอร์ตรวม</td>
                      <td className="py-2 text-sm font-black text-right tabular-nums text-emerald-600">{thbM(grandTotal)}</td>
                      <td className="py-2 text-xs text-right text-muted-foreground hidden sm:table-cell">100%</td>
                      <td className="py-2 text-right"></td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td colSpan={4} className="py-3 text-xs text-center text-muted-foreground">
                      ยังไม่มีข้อมูลสินทรัพย์ —{" "}
                      <Link href="/my-data" className="text-primary hover:underline">เพิ่มข้อมูล</Link>
                    </td>
                  </tr>
                )}
                {effectiveReturn !== null && (
                  <tr>
                    <td className="py-2 text-xs text-muted-foreground">ผลตอบแทนพอร์ตเฉลี่ย</td>
                    <td className="py-2 text-xs font-semibold text-right tabular-nums text-emerald-600">~{effectiveReturn.toFixed(1)}%/ปี</td>
                    <td className="py-2 text-xs text-right text-muted-foreground hidden sm:table-cell">weighted avg</td>
                    <td className="py-2 text-right"><HealthBadge health="good" /></td>
                  </tr>
                )}
                <tr>
                  <td className="py-2 text-xs text-muted-foreground">ลงทุนกองทุนภาษี/ปี</td>
                  <td className={cn("py-2 text-xs font-semibold text-right tabular-nums",
                    HEALTH_COLOR[investRatio >= 0.15 ? "good" : investRatio > 0 ? "warn" : "neutral"])}>
                    {thb(totalTaxInvested)}
                  </td>
                  <td className="py-2 text-xs text-right text-muted-foreground hidden sm:table-cell">
                    {(investRatio * 100).toFixed(0)}% / เป้า 15%
                  </td>
                  <td className="py-2 text-right">
                    <HealthBadge health={investRatio >= 0.15 ? "good" : investRatio > 0 ? "warn" : "neutral"} />
                  </td>
                </tr>
                {riskLabel && (
                  <tr>
                    <td className="py-2 text-xs text-muted-foreground">ระดับความเสี่ยง</td>
                    <td className="py-2 text-xs font-medium text-right">{riskLabel}</td>
                    <td className="py-2 text-xs text-right text-muted-foreground hidden sm:table-cell">
                      {risk?.riskLevel === "conservative" ? "หนี้ 70% / หุ้น 30%"
                        : risk?.riskLevel === "moderate" ? "หุ้น 50% / หนี้ 35%"
                        : "หุ้น 80% / ทางเลือก 20%"}
                    </td>
                    <td className="py-2 text-right"><HealthBadge health="neutral" /></td>
                  </tr>
                )}
              </tbody>
            </table>
            {assets.length > 0 && (
              <div className="mt-3 pt-2 border-t">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  สินทรัพย์ (top {Math.min(assets.length, 5)})
                </p>
                <table className="w-full">
                  <tbody className="divide-y divide-border/40">
                    {assets.slice(0, 5).map(a => (
                      <tr key={a.id}>
                        <td className="py-1 text-xs text-muted-foreground truncate max-w-0">{a.assetType ?? "—"}</td>
                        <td className="py-1 text-xs font-medium text-right tabular-nums shrink-0">{thbM(a.currentValue)}</td>
                        <td className="py-1 text-xs text-right text-muted-foreground shrink-0 pl-2 hidden sm:table-cell">
                          {grandTotal > 0 ? pct(a.currentValue, grandTotal) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {assets.length > 5 && (
                  <Link href="/my-data" className="text-[10px] text-primary hover:underline mt-1 block">
                    ดูทั้งหมด {assets.length} รายการ →
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Tax Deduction ── */}
        <Card>
          <CardHeader className="pb-1 pt-4">
            <CardTitle className="text-sm">
              <SectionHeader icon={CheckCircle2} title="การลดหย่อนภาษี" color="text-violet-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1.5 text-xs font-semibold text-muted-foreground">สิทธิ์ลดหย่อน</th>
                  <th className="text-right py-1.5 text-xs font-semibold text-muted-foreground">ใช้แล้ว</th>
                  <th className="text-right py-1.5 text-xs font-semibold text-muted-foreground hidden sm:table-cell">วงเงิน</th>
                  <th className="text-right py-1.5 text-xs font-semibold text-muted-foreground">% ใช้</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {TAX_FUNDS.map(f => {
                  const fpct = f.cap > 0 ? Math.min(100, (f.val / f.cap) * 100) : 0;
                  const fh: Health = fpct >= 100 ? "good" : fpct > 0 ? "warn" : "neutral";
                  return (
                    <tr key={f.label}>
                      <td className="py-2 text-xs text-muted-foreground">{f.label}</td>
                      <td className={cn("py-2 text-xs font-medium text-right tabular-nums", fpct > 0 ? "text-foreground" : "text-muted-foreground/50")}>
                        {f.val > 0 ? thb(f.val) : "—"}
                      </td>
                      <td className="py-2 text-xs text-right text-muted-foreground hidden sm:table-cell">{thb(f.cap)}</td>
                      <td className="py-2 text-right">
                        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", HEALTH_BG[fh], HEALTH_COLOR[fh])}>
                          {fpct.toFixed(0)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/20">
                  <td className="py-2.5 text-xs font-bold">รวม</td>
                  <td className={cn("py-2.5 text-xs font-bold text-right tabular-nums", HEALTH_COLOR[taxHealth])}>
                    {thb(totalTaxInvested)}
                  </td>
                  <td className="py-2.5 text-xs text-right text-muted-foreground hidden sm:table-cell">
                    {totalTaxRoom > 0 ? `เหลือ ${thb(totalTaxRoom)}` : "ใช้ครบแล้ว ✓"}
                  </td>
                  <td className="py-2.5 text-right"><HealthBadge health={taxHealth} /></td>
                </tr>
              </tfoot>
            </table>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Marginal rate: <span className="font-semibold text-foreground">{(marginalRate * 100).toFixed(0)}%</span>
                {totalTaxRoom > 0 && marginalRate > 0 && (
                  <> · ประหยัดได้อีก <span className="font-semibold text-violet-600">{thb(taxSaving)}/ปี</span></>
                )}
              </p>
              <Link href="/tax" className="text-xs text-primary hover:underline flex items-center gap-0.5">
                คำนวณภาษี <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
      )}

      {/* ── Tab: เกษียณ ── */}
      {activeTab === "retirement" && (
        <div className="space-y-5">
      {/* ── Retirement Projection ── */}
      <Card>
        <CardHeader className="pb-1 pt-4">
          <CardTitle className="text-sm flex items-center justify-between">
            <SectionHeader icon={Target} title="การฉายภาพเกษียณ (Retirement Projection)" color="text-indigo-600" />
            <Link href="/goals" className="text-xs text-primary hover:underline -mt-3">แก้ไขข้อมูล</Link>
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          {plan?.currentAge ? (
            <div className="space-y-4">
              {/* Main retirement table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 text-xs font-semibold text-muted-foreground w-[40%]">รายการ</th>
                      <th className="text-right py-2 text-xs font-semibold text-muted-foreground">ข้อมูล</th>
                      <th className="text-right py-2 text-xs font-semibold text-muted-foreground">หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    <tr>
                      <td className="py-2.5 text-xs text-muted-foreground">อายุปัจจุบัน</td>
                      <td className="py-2.5 text-xs font-medium text-right tabular-nums">{plan.currentAge} ปี</td>
                      <td className="py-2.5 text-xs text-muted-foreground text-right"></td>
                    </tr>
                    <tr>
                      <td className="py-2.5 text-xs text-muted-foreground">อายุเกษียณเป้า</td>
                      <td className="py-2.5 text-xs font-medium text-right tabular-nums">{plan.retirementAge} ปี</td>
                      <td className="py-2.5 text-xs text-muted-foreground text-right">
                        {yearsToRetire !== null ? `อีก ${yearsToRetire} ปี` : ""}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 text-xs text-muted-foreground">ค่าใช้จ่ายหลังเกษียณ</td>
                      <td className="py-2.5 text-xs font-medium text-right tabular-nums">
                        {plan.monthlyRetirementNeeds ? thb(plan.monthlyRetirementNeeds) + "/เดือน" : "—"}
                      </td>
                      <td className="py-2.5 text-xs text-muted-foreground text-right">
                        {yearsToRetire && plan.monthlyRetirementNeeds
                          ? `ปรับเงินเฟ้อ 3%: ${thb(Math.round(plan.monthlyRetirementNeeds * Math.pow(1.03, yearsToRetire)))}/เดือน`
                          : ""}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 text-xs text-muted-foreground">ผลตอบแทนที่คาดหวัง</td>
                      <td className="py-2.5 text-xs font-medium text-right tabular-nums">
                        {plan.expectedReturn ?? effectiveReturn ?? 7}%/ปี
                      </td>
                      <td className="py-2.5 text-xs text-muted-foreground text-right">
                        {effectiveReturn ? "จาก Portfolio" : "ค่าเริ่มต้น"}
                      </td>
                    </tr>
                    {retCorpus !== null && (
                      <tr>
                        <td className="py-2.5 text-xs text-muted-foreground">เงินที่ต้องการ (4% Rule)</td>
                        <td className="py-2.5 text-xs font-semibold text-right tabular-nums text-indigo-600">{thbM(retCorpus)}</td>
                        <td className="py-2.5 text-xs text-muted-foreground text-right">corpus เป้าหมาย</td>
                      </tr>
                    )}
                    {retProjected !== null && (
                      <tr>
                        <td className="py-2.5 text-xs text-muted-foreground">คาดการณ์ ณ วันนี้</td>
                        <td className={cn("py-2.5 text-xs font-semibold text-right tabular-nums", HEALTH_COLOR[retHealth])}>
                          {thbM(retProjected)}
                        </td>
                        <td className="py-2.5 text-right">
                          <span className={cn("text-xs font-bold", HEALTH_COLOR[retHealth])}>{retPct}% ของเป้า</span>
                        </td>
                      </tr>
                    )}
                    {retCorpus !== null && retProjected !== null && (
                      <tr className="bg-muted/30">
                        <td className="py-2.5 text-xs font-semibold">
                          {retProjected >= retCorpus ? "เกินเป้าหมาย" : "ยังขาดอีก"}
                        </td>
                        <td className={cn("py-2.5 text-sm font-bold text-right tabular-nums",
                          retProjected >= retCorpus ? "text-emerald-600" : "text-red-600")}>
                          {thbM(Math.abs(retCorpus - retProjected))}
                        </td>
                        <td className="py-2.5 text-xs text-muted-foreground text-right">
                          {retProjected >= retCorpus ? "✓ อยู่ในเส้นทาง" : "ต้องเพิ่มการออม"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {/* Progress bar */}
              {retPct !== null && (
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground font-medium">ความคืบหน้าสู่เป้าหมายเกษียณ</span>
                    <span className={cn("font-bold", HEALTH_COLOR[retHealth])}>{retPct}%</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all",
                      retHealth === "good" ? "bg-emerald-500" : retHealth === "warn" ? "bg-amber-400" : "bg-red-400"
                    )} style={{ width: `${retPct}%` }} />
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    {retHealth === "good"
                      ? <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /><span className="text-xs text-emerald-700 font-medium">อยู่ในเส้นทาง ✓</span></>
                      : retHealth === "warn"
                      ? <><AlertCircle className="h-3.5 w-3.5 text-amber-500" /><span className="text-xs text-amber-700 font-medium">ต้องเพิ่มการออมเพื่อถึงเป้า</span></>
                      : <><AlertTriangle className="h-3.5 w-3.5 text-red-500" /><span className="text-xs text-red-600 font-medium">ขาดมาก — ควรทบทวนแผนด่วน</span></>}
                  </div>
                </div>
              )}
              {/* FIRE Scenarios */}
              {yearsToRetire !== null && yearsToRetire > 0 && plan.monthlyRetirementNeeds && (
                <div className="pt-3 border-t">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Flame className="h-3.5 w-3.5 text-orange-500" />
                    FIRE Scenarios — 3 สถานการณ์ผลตอบแทน
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-1.5 text-xs font-semibold text-muted-foreground">สถานการณ์</th>
                          <th className="text-right py-1.5 text-xs font-semibold text-muted-foreground">ผลตอบแทน</th>
                          <th className="text-right py-1.5 text-xs font-semibold text-muted-foreground hidden sm:table-cell">เงินที่ต้องการ</th>
                          <th className="text-right py-1.5 text-xs font-semibold text-muted-foreground">คาดการณ์</th>
                          <th className="text-right py-1.5 text-xs font-semibold text-muted-foreground">สถานะ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {([
                          { label: "ระมัดระวัง", rate: 5,  emoji: "🛡️" },
                          { label: "ฐาน",        rate: Number(plan.expectedReturn ?? effectiveReturn ?? 7), emoji: "⚖️" },
                          { label: "เชิงรุก",    rate: 10, emoji: "🚀" },
                        ]).map(({ label, rate, emoji }) => {
                          const pv2   = plan.currentSavings ?? 0;
                          const pmt2  = plan.monthlyInvestable ?? Math.max(0, monthlyFree * 0.7);
                          const proj2 = calcFV(pv2, rate / 100, yearsToRetire!, pmt2);
                          const rn2   = plan.monthlyRetirementNeeds! * Math.pow(1.03, yearsToRetire!);
                          const c2    = (rn2 * 12) / 0.04;
                          const p2    = c2 > 0 ? Math.min(100, Math.round((proj2 / c2) * 100)) : 100;
                          const h2: Health = p2 >= 80 ? "good" : p2 >= 50 ? "warn" : "bad";
                          return (
                            <tr key={label}>
                              <td className="py-2 text-xs font-medium">{emoji} {label}</td>
                              <td className="py-2 text-xs text-right text-muted-foreground tabular-nums">{rate}%/ปี</td>
                              <td className="py-2 text-xs text-right tabular-nums hidden sm:table-cell">{thbM(c2)}</td>
                              <td className={cn("py-2 text-xs text-right font-semibold tabular-nums", HEALTH_COLOR[h2])}>{thbM(proj2)}</td>
                              <td className="py-2 text-right">
                                <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold", HEALTH_BG[h2], HEALTH_COLOR[h2])}>
                                  {p2}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 py-2">
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
              <div>
                <p className="text-sm font-medium">ยังไม่มีข้อมูลแผนเกษียณ</p>
                <Link href="/goals" className="text-xs text-primary hover:underline">กรอกข้อมูลเกษียณ →</Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      </div>
      )}

      {/* ── Tab: ภาพรวม ── */}
      {activeTab === "overview" && (
        <div className="space-y-5">
      {/* ── Summary Health Scorecard ── */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-1 pt-4">
          <CardTitle className="text-sm">
            <SectionHeader icon={Activity} title="สรุป Financial Health Scorecard" />
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-xs font-semibold text-muted-foreground">ตัวชี้วัด</th>
                  <th className="text-right py-2 text-xs font-semibold text-muted-foreground">ค่าปัจจุบัน</th>
                  <th className="text-right py-2 text-xs font-semibold text-muted-foreground hidden sm:table-cell">เป้าหมาย</th>
                  <th className="text-right py-2 text-xs font-semibold text-muted-foreground">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {([
                  { label: "กองทุนฉุกเฉิน",        current: efMonths !== null ? `${efMonths.toFixed(1)} เดือน` : "ไม่มีข้อมูล", target: "≥ 6 เดือน", health: efHealth },
                  { label: "อัตราการออม",           current: `${(savingsRate * 100).toFixed(0)}%`, target: "≥ 20%", health: savHealth },
                  { label: "ภาระหนี้ (DTI)",        current: `${(dti * 100).toFixed(0)}%`, target: "< 30%", health: dtiHealth },
                  { label: "ลงทุน/รายได้ต่อปี",    current: `${(investRatio * 100).toFixed(0)}%`, target: "≥ 15%", health: (investRatio >= 0.15 ? "good" : investRatio > 0 ? "warn" : "bad") as Health },
                  { label: "ใช้สิทธิ์ลดหย่อนภาษี", current: totalTaxRoom < 5_000 ? "ใช้ครบแล้ว ✓" : `เหลือ ${thb(totalTaxRoom)}`, target: "ใช้สูงสุด", health: taxHealth },
                  { label: "ความพร้อมเกษียณ",       current: retPct !== null ? `${retPct}%` : "ยังไม่กำหนด", target: "≥ 80%", health: retHealth },
                ] as { label: string; current: string; target: string; health: Health }[]).map(row => (
                  <tr key={row.label} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 text-xs font-medium">{row.label}</td>
                    <td className={cn("py-2.5 text-xs font-semibold text-right tabular-nums", HEALTH_COLOR[row.health])}>{row.current}</td>
                    <td className="py-2.5 text-xs text-muted-foreground text-right hidden sm:table-cell">{row.target}</td>
                    <td className="py-2.5 text-right"><HealthBadge health={row.health} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/20">
                  <td colSpan={2} className="py-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Activity className={cn("h-4 w-4", HEALTH_COLOR[scoreHealth])} />
                      <span className="font-semibold">คะแนนรวม:</span>
                      <span className={cn("font-black text-base leading-none", HEALTH_COLOR[scoreHealth])}>{score}</span>
                      <span className="text-muted-foreground">/100 — {scoreLabel}</span>
                    </div>
                  </td>
                  <td colSpan={2} className="py-3 text-right">
                    <Progress value={score} className="h-2.5 w-32 ml-auto" />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Budget Allocation 50/30/20 ── */}
      <Card>
        <CardHeader className="pb-1 pt-4">
          <CardTitle className="text-sm">
            <SectionHeader icon={PiggyBank} title="การจัดสรรงบประมาณ vs หลัก 50/30/20" color="text-teal-600" />
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          {(() => {
            const savingsAmt = Math.max(0, monthlyFree);
            const needsPct  = monthlyIncome > 0 ? (profile.monthlyExpenses / monthlyIncome) * 100 : 0;
            const debtPct   = monthlyIncome > 0 ? (profile.monthlyDebtPayment / monthlyIncome) * 100 : 0;
            const savPct    = monthlyIncome > 0 ? (savingsAmt / monthlyIncome) * 100 : 0;
            const rows = [
              { label: "รายจ่ายประจำ (Needs)", actual: needsPct, ideal: 50, value: profile.monthlyExpenses,    color: "bg-blue-500" },
              { label: "ชำระหนี้ (Debt)",       actual: debtPct,  ideal: 0,  value: profile.monthlyDebtPayment, color: "bg-orange-400" },
              { label: "ออม & ลงทุน (Savings)", actual: savPct,   ideal: 20, value: savingsAmt,                 color: "bg-emerald-500" },
            ];
            return (
              <div className="space-y-3">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 text-xs font-semibold text-muted-foreground w-[35%]">หมวด</th>
                        <th className="text-right py-2 text-xs font-semibold text-muted-foreground">สัดส่วนจริง</th>
                        <th className="text-right py-2 text-xs font-semibold text-muted-foreground hidden sm:table-cell">เป้าหมาย</th>
                        <th className="text-right py-2 text-xs font-semibold text-muted-foreground">จำนวนเงิน</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {rows.map(r => (
                        <tr key={r.label}>
                          <td className="py-2.5 text-xs font-medium">{r.label}</td>
                          <td className={cn("py-2.5 text-xs font-bold text-right tabular-nums",
                            r.label.includes("ออม")
                              ? (r.actual >= 20 ? "text-emerald-600" : r.actual >= 10 ? "text-amber-600" : "text-red-600")
                              : "text-foreground"
                          )}>{r.actual.toFixed(0)}%</td>
                          <td className="py-2.5 text-xs text-muted-foreground text-right hidden sm:table-cell">{r.ideal > 0 ? `${r.ideal}%` : "—"}</td>
                          <td className="py-2.5 text-xs text-right tabular-nums text-muted-foreground">{thb(r.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Stacked bar */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">การกระจายรายได้</p>
                  <div className="h-4 rounded-full overflow-hidden flex bg-muted">
                    {rows.map(r =>
                      r.actual > 0 ? (
                        <div key={r.label}
                          className={cn("h-full transition-all", r.color)}
                          style={{ width: `${Math.min(100, r.actual)}%` }}
                          title={`${r.label}: ${r.actual.toFixed(0)}%`}
                        />
                      ) : null
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {rows.map(r => (
                      <span key={r.label} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <span className={cn("inline-block w-2 h-2 rounded-sm", r.color)} />
                        {r.label} ({r.actual.toFixed(0)}%)
                      </span>
                    ))}
                  </div>
                  {savPct < 20 && (
                    <p className="text-[11px] text-amber-600 font-medium pt-0.5">
                      💡 เพิ่มการออมอีก {(20 - savPct).toFixed(0)}% ({thb(monthlyIncome * (20 - savPct) / 100)}/เดือน) เพื่อถึงเป้า 20%
                    </p>
                  )}
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* ── Wealth Growth Timeline ── */}
      {(grandTotal > 0 || (plan?.currentSavings ?? 0) > 0) && (
        <Card>
          <CardHeader className="pb-1 pt-4">
            <CardTitle className="text-sm">
              <SectionHeader icon={TrendingUp} title="การเติบโตของความมั่งคั่ง (Wealth Timeline)" color="text-emerald-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {(() => {
              const startPV = plan?.currentSavings ?? grandTotal;
              const monthly = plan?.monthlyInvestable ?? Math.max(0, monthlyFree * 0.7);
              const rate    = (plan?.expectedReturn ?? effectiveReturn ?? 7) / 100;
              const allMilestones = [1, 3, 5, 10, 15, 20, 25, 30];
              const milestones = allMilestones.filter(y =>
                yearsToRetire === null || y <= yearsToRetire + 1
              ).slice(0, 7);
              return (
                <div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 text-xs font-semibold text-muted-foreground">ช่วงเวลา</th>
                          {plan?.currentAge && <th className="text-right py-2 text-xs font-semibold text-muted-foreground hidden sm:table-cell">อายุ</th>}
                          <th className="text-right py-2 text-xs font-semibold text-muted-foreground">คาดการณ์สินทรัพย์</th>
                          <th className="text-right py-2 text-xs font-semibold text-muted-foreground hidden md:table-cell">เติบโต</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        <tr className="bg-muted/20">
                          <td className="py-2.5 text-xs font-semibold text-muted-foreground">ปัจจุบัน</td>
                          {plan?.currentAge && <td className="py-2.5 text-xs text-right text-muted-foreground hidden sm:table-cell">{plan.currentAge} ปี</td>}
                          <td className="py-2.5 text-xs font-bold text-right tabular-nums">{thbM(startPV)}</td>
                          <td className="py-2.5 text-xs text-right text-muted-foreground hidden md:table-cell">—</td>
                        </tr>
                        {milestones.map(y => {
                          const proj = calcFV(startPV, rate, y, monthly);
                          const growPct = startPV > 0 ? ((proj / startPV - 1) * 100).toFixed(0) : null;
                          const isRetYear = yearsToRetire !== null && y === yearsToRetire;
                          return (
                            <tr key={y} className={cn(isRetYear ? "bg-indigo-50/50" : "")}>
                              <td className={cn("py-2.5 text-xs", isRetYear ? "font-semibold" : "")}>
                                {isRetYear ? "🏁 " : ""}อีก {y} ปี{isRetYear ? " (เกษียณ)" : ""}
                              </td>
                              {plan?.currentAge && (
                                <td className="py-2.5 text-xs text-right text-muted-foreground hidden sm:table-cell">
                                  {plan.currentAge + y} ปี
                                </td>
                              )}
                              <td className={cn("py-2.5 text-xs text-right font-semibold tabular-nums",
                                isRetYear ? "text-indigo-600" : retCorpus && proj >= retCorpus ? "text-emerald-600" : "text-foreground"
                              )}>
                                {thbM(proj)}
                              </td>
                              <td className="py-2.5 text-xs text-right text-emerald-600 hidden md:table-cell">
                                {growPct ? `+${growPct}%` : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-3">
                    * คำนวณจากสินทรัพย์ {thbM(startPV)} + ออม {thb(monthly)}/เดือน ที่ผลตอบแทน {plan?.expectedReturn ?? effectiveReturn ?? 7}%/ปี (ทบต้น)
                  </p>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}
      </div>
      )}
    </div>
  );
}
