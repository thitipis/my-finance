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
  taxRefundAmount: number; dividendIncome: number;
  monthlyExpenses: number; monthlyDebtPayment: number; totalDebt: number;
  debtInterestRate: number;
  emergencyFundAmount: number;
  rmfAmount: number; ssfAmount: number; thaiEsgAmount: number;
  ltfAmount: number; providentFundAmount: number;
  lifeInsurancePremium: number; healthInsurancePremium: number;
  annuityInsurancePremium: number; withheldTax: number;
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

const ASSET_LABEL: Record<string, string> = {
  thai_stock: "หุ้นไทย",
  thai_reit:  "REITs ไทย",
  thai_fund:  "กองทุนไทย",
  us_etf:     "US ETF",
  us_stock:   "หุ้น US",
  gold:       "ทองคำ",
  crypto:     "Crypto",
};

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
  const [risk,    setRisk]    = useState<RiskData | null>(null);
  const [assets,  setAssets]  = useState<PortfolioAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview"|"cashflow"|"investment">("overview");
  // no mode toggle — FA shows current state only


  useEffect(() => {
    Promise.all([
      fetch("/api/user/financial-profile").then(r => r.json()),
      fetch("/api/user/risk-assessment").then(r => r.json()),
      fetch("/api/user/portfolio-assets").then(r => r.json()),
    ]).then(([profRes, riskRes, portRes]) => {
      if (profRes.data) {
        const d = profRes.data;
        setProfile({
          annualSalary: Number(d.annualSalary ?? 0), bonus: Number(d.bonus ?? 0), otherIncome: Number(d.otherIncome ?? 0),
          taxRefundAmount: Number(d.taxRefundAmount ?? 0), dividendIncome: Number(d.dividendIncome ?? 0),
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
  const annualIncome  = profile.annualSalary + profile.bonus + profile.otherIncome + profile.dividendIncome + profile.taxRefundAmount;
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

  // Health signals
  const efHealth:  Health = efMonths === null ? "neutral" : efMonths >= 6 ? "good" : efMonths >= 3 ? "warn" : "bad";
  const dtiHealth: Health = dti === 0 ? "good" : dti < 0.30 ? "good" : dti < 0.50 ? "warn" : "bad";
  const savHealth: Health = savingsRate >= 0.20 ? "good" : savingsRate >= 0.10 ? "warn" : "bad";
  const taxHealth: Health = totalTaxRoom < 5_000 ? "good" : totalTaxRoom < 50_000 ? "warn" : "bad";
  const riskLabel = risk?.riskLevel === "conservative" ? "อนุรักษ์นิยม"
    : risk?.riskLevel === "moderate" ? "สมดุล" : risk?.riskLevel === "aggressive" ? "เชิงรุก" : null;

  // Composite score (0–100)
  let score = 0;
  if (efHealth  === "good") score += 30; else if (efHealth  === "warn") score += 15;
  if (dtiHealth === "good") score += 25; else if (dtiHealth === "warn") score += 12;
  if (savHealth === "good") score += 25; else if (savHealth === "warn") score += 12;
  if (investRatio >= 0.15)  score += 15; else if (investRatio > 0) score += 7;
  if (risk) score += 5;
  const scoreHealth: Health = score >= 75 ? "good" : score >= 45 ? "warn" : "bad";
  const scoreLabel = score >= 75 ? "สุขภาพการเงินดี" : score >= 45 ? "พอใช้ได้" : "ต้องปรับปรุง";

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />Financial Analysis
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">วิเคราะห์สถานะการเงินปัจจุบัน · คำนวณจากข้อมูล My Data</p>
        </div>
        <Link href="/my-data" className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0 mt-1">
          อัปเดตข้อมูล <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Health Summary Banner */}
      <div className="rounded-2xl border overflow-hidden bg-card">
        <div className="flex flex-col sm:flex-row sm:divide-x">
          {/* Score ring */}
          <div className={cn("flex items-center gap-4 px-6 py-5 shrink-0 border-b sm:border-b-0", HEALTH_BG[scoreHealth])}>
            <div className="relative w-[72px] h-[72px] shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="2.8"
                  className="text-black/10" />
                <circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="2.8"
                  className={HEALTH_COLOR[scoreHealth]}
                  stroke="currentColor"
                  strokeDasharray={`${score} 100`}
                  strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={cn("text-xl font-black tabular-nums leading-none", HEALTH_COLOR[scoreHealth])}>{score}</span>
                <span className="text-[9px] text-muted-foreground leading-none mt-0.5">/100</span>
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">คะแนนสุขภาพ</p>
              <p className={cn("text-base font-bold mt-0.5 leading-tight", HEALTH_COLOR[scoreHealth])}>{scoreLabel}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Financial Analysis</p>
            </div>
          </div>

          {/* Metrics strip */}
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-y lg:divide-y-0">
            {([
              {
                icon: Wallet, label: "รายได้สุทธิ", value: thb(monthlyIncome),
                sub: `ปีละ ${thbM(annualIncome)}`, health: "neutral" as Health,
              },
              {
                icon: PiggyBank, label: "เงินออม/เดือน", value: thb(Math.max(0, monthlyFree)),
                sub: `${(savingsRate * 100).toFixed(0)}% ของรายได้`, health: savHealth,
                href: "/my-data?tab=income",
              },
              {
                icon: ShieldCheck, label: "กองทุนฉุกเฉิน",
                value: efMonths !== null ? `${efMonths.toFixed(1)} เดือน` : "—",
                sub: `${thb(profile.emergencyFundAmount)} / ${thb(efTarget)}`, health: efHealth,
                href: "/my-data?tab=debts",
              },
              {
                icon: Scale, label: "DTI หนี้/รายได้",
                value: `${(dti * 100).toFixed(0)}%`, sub: "เป้า < 30%", health: dtiHealth,
              },
              {
                icon: Target, label: "สินทรัพย์สุทธิ",
                value: thbM(Math.abs(netWorth)),
                sub: netWorth >= 0 ? "สินทรัพย์ > หนี้" : "หนี้ > สินทรัพย์",
                health: (netWorth >= 0 ? "good" : "bad") as Health,
              },
            ] as const).map((m) => (
              <div key={m.label} className="px-4 py-4 flex flex-col gap-0.5 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <m.icon className={cn("h-3 w-3 shrink-0", HEALTH_COLOR[m.health])} />
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground truncate">{m.label}</p>
                </div>
                <p className={cn("text-lg font-black tabular-nums leading-tight", HEALTH_COLOR[m.health])}>{m.value}</p>
                <p className="text-[11px] text-muted-foreground leading-snug">{m.sub}</p>
                {"href" in m && (
                  <Link href={(m as { href: string }).href} className="text-[10px] text-primary hover:underline mt-0.5">แก้ไข →</Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-b">
        <div className="flex gap-0 overflow-x-auto">
          {([
            { key: "overview",   label: "ภาพรวม",       icon: Activity },
            { key: "cashflow",   label: "กระแสเงินสด",  icon: Banknote },
            { key: "investment", label: "การลงทุน",      icon: TrendingUp },
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

      {/* Tab content */}
      <div className="space-y-5">

      {/* ── Tab: ภาพรวม ── */}
      {activeTab === "overview" && (
        <div className="grid lg:grid-cols-2 gap-5">
          {/* Health Score Breakdown */}
          <Card>
            <CardHeader className="pb-1 pt-4">
              <CardTitle className="text-sm">
                <SectionHeader icon={Activity} title="คะแนนสุขภาพการเงิน" color="text-primary" />
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4 space-y-4">
              {[
                { label: "กองทุนฉุกเฉิน (Emergency Fund)", health: efHealth, score: efHealth === "good" ? 30 : efHealth === "warn" ? 15 : 0, max: 30,
                  detail: efMonths !== null ? `${efMonths.toFixed(1)} เดือน / เป้า 6 เดือน` : "ยังไม่มีข้อมูล" },
                { label: "ภาระหนี้ (Debt to Income)", health: dtiHealth, score: dtiHealth === "good" ? 25 : dtiHealth === "warn" ? 12 : 0, max: 25,
                  detail: `DTI ${(dti * 100).toFixed(0)}% / เป้า < 30%` },
                { label: "การออม (Savings Rate)", health: savHealth, score: savHealth === "good" ? 25 : savHealth === "warn" ? 12 : 0, max: 25,
                  detail: `ออมได้ ${(savingsRate * 100).toFixed(0)}% / เป้า 20%` },
                { label: "การลงทุนกองทุนภาษี", health: investRatio >= 0.15 ? "good" as Health : investRatio > 0 ? "warn" as Health : "bad" as Health,
                  score: investRatio >= 0.15 ? 15 : investRatio > 0 ? 7 : 0, max: 15,
                  detail: `${(investRatio * 100).toFixed(0)}% ของรายได้ / เป้า 15%` },
                { label: "ประเมินความเสี่ยง", health: risk ? "good" as Health : "neutral" as Health,
                  score: risk ? 5 : 0, max: 5,
                  detail: risk ? `ระดับ: ${riskLabel ?? "—"}` : "ยังไม่ได้ประเมิน" },
              ].map(item => (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className={cn("font-semibold tabular-nums", HEALTH_COLOR[item.health])}>
                      {item.score}/{item.max}
                    </span>
                  </div>
                  <Progress value={item.max > 0 ? (item.score / item.max) * 100 : 0}
                    className={cn("h-1.5", item.health === "good" ? "[&>div]:bg-emerald-500" : item.health === "warn" ? "[&>div]:bg-amber-400" : "")} />
                  <p className="text-[10px] text-muted-foreground">{item.detail}</p>
                </div>
              ))}
              <div className="pt-2 border-t flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">คะแนนรวม</span>
                <span className={cn("text-lg font-black tabular-nums", HEALTH_COLOR[scoreHealth])}>{score}/100 — {scoreLabel}</span>
              </div>
            </CardContent>
          </Card>

          {/* Key Actions */}
          <Card>
            <CardHeader className="pb-1 pt-4">
              <CardTitle className="text-sm">
                <SectionHeader icon={CheckCircle2} title="สิ่งที่ควรทำต่อไป" color="text-violet-600" />
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="space-y-3">
                {efHealth !== "good" && (
                  <div className={cn("flex gap-3 rounded-lg border p-3", efHealth === "bad" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50")}>
                    <ShieldCheck className={cn("h-4 w-4 mt-0.5 shrink-0", efHealth === "bad" ? "text-red-500" : "text-amber-500")} />
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold">สร้างกองทุนฉุกเฉิน</p>
                      <p className="text-[11px] text-muted-foreground">
                        เป้าหมาย {thb(efTarget)} ({profile.monthlyExpenses > 0 ? "6 เดือน × " + thb(profile.monthlyExpenses) : "6 เดือนค่าใช้จ่าย"})
                        {efMonths !== null && <> · มีแล้ว {thb(profile.emergencyFundAmount)}</>}
                      </p>
                      <Link href="/my-data?tab=debts" className="text-[11px] text-primary hover:underline">อัปเดตข้อมูล →</Link>
                    </div>
                  </div>
                )}
                {dtiHealth !== "good" && (
                  <div className={cn("flex gap-3 rounded-lg border p-3", dtiHealth === "bad" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50")}>
                    <Scale className={cn("h-4 w-4 mt-0.5 shrink-0", dtiHealth === "bad" ? "text-red-500" : "text-amber-500")} />
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold">ลดภาระหนี้</p>
                      <p className="text-[11px] text-muted-foreground">DTI ปัจจุบัน {(dti * 100).toFixed(0)}% — เป้าหมายต้องต่ำกว่า 30%</p>
                    </div>
                  </div>
                )}
                {savHealth !== "good" && (
                  <div className={cn("flex gap-3 rounded-lg border p-3", savHealth === "bad" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50")}>
                    <PiggyBank className={cn("h-4 w-4 mt-0.5 shrink-0", savHealth === "bad" ? "text-red-500" : "text-amber-500")} />
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold">เพิ่มอัตราการออม</p>
                      <p className="text-[11px] text-muted-foreground">ออมได้ {(savingsRate * 100).toFixed(0)}% — เป้าหมาย 20% ของรายได้ ({thb(monthlyIncome * 0.20)}/เดือน)</p>
                    </div>
                  </div>
                )}
                {investRatio < 0.15 && (
                  <div className={cn("flex gap-3 rounded-lg border p-3", investRatio === 0 ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50")}>
                    <TrendingUp className={cn("h-4 w-4 mt-0.5 shrink-0", investRatio === 0 ? "text-red-500" : "text-amber-500")} />
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold">เพิ่มการลงทุนกองทุนภาษี</p>
                      <p className="text-[11px] text-muted-foreground">
                        ลงทุนอยู่ {thb(totalTaxInvested)}/ปี — เป้าหมาย 15% ของรายได้ ({thb(annualIncome * 0.15)}/ปี)
                        {totalTaxRoom > 0 && marginalRate > 0 && <> · ประหยัดภาษีได้ {thb(taxSaving)}</>}
                      </p>
                      <Link href="/tax" className="text-[11px] text-primary hover:underline">คำนวณภาษี →</Link>
                    </div>
                  </div>
                )}
                {!risk && (
                  <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <Activity className="h-4 w-4 mt-0.5 shrink-0 text-blue-500" />
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold">ประเมินความเสี่ยงการลงทุน</p>
                      <p className="text-[11px] text-muted-foreground">ยังไม่ได้ทำแบบประเมิน Risk Profile</p>
                      <Link href="/tools/risk" className="text-[11px] text-primary hover:underline">ทำแบบประเมิน →</Link>
                    </div>
                  </div>
                )}
                {score >= 75 && (
                  <div className="flex gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-500" />
                    <div>
                      <p className="text-xs font-semibold text-emerald-700">สุขภาพการเงินอยู่ในเกณฑ์ดี</p>
                      <p className="text-[11px] text-muted-foreground">คงรักษาวินัยทางการเงินต่อไป และพิจารณาเพิ่มการลงทุนระยะยาว</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Net Worth snapshot */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-1 pt-4">
              <CardTitle className="text-sm">
                <SectionHeader icon={Wallet} title="ภาพรวมฐานะการเงิน" color="text-blue-600" />
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted/40">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">รายได้/เดือน</p>
                  <p className="text-lg font-black tabular-nums mt-1">{thb(monthlyIncome)}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/40">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">เงินออมได้/เดือน</p>
                  <p className={cn("text-lg font-black tabular-nums mt-1", HEALTH_COLOR[savHealth])}>{thb(Math.max(0, monthlyFree))}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/40">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">พอร์ตรวม</p>
                  <p className="text-lg font-black tabular-nums mt-1 text-emerald-600">{grandTotal > 0 ? thbM(grandTotal) : "—"}</p>
                </div>
                <div className={cn("text-center p-3 rounded-lg", netWorth >= 0 ? "bg-emerald-50" : "bg-red-50")}>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">สินทรัพย์สุทธิ</p>
                  <p className={cn("text-lg font-black tabular-nums mt-1", netWorth >= 0 ? "text-emerald-600" : "text-red-500")}>
                    {netWorth >= 0 ? "+" : ""}{thbM(netWorth)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
                {profile.dividendIncome > 0 && (
                  <tr>
                    <td className="py-2 text-xs text-muted-foreground">เงินปันผล จากหุ้น (เฉลี่ย/เดือน)</td>
                    <td className="py-2 text-xs font-medium text-right tabular-nums">{thb(profile.dividendIncome / 12)}</td>
                    <td className="py-2 text-xs text-right text-muted-foreground hidden sm:table-cell">{pct(profile.dividendIncome, annualIncome)}</td>
                    <td className="py-2 text-right"><HealthBadge health="neutral" /></td>
                  </tr>
                )}
                <tr>
                  <td className="py-2 text-xs text-muted-foreground">
                    เงินคืนภาษี/ปี
                    {profile.taxRefundAmount === 0 && (
                      <span className="ml-1 text-[10px] text-primary/70 hover:underline cursor-pointer">
                        · <a href="/my-data">กรอกใน My Data</a>
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-xs font-medium text-right tabular-nums">
                    {profile.taxRefundAmount > 0 ? thb(profile.taxRefundAmount) : <span className="text-muted-foreground/50">—</span>}
                  </td>
                  <td className="py-2 text-xs text-right text-muted-foreground hidden sm:table-cell">
                    {profile.taxRefundAmount > 0 ? pct(profile.taxRefundAmount, annualIncome) : "—"}
                  </td>
                  <td className="py-2 text-right">
                    {profile.taxRefundAmount > 0 && <HealthBadge health="good" />}
                  </td>
                </tr>
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
        <div className="space-y-5">
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
      </div>
      )}

      </div>
    </div>
  );
}
