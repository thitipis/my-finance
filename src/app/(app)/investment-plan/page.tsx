"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, BarChart3, TrendingUp, CheckCircle2, ArrowRight, PieChart, GitBranch, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLANS, type OptionPlan, type Instrument } from "@/lib/investment-plans";

type PlanData = {
  currentAge: number | null;
  retirementAge: number | null;
  currentSavings: number;
  monthlyInvestable: number | null;
  expectedReturn: number | null;
};

type RiskData = { riskLevel: "conservative" | "moderate" | "aggressive" };

type ProfileData = {
  annualSalary: number; bonus: number; otherIncome: number; spouseIncome: number;
  monthlyDebtPayment: number;
  monthlyInvestTax: number;
  monthlyInvestPersonal: number;
};

type PortfolioAsset = {
  id: string;
  name: string;
  group: string;
  emoji: string;
  currentValue: number;
  assetType?: string;
  ticker?: string;
};

const COLOR_MAP = {
  amber: {
    border: "border-amber-200 dark:border-amber-800",
    bg: "bg-amber-50 dark:bg-amber-950/20",
    badge: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300",
    btn: "bg-amber-500 hover:bg-amber-600 text-white",
    bar: "bg-amber-400",
  },
  blue: {
    border: "border-blue-200 dark:border-blue-800",
    bg: "bg-blue-50 dark:bg-blue-950/20",
    badge: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
    btn: "bg-blue-600 hover:bg-blue-700 text-white",
    bar: "bg-blue-400",
  },
  emerald: {
    border: "border-emerald-200 dark:border-emerald-800",
    bg: "bg-emerald-50 dark:bg-emerald-950/20",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300",
    btn: "bg-emerald-600 hover:bg-emerald-700 text-white",
    bar: "bg-emerald-500",
  },
};

const RISK_LABELS: Record<string, string> = {
  conservative: "🛡️ อนุรักษ์นิยม",
  moderate: "⚖️ กลาง",
  aggressive: "🚀 เชิงรุก",
};


const DOWNSIDE: Record<string, Record<string, { worstYear: number; maxDrawdown: number; recoveryYears: number }>> = {
  conservative: {
    soft:     { worstYear: -3,  maxDrawdown: -8,  recoveryYears: 1 },
    balanced: { worstYear: -10, maxDrawdown: -18, recoveryYears: 2 },
    hard:     { worstYear: -18, maxDrawdown: -28, recoveryYears: 3 },
  },
  moderate: {
    soft:     { worstYear: -8,  maxDrawdown: -15, recoveryYears: 2 },
    balanced: { worstYear: -15, maxDrawdown: -25, recoveryYears: 3 },
    hard:     { worstYear: -25, maxDrawdown: -40, recoveryYears: 4 },
  },
  aggressive: {
    soft:     { worstYear: -20, maxDrawdown: -35, recoveryYears: 3 },
    balanced: { worstYear: -35, maxDrawdown: -50, recoveryYears: 4 },
    hard:     { worstYear: -45, maxDrawdown: -60, recoveryYears: 6 },
  },
};

function thb(v: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency", currency: "THB", maximumFractionDigits: 0,
  }).format(v);
}

function calcFV(pv: number, annualRate: number, years: number, monthlyPmt: number): number {
  if (years <= 0) return pv;
  if (Math.abs(annualRate) < 1e-9) return pv + monthlyPmt * 12 * years;
  const r = annualRate / 12;
  const n = years * 12;
  return pv * Math.pow(1 + r, n) + monthlyPmt * ((Math.pow(1 + r, n) - 1) / r);
}

