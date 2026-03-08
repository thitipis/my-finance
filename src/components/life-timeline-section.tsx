"use client";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  X, RefreshCw, ChevronLeft,
  Target, Trash2, Pencil, Loader2, CheckCircle2, Flame,
  TrendingUp, Shield, Home, GraduationCap, Zap, Star,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────
const PX_PER_YEAR = 36;

// ─── Avatar Options ───────────────────────────────────────────────────────────
const AVATARS = [
  { id: "human",     emoji: "🧑",  label: "Human" },
  { id: "panda",     emoji: "🐼",  label: "Panda" },
  { id: "fox",       emoji: "🦊",  label: "Fox" },
  { id: "cat",       emoji: "🐱",  label: "Cat" },
  { id: "robot",     emoji: "🤖",  label: "Robot" },
  { id: "astronaut", emoji: "🧑‍🚀", label: "Astronaut" },
];

// ─── Types ────────────────────────────────────────────────────────────────────
export interface LifeStage {
  id: string; ageFrom: number; ageTo: number;
  titleTh: string; descriptionTh: string; icon: string;
  allocEquity: number; allocBond: number; allocCash: number; colorHex: string;
}
export interface TlEvent {
  id: string; age: number; eventType: string; impact: string;
  title: string; description?: string | null; isAuto: boolean; isAI: boolean;
}
export interface YrProj {
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
export type FullGoal = {
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

const EMPTY_GOAL = {
  name: "", goalType: "custom", targetAmount: "",
  currentAmount: "0", monthlyContribution: "", annualReturnRate: "7",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

// ─── Projection Engine ────────────────────────────────────────────────────────
function computeProjections(data: LineageData, lifeExpectancy: number): YrProj[] {
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
  const riskReturn       = data.riskLevel === "aggressive" ? 0.08 : data.riskLevel === "conservative" ? 0.04 : 0.06;
  const inflationRate    = Number(plan?.inflationRate ?? 3) / 100;
  const retirementAnnual = Number(plan?.monthlyRetirementNeeds ?? 0) * 12 || monthlyExpenses * 12;
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
      annualSavings = Math.max(0, annualIncome - annualExp - curDebt * 12);
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

// ─── Auto Events ──────────────────────────────────────────────────────────────
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

// ─── Awareness Items ──────────────────────────────────────────────────────────
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

// ─── Goal Ring ─────────────────────────────────────────────────────────────────
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

// ─── Goal Row Card ─────────────────────────────────────────────────────────────
function GoalRowCard({ goal, onDelete, onUpdate }: {
  goal: FullGoal; onDelete: (id: string) => void; onUpdate: (g: FullGoal) => void;
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

// ─── Unified Add Modal ────────────────────────────────────────────────────────
function UnifiedAddModal({ currentAge, lifeExpectancy, defaultAge, onEventSave, onGoalSave, onClose }: {
  currentAge: number; lifeExpectancy: number; defaultAge: number;
  onEventSave: (ev: TlEvent) => void;
  onGoalSave: (g: FullGoal) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<"pick" | "event" | "goal">("pick");
  const [age,       setAge]       = useState(String(defaultAge));
  const [eventType, setEventType] = useState("custom");
  const [impact,    setImpact]    = useState("positive");
  const [title,     setTitle]     = useState("");
  const [desc,      setDesc]      = useState("");
  const [goalForm,  setGoalForm]  = useState(EMPTY_GOAL);
  const [goalErr,   setGoalErr]   = useState("");
  const [saving,    setSaving]    = useState(false);

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

  const goalType  = getGoalType(goalForm.goalType);
  const stepTitle = step === "pick" ? "เพิ่มอะไร?" : step === "event" ? "เพิ่มเหตุการณ์ชีวิต" : "เพิ่มเป้าหมายการเงิน";

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
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

        {step === "pick" && (
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setStep("event")}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-slate-200 hover:border-violet-400 hover:bg-violet-50 transition-all group">
              <span className="text-3xl">📅</span>
              <div className="text-center">
                <p className="font-bold text-slate-800 text-sm group-hover:text-violet-700">เหตุการณ์ชีวิต</p>
                <p className="text-[11px] text-slate-400 mt-0.5">บันทึกเหตุการณ์ในไทม์ไลน์</p>
              </div>
            </button>
            <button onClick={() => setStep("goal")}
              className="flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-slate-200 hover:border-violet-400 hover:bg-violet-50 transition-all group">
              <span className="text-3xl">🏆</span>
              <div className="text-center">
                <p className="font-bold text-slate-800 text-sm group-hover:text-violet-700">เป้าหมายการเงิน</p>
                <p className="text-[11px] text-slate-400 mt-0.5">ตั้งเป้าและติดตามความคืบหน้า</p>
              </div>
            </button>
          </div>
        )}

        {step === "event" && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">ชื่อเหตุการณ์</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="เช่น ซื้อบ้านหลังแรก, ลูกเกิด"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">อายุ (ปี)</label>
                <input type="number" min={currentAge} max={lifeExpectancy} value={age} onChange={e => setAge(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">ประเภท</label>
                <select value={eventType} onChange={e => setEventType(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
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
                  <button key={v} onClick={() => setImpact(v)} className={cn("rounded-xl py-2 text-xs font-semibold border transition-all",
                    impact === v ? "bg-violet-600 text-white border-violet-600" : "border-slate-200 text-slate-600 hover:border-violet-400")}>
                    {v === "positive" ? "😊 บวก" : v === "neutral" ? "😐 กลาง" : "😟 ลบ"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">รายละเอียด</label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} placeholder="เพิ่มเติม..."
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none" />
            </div>
            <button onClick={handleEventSave} disabled={saving || !title.trim()}
              className="w-full bg-violet-600 text-white font-bold py-3 rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-all text-sm">
              {saving ? "กำลังบันทึก..." : "บันทึกเหตุการณ์"}
            </button>
          </div>
        )}

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
                { k: "targetAmount",        label: "เป้า (฿)",         req: true  },
                { k: "currentAmount",       label: "มีแล้ว (฿)",       req: false },
                { k: "monthlyContribution", label: "ออม/เดือน (฿)",    req: false },
                { k: "annualReturnRate",    label: "ผลตอบแทน (%/ปี)", req: false },
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

// ─── Life Timeline Rail (left-panel only, controlled) ─────────────────────────
export function LifeTimelineRail({
  lifeExpectancy,
  selectedAge,
  onAgeChange,
  onDataReady,
}: {
  lifeExpectancy: number;
  selectedAge: number;
  onAgeChange: (age: number, proj: YrProj | null) => void;
  onDataReady?: (projections: YrProj[], events: TlEvent[], currentAge: number) => void;
}) {
  const [rawData,      setRawData]      = useState<LineageData | null>(null);
  const [manualEvents, setManualEvents] = useState<TlEvent[]>([]);
  const [avatarId,     setAvatarId]     = useState("human");
  const [isDragging,   setIsDragging]   = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/lineage")
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => setRawData(d))
      .catch(() => {});
  }, []);

  const projections = useMemo(
    () => rawData ? computeProjections(rawData, lifeExpectancy) : [],
    [rawData, lifeExpectancy]
  );
  const events = useMemo(() => {
    if (!rawData) return [];
    return [...rawData.savedEvents, ...manualEvents, ...genAutoEvents(rawData, projections)];
  }, [rawData, projections, manualEvents]);

  // Report data to parent whenever projections/events change
  useEffect(() => {
    if (rawData && projections.length > 0)
      onDataReady?.(projections, events, Number(rawData.plan?.currentAge ?? 30));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projections, events]);

  const startAge      = projections[0]?.age ?? 18;
  const endAge        = projections[projections.length - 1]?.age ?? lifeExpectancy;
  const currentAge_   = Number(rawData?.plan?.currentAge ?? 30);
  const retirementAge = Number(rawData?.plan?.retirementAge ?? 60);
  const timelineH     = (endAge - startAge + 1) * PX_PER_YEAR;
  const avatar        = AVATARS.find(a => a.id === avatarId) ?? AVATARS[0];

  const getAgeFromY = useCallback((clientY: number): number => {
    if (!timelineRef.current) return selectedAge;
    const rect = timelineRef.current.getBoundingClientRect();
    const y    = clientY - rect.top + timelineRef.current.scrollTop;
    return Math.max(startAge, Math.min(endAge, Math.round(y / PX_PER_YEAR) + startAge));
  }, [startAge, endAge, selectedAge]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const age = getAgeFromY(e.clientY);
    onAgeChange(age, projections.find(p => p.age === age) ?? null);
  }, [getAgeFromY, projections, onAgeChange]);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      const age = getAgeFromY(e.clientY);
      onAgeChange(age, projections.find(p => p.age === age) ?? null);
    };
    const onUp = () => setIsDragging(false);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup",   onUp);
    return () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
  }, [isDragging, getAgeFromY, projections, onAgeChange]);

  useEffect(() => {
    if (!timelineRef.current || isDragging) return;
    const col = timelineRef.current;
    const y   = (selectedAge - startAge) * PX_PER_YEAR;
    if (y < col.scrollTop + 48 || y > col.scrollTop + col.clientHeight - 48)
      col.scrollTo({ top: y - col.clientHeight / 2, behavior: "smooth" });
  }, [selectedAge, startAge, isDragging]);

  if (!rawData || projections.length === 0) return (
    <div className="w-48 flex-shrink-0 border-r border-slate-200 bg-white flex items-center justify-center">
      <RefreshCw className="h-4 w-4 animate-spin text-slate-300" />
    </div>
  );

  return (
    <div className="flex flex-col w-48 flex-shrink-0 border-r border-slate-200 bg-white">
      {/* Avatar picker */}
      <div className="px-2 py-1.5 border-b border-slate-100 flex items-center gap-0.5 justify-center flex-wrap">
        {AVATARS.map(av => (
          <button key={av.id} onClick={() => setAvatarId(av.id)} title={av.label}
            className={cn("w-6 h-6 rounded text-xs flex items-center justify-center transition-all",
              avatarId === av.id ? "bg-violet-100 ring-1 ring-violet-400" : "hover:bg-slate-50"
            )}>
            {av.emoji}
          </button>
        ))}
      </div>
      {/* Timeline scroll */}
      <div
        ref={timelineRef}
        onMouseDown={handleMouseDown}
        className="flex-1 overflow-y-auto overflow-x-hidden"
        style={{ cursor: isDragging ? "grabbing" : "pointer", userSelect: "none" }}
      >
        <div style={{ height: timelineH, position: "relative" }}>
          {rawData.lifeStages.map(stage => {
            const top = (Math.max(stage.ageFrom, startAge) - startAge) * PX_PER_YEAR;
            const h   = (Math.min(stage.ageTo, endAge) - Math.max(stage.ageFrom, startAge) + 1) * PX_PER_YEAR;
            if (h <= 0) return null;
            return (
              <div key={stage.id} style={{ position: "absolute", left: 0, right: 0, top, height: h, background: `${stage.colorHex}10`, borderTop: `1.5px solid ${stage.colorHex}30` }}>
                <span style={{ color: stage.colorHex }} className="text-[9px] font-bold absolute left-11 top-1 select-none whitespace-nowrap">
                  {stage.icon} {stage.titleTh}
                </span>
              </div>
            );
          })}
          <div style={{ position: "absolute", left: 36, top: 0, bottom: 0, width: 2, background: "#e2e8f0" }} />
          {projections.map(pr => {
            const top        = (pr.age - startAge) * PX_PER_YEAR;
            const isSelected = pr.age === selectedAge;
            const isCurrent  = pr.age === currentAge_;
            const isRetire   = pr.age === retirementAge;
            const show       = pr.age % 5 === 0 || isCurrent || isRetire || isSelected;
            const rowEvents  = events.filter(e => e.age === pr.age);
            return (
              <div key={pr.age} style={{
                position: "absolute", left: 0, right: 0, top, height: PX_PER_YEAR,
                display: "flex", alignItems: "center",
                background: isSelected ? "#f5f3ff" : "transparent",
                transition: "background 0.1s",
              }}>
                <div style={{ width: 30, textAlign: "right", paddingRight: 4, flexShrink: 0 }}>
                  {show && (
                    <span style={{ fontSize: 10, fontFamily: "monospace",
                      fontWeight: isSelected || isCurrent || isRetire ? 800 : 500,
                      color: isCurrent ? "#d97706" : isRetire ? "#7c3aed" : isSelected ? "#7c3aed" : "#94a3b8" }}>
                      {pr.age}
                    </span>
                  )}
                </div>
                <div style={{ width: 8, flexShrink: 0, position: "relative", height: "100%" }}>
                  {(show || rowEvents.length > 0) && (
                    <div style={{
                      position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
                      width: isSelected ? 12 : isCurrent || isRetire ? 10 : 6,
                      height: isSelected ? 12 : isCurrent || isRetire ? 10 : 6,
                      borderRadius: "50%",
                      background: isSelected ? "#7c3aed" : isCurrent ? "#f59e0b" : isRetire ? "#8b5cf6" : "#cbd5e1",
                      border: isSelected ? "2px solid white" : "none",
                      boxShadow: isSelected ? "0 0 0 3px #7c3aed30" : "none", zIndex: 2,
                    }} />
                  )}
                </div>
                {isSelected && (
                  <div style={{ position: "absolute", left: 24, top: "50%", transform: "translateY(-50%)", zIndex: 10 }}
                    onMouseDown={e => { e.stopPropagation(); setIsDragging(true); }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%", background: "white",
                      border: "2px solid #7c3aed", fontSize: 18,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 2px 12px #7c3aed40",
                      cursor: isDragging ? "grabbing" : "grab",
                      transform: isDragging ? "scale(1.15)" : "scale(1)",
                      transition: "transform 0.1s",
                    }}>
                      {avatar.emoji}
                    </div>
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 2, marginLeft: 6, overflow: "hidden" }}>
                  {rowEvents.slice(0, 5).map(ev => (
                    <div key={ev.id} style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                      background: ev.impact === "positive" ? "#34d399" : ev.impact === "negative" ? "#f87171" : "#94a3b8" }} />
                  ))}
                  {rowEvents.length > 5 && <span style={{ fontSize: 8, color: "#94a3b8" }}>+{rowEvents.length - 5}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main Exported Component ───────────────────────────────────────────────────
export function LifeTimelineSection({ externalLifeSpan }: { externalLifeSpan?: number }) {
  const [rawData,       setRawData]       = useState<LineageData | null>(null);
  const [selectedAge,   setSelectedAge]   = useState(30);
  const [avatarId,      setAvatarId]      = useState("human");
  const [manualEvents,  setManualEvents]  = useState<TlEvent[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [fullGoals,     setFullGoals]     = useState<FullGoal[]>([]);
  const [showModal,     setShowModal]     = useState(false);
  const [isDragging,    setIsDragging]    = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Use external life span if provided, else default to 85
  const lifeExpectancy = externalLifeSpan ?? 85;

  useEffect(() => {
    fetch("/api/lineage")
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => { setRawData(d); setSelectedAge(Number(d.plan?.currentAge ?? 30)); setLoading(false); })
      .catch(() => setLoading(false));
    fetch("/api/goals")
      .then(r => r.json())
      .then(d => setFullGoals(d.data ?? []))
      .catch(() => {});
  }, []);

  const projections = useMemo(
    () => rawData ? computeProjections(rawData, lifeExpectancy) : [],
    [rawData, lifeExpectancy]
  );
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

  const getAgeFromY = useCallback((clientY: number): number => {
    if (!timelineRef.current) return selectedAge;
    const rect = timelineRef.current.getBoundingClientRect();
    const y    = clientY - rect.top + timelineRef.current.scrollTop;
    return Math.max(startAge, Math.min(endAge, Math.round(y / PX_PER_YEAR) + startAge));
  }, [startAge, endAge, selectedAge]);

  const handleTimelineMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setSelectedAge(getAgeFromY(e.clientY));
  }, [getAgeFromY]);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => setSelectedAge(getAgeFromY(e.clientY));
    const onUp   = () => setIsDragging(false);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup",   onUp);
    return () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
  }, [isDragging, getAgeFromY]);

  useEffect(() => {
    if (!timelineRef.current || isDragging) return;
    const col = timelineRef.current;
    const y   = (selectedAge - startAge) * PX_PER_YEAR;
    if (y < col.scrollTop + 48 || y > col.scrollTop + col.clientHeight - 48)
      col.scrollTo({ top: y - col.clientHeight / 2, behavior: "smooth" });
  }, [selectedAge, startAge, isDragging]);

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

  if (loading) return (
    <div className="flex items-center justify-center h-32 text-muted-foreground">
      <RefreshCw className="h-5 w-5 animate-spin mr-2" /> กำลังโหลด Life Timeline...
    </div>
  );
  if (!rawData) return <div className="p-8 text-muted-foreground text-sm">ไม่สามารถโหลดข้อมูลไทม์ไลน์ได้</div>;

  const plan          = rawData.plan;
  const currentAge_   = Number(plan?.currentAge ?? 30);
  const retirementAge = Number(plan?.retirementAge ?? 60);
  const timelineH     = (endAge - startAge + 1) * PX_PER_YEAR;
  const currentProj   = projections.find(pr => pr.age === currentAge_);

  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-2 bg-white border-b border-slate-100">
        <div className="flex items-center gap-4 overflow-x-auto">
          {[
            { label: "Net Worth ตอนนี้",            value: compact(currentProj?.netWorth ?? 0),    color: "text-emerald-600" },
            { label: `เกษียณ (${retirementAge} ปี)`, value: compact(projections.find(p => p.age === retirementAge)?.netWorth ?? 0), color: "text-violet-600" },
            { label: "รายได้/ปี",  value: compact(currentProj?.annualIncome ?? 0),  color: "text-sky-600"    },
            { label: "ออมได้/ปี",  value: compact(currentProj?.annualSavings ?? 0), color: "text-amber-600"  },
            { label: "เป้าหมาย",  value: `${fullGoals.length} รายการ`,              color: "text-indigo-600" },
          ].map(s => (
            <div key={s.label} className="flex-shrink-0">
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">{s.label}</p>
              <p className={cn("text-base font-black leading-none mt-0.5", s.color)}>{s.value}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-4 shrink-0">
          {/* Avatar picker */}
          <div className="flex items-center gap-1">
            {AVATARS.map(av => (
              <button key={av.id} onClick={() => setAvatarId(av.id)} title={av.label}
                className={cn("w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all",
                  avatarId === av.id ? "bg-slate-100 ring-2 ring-violet-400" : "hover:bg-slate-50 text-slate-500"
                )}>
                {av.emoji}
              </button>
            ))}
          </div>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-xl bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 transition-colors">
            <Plus className="h-3.5 w-3.5" /> เพิ่ม
          </button>
        </div>
      </div>

      {/* Body: vertical timeline + right detail panel */}
      <div className="flex" style={{ height: 620 }}>

        {/* Vertical Timeline column */}
        <div
          ref={timelineRef}
          onMouseDown={handleTimelineMouseDown}
          className="w-48 flex-shrink-0 border-r border-slate-200 bg-white overflow-y-auto overflow-x-hidden"
          style={{ cursor: isDragging ? "grabbing" : "pointer", userSelect: "none" }}
        >
          <div style={{ height: timelineH, position: "relative" }}>
            {rawData.lifeStages.map(stage => {
              const top = (Math.max(stage.ageFrom, startAge) - startAge) * PX_PER_YEAR;
              const h   = (Math.min(stage.ageTo, endAge) - Math.max(stage.ageFrom, startAge) + 1) * PX_PER_YEAR;
              if (h <= 0) return null;
              return (
                <div key={stage.id} style={{ position: "absolute", left: 0, right: 0, top, height: h, background: `${stage.colorHex}10`, borderTop: `1.5px solid ${stage.colorHex}30` }}>
                  <span style={{ color: stage.colorHex }} className="text-[9px] font-bold absolute left-11 top-1 select-none whitespace-nowrap">
                    {stage.icon} {stage.titleTh}
                  </span>
                </div>
              );
            })}
            <div style={{ position: "absolute", left: 36, top: 0, bottom: 0, width: 2, background: "#e2e8f0" }} />
            {projections.map(pr => {
              const top        = (pr.age - startAge) * PX_PER_YEAR;
              const isSelected = pr.age === selectedAge;
              const isCurrent  = pr.age === currentAge_;
              const isRetire   = pr.age === retirementAge;
              const show       = pr.age % 5 === 0 || isCurrent || isRetire || isSelected;
              const rowEvents  = events.filter(e => e.age === pr.age);
              return (
                <div key={pr.age} style={{
                  position: "absolute", left: 0, right: 0, top, height: PX_PER_YEAR,
                  display: "flex", alignItems: "center",
                  background: isSelected ? "#f5f3ff" : "transparent",
                  transition: "background 0.1s",
                }}>
                  <div style={{ width: 30, textAlign: "right", paddingRight: 4, flexShrink: 0 }}>
                    {show && (
                      <span style={{ fontSize: 10, fontFamily: "monospace",
                        fontWeight: isSelected || isCurrent || isRetire ? 800 : 500,
                        color: isCurrent ? "#d97706" : isRetire ? "#7c3aed" : isSelected ? "#7c3aed" : "#94a3b8" }}>
                        {pr.age}
                      </span>
                    )}
                  </div>
                  <div style={{ width: 8, flexShrink: 0, position: "relative", height: "100%" }}>
                    {(show || rowEvents.length > 0) && (
                      <div style={{
                        position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
                        width: isSelected ? 12 : isCurrent || isRetire ? 10 : 6,
                        height: isSelected ? 12 : isCurrent || isRetire ? 10 : 6,
                        borderRadius: "50%",
                        background: isSelected ? "#7c3aed" : isCurrent ? "#f59e0b" : isRetire ? "#8b5cf6" : "#cbd5e1",
                        border: isSelected ? "2px solid white" : "none",
                        boxShadow: isSelected ? "0 0 0 3px #7c3aed30" : "none", zIndex: 2,
                      }} />
                    )}
                  </div>
                  {isSelected && (
                    <div style={{ position: "absolute", left: 24, top: "50%", transform: "translateY(-50%)", zIndex: 10 }}
                      onMouseDown={e => { e.stopPropagation(); setIsDragging(true); }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: "50%", background: "white",
                        border: "2px solid #7c3aed", fontSize: 18,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 2px 12px #7c3aed40",
                        cursor: isDragging ? "grabbing" : "grab",
                        transform: isDragging ? "scale(1.15)" : "scale(1)",
                        transition: "transform 0.1s",
                      }}>
                        {avatar.emoji}
                      </div>
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 2, marginLeft: 6, overflow: "hidden" }}>
                    {rowEvents.slice(0, 5).map(ev => (
                      <div key={ev.id} style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                        background: ev.impact === "positive" ? "#34d399" : ev.impact === "negative" ? "#f87171" : "#94a3b8" }} />
                    ))}
                    {rowEvents.length > 5 && <span style={{ fontSize: 8, color: "#94a3b8" }}>+{rowEvents.length - 5}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right detail panel */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-50">
          {selectedProj ? (
            <div className="max-w-xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-3xl flex-shrink-0">
                  {selectedProj.lifeStage?.icon ?? "📅"}
                </div>
                <div>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-4xl font-black text-slate-900 leading-none">{selectedProj.age}</span>
                    <span className="text-sm text-slate-400">ปี · {selectedProj.year}</span>
                    {selectedProj.isRetired && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700">เกษียณแล้ว</span>}
                  </div>
                  {selectedProj.lifeStage && (
                    <div className="mt-0.5">
                      <span className="text-sm font-bold" style={{ color: selectedProj.lifeStage.colorHex }}>{selectedProj.lifeStage.titleTh}</span>
                      <span className="text-xs text-slate-400 ml-2">{selectedProj.lifeStage.descriptionTh}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "สินทรัพย์สุทธิ์", value: compact(selectedProj.netWorth), cls: selectedProj.netWorth > 0 ? "text-emerald-600" : "text-red-500" },
                  { label: "รายได้/ปี",       value: compact(selectedProj.annualIncome), cls: "text-slate-800" },
                  { label: "ออมได้/ปี",       value: compact(selectedProj.annualSavings), cls: "text-sky-600" },
                ].map(({ label, value, cls }) => (
                  <div key={label} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">{label}</p>
                    <p className={cn("text-xl font-black leading-tight", cls)}>{value}</p>
                  </div>
                ))}
              </div>

              {eventsAtAge.length > 0 && (
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-3">เหตุการณ์ในวัยนี้</p>
                  <div className="flex flex-wrap gap-2">
                    {eventsAtAge.map(ev => (
                      <div key={ev.id} className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border",
                        ev.impact === "positive" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        ev.impact === "negative" ? "bg-red-50 text-red-700 border-red-200" :
                        "bg-slate-50 text-slate-700 border-slate-200"
                      )}>
                        {ev.title}
                        {ev.description && <span className="text-xs opacity-60">· {ev.description}</span>}
                        {!ev.isAuto && (
                          <button onClick={async () => {
                            await fetch(`/api/lineage/events?id=${ev.id}`, { method: "DELETE" });
                            setManualEvents(prev => prev.filter(me => me.id !== ev.id));
                          }} className="ml-0.5 opacity-40 hover:opacity-80"><X className="h-3 w-3" /></button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-50">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">สิ่งที่ควรรู้ในวัยนี้</p>
                </div>
                <div className="p-3 space-y-2">
                  {awarenessItems.length > 0 ? awarenessItems.map((item, i) => (
                    <div key={i} className={cn(
                      "flex items-start gap-2.5 px-3.5 py-3 rounded-xl text-sm leading-snug",
                      item.type === "warn" ? "bg-amber-50 text-amber-800" :
                      item.type === "good" ? "bg-emerald-50 text-emerald-800" :
                      "bg-blue-50 text-blue-800"
                    )}>
                      <span className="flex-shrink-0 text-base leading-none mt-0.5">
                        {item.type === "warn" ? "⚠️" : item.type === "good" ? "✅" : "💡"}
                      </span>
                      <span>{item.text}</span>
                    </div>
                  )) : (
                    <div className="flex items-center gap-2 px-3.5 py-3 text-sm text-slate-400">
                      <span>✨</span> ไม่มีรายการเตือน — การเงินอยู่ในเส้นทางที่ดี
                    </div>
                  )}
                </div>
              </div>

              {selectedProj.lifeStage && (
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-4">พอร์ตเป้าหมาย · {selectedProj.lifeStage.titleTh}</p>
                  <div className="space-y-3">
                    {[
                      { label: "หุ้น · Equity",     pct: selectedProj.lifeStage.allocEquity, color: "#7c3aed" },
                      { label: "ตราสารหนี้ · Bond", pct: selectedProj.lifeStage.allocBond,   color: "#0ea5e9" },
                      { label: "เงินสด · Cash",     pct: selectedProj.lifeStage.allocCash,   color: "#10b981" },
                    ].map(item => (
                      <div key={item.label}>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-slate-600 font-medium">{item.label}</span>
                          <span className="font-black" style={{ color: item.color }}>{item.pct}%</span>
                        </div>
                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div style={{ width: `${item.pct}%`, background: item.color, height: "100%", borderRadius: 9999, transition: "width 0.4s ease" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5" />
                    เป้าหมายการเงิน {fullGoals.length > 0 && `(${fullGoals.length})`}
                  </p>
                </div>
                <div className="p-3 space-y-2">
                  {fullGoals.length === 0 ? (
                    <div className="flex flex-col items-center py-8 text-slate-400 gap-3">
                      <Target className="h-9 w-9 opacity-25" />
                      <p className="text-xs text-center">ยังไม่มีเป้าหมายการเงิน<br />สร้างได้ผ่าน <span className="text-violet-500 font-medium">AI ที่ปรึกษา</span></p>
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
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
              คลิกหรือลากบน Timeline เพื่อดูข้อมูลแต่ละวัย
            </div>
          )}
        </div>
      </div>

      {showModal && rawData && (
        <UnifiedAddModal
          currentAge={currentAge_}
          lifeExpectancy={lifeExpectancy}
          defaultAge={selectedAge}
          onEventSave={ev => { setManualEvents(prev => [...prev, ev]); setShowModal(false); }}
          onGoalSave={g => { handleGoalAdded(g); setShowModal(false); }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
