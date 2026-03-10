"use client";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  X, RefreshCw, ChevronLeft,
  Target, Trash2, Pencil, Loader2, CheckCircle2, Flame,
  TrendingUp, Shield, Home, GraduationCap, Zap, Star,
  BarChart3, GitBranch,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────
const PX_PER_YEAR = 36;

// ─── Scenario Return Rates ──────────────────────────────────────────────────
const SCENARIO_RETURNS: Record<string, number> = { conservative: 0.04, moderate: 0.06, aggressive: 0.08 };
const SCENARIO_LABELS = [
  { key: "conservative", label: "Conservative", color: "#f59e0b", emoji: "🛡️" },
  { key: "moderate",     label: "Moderate",     color: "#7c3aed", emoji: "⚖️" },
  { key: "aggressive",   label: "Aggressive",   color: "#10b981", emoji: "🚀" },
  { key: "plan",         label: "จากแผน",       color: "#0ea5e9", emoji: "📈" },
];

// ─── Avatar Options ───────────────────────────────────────────────────────────
const AVATARS = [
  { id: "human",     emoji: "🧑",  label: "Human" },
  { id: "panda",     emoji: "🐼",  label: "Panda" },
  { id: "fox",       emoji: "🦊",  label: "Fox" },
  { id: "cat",       emoji: "🐱",  label: "Cat" },
  { id: "robot",     emoji: "🤖",  label: "Robot" },
  { id: "astronaut", emoji: "🧑‍🚀", label: "Astronaut" },
];

// ─── Types ───────────────────────────────────────────────────────────────────
interface LifeStage {
  id: string; ageFrom: number; ageTo: number;
  titleTh: string; descriptionTh: string; icon: string;
  allocEquity: number; allocBond: number; allocCash: number; colorHex: string;
}
interface TlEvent {
  id: string; age: number; eventType: string; impact: string;
  title: string; description?: string | null; isAuto: boolean; isAI: boolean;
}
interface YrProj {
  age: number; year: number; netWorth: number; annualIncome: number;
  annualSavings: number; happiness: number; lifeStage: LifeStage | null;
  isRetired: boolean; isBroke: boolean;
}
interface LineageData {
  profile: Record<string, string | number | null>;
  plan: Record<string, string | number | null> | null;
  goals: Array<{ id: string; name: string; targetAmount: number; targetDate: string | null; goalType: string }>;
  lifeStages: LifeStage[];
  savedEvents: TlEvent[];
  riskLevel: string;
}
type AwarenessItem = { text: string; type: "warn" | "good" | "info" };

// ─── Goal Types ───────────────────────────────────────────────────────────────
type FullGoal = {
  id: string; name: string; goalType: string;
  targetAmount: string; currentAmount: string;
  monthlyContribution: string; annualReturnRate: string;
  projection: {
    progressPercent: number; projectedCompletionDate: string | null;
    onTrack: boolean; monthsRemaining: number | null;
  };
};