export default function InvestmentPlanPage() {
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [risk, setRisk] = useState<RiskData | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"soft" | "balanced" | "hard" | null>(null);
  const [savedRate, setSavedRate] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [assets, setAssets] = useState<PortfolioAsset[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/user/financial-plan").then(r => r.json()),
      fetch("/api/user/risk-assessment").then(r => r.json()),
      fetch("/api/user/portfolio-assets").then(r => r.json()),
      fetch("/api/user/financial-profile").then(r => r.json()),
    ]).then(([planRes, riskRes, assetsRes, profileRes]) => {
      if (riskRes.data) setRisk(riskRes.data);
      if (assetsRes.data) setAssets(assetsRes.data);
      const pd: ProfileData | null = profileRes.data ?? null;
      if (pd) setProfile(pd);
      if (planRes.data) {
        const d = planRes.data;
        // Compute monthlyInvestable from profile's monthly invest targets
        const profileMonthly = pd
          ? (Number(pd.monthlyInvestTax ?? 0) + Number(pd.monthlyInvestPersonal ?? 0))
          : 0;
        const monthlyInvest: number | null = profileMonthly > 0
          ? profileMonthly
          : (d.monthlyInvestable ? Number(d.monthlyInvestable) : null);
        setPlan({
          currentAge: d.currentAge ?? null,
          retirementAge: d.retirementAge ?? null,
          currentSavings: Number(d.currentSavings ?? 0),
          monthlyInvestable: monthlyInvest,
          expectedReturn: d.expectedReturn != null ? Number(d.expectedReturn) : null,
        });
        if (d.expectedReturn != null) setSavedRate(Number(d.expectedReturn));
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 5000);
  };

  const handleUse = async (opt: "soft" | "balanced" | "hard") => {
    const riskLevel = (risk?.riskLevel ?? "moderate") as keyof typeof PLANS;
    const chosen = PLANS[riskLevel][opt];
    setSaving(opt);
    try {
      const res = await fetch("/api/user/financial-plan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedReturn: chosen.returnRate }),
      });
      if (res.ok) {
        setSavedRate(chosen.returnRate);
        setPlan(p => p ? { ...p, expectedReturn: chosen.returnRate } : p);
        showToast(`${chosen.label} (${chosen.returnRate}%/ปี) บันทึกแล้ว`);
      } else {
        showToast("บันทึกไม่สำเร็จ กรุณาลองใหม่");
      }
    } catch {
      showToast("เกิดข้อผิดพลาด กรุณาลองใหม่");
    }
    setSaving(null);
  };

  const handleReset = async () => {
    if (!confirm("ยืนยันการล้างแผนการลงทุน?")) return;
    try {
      const res = await fetch("/api/user/financial-plan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedReturn: null }),
      });
      if (res.ok) {
        setSavedRate(null);
        setPlan(p => p ? { ...p, expectedReturn: null } : p);
        showToast("ล้างแผนการลงทุนแล้ว");
      }
    } catch {
      showToast("เกิดข้อผิดพลาด กรุณาลองใหม่");
    }
  };


  if (loading) return (
    <div className="flex justify-center py-24">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  const riskLevel = (risk?.riskLevel ?? "moderate") as keyof typeof PLANS;
  const planOpts = PLANS[riskLevel];

  const savedOpt = savedRate !== null
    ? (["soft", "balanced", "hard"] as const).find(o => planOpts[o].returnRate === savedRate) ?? null
    : null;
  const savedPlan = savedOpt ? planOpts[savedOpt] : null;

  const totalPortfolio = assets.reduce((s, a) => s + Number(a.currentValue), 0);
  const GROUP_LABELS: Record<string, string> = { thai: "🇹🇭 ไทย", international: "🌐 ต่างประเทศ", other: "🏦 อื่นๆ", tax: "🧾 ลดหย่อนภาษี" };
  const groupedAssets = assets.reduce((acc, a) => {
    const g = a.group ?? "other";
    if (!acc[g]) acc[g] = [];
    acc[g].push(a);
    return acc;
  }, {} as Record<string, PortfolioAsset[]>);
  const yearsToRetire = plan?.currentAge && plan?.retirementAge
    ? Math.max(0, plan.retirementAge - plan.currentAge) : null;


  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-10">

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm rounded-xl border bg-card shadow-xl px-4 py-3 text-sm font-medium">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
            <span>{toast}</span>
            <Link href="/financial-plan" className="ml-1 font-semibold text-primary hover:underline whitespace-nowrap flex items-center gap-1">
              ดูผล <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PieChart className="h-6 w-6 text-primary" />
            Investment Plan
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            แผนการลงทุนสำหรับ{" "}
            <span className="font-semibold text-foreground">{RISK_LABELS[riskLevel]}</span>
          </p>
        </div>
        {savedRate !== null && (
          <div className="flex items-center gap-2 rounded-xl border bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 px-3 py-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">แผนปัจจุบัน: {savedRate}%/ปี</span>
            <button onClick={handleReset} title="ล้างแผน" className="p-0.5 text-muted-foreground hover:text-red-500 transition-colors">
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <Link href="/financial-plan" className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5">
              ดูผล <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </div>

      {/* Context + Portfolio (2-col grid) */}
      <div className="grid md:grid-cols-2 gap-4">
        {plan && (
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "อายุปัจจุบัน", value: plan.currentAge ? `${plan.currentAge} ปี` : "—" },
              { label: "เป้าเกษียณ",   value: plan.retirementAge ? `${plan.retirementAge} ปี` : "—" },
              { label: "เหลือเวลา",    value: yearsToRetire !== null ? `${yearsToRetire} ปี` : "—" },
            ].map(c => (
              <div key={c.label} className="rounded-lg border bg-card px-3 py-2.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{c.label}</p>
                <p className="text-base font-bold mt-0.5">{c.value}</p>
              </div>
            ))}
            <div className={cn("rounded-lg border px-3 py-2.5", plan.monthlyInvestable ? "border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20" : "bg-card")}>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">ลงทุนได้/เดือน</p>
              <p className={cn("text-base font-bold", plan.monthlyInvestable ? "text-emerald-700 dark:text-emerald-400" : "")}>
                {plan.monthlyInvestable ? plan.monthlyInvestable.toLocaleString("th-TH") : "—"}
              </p>
              {plan.monthlyInvestable && profile && (profile.monthlyInvestTax > 0 || profile.monthlyInvestPersonal > 0) && (
                <p className="text-[9px] text-muted-foreground mt-0.5">
                  ภาษี {profile.monthlyInvestTax.toLocaleString("th-TH")} + ส่วนตัว {profile.monthlyInvestPersonal.toLocaleString("th-TH")}
                </p>
              )}
              {!plan.monthlyInvestable && (
                <p className="text-[9px] text-muted-foreground mt-0.5">ตั้งค่าใน My Data</p>
              )}
            </div>
          </div>
        )}

        {/* Portfolio summary */}
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold">พอร์ตปัจจุบัน</span>
            <span className="text-base font-black">{thb(totalPortfolio)}</span>
            <Link href="/my-data" className="text-xs text-primary hover:underline">แก้ไข →</Link>
          </div>
          {assets.length === 0 ? (
            <div className="text-center py-3">
              <TrendingUp className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground">ยังไม่มีข้อมูลพอร์ต</p>
              <Link href="/my-data" className="text-xs text-primary hover:underline mt-0.5 block">เพิ่มข้อมูลใน My Data</Link>
            </div>
          ) : (
            <div className="space-y-2">
              {Object.entries(groupedAssets).map(([g, gitems]) => {
                const tot = gitems.reduce((s, a) => s + Number(a.currentValue), 0);
                const pct = totalPortfolio > 0 ? (tot / totalPortfolio) * 100 : 0;
                return (
                  <div key={g} className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-20 truncate">{GROUP_LABELS[g] ?? g}</span>
                    <div className="flex-1 h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-primary/60 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] font-medium tabular-nums w-14 text-right">{thb(tot)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Projection comparison */}
      {plan && yearsToRetire !== null && yearsToRetire > 0 && plan.monthlyInvestable && plan.monthlyInvestable > 0 && (
        <div className="rounded-xl border bg-muted/30 px-4 py-3">
          <p className="text-xs text-muted-foreground mb-2.5">
            คาดการณ์ · เงินออม {thb(plan.currentSavings)} + ลงทุน {thb(plan.monthlyInvestable)}/เดือน · {yearsToRetire} ปี
          </p>
          <div className="grid grid-cols-3 gap-3">
            {(["soft", "balanced", "hard"] as const).map(opt => {
              const o = planOpts[opt];
              const d = DOWNSIDE[riskLevel]?.[opt];
              const proj = calcFV(plan.currentSavings, o.returnRate / 100, yearsToRetire, plan.monthlyInvestable!);
              return (
                <div key={opt} className="text-center">
                  <p className="text-[10px] text-muted-foreground">{o.label}</p>
                  <p className="text-sm font-black text-emerald-600 mt-0.5">{thb(proj)}</p>
                  {d && <p className="text-[10px] text-red-400">ปีเลวร้าย {d.worstYear}%</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Plan cards with upside and downside */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">เลือกแผนการลงทุน</p>
        <div className="grid gap-4 md:grid-cols-3">
          {(["soft", "balanced", "hard"] as const).map(opt => {
            const o = planOpts[opt];
            const d = DOWNSIDE[riskLevel]?.[opt];
            const isSaved = savedRate === o.returnRate;
            const c = COLOR_MAP[o.colorKey];
            const proj = plan && yearsToRetire && yearsToRetire > 0 && plan.monthlyInvestable
              ? calcFV(plan.currentSavings, o.returnRate / 100, yearsToRetire, plan.monthlyInvestable)
              : null;
            return (
              <div key={opt} className={cn("rounded-xl border p-4 space-y-3", c.border, c.bg)}>
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h2 className="text-sm font-bold">{o.label}</h2>
                      {isSaved && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-primary/10 text-primary border border-primary/20">
                          ใช้งานอยู่
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{o.desc}</p>
                  </div>
                  <span className={cn("px-2 py-1 rounded-lg text-sm font-black border flex-shrink-0", c.badge)}>
                    ~{o.returnRate}%
                  </span>
                </div>

                {/* Upside */}
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 p-2.5">
                  <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wide">✅ ผลตอบแทนคาดหวัง</p>
                  <p className="text-sm font-black text-emerald-700 mt-0.5">+{o.returnRate}%/ปี</p>
                  {proj !== null && (
                    <p className="text-xs text-emerald-600 mt-0.5">ฉลาย ~{thb(proj)}</p>
                  )}
                </div>

                {/* Downside */}
                {d && (
                  <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900 p-2.5">
                    <p className="text-[9px] font-bold text-red-500 uppercase tracking-wide">⚠️ ความเสี่ยง (Downside)</p>
                    <p className="text-sm font-bold text-red-600 mt-0.5">ปีเลวร้าย: {d.worstYear}%</p>
                    <p className="text-[10px] text-red-400">Max Drawdown {d.maxDrawdown}% · ฟื้นตัว ~{d.recoveryYears} ปี</p>
                  </div>
                )}

                {/* Allocation */}
                <div>
                  <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                    จัดสรร · ⟳ {o.rebalance}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {o.instruments.map(i => (
                      <span key={i.name} className="text-[10px] bg-black/5 dark:bg-white/10 rounded-md px-1.5 py-0.5 whitespace-nowrap">
                        {i.name.split("(")[0].trim()} {i.alloc}%
                      </span>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                <button
                  onClick={() => handleUse(opt)}
                  disabled={saving !== null || isSaved}
                  className={cn(
                    "w-full py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5",
                    isSaved
                      ? "bg-muted text-muted-foreground cursor-default"
                      : cn(c.btn, "disabled:opacity-50"),
                    saving === opt && "opacity-70 cursor-wait"
                  )}
                >
                  {saving === opt ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" />กำลังบันทึก...</>
                  ) : isSaved ? (
                    <><CheckCircle2 className="h-3.5 w-3.5" />ใช้แผนนี้อยู่แล้ว</>
                  ) : (
                    <>ใช้แผนนี้<ArrowRight className="h-3.5 w-3.5" /></>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active plan breakdown */}
      {savedOpt && savedPlan && plan && plan.monthlyInvestable && plan.monthlyInvestable > 0 && (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20 p-5 space-y-4">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              <div>
                <p className="font-bold text-sm">ขั้นตอนต่อไป — {savedPlan.label}</p>
                <p className="text-[11px] text-muted-foreground">{savedPlan.desc} · Rebalance {savedPlan.rebalance}</p>
              </div>
            </div>
            {yearsToRetire !== null && yearsToRetire > 0 && plan.currentSavings !== null && (
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground">คาดเกษียณ อีก {yearsToRetire} ปี</p>
                <p className="text-base font-black text-emerald-600">
                  ~{thb(calcFV(plan.currentSavings, savedPlan.returnRate / 100, yearsToRetire, plan.monthlyInvestable!))}
                </p>
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2.5">
              ลงทุน <span className="font-bold text-foreground">{thb(plan.monthlyInvestable)}/เดือน</span> แบ่งเป็น:
            </p>
            <div className="space-y-2">
              {savedPlan.instruments.map(i => {
                const monthly = Math.round(plan.monthlyInvestable! * i.alloc / 100);
                return (
                  <div key={i.name} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm">{i.name}</span>
                      <span className="text-[10px] text-muted-foreground ml-1.5 hidden sm:inline">({i.note})</span>
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right shrink-0">{i.alloc}%</span>
                    <span className="text-sm font-semibold tabular-nums text-right shrink-0 min-w-[90px]">
                      {thb(monthly)}/เดือน
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1 border-t border-emerald-200 dark:border-emerald-800">
            <Link href="/financial-plan" className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
              <BarChart3 className="h-4 w-4" /> ดูการวิเคราะห์ทั้งหมด <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <button onClick={handleReset} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-500 transition-colors ml-auto">
              <RotateCcw className="h-3.5 w-3.5" /> ล้างแผน
            </button>
          </div>
        </div>
      )}

      {/* Life Phase Strategy */}
      {plan?.currentAge && plan?.retirementAge && (() => {
        const cur = plan.currentAge!;
        const ret = plan.retirementAge!;
        const totalPreRet = Math.max(0, ret - cur);
        const phases = [
          { key: "hard" as const, label: "สะสมทรัพย์ (Accumulation)", subLabel: "ช่วงแรก · ลงทุนเชิงรุก เน้นเติบโตสูงสุด", icon: "🚀",
            color: "border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/20",
            badge: "bg-amber-100 text-amber-700 border-amber-200",
            ageStart: cur, ageEnd: Math.max(cur, ret - Math.round(totalPreRet * 0.4)) },
          { key: "balanced" as const, label: "เติบโตมั่นคง (Growth)", subLabel: "ช่วงกลาง · สมดุลระหว่างเติบโตและความเสี่ยง", icon: "⚖️",
            color: "border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/20",
            badge: "bg-blue-100 text-blue-700 border-blue-200",
            ageStart: Math.max(cur, ret - Math.round(totalPreRet * 0.4)), ageEnd: Math.max(cur, ret - Math.round(totalPreRet * 0.2)) },
          { key: "soft" as const, label: "ใกล้เกษียณ (Pre-Retirement)", subLabel: "ช่วงสุดท้ายก่อนเกษียณ · ลดความเสี่ยง ปกป้องทุน", icon: "🛡️",
            color: "border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20",
            badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
            ageStart: Math.max(cur, ret - Math.round(totalPreRet * 0.2)), ageEnd: ret },
        ];
        const retirementPhase = {
          label: "หลังเกษียณ (Retirement)", subLabel: "เน้นรักษาทุน สร้างรายได้สม่ำเสมอ ลดความผันผวน", icon: "🏖️",
          color: "border-violet-200 dark:border-violet-800 bg-violet-50/60 dark:bg-violet-950/20",
          badge: "bg-violet-100 text-violet-700 border-violet-200",
          ageStart: ret, returnRate: "4–5",
          instruments: [
            { name: "พันธบัตร / ตราสารหนี้", alloc: 50, note: "สร้างรายได้ประจำ" },
            { name: "หุ้นปันผลสูง / Low Vol", alloc: 20, note: "เติบโตช้า ความเสี่ยงต่ำ" },
            { name: "กองทุนรวม / ตลาดเงิน", alloc: 20, note: "สภาพคล่องสูง" },
            { name: "ทองคำ / สินทรัพย์ป้องกัน", alloc: 10, note: "ป้องกันเงินเฟ้อ" },
          ],
        };
        return (
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <GitBranch className="h-4 w-4 text-primary" />
              <p className="text-sm font-bold">การลงทุนตามช่วงชีวิต (Life Phase Strategy)</p>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              ปรับพอร์ตตามอายุและระยะห่างจากเกษียณ — เชิงรุกช่วงแรก ค่อยๆ ลดความเสี่ยงเมื่อใกล้เกษียณ
            </p>
            <div className="space-y-3">
              {phases.map(ph => {
                const opt = PLANS[riskLevel][ph.key];
                const duration = Math.max(0, ph.ageEnd - ph.ageStart);
                if (duration === 0) return null;
                return (
                  <div key={ph.key} className={cn("rounded-xl border p-4 space-y-2.5", ph.color)}>
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-bold">{ph.icon} {ph.label}</span>
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border font-semibold", ph.badge)}>
                            อายุ {ph.ageStart}–{ph.ageEnd} ปี ({duration} ปี)
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{ph.subLabel}</p>
                      </div>
                      <span className={cn("text-sm font-black px-2 py-1 rounded-lg border shrink-0", ph.badge)}>~{opt.returnRate}%/ปี</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {opt.instruments.map(i => (
                        <span key={i.name} className="text-[10px] bg-black/5 dark:bg-white/10 rounded-md px-2 py-1 whitespace-nowrap font-medium">
                          {i.name.split("(")[0].trim()} <span className="font-black">{i.alloc}%</span>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
              <div className={cn("rounded-xl border p-4 space-y-2.5", retirementPhase.color)}>
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-bold">{retirementPhase.icon} {retirementPhase.label}</span>
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border font-semibold", retirementPhase.badge)}>
                        อายุ {retirementPhase.ageStart}+ ปี
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{retirementPhase.subLabel}</p>
                  </div>
                  <span className={cn("text-sm font-black px-2 py-1 rounded-lg border shrink-0", retirementPhase.badge)}>~{retirementPhase.returnRate}%/ปี</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {retirementPhase.instruments.map(i => (
                    <span key={i.name} className="text-[10px] bg-black/5 dark:bg-white/10 rounded-md px-2 py-1 whitespace-nowrap font-medium">
                      {i.name} <span className="font-black">{i.alloc}%</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              * สัดส่วนเป็นแนวทาง ปรับตามระดับความเสี่ยง <strong>{RISK_LABELS[riskLevel]}</strong> — ควร Rebalance ทุกปี
            </p>
          </div>
        );
      })()}

      {/* Cross links */}
      <div className="flex gap-4 text-sm pt-1 border-t">
        <Link href="/financial-plan" className="flex items-center gap-1.5 text-primary hover:underline mt-3">
          <BarChart3 className="h-4 w-4" /> Financial Analysis
        </Link>
        <Link href="/lineage" className="flex items-center gap-1.5 text-primary hover:underline mt-3">
          <GitBranch className="h-4 w-4" /> เส้นทางชีวิต
        </Link>
        <Link href="/my-data" className="flex items-center gap-1.5 text-primary hover:underline mt-3">
          <TrendingUp className="h-4 w-4" /> ข้อมูลของฉัน
        </Link>
      </div>
    </div>
  );
}