const GOAL_TYPES = [
  { value: "retirement",     label: "เกษียณ",         Icon: TrendingUp,    color: "#6366f1" },
  { value: "emergency_fund", label: "กองทุนฉุกเฉิน",  Icon: Shield,        color: "#f59e0b" },
  { value: "home_car",       label: "บ้าน / รถ",      Icon: Home,          color: "#3b82f6" },
  { value: "education",      label: "การศึกษา",       Icon: GraduationCap, color: "#8b5cf6" },
  { value: "investment",     label: "การลงทุน",       Icon: Zap,           color: "#10b981" },
  { value: "custom",         label: "อื่น ๆ",         Icon: Star,          color: "#64748b" },
];
function getGoalType(v: string) {
  return GOAL_TYPES.find(t => t.value === v) ?? GOAL_TYPES[GOAL_TYPES.length - 1];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function thb(n: number): string {
  return n >= 1_000_000
    ? `฿${(n / 1_000_000).toFixed(2)}M`
    : n >= 1_000
    ? `฿${(n / 1_000).toFixed(0)}K`
    : `฿${Math.round(n).toLocaleString()}`;
}
function compact(n: number): string {
  if (n >= 1e9) return `฿${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `฿${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `฿${(n / 1e3).toFixed(0)}K`;
  return `฿${Math.round(n).toLocaleString()}`;
}

// ─── Projection Engine ───────────────────────────────────────────────────────
function computeProjections(data: LineageData, lifeExpectancy: number, riskReturnOverride?: number): YrProj[] {
  const p    = data.profile ?? {};
  const plan = data.plan;
  const ls   = data.lifeStages ?? [];
  const currentAge    = Number(plan?.currentAge ?? 30);
  const retirementAge = Number(plan?.retirementAge ?? 60);
  const currentYear   = new Date().getFullYear();
  const annualSalary    = Number(p.annualSalary ?? 0);
  const monthlyExpenses = Number(p.monthlyExpenses ?? 0);
  const monthlyDebtPmt  = Number(p.monthlyDebtPayment ?? 0);
  const debtRate        = Number(p.debtInterestRate ?? 7) / 100;
  const ef              = Number(p.emergencyFundAmount ?? 0);
  const currentInvest = [p.goldAmount, p.cryptoAmount, p.etfAmount, p.thaiStockAmount, p.foreignStockAmount, p.otherInvestAmount, p.emergencyFundAmount]
    .reduce<number>((s, v) => s + Number(v ?? 0), 0);
  const startWealth      = Math.max(currentInvest, Number(plan?.currentSavings ?? 0));
  const initialDebt      = Number(p.totalDebt ?? 0);
  const riskReturn       = riskReturnOverride ?? (data.riskLevel === "aggressive" ? 0.08 : data.riskLevel === "conservative" ? 0.04 : 0.06);
  const inflationRate    = Number(plan?.inflationRate ?? 3) / 100;
  const retirementAnnual = Number(plan?.monthlyRetirementNeeds ?? 0) * 12 || monthlyExpenses * 12;
  const planMonthlyInvest: number | null = plan?.monthlyInvestable != null ? Number(plan.monthlyInvestable) : null;
  let netWorth = startWealth - initialDebt;
  let remDebt  = initialDebt;
  let curDebt  = monthlyDebtPmt;
  const out: YrProj[] = [];
  for (let age = currentAge; age <= lifeExpectancy; age++) {
    const yi        = age - currentAge;
    const isRetired = age >= retirementAge;
    const lifeStage = ls.find(s => age >= s.ageFrom && age <= s.ageTo) ?? null;
    let annualIncome = 0, annualSavings = 0;
    if (!isRetired) {
      annualIncome = annualSalary * Math.pow(1.03, yi);
      const annualExp = monthlyExpenses * 12 * Math.pow(1 + inflationRate, yi);
      if (remDebt > 0) {
        const interest = remDebt * debtRate;
        remDebt = Math.max(0, remDebt + interest - curDebt * 12);
        if (remDebt <= 0) { remDebt = 0; curDebt = 0; }
      }
      if (planMonthlyInvest != null && planMonthlyInvest > 0) {
        const monthly = planMonthlyInvest + (curDebt === 0 ? monthlyDebtPmt : 0);
        annualSavings = Math.max(0, monthly * 12 * Math.pow(1.03, yi));
      } else {
        annualSavings = Math.max(0, annualIncome - annualExp - curDebt * 12);
      }
      netWorth = (netWorth + annualSavings) * (1 + riskReturn);
    } else {
      netWorth = netWorth * 1.04 - retirementAnnual * Math.pow(1 + inflationRate, age - retirementAge);
    }
    let h = 55;
    if (ef >= monthlyExpenses * 3) h += 8;
    if (ef >= monthlyExpenses * 6) h += 5;
    if (remDebt === 0 && initialDebt > 0) h += 8;
    if (netWorth > annualSalary * 5) h += 10;
    if (netWorth < 0) h -= 20;
    out.push({ age, year: currentYear + yi, netWorth: Math.max(0, netWorth), annualIncome, annualSavings,
      happiness: Math.max(10, Math.min(98, h)), lifeStage, isRetired, isBroke: netWorth <= 0 && isRetired });
  }
  return out;
}

// ─── Auto Events ─────────────────────────────────────────────────────────────
function genAutoEvents(data: LineageData, projections: YrProj[]): TlEvent[] {
  const evs: TlEvent[] = [];
  const plan = data.plan;
  const p    = data.profile ?? {};
  const currentAge    = Number(plan?.currentAge ?? 30);
  const retirementAge = Number(plan?.retirementAge ?? 60);
  const now = new Date().getFullYear();
  data.goals.forEach(g => {
    if (g.targetDate) {
      const age = currentAge + (new Date(g.targetDate).getFullYear() - now);
      if (age > currentAge && age <= 100)
        evs.push({ id: `g_${g.id}`, age, eventType: "goal", impact: "positive",
          title: `🏆 ${g.name}`, description: `฿${Number(g.targetAmount).toLocaleString()}`, isAuto: true, isAI: false });
    }
  });
  evs.push({ id: "retirement", age: retirementAge, eventType: "life_stage", impact: "positive",
    title: "🌅 เกษียณ", description: "เริ่มบทใหม่", isAuto: true, isAI: false });
  const totalDebt = Number(p.totalDebt ?? 0), mDebt = Number(p.monthlyDebtPayment ?? 0);
  if (totalDebt > 0 && mDebt > 0) {
    const dfAge = currentAge + Math.ceil(totalDebt / (mDebt * 12));
    if (dfAge < retirementAge && dfAge > currentAge)
      evs.push({ id: "debt_free", age: dfAge, eventType: "happy", impact: "positive",
        title: "🎉 ปลอดหนี้!", description: `฿${totalDebt.toLocaleString()}`, isAuto: true, isAI: false });
  }
  const ef = Number(p.emergencyFundAmount ?? 0), me = Number(p.monthlyExpenses ?? 0);
  if (me > 0 && ef < me * 3)
    evs.push({ id: "ef_gap", age: currentAge, eventType: "crisis", impact: "negative",
      title: "⚠️ เงินสำรองน้อย", description: "ควรมี 3 เดือน", isAuto: true, isAI: false });
  const brokeP = projections.find(pr => pr.isBroke);
  if (brokeP)
    evs.push({ id: "broke", age: brokeP.age, eventType: "crisis", impact: "negative",
      title: "🚨 เงินอาจหมด", description: "ปรับแผนออมเพิ่ม", isAuto: true, isAI: false });
  return evs;
}

// ─── Investment Timeline Events ─────────────────────────────────────────────────
function genInvestmentTimelineEvents(
  data: LineageData,
  projections: YrProj[]
): { negative: TlEvent[]; positive: TlEvent[] } {
  const neg: TlEvent[] = [];
  const pos: TlEvent[] = [];
  const plan = data.plan;
  const currentAge    = Number(plan?.currentAge ?? 30);
  const retirementAge = Number(plan?.retirementAge ?? 60);
  const riskLevel     = data.riskLevel ?? "moderate";
  const lastAge       = projections[projections.length - 1]?.age ?? retirementAge;

  const corrInfo = riskLevel === "aggressive"
    ? { pct: "−28~50%", desc: "Aggressive กระทบหนัก" }
    : riskLevel === "conservative"
    ? { pct: "−8~18%",  desc: "Conservative ผันผวนน้อย" }
    : { pct: "−15~25%", desc: "Moderate กระทบปานกลาง" };

  // Market corrections every ~7 years
  for (let yr = 7; currentAge + yr <= lastAge; yr += 7) {
    const age = currentAge + yr;
    neg.push({
      id: `mkt_${age}`, age, eventType: "crisis", impact: "negative",
      title: "📉 วิกฤตตลาด",
      description: `${corrInfo.pct} · ${corrInfo.desc}`,
      isAuto: true, isAI: false,
    });
  }

  // Inflation warning every 10 years
  for (let yr = 10; currentAge + yr <= lastAge; yr += 10) {
    const age   = currentAge + yr;
    const cumPct = Math.round((Math.pow(1.03, yr) - 1) * 100);
    neg.push({
      id: `inf_${age}`, age, eventType: "crisis", impact: "negative",
      title: "🔥 เงินเฟ้อสะสม",
      description: `ค่าเงินลดลงราว ${cumPct}%`,
      isAuto: true, isAI: false,
    });
  }

  // Pre-retirement de-risk (5 years before)
  const preRetAge = retirementAge - 5;
  if (preRetAge > currentAge) {
    neg.push({
      id: "pre_ret", age: preRetAge, eventType: "crisis", impact: "negative",
      title: "⚠️ ลดความเสี่ยงพอร์ต",
      description: "โยกไป Bond/Cash ก่อนเกษียณ",
      isAuto: true, isAI: false,
    });
  }

  // Net worth milestones (positive)
  for (const m of [1_000_000, 5_000_000, 10_000_000, 20_000_000, 50_000_000]) {
    const crossed = projections.find((pr, i) => pr.netWorth >= m && (i === 0 || projections[i - 1].netWorth < m));
    if (crossed) {
      pos.push({
        id: `nw_${m}`, age: crossed.age, eventType: "goal", impact: "positive",
        title: `🏆 Net Worth ${m >= 1e6 ? (m / 1e6).toFixed(0) + "M" : (m / 1e3).toFixed(0) + "K"}`,
        description: "ไมล์สโตนสำคัญ 🎉",
        isAuto: true, isAI: false,
      });
    }
  }

  return { negative: neg, positive: pos };
}

// ─── Awareness Items ─────────────────────────────────────────────────────────
function genAwarenessItems(
  age: number, proj: YrProj, data: LineageData,
  projections: YrProj[], fullGoals: FullGoal[]
): AwarenessItem[] {
  const items: AwarenessItem[] = [];
  const p    = data.profile ?? {};
  const plan = data.plan;
  const retirementAge = Number(plan?.retirementAge ?? 60);
  const currentAge    = Number(plan?.currentAge ?? 30);
  const now           = new Date().getFullYear();

  // Goal-specific awareness at projected completion age
  fullGoals.forEach(g => {
    const months = g.projection.monthsRemaining;
    if (months === null) return;
    const projAge = currentAge + Math.ceil(months / 12);
    if (projAge === age) {
      if (g.projection.onTrack)
        items.push({ text: `ถึงเป้า "${g.name}" — ${thb(Number(g.targetAmount))} 🎯 อยู่ในแผน`, type: "good" });
      else
        items.push({ text: `เป้าหมาย "${g.name}" อาจล่าช้า — พิจารณาเพิ่มยอดออมต่อเดือน`, type: "warn" });
    }
  });
  // Goals from rawData that have a targetDate aligning with this age
  data.goals.forEach(g => {
    if (!g.targetDate) return;
    const goalAge = currentAge + (new Date(g.targetDate).getFullYear() - now);
    if (goalAge === age) {
      const currentAmt = fullGoals.find(fg => fg.id === g.id);
      if (currentAmt) {
        const gap = Number(g.targetAmount) - Number(currentAmt.currentAmount);
        if (gap > 0)
          items.push({ text: `เป้าหมาย "${g.name}" ยังขาดอยู่ ${thb(gap)} — เร่งออมเพิ่ม`, type: "warn" });
        else
          items.push({ text: `เป้าหมาย "${g.name}" ถึงเป้าแล้ว ${thb(Number(g.targetAmount))} 🎉`, type: "good" });
      }
    }
  });

  if (proj.isBroke)
    items.push({ text: "เงินออมอาจหมดในช่วงอายุนี้ — ต้องปรับแผนเร่งด่วน", type: "warn" });
  if (!proj.isRetired && age >= retirementAge - 5)
    items.push({ text: `เหลืออีก ${retirementAge - age} ปีก่อนเกษียณ — เพิ่มการออมให้สูงสุดและลดความเสี่ยงพอร์ต`, type: "warn" });
  if (age === retirementAge)
    items.push({ text: "ปีเกษียณ — ปรับพอร์ตเป็น Conservative เพื่อรักษาเงินต้น วางแผนรายได้", type: "info" });
  if (proj.isRetired && age > retirementAge) {
    const futureBroke = projections.filter(pr => pr.age > age && pr.isBroke);
    if (futureBroke.length === 0)
      items.push({ text: "แผนเกษียณแข็งแกร่ง — ทรัพย์สินเพียงพอตลอดช่วงชีวิตที่เหลือ", type: "good" });
    else
      items.push({ text: `คาดว่าเงินออมจะหมดที่อายุ ${futureBroke[0].age} ปี — พิจารณาลดรายจ่ายหรือหารายได้เสริม`, type: "warn" });
  }
  if (age <= currentAge + 1) {
    const ef = Number(p.emergencyFundAmount ?? 0), me = Number(p.monthlyExpenses ?? 0);
    if (me > 0 && ef < me * 3)
      items.push({ text: `เงินฉุกเฉินไม่เพียงพอ — มี ${compact(ef)} ควรมีอย่างน้อย ${compact(me * 3)}`, type: "warn" });
    const totalDebt = Number(p.totalDebt ?? 0), annSal = Number(p.annualSalary ?? 0);
    if (annSal > 0 && totalDebt > annSal * 3)
      items.push({ text: `หนี้สูงเกินไป (${compact(totalDebt)}) — ควรเร่งชำระก่อนลงทุน`, type: "warn" });
  }
  if (age % 10 === 0)
    items.push({ text: `วัย ${age} — ทบทวนประกันชีวิต แผนมรดก และเป้าหมายการเงินทั้งหมด`, type: "info" });
  const prevNW = projections.find(pr => pr.age === age - 1)?.netWorth ?? 0;
  if (proj.netWorth >= 10_000_000 && prevNW < 10_000_000)
    items.push({ text: "Net Worth ผ่าน 10 ล้านบาท — ถึงเวลาวางแผนภาษีขั้นสูงและมรดก", type: "good" });
  if (!proj.isRetired && proj.annualSavings > 0 && proj.happiness >= 75)
    items.push({ text: "การออมอยู่ในเกณฑ์ดี — พิจารณาเพิ่มสินทรัพย์ที่ให้ผลตอบแทนสูงขึ้น", type: "good" });
  return items;
}

// ─── Add Event Modal ─────────────────────────────────────────────────────────
function UnifiedAddModal({ currentAge, lifeExpectancy, defaultAge, onEventSave, onGoalSave, onClose }: {
  currentAge: number; lifeExpectancy: number; defaultAge: number;
  onEventSave: (ev: TlEvent) => void;
  onGoalSave: (g: FullGoal) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<"pick" | "event" | "goal">("pick");

  // Event form state
  const [age,       setAge]       = useState(String(defaultAge));
  const [eventType, setEventType] = useState("custom");
  const [impact,    setImpact]    = useState("positive");
  const [title,     setTitle]     = useState("");
  const [desc,      setDesc]      = useState("");

  // Goal form state
  const [goalForm, setGoalForm] = useState(EMPTY_GOAL);
  const [goalErr,  setGoalErr]  = useState("");

  const [saving, setSaving] = useState(false);

  async function handleEventSave() {
    if (!title.trim() || !age) return;
    setSaving(true);
    try {
      const ageNum  = Number(age);
      const yearNum = new Date().getFullYear() + (ageNum - currentAge);
      const res     = await fetch("/api/lineage/events", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ age: ageNum, eventYear: yearNum, eventType, impact, title: title.trim(), description: desc.trim() || null }),
      });
      const data = await res.json();
      if (data.data) {
        onEventSave({ id: data.data.id, age: ageNum, eventType, impact, title: title.trim(), description: desc.trim() || null, isAuto: false, isAI: false });
        onClose();
      }
    } finally { setSaving(false); }
  }

  const goalSet = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setGoalForm(p => ({ ...p, [k]: e.target.value }));

  async function handleGoalSave(e: React.FormEvent) {
    e.preventDefault();
    const tNum = parseFloat(goalForm.targetAmount) || 0;
    if (!goalForm.name.trim() || tNum <= 0) { setGoalErr("กรุณากรอกชื่อและจำนวนเงิน"); return; }
    setSaving(true);
    const res = await fetch("/api/goals", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: goalForm.name, goalType: goalForm.goalType,
        targetAmount: tNum, currentAmount: parseFloat(goalForm.currentAmount) || 0,
        monthlyContribution: parseFloat(goalForm.monthlyContribution) || 0,
        annualReturnRate: parseFloat(goalForm.annualReturnRate) || 0,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setGoalErr(data.error ?? "เกิดข้อผิดพลาด"); return; }
    onGoalSave(data.data);
    onClose();
  }

  const goalType = getGoalType(goalForm.goalType);

  const stepTitle = step === "pick" ? "เพิ่มอะไร?" : step === "event" ? "เพิ่มเหตุการณ์ชีวิต" : "เพิ่มเป้าหมายการเงิน";

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>

        {/* Modal header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            {step !== "pick" && (
              <button onClick={() => setStep("pick")} className="text-slate-400 hover:text-slate-600 transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <h3 className="font-bold text-slate-800 text-lg">{stepTitle}</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>

        {/* Step: Pick type */}
        {step === "pick" && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setStep("event")}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-slate-200 hover:border-violet-400 hover:bg-violet-50 transition-all group">
              <span className="text-3xl">📅</span>
              <div className="text-center">
                <p className="font-bold text-slate-800 text-sm group-hover:text-violet-700">เหตุการณ์ชีวิต</p>
                <p className="text-[11px] text-slate-400 mt-0.5">บันทึกเหตุการณ์ในไทม์ไลน์</p>
              </div>
            </button>
            <button
              onClick={() => setStep("goal")}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-slate-200 hover:border-violet-400 hover:bg-violet-50 transition-all group">
              <span className="text-3xl">🏆</span>
              <div className="text-center">
                <p className="font-bold text-slate-800 text-sm group-hover:text-violet-700">เป้าหมายการเงิน</p>
                <p className="text-[11px] text-slate-400 mt-0.5">ตั้งเป้าและติดตามความคืบหน้า</p>
              </div>
            </button>
          </div>
        )}

        {/* Step: Add event */}
        {step === "event" && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">ชื่อเหตุการณ์</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="เช่น ซื้อบ้านหลังแรก, ลูกเกิด" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">อายุ (ปี)</label>
                <input type="number" min={currentAge} max={lifeExpectancy} value={age} onChange={e => setAge(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">ประเภท</label>
                <select value={eventType} onChange={e => setEventType(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
                  <option value="happy">😊 ความสุข</option>
                  <option value="goal">🏆 เป้าหมาย</option>
                  <option value="crisis">⚠️ ความท้าทาย</option>
                  <option value="allocation">📊 ปรับพอร์ต</option>
                  <option value="custom">📌 อื่นๆ</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">ผลกระทบ</label>
              <div className="grid grid-cols-3 gap-2">
                {(["positive", "neutral", "negative"] as const).map(v => (
                  <button key={v} onClick={() => setImpact(v)} className={cn("rounded-xl py-2 text-xs font-semibold border transition-all", impact === v ? "bg-violet-600 text-white border-violet-600" : "border-slate-200 text-slate-600 hover:border-violet-400")}>
                    {v === "positive" ? "😊 บวก" : v === "neutral" ? "😐 กลาง" : "😟 ลบ"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">รายละเอียด</label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} placeholder="เพิ่มเติม..." className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none" />
            </div>
            <button onClick={handleEventSave} disabled={saving || !title.trim()} className="w-full bg-violet-600 text-white font-bold py-3 rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-all text-sm">
              {saving ? "กำลังบันทึก..." : "บันทึกเหตุการณ์"}
            </button>
          </div>
        )}

        {/* Step: Add goal */}
        {step === "goal" && (
          <form onSubmit={handleGoalSave} className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {GOAL_TYPES.map(t => (
                <button key={t.value} type="button"
                  onClick={() => setGoalForm(p => ({ ...p, goalType: t.value }))}
                  className={cn(
                    "flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border font-medium transition-all",
                    goalForm.goalType === t.value ? "text-white border-transparent" : "text-slate-500 hover:border-slate-400"
                  )}
                  style={goalForm.goalType === t.value ? { background: goalType.color, borderColor: goalType.color } : {}}>
                  <t.Icon className="h-3 w-3" />{t.label}
                </button>
              ))}
            </div>
            <input required value={goalForm.name} onChange={goalSet("name")}
              placeholder="ชื่อ เช่น ซื้อบ้าน, กองทุนฉุกเฉิน"
              className="w-full h-9 rounded-xl border px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-violet-300" />
            <div className="grid grid-cols-2 gap-2">
              {[
                { k: "targetAmount",        label: "เป้า (฿)",          req: true  },
                { k: "currentAmount",       label: "มีแล้ว (฿)",        req: false },
                { k: "monthlyContribution", label: "ออม/เดือน (฿)",     req: false },
                { k: "annualReturnRate",    label: "ผลตอบแทน (%/ปี)",  req: false },
              ].map(({ k, label, req }) => (
                <div key={k}>
                  <label className="text-[11px] font-semibold text-slate-500">{label}</label>
                  <input required={req} type="number" min={0}
                    step={k === "annualReturnRate" ? 0.5 : 1}
                    value={(goalForm as Record<string, string>)[k]}
                    onChange={goalSet(k)}
                    className="w-full h-9 rounded-xl border px-3 text-sm bg-background mt-0.5 focus:outline-none focus:ring-2 focus:ring-violet-300" />
                </div>
              ))}
            </div>
            {goalErr && <p className="text-xs text-red-500">{goalErr}</p>}
            <button type="submit" disabled={saving}
              className="w-full h-10 rounded-xl bg-violet-600 text-white text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-violet-700 disabled:opacity-60">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              บันทึกเป้าหมาย
            </button>
          </form>
        )}

      </div>
    </div>
  );
}

// ─── Goal Ring ────────────────────────────────────────────────────────────────
function GoalRing({ pct, color, size = 52 }: { pct: number; color: string; size?: number }) {
  const r    = (size - 8) / 2;
  const c    = 2 * Math.PI * r;
  const dash = c * Math.min(pct, 100) / 100;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={6} stroke="currentColor" className="text-slate-100" fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={6} stroke={pct >= 100 ? "#10b981" : color}
        fill="none" strokeDasharray={`${dash.toFixed(1)} ${c.toFixed(1)}`} strokeLinecap="round" />
    </svg>
  );
}

// ─── Goal Row Card ────────────────────────────────────────────────────────────
function GoalRowCard({ goal, onDelete, onUpdate }: {
  goal: FullGoal;
  onDelete: (id: string) => void;
  onUpdate: (g: FullGoal) => void;
}) {
  const type    = getGoalType(goal.goalType);
  const pct     = goal.projection.progressPercent;
  const current = Number(goal.currentAmount);
  const target  = Number(goal.targetAmount);
  const monthly = Number(goal.monthlyContribution);
  const left    = Math.max(0, target - current);
  const done    = pct >= 100;

  const [deleting, setDeleting] = useState(false);
  const [editing,  setEditing]  = useState(false);
  const [editForm, setEditForm] = useState({
    name: goal.name, targetAmount: goal.targetAmount,
    currentAmount: goal.currentAmount, monthlyContribution: goal.monthlyContribution,
    annualReturnRate: goal.annualReturnRate,
  });
  const [saving, setSaving] = useState(false);

  const handleDelete = async () => {
    if (!confirm("ลบเป้าหมายนี้?")) return;
    setDeleting(true);
    await fetch(`/api/goals/${goal.id}`, { method: "DELETE" });
    onDelete(goal.id);
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch(`/api/goals/${goal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editForm.name,
        targetAmount: Number(editForm.targetAmount),
        currentAmount: Number(editForm.currentAmount),
        monthlyContribution: Number(editForm.monthlyContribution),
        annualReturnRate: Number(editForm.annualReturnRate),
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok && data.data) { onUpdate(data.data); setEditing(false); }
  };

  const setE = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setEditForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="h-0.5 w-full" style={{ background: type.color }} />
      <div className="p-3 flex items-center gap-3">
        <GoalRing pct={pct} color={type.color} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <div>
              <p className="text-sm font-bold text-slate-800 leading-tight">{goal.name}</p>
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <type.Icon className="h-3 w-3" style={{ color: type.color }} />
                {type.label}
                {done
                  ? <span className="text-emerald-600 font-semibold ml-1">· ✓ ถึงเป้าแล้ว!</span>
                  : <span className="ml-1">· ขาดอีก {thb(left)}</span>}
              </p>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <button onClick={() => setEditing(v => !v)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                {editing ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors">
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-xs">
            <span className="text-slate-400 tabular-nums">{thb(current)}/{thb(target)}</span>
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full"
                style={{ width: `${Math.min(pct, 100)}%`, background: done ? "#10b981" : type.color }} />
            </div>
            <span className="font-bold tabular-nums" style={{ color: done ? "#10b981" : type.color }}>
              {pct.toFixed(0)}%
            </span>
          </div>
          {monthly > 0 && !done && (
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <Flame className="h-3 w-3 text-orange-400" />
              ออม {thb(monthly)}/เดือน
              {goal.projection.projectedCompletionDate && (
                <span className="ml-1">· คาดถึงเป้า {goal.projection.projectedCompletionDate.slice(0, 7)}</span>
              )}
            </p>
          )}
        </div>
      </div>
      {editing && (
        <div className="px-3 pb-3 border-t border-slate-50 space-y-2 pt-2">
          <input value={editForm.name} onChange={setE("name")} placeholder="ชื่อเป้าหมาย"
            className="w-full h-8 rounded-lg border px-2.5 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-violet-300" />
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { k: "targetAmount",        p: "เป้าหมาย (฿)" },
              { k: "currentAmount",       p: "มีแล้ว (฿)" },
              { k: "monthlyContribution", p: "ออม/เดือน (฿)" },
              { k: "annualReturnRate",    p: "ผลตอบแทน (%)" },
            ].map(({ k, p }) => (
              <input key={k} type="number" min={0} placeholder={p}
                value={(editForm as Record<string, string>)[k]}
                onChange={setE(k)}
                className="h-8 rounded-lg border px-2.5 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-violet-300" />
            ))}
          </div>
          <div className="flex gap-1.5">
            <button onClick={handleSave} disabled={saving}
              className="h-7 px-3 rounded-lg bg-violet-600 text-white text-xs font-semibold flex items-center gap-1 disabled:opacity-60 hover:bg-violet-700">
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
              บันทึก
            </button>
            <button onClick={() => setEditing(false)}
              className="h-7 px-2.5 rounded-lg border text-xs hover:bg-slate-50">ยกเลิก</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Inline Add Goal ──────────────────────────────────────────────────────────
const EMPTY_GOAL = {
  name: "", goalType: "custom", targetAmount: "",
  currentAmount: "0", monthlyContribution: "", annualReturnRate: "7",
};

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function LineagePage() {
  const [rawData,        setRawData]        = useState<LineageData | null>(null);
  const [lifeExpectancy, setLifeExpectancy] = useState(() => {
    if (typeof window !== "undefined") {
      const v = Number(localStorage.getItem("mf_life_expectancy"));
      if (v >= 70 && v <= 100) return v;
    }
    return 85;
  });
  const [selectedAge,    setSelectedAge]    = useState(30);
  const [currentAgeLocal, setCurrentAgeLocal] = useState(30);
  const [avatarId,       setAvatarId]       = useState("human");
  const [scenario,       setScenario]       = useState<"conservative" | "moderate" | "aggressive" | "plan">("plan");
  const [manualEvents,   setManualEvents]   = useState<TlEvent[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [fullGoals,      setFullGoals]      = useState<FullGoal[]>([]);
  const timelineRef = useRef<HTMLDivElement>(null);

  const saveCurrentAge = useCallback((age: number) => {
    fetch("/api/user/financial-plan", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentAge: age }),
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/lineage")
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => {
        const age = Number(d.plan?.currentAge ?? 30);
        setRawData(d);
        setSelectedAge(age);
        setCurrentAgeLocal(age);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    fetch("/api/goals")
      .then(r => r.json())
      .then(d => setFullGoals(d.data ?? []))
      .catch(() => {});
  }, []);

  const planExpectedReturn = rawData?.plan?.expectedReturn != null ? Number(rawData.plan.expectedReturn) / 100 : null;
  const activeScenarioRate = planExpectedReturn ?? 0.06;
  const projections = useMemo(() => rawData ? computeProjections(rawData, lifeExpectancy, activeScenarioRate) : [], [rawData, lifeExpectancy, activeScenarioRate]);
  const maxNetWorth  = useMemo(() => Math.max(...projections.map(p => p.netWorth), 1), [projections]);
  const scenarioColor = planExpectedReturn !== null ? "#0ea5e9" : "#7c3aed";
  const events = useMemo(() => {
    if (!rawData) return [];
    return [...rawData.savedEvents, ...manualEvents, ...genAutoEvents(rawData, projections)];
  }, [rawData, projections, manualEvents]);

  const startAge     = projections[0]?.age ?? 18;
  const endAge       = projections[projections.length - 1]?.age ?? lifeExpectancy;
  const selectedProj = projections.find(pr => pr.age === selectedAge) ?? projections[0];
  const eventsAtAge  = events.filter(e => e.age === selectedAge);
  const awarenessItems = useMemo(
    () => rawData && selectedProj ? genAwarenessItems(selectedAge, selectedProj, rawData, projections, fullGoals) : [],
    [selectedAge, selectedProj, rawData, projections, fullGoals]
  );
  const avatar = AVATARS.find(a => a.id === avatarId) ?? AVATARS[0];

  const investEvents = useMemo(
    () => rawData ? genInvestmentTimelineEvents(rawData, projections) : { negative: [], positive: [] },
    [rawData, projections]
  );

  const timelineRows = useMemo(() => {
    return projections.map(pr => {
      const evNeg = [
        ...events.filter(e => e.age === pr.age && e.impact === "negative"),
        ...investEvents.negative.filter(e => e.age === pr.age),
      ];
      const evPos = [
        ...events.filter(e => e.age === pr.age && e.impact !== "negative"),
        ...investEvents.positive.filter(e => e.age === pr.age),
      ];
      return { age: pr.age, proj: pr, negative: evNeg, positive: evPos };
    });
  }, [projections, events, investEvents]);

  useEffect(() => {
    if (!timelineRef.current) return;
    const el = timelineRef.current.querySelector(`[data-age="${selectedAge}"]`);
    if (el) (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "center" });
  }, [selectedAge]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
      <RefreshCw className="h-5 w-5 animate-spin mr-2" /> กำลังโหลด...
    </div>
  );
  if (!rawData) return <div className="p-8 text-muted-foreground">ไม่สามารถโหลดข้อมูลได้</div>;

  const plan          = rawData.plan;
  const currentAge_   = Number(plan?.currentAge ?? 30);
  const retirementAge = Number(plan?.retirementAge ?? 60);
  const timelineH     = (endAge - startAge + 1) * PX_PER_YEAR;
  const currentProj   = projections.find(pr => pr.age === currentAge_);

  const handleGoalAdded = (g: FullGoal) => {
    setFullGoals(prev => [g, ...prev]);
    setRawData(prev => prev ? {
      ...prev,
      goals: [...prev.goals, { id: g.id, name: g.name, targetAmount: Number(g.targetAmount), targetDate: null, goalType: g.goalType }],
    } : prev);
  };

  const handleGoalDelete = (id: string) => {
    setFullGoals(prev => prev.filter(g => g.id !== id));
    setRawData(prev => prev ? { ...prev, goals: prev.goals.filter(g => g.id !== id) } : prev);
  };

  const handleGoalUpdate = (updated: FullGoal) => {
    setFullGoals(prev => prev.map(g => g.id === updated.id ? updated : g));
    setRawData(prev => prev ? {
      ...prev,
      goals: prev.goals.map(g => g.id === updated.id
        ? { ...g, name: updated.name, targetAmount: Number(updated.targetAmount) }
        : g),
    } : prev);
  };

  return (
    <div className="flex flex-col bg-slate-50"
      style={{
        position: "fixed",
        top: 0,
        left: "15rem",   /* sidebar w-60 = 15rem */
        right: 0,
        bottom: 0,
        overflow: "hidden",
        zIndex: 10,
      }}
    >

      {/* Header / Shared Tab Nav */}
      <div className="flex-shrink-0 bg-white border-b border-slate-100">
        <div className="flex items-center px-5">
          <div className="flex gap-0 flex-1 -mb-px overflow-x-auto">
            <Link
              href="/financial-plan"
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/40"
            >
              <BarChart3 className="h-3.5 w-3.5 shrink-0" />
              Financial Analysis
            </Link>
            <span className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 border-primary text-primary">
              <GitBranch className="h-3.5 w-3.5 shrink-0" />
              Life Timeline
            </span>
          </div>
          <div className="flex items-center gap-3 ml-2 shrink-0">
            {/* Avatar picker */}
            <div className="flex items-center gap-0.5">
              {AVATARS.map(av => (
                <button key={av.id} onClick={() => setAvatarId(av.id)} title={av.label}
                  className={cn("w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all",
                    avatarId === av.id ? "bg-violet-100 ring-2 ring-violet-400" : "hover:bg-slate-100 text-slate-500"
                  )}>
                  {av.emoji}
                </button>
              ))}
            </div>
            {/* Age input */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-400">อายุ</span>
              <input
                type="number" min={18} max={80}
                value={currentAgeLocal}
                onChange={e => {
                  const v = Math.max(18, Math.min(80, Number(e.target.value) || 18));
                  setCurrentAgeLocal(v);
                  setSelectedAge(v);
                  setRawData(prev => prev && prev.plan ? { ...prev, plan: { ...prev.plan, currentAge: v } } : prev);
                  saveCurrentAge(v);
                }}
                className="w-12 border border-slate-200 rounded-md px-1.5 py-0.5 text-xs text-center focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
              <span className="text-xs text-slate-400">ปี</span>
            </div>
            {/* Life expectancy */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 whitespace-nowrap">ถึง</span>
              <input type="range" min={70} max={100} value={lifeExpectancy}
                onChange={e => { const v = Number(e.target.value); setLifeExpectancy(v); localStorage.setItem("mf_life_expectancy", String(v)); }}
                className="w-20 accent-violet-500" />
              <span className="text-xs font-semibold text-violet-600 w-5">{lifeExpectancy}</span>
            </div>
            {/* Scenario: show active rate (plan rate or default moderate) */}
            <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-3 py-1">
              <span className="text-[11px] font-semibold text-slate-500">อัตราผลตอบ:</span>
              {planExpectedReturn !== null ? (
                <span className="text-[11px] font-black" style={{ color: "#0ea5e9" }}>📈 {(planExpectedReturn * 100).toFixed(1)}%/ปี · จากแผน</span>
              ) : (
                <span className="text-[11px] font-black text-violet-500">6%/ปี · ค่าเริ่มต้น</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="flex-shrink-0 bg-white border-b border-slate-100 px-5 py-2 flex items-center gap-6 overflow-x-auto">
        {[
          { label: "Net Worth ตอนนี้",          value: compact(currentProj?.netWorth ?? 0),    color: "text-emerald-600" },
          { label: `เกษียณ (${retirementAge} ปี)`, value: compact(projections.find(p => p.age === retirementAge)?.netWorth ?? 0), color: "text-violet-600" },
          { label: "รายได้/ปี",   value: compact(currentProj?.annualIncome ?? 0), color: "text-sky-600" },
          { label: "ออมได้/ปี",   value: compact(currentProj?.annualSavings ?? 0), color: "text-amber-600" },
          { label: "เป้าหมาย",    value: `${fullGoals.length} รายการ`, color: "text-indigo-600" },
        ].map(s => (
          <div key={s.label} className="flex-shrink-0">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">{s.label}</p>
            <p className={cn("text-base font-black leading-none mt-0.5", s.color)}>{s.value}</p>
          </div>
        ))}
        <div className="ml-auto flex-shrink-0 flex items-center gap-1.5 text-[11px] text-slate-400">
          <span>อัตราผลตอบ:</span>
          <span className="font-bold" style={{ color: scenarioColor }}>
            {planExpectedReturn !== null ? `📈 จากแผน (${(planExpectedReturn * 100).toFixed(1)}%/ปี)` : "⚖️ ค่าเริ่มต้น (6%/ปี)"}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: Detail Panel */}
        <div className="w-80 flex-shrink-0 border-r border-slate-200 bg-white overflow-y-auto">
          {selectedProj ? (
            <div className="p-4 space-y-3">

              {/* Age header */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-2xl flex-shrink-0">
                  {selectedProj.lifeStage?.icon ?? "📅"}
                </div>
                <div>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-3xl font-black text-slate-900 leading-none">{selectedProj.age}</span>
                    <span className="text-xs text-slate-400">ปี · {selectedProj.year}</span>
                    {selectedProj.isRetired && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">เกษียณแล้ว</span>
                    )}
                  </div>
                  {selectedProj.lifeStage && (
                    <div className="mt-0.5">
                      <span className="text-xs font-bold" style={{ color: selectedProj.lifeStage.colorHex }}>
                        {selectedProj.lifeStage.titleTh}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1.5">{selectedProj.lifeStage.descriptionTh}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-1.5">
                <div className="bg-slate-50 rounded-xl p-2.5">
                  <p className="text-[9px] text-slate-400 uppercase tracking-wide">สินทรัพย์สุทธิ์</p>
                  <p className={cn("text-sm font-black leading-tight mt-0.5", selectedProj.netWorth > 0 ? "text-emerald-600" : "text-red-500")}>
                    {compact(selectedProj.netWorth)}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-2.5">
                  <p className="text-[9px] text-slate-400 uppercase tracking-wide">รายได้/ปี</p>
                  <p className="text-sm font-black text-slate-800 leading-tight mt-0.5">{compact(selectedProj.annualIncome)}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-2.5">
                  <p className="text-[9px] text-slate-400 uppercase tracking-wide">ออมได้/ปี</p>
                  <p className="text-sm font-black text-sky-600 leading-tight mt-0.5">{compact(selectedProj.annualSavings)}</p>
                </div>
              </div>

              {/* Awareness */}
              <div className="rounded-xl border border-slate-100 overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-50 bg-slate-50">
                  <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">สิ่งที่ควรรู้</p>
                </div>
                <div className="p-2 space-y-1.5">
                  {awarenessItems.length > 0 ? awarenessItems.map((item, i) => (
                    <div key={i} className={cn(
                      "flex items-start gap-2 px-2.5 py-2 rounded-lg text-xs leading-snug",
                      item.type === "warn" ? "bg-amber-50 text-amber-800" :
                      item.type === "good" ? "bg-emerald-50 text-emerald-800" :
                      "bg-blue-50 text-blue-800"
                    )}>
                      <span className="flex-shrink-0 leading-none mt-0.5">
                        {item.type === "warn" ? "⚠️" : item.type === "good" ? "✅" : "💡"}
                      </span>
                      <span>{item.text}</span>
                    </div>
                  )) : (
                    <div className="flex items-center gap-1.5 px-2.5 py-2 text-xs text-slate-400">
                      <span>✨</span> การเงินอยู่ในเส้นทางที่ดี
                    </div>
                  )}
                </div>
              </div>

              {/* Life stage allocation */}
              {selectedProj.lifeStage && (
                <div className="rounded-xl border border-slate-100 p-3">
                  <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide mb-2.5">
                    พอร์ตเป้าหมาย · {selectedProj.lifeStage.titleTh}
                  </p>
                  <div className="space-y-2">
                    {[
                      { label: "หุ้น · Equity",    pct: selectedProj.lifeStage.allocEquity, color: "#7c3aed" },
                      { label: "ตราสารหนี้ · Bond", pct: selectedProj.lifeStage.allocBond,   color: "#0ea5e9" },
                      { label: "เงินสด · Cash",     pct: selectedProj.lifeStage.allocCash,   color: "#10b981" },
                    ].map(item => (
                      <div key={item.label}>
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className="text-slate-600">{item.label}</span>
                          <span className="font-bold" style={{ color: item.color }}>{item.pct}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div style={{ width: `${item.pct}%`, background: item.color }} className="h-full rounded-full transition-all duration-300" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Goals */}
              <div className="rounded-xl border border-slate-100 overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-50 bg-slate-50 flex items-center justify-between">
                  <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    เป้าหมาย {fullGoals.length > 0 && `(${fullGoals.length})`}
                  </p>
                </div>
                <div className="p-2 space-y-1.5">
                  {fullGoals.length === 0 ? (
                    <div className="flex flex-col items-center py-5 text-slate-400 gap-2">
                      <Target className="h-7 w-7 opacity-25" />
                      <p className="text-xs text-center">ยังไม่มีเป้าหมายการเงิน</p>
                    </div>
                  ) : (
                    fullGoals.map(g => (
                      <GoalRowCard key={g.id} goal={g} onDelete={handleGoalDelete} onUpdate={handleGoalUpdate} />
                    ))
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm p-8 text-center">
              คลิก Timeline เพื่อดูข้อมูลแต่ละวัย
            </div>
          )}
        </div>

        {/* Right: Dual-Lane Timeline */}
        <div ref={timelineRef} className="flex-1 overflow-y-auto bg-slate-50 relative">

          {/* Sticky legend */}
          <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-sm border-b border-slate-200">
            <div className="grid grid-cols-[1fr_80px_1fr] gap-2 px-4 py-2.5">
              <span className="text-[10px] font-bold text-red-400 text-right">⚠️ ความเสี่ยง / วิกฤต</span>
              <span className="text-[10px] font-bold text-slate-400 text-center">อายุ</span>
              <span className="text-[10px] font-bold text-emerald-500">✅ ดี / เป้าหมาย</span>
            </div>
          </div>

          {/* Center vertical line */}
          <div className="absolute left-1/2 top-10 bottom-0 w-px bg-slate-200 -translate-x-px pointer-events-none" />

          <div className="relative">
            {timelineRows.map(row => {
              const isSelected = row.age === selectedAge;
              const isCurrent  = row.age === currentAge_;
              const isRetire   = row.age === retirementAge;
              const hasEvents  = row.negative.length > 0 || row.positive.length > 0;
              if (!hasEvents && row.age % 5 !== 0 && !isSelected && !isCurrent && !isRetire) return null;
              return (
                <div
                  key={row.age}
                  data-age={row.age}
                  onClick={() => setSelectedAge(row.age)}
                  className={cn(
                    "grid grid-cols-[1fr_80px_1fr] gap-2 px-3 py-2 cursor-pointer transition-colors border-b border-slate-100/50",
                    isSelected ? "bg-violet-50" : "hover:bg-white/70"
                  )}
                >
                  {/* LEFT: negative / risk events */}
                  <div className="flex flex-col gap-1 items-end min-h-[28px] justify-start">
                    {row.negative.map(ev => (
                      <div key={ev.id} className="rounded-lg bg-red-50 border border-red-100 px-2 py-1 text-[10px] text-red-700 text-right max-w-[240px]">
                        <p className="font-semibold leading-tight">{ev.title}</p>
                        {ev.description && <p className="opacity-60 leading-tight">{ev.description}</p>}
                        {!ev.isAuto && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              await fetch(`/api/lineage/events?id=${ev.id}`, { method: "DELETE" });
                              setManualEvents(prev => prev.filter(me => me.id !== ev.id));
                            }}
                            className="mt-0.5 opacity-40 hover:opacity-80 block ml-auto"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* CENTER: dot + age + avatar */}
                  <div className="flex flex-col items-center gap-0.5 relative z-10 pt-1">
                    <div className={cn(
                      "rounded-full border-2 border-white shadow flex items-center justify-center transition-all",
                      isSelected
                        ? "w-9 h-9 bg-violet-500 text-lg"
                        : isRetire
                        ? "w-5 h-5 bg-purple-500"
                        : isCurrent
                        ? "w-5 h-5 bg-amber-400"
                        : row.negative.length > 0
                        ? "w-3.5 h-3.5 bg-red-300"
                        : row.positive.length > 0
                        ? "w-3.5 h-3.5 bg-emerald-400"
                        : "w-2.5 h-2.5 bg-slate-300"
                    )}>
                      {isSelected && <span className="leading-none">{avatar.emoji}</span>}
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold leading-none",
                      isSelected ? "text-violet-600" :
                      isRetire   ? "text-purple-500" :
                      isCurrent  ? "text-amber-500" :
                      hasEvents  ? "text-slate-500" :
                      "text-slate-300"
                    )}>
                      {row.age}
                    </span>
                    {isRetire && <span className="text-[8px] text-purple-400 font-semibold -mt-0.5">เกษียณ</span>}
                    {isCurrent && !isSelected && <span className="text-[8px] text-amber-400 font-semibold -mt-0.5">ตอนนี้</span>}
                  </div>

                  {/* RIGHT: positive / milestone events */}
                  <div className="flex flex-col gap-1 min-h-[28px] justify-start">
                    {row.positive.map(ev => (
                      <div key={ev.id} className="rounded-lg bg-emerald-50 border border-emerald-100 px-2 py-1 text-[10px] text-emerald-700 max-w-[240px]">
                        <p className="font-semibold leading-tight">{ev.title}</p>
                        {ev.description && <p className="opacity-60 leading-tight">{ev.description}</p>}
                        {!ev.isAuto && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              await fetch(`/api/lineage/events?id=${ev.id}`, { method: "DELETE" });
                              setManualEvents(prev => prev.filter(me => me.id !== ev.id));
                            }}
                            className="mt-0.5 opacity-40 hover:opacity-80 block"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
