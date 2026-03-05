"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  MapPin, ChevronRight, ChevronLeft, Save, Loader2, CheckCircle2,
  TrendingUp, AlertCircle, Home, Car, GraduationCap, Landmark,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Plan {
  currentAge: number;
  maritalStatus: string;
  numChildrenPlan: number;
  retirementAge: number;
  monthlyRetirementNeeds: number;
  hasHomeGoal: boolean;
  homePurchaseYears: number;
  homeBudget: number;
  hasCarGoal: boolean;
  carPurchaseYears: number;
  carBudget: number;
  hasEducationGoal: boolean;
  educationYears: number;
  educationBudget: number;
  emergencyFundMonths: number;
  monthlyInvestable: number;
  currentSavings: number;
  expectedReturn: number;
  inflationRate: number;
  targetWealthOverride: number | null;
}

const DEFAULT_PLAN: Plan = {
  currentAge: 30, maritalStatus: "single", numChildrenPlan: 0,
  retirementAge: 60, monthlyRetirementNeeds: 50000,
  hasHomeGoal: false, homePurchaseYears: 5, homeBudget: 3000000,
  hasCarGoal: false,  carPurchaseYears: 2,  carBudget: 600000,
  hasEducationGoal: false, educationYears: 15, educationBudget: 500000,
  emergencyFundMonths: 6,
  monthlyInvestable: 10000, currentSavings: 200000,
  expectedReturn: 7, inflationRate: 3,
  targetWealthOverride: null,
};

// ─── Projection engine ────────────────────────────────────────────────────────

function calcFV(pv: number, monthlyRate: number, months: number, pmt: number): number {
  if (months <= 0) return pv;
  if (Math.abs(monthlyRate) < 1e-9) return pv + pmt * months;
  const g = (1 + monthlyRate) ** months;
  return pv * g + pmt * (g - 1) / monthlyRate;
}

function calcPMT(pv: number, monthlyRate: number, months: number, fv: number): number {
  if (months <= 0) return 0;
  if (Math.abs(monthlyRate) < 1e-9) return Math.max(0, (fv - pv) / months);
  const g = (1 + monthlyRate) ** months;
  return Math.max(0, (fv - pv * g) * monthlyRate / (g - 1));
}

interface Projection {
  projectedWealth: number;
  corpusNeeded: number;
  monthlyNeeded: number;
  onTrack: boolean;
  progressPct: number;
  surplus: number;
  timeline: { age: number; wealth: number }[];
  milestones: { label: string; icon: React.ElementType; age: number; years: number; budget: number; canAfford: boolean }[];
  emergencyTarget: number;
}

function project(p: Plan): Projection {
  const years = Math.max(1, p.retirementAge - p.currentAge);
  const months = years * 12;
  const r = (1 + p.expectedReturn / 100) ** (1 / 12) - 1;

  // Corpus using 4% safe-withdrawal rule, inflation-adjusted to retirement
  const inflationFactor = (1 + p.inflationRate / 100) ** years;
  const annualNeeds = p.monthlyRetirementNeeds * 12 * inflationFactor;
  const corpusNeeded = p.targetWealthOverride ?? (p.monthlyRetirementNeeds > 0 ? annualNeeds / 0.04 : 0);

  const projectedWealth = calcFV(p.currentSavings, r, months, p.monthlyInvestable);
  const monthlyNeeded = corpusNeeded > 0 ? calcPMT(p.currentSavings, r, months, corpusNeeded) : 0;
  const progressPct = corpusNeeded > 0 ? Math.min(100, Math.round(projectedWealth / corpusNeeded * 100)) : 100;

  // Timeline (yearly snapshots)
  const timeline = Array.from({ length: years + 1 }, (_, i) => ({
    age: p.currentAge + i,
    wealth: calcFV(p.currentSavings, r, i * 12, p.monthlyInvestable),
  }));

  const milestones: Projection["milestones"] = [];
  if (p.hasHomeGoal && p.homePurchaseYears > 0) {
    const w = calcFV(p.currentSavings, r, p.homePurchaseYears * 12, p.monthlyInvestable);
    milestones.push({ label: "ซื้อบ้าน", icon: Home, age: p.currentAge + p.homePurchaseYears, years: p.homePurchaseYears, budget: p.homeBudget, canAfford: w >= p.homeBudget });
  }
  if (p.hasCarGoal && p.carPurchaseYears > 0) {
    const w = calcFV(p.currentSavings, r, p.carPurchaseYears * 12, p.monthlyInvestable);
    milestones.push({ label: "ซื้อรถ", icon: Car, age: p.currentAge + p.carPurchaseYears, years: p.carPurchaseYears, budget: p.carBudget, canAfford: w >= p.carBudget });
  }
  if (p.hasEducationGoal && p.educationYears > 0) {
    const w = calcFV(p.currentSavings, r, p.educationYears * 12, p.monthlyInvestable);
    milestones.push({ label: "ทุนการศึกษา", icon: GraduationCap, age: p.currentAge + p.educationYears, years: p.educationYears, budget: p.educationBudget, canAfford: w >= p.educationBudget });
  }

  const emergencyTarget = p.monthlyRetirementNeeds > 0
    ? p.monthlyRetirementNeeds * p.emergencyFundMonths
    : 0;

  return {
    projectedWealth, corpusNeeded, monthlyNeeded,
    onTrack: projectedWealth >= corpusNeeded,
    progressPct, surplus: projectedWealth - corpusNeeded,
    timeline, milestones, emergencyTarget,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const thb = (n: number) =>
  n >= 1_000_000
    ? `฿${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `฿${(n / 1_000).toFixed(0)}K`
    : `฿${n.toLocaleString("th-TH")}`;

function Slider({
  label, sublabel, min, max, step = 1, value, onChange, format,
}: {
  label: string; sublabel?: string; min: number; max: number; step?: number;
  value: number; onChange: (v: number) => void; format?: (v: number) => string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline">
        <Label className="text-sm font-medium">{label}</Label>
        <span className="text-base font-bold text-primary">
          {format ? format(value) : value}
        </span>
      </div>
      {sublabel && <p className="text-xs text-muted-foreground -mt-1">{sublabel}</p>}
      <div className="relative py-1">
        <input
          type="range" min={min} max={max} step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer bg-muted accent-primary"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{format ? format(min) : min}</span>
          <span>{format ? format(max) : max}</span>
        </div>
      </div>
    </div>
  );
}

function WealthChart({ timeline, corpusNeeded, retirementAge }: {
  timeline: { age: number; wealth: number }[];
  corpusNeeded: number;
  retirementAge: number;
}) {
  const maxWealth = Math.max(corpusNeeded * 1.1, ...(timeline.map(t => t.wealth)));
  const W = 480; const H = 160; const PX = 40; const PY = 16;
  const cw = W - PX * 2; const ch = H - PY * 2;
  const n = timeline.length;

  const px = (i: number) => PX + (i / (n - 1)) * cw;
  const py = (v: number) => PY + ch - (v / maxWealth) * ch;

  const wealthPath = timeline.map((t, i) => `${i === 0 ? "M" : "L"}${px(i).toFixed(1)},${py(t.wealth).toFixed(1)}`).join(" ");

  // Corpus horizontal line
  const corpusY = py(corpusNeeded).toFixed(1);
  const retIdx = timeline.findIndex(t => t.age >= retirementAge);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-label="wealth projection chart">
      {/* Grid lines */}
      {[0.25, 0.5, 0.75, 1].map(f => (
        <line key={f} x1={PX} x2={W - PX} y1={py(maxWealth * f)} y2={py(maxWealth * f)}
          stroke="currentColor" strokeOpacity={0.08} strokeWidth={1} />
      ))}
      {/* Corpus needed line */}
      {corpusNeeded > 0 && (
        <>
          <line x1={PX} x2={W - PX} y1={corpusY} y2={corpusY}
            stroke="#ef4444" strokeWidth={1.5} strokeDasharray="5,4" opacity={0.7} />
          <text x={W - PX + 2} y={Number(corpusY) + 4} fontSize={9} fill="#ef4444" opacity={0.85}>เป้าหมาย</text>
        </>
      )}
      {/* Retirement marker */}
      {retIdx >= 0 && (
        <line x1={px(retIdx)} x2={px(retIdx)} y1={PY} y2={H - PY}
          stroke="#6366f1" strokeWidth={1.5} strokeDasharray="3,3" opacity={0.5} />
      )}
      {/* Wealth area fill */}
      <defs>
        <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path d={`${wealthPath} L${px(n - 1).toFixed(1)},${H - PY} L${PX},${H - PY} Z`} fill="url(#wGrad)" />
      <path d={wealthPath} stroke="#3b82f6" strokeWidth={2.5} fill="none" />
      {/* Age labels on X */}
      {timeline.filter((_, i) => i % Math.max(1, Math.floor(n / 5)) === 0).map((t, _, arr) => {
        const i = timeline.indexOf(t);
        return (
          <text key={t.age} x={px(i)} y={H - 2} textAnchor="middle" fontSize={9} fill="currentColor" opacity={0.5}>
            {t.age}
          </text>
        );
      })}
      {/* Y max label */}
      <text x={PX - 2} y={PY + 6} textAnchor="end" fontSize={9} fill="currentColor" opacity={0.5}>
        {thb(maxWealth)}
      </text>
    </svg>
  );
}

// ─── Step components ──────────────────────────────────────────────────────────

function Step1({ plan, update }: { plan: Plan; update: (k: keyof Plan, v: Plan[keyof Plan]) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">ขั้นที่ 1 — ข้อมูลส่วนตัว</h2>
        <p className="text-sm text-muted-foreground">บอกเราเรื่องสถานการณ์ชีวิตของคุณ เพื่อวางแผนได้แม่นยำขึ้น</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Current age */}
        <div className="space-y-1">
          <Label>อายุปัจจุบัน (ปี)</Label>
          <Input type="number" min={18} max={70} value={plan.currentAge || ""}
            onChange={e => update("currentAge", parseInt(e.target.value) || 30)} placeholder="30" />
        </div>

        {/* Marital status */}
        <div className="space-y-1">
          <Label>สถานภาพ</Label>
          <select
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={plan.maritalStatus}
            onChange={e => update("maritalStatus", e.target.value)}
          >
            <option value="single">โสด</option>
            <option value="married">สมรส</option>
            <option value="divorced">หย่าร้าง / แยกกัน</option>
          </select>
        </div>

        {/* Children */}
        <div className="space-y-1">
          <Label>แผนจะมีบุตร (คน)</Label>
          <Input type="number" min={0} max={10} value={plan.numChildrenPlan || ""}
            onChange={e => update("numChildrenPlan", parseInt(e.target.value) || 0)} placeholder="0" />
          <p className="text-xs text-muted-foreground">รวมบุตรที่มีอยู่แล้ว (ถ้ามี)</p>
        </div>

        {/* Monthly investable */}
        <div className="space-y-1">
          <Label>รายได้ที่ลงทุนได้ต่อเดือน (บาท)</Label>
          <Input type="number" min={0} value={plan.monthlyInvestable || ""}
            onChange={e => update("monthlyInvestable", parseFloat(e.target.value) || 0)} placeholder="เช่น 10,000" />
          <p className="text-xs text-muted-foreground">หลังหักค่าใช้จ่ายทั้งหมดแล้ว</p>
        </div>

        {/* Current savings */}
        <div className="space-y-1">
          <Label>เงินออม / ลงทุนที่มีอยู่แล้ว (บาท)</Label>
          <Input type="number" min={0} value={plan.currentSavings || ""}
            onChange={e => update("currentSavings", parseFloat(e.target.value) || 0)} placeholder="เช่น 200,000" />
        </div>

        {/* Emergency fund months */}
        <div className="space-y-1">
          <Label>เป้าหมายเงินสำรอง (กี่เดือน)</Label>
          <Input type="number" min={1} max={24} value={plan.emergencyFundMonths}
            onChange={e => update("emergencyFundMonths", parseInt(e.target.value) || 6)} />
          <p className="text-xs text-muted-foreground">แนะนำ 6 เดือนขึ้นไป</p>
        </div>
      </div>
    </div>
  );
}

function Step2({ plan, update }: { plan: Plan; update: (k: keyof Plan, v: Plan[keyof Plan]) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">ขั้นที่ 2 — เป้าหมายชีวิต</h2>
        <p className="text-sm text-muted-foreground">ตั้งเป้าหมายทางการเงินที่สำคัญ ระบบจะช่วยคำนวณว่าต้องเก็บเงินเท่าไร</p>
      </div>

      {/* Retirement */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Landmark className="h-4 w-4 text-primary" />เกษียณอายุ
          </CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>อยากเกษียณตอนอายุ (ปี)</Label>
            <Input type="number" min={40} max={80} value={plan.retirementAge}
              onChange={e => update("retirementAge", parseInt(e.target.value) || 60)} />
          </div>
          <div className="space-y-1">
            <Label>เงินที่ต้องการต่อเดือนหลังเกษียณ (บาท วันนี้)</Label>
            <Input type="number" min={0} value={plan.monthlyRetirementNeeds || ""}
              onChange={e => update("monthlyRetirementNeeds", parseFloat(e.target.value) || 0)}
              placeholder="เช่น 50,000" />
            <p className="text-xs text-muted-foreground">ตัวเลขในมูลค่าปัจจุบัน ระบบจะปรับตามเงินเฟ้อให้</p>
          </div>
        </CardContent>
      </Card>

      {/* Home */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Home className="h-4 w-4 text-blue-500" />ซื้อบ้าน / อสังหาริมทรัพย์
            </CardTitle>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="accent-primary"
                checked={plan.hasHomeGoal}
                onChange={e => update("hasHomeGoal", e.target.checked)} />
              มีแผน
            </label>
          </div>
        </CardHeader>
        {plan.hasHomeGoal && (
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>อีกกี่ปี</Label>
              <Input type="number" min={1} value={plan.homePurchaseYears}
                onChange={e => update("homePurchaseYears", parseInt(e.target.value) || 5)} />
            </div>
            <div className="space-y-1">
              <Label>งบประมาณ (บาท)</Label>
              <Input type="number" min={0} value={plan.homeBudget || ""}
                onChange={e => update("homeBudget", parseFloat(e.target.value) || 0)} placeholder="3,000,000" />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Car */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Car className="h-4 w-4 text-amber-500" />ซื้อรถยนต์
            </CardTitle>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="accent-primary"
                checked={plan.hasCarGoal}
                onChange={e => update("hasCarGoal", e.target.checked)} />
              มีแผน
            </label>
          </div>
        </CardHeader>
        {plan.hasCarGoal && (
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>อีกกี่ปี</Label>
              <Input type="number" min={1} value={plan.carPurchaseYears}
                onChange={e => update("carPurchaseYears", parseInt(e.target.value) || 2)} />
            </div>
            <div className="space-y-1">
              <Label>งบประมาณ (บาท)</Label>
              <Input type="number" min={0} value={plan.carBudget || ""}
                onChange={e => update("carBudget", parseFloat(e.target.value) || 0)} placeholder="600,000" />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Education */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-emerald-500" />ทุนการศึกษาบุตร
            </CardTitle>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="accent-primary"
                checked={plan.hasEducationGoal}
                onChange={e => update("hasEducationGoal", e.target.checked)} />
              มีแผน
            </label>
          </div>
        </CardHeader>
        {plan.hasEducationGoal && (
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>อีกกี่ปีที่ต้องใช้</Label>
              <Input type="number" min={1} value={plan.educationYears}
                onChange={e => update("educationYears", parseInt(e.target.value) || 15)} />
            </div>
            <div className="space-y-1">
              <Label>งบประมาณต่อบุตร (บาท)</Label>
              <Input type="number" min={0} value={plan.educationBudget || ""}
                onChange={e => update("educationBudget", parseFloat(e.target.value) || 0)} placeholder="500,000" />
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

function Step3({ plan, update, result }: {
  plan: Plan;
  update: (k: keyof Plan, v: Plan[keyof Plan]) => void;
  result: Projection;
}) {
  const [useTargetOverride, setUseTargetOverride] = useState(plan.targetWealthOverride !== null);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">ขั้นที่ 3 — ปรับแผนแบบ Interactive</h2>
        <p className="text-sm text-muted-foreground">เลื่อน slider เพื่อดูผลกระทบต่อแผนการเงินของคุณแบบ real-time</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ─ Left: Sliders ─ */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">พารามิเตอร์แผน</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <Slider label="เกษียณอายุ" min={40} max={75} value={plan.retirementAge}
                onChange={v => update("retirementAge", v)}
                format={v => `${v} ปี (อีก ${Math.max(0, v - plan.currentAge)} ปี)`} />

              <Slider label="เงินลงทุน / ออมต่อเดือน" min={1000} max={200000} step={1000}
                value={plan.monthlyInvestable}
                onChange={v => update("monthlyInvestable", v)}
                format={v => `฿${v.toLocaleString("th-TH")}`} />

              <Slider label="ผลตอบแทนคาดหวัง (%/ปี)" sublabel="ตลาดหุ้นไทยเฉลี่ยระยะยาว ~7-9%"
                min={1} max={20} step={0.5} value={plan.expectedReturn}
                onChange={v => update("expectedReturn", v)}
                format={v => `${v}%`} />

              <Slider label="อัตราเงินเฟ้อ (%/ปี)" sublabel="ประมาณการ BOT ระยะกลาง ~2-3%"
                min={0} max={10} step={0.5} value={plan.inflationRate}
                onChange={v => update("inflationRate", v)}
                format={v => `${v}%`} />

              {/* Target override */}
              <div className="space-y-2 pt-2 border-t">
                <label className="flex items-center gap-2 text-sm cursor-pointer font-medium">
                  <input type="checkbox" className="accent-primary"
                    checked={useTargetOverride}
                    onChange={e => {
                      setUseTargetOverride(e.target.checked);
                      update("targetWealthOverride", e.target.checked ? (result.corpusNeeded || 20_000_000) : null);
                    }} />
                  กำหนดเป้าหมายความมั่งคั่งเอง
                </label>
                {useTargetOverride && (
                  <div className="space-y-1 ml-6">
                    <Slider label="เป้าหมายความมั่งคั่ง" min={1_000_000} max={100_000_000}
                      step={500_000} value={plan.targetWealthOverride ?? result.corpusNeeded}
                      onChange={v => update("targetWealthOverride", v)}
                      format={v => thb(v)} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─ Right: Results ─ */}
        <div className="space-y-4">
          {/* Main status card */}
          <Card className={result.onTrack
            ? "border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/10"
            : "border-red-200 bg-red-50/50 dark:bg-red-950/10"
          }>
            <CardContent className="pt-5 pb-4 space-y-3">
              <div className="flex items-center gap-2">
                {result.onTrack
                  ? <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  : <AlertCircle className="h-5 w-5 text-red-500" />
                }
                <span className={`font-semibold ${result.onTrack ? "text-emerald-700" : "text-red-600"}`}>
                  {result.onTrack ? "🎉 แผนการเงินของคุณอยู่ในเส้นทางที่ดี!" : "⚠️ ต้องปรับแผน — ยังไม่ถึงเป้าหมาย"}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">ความคืบหน้าสู่เป้าหมาย</span>
                  <span className="font-medium">{result.progressPct}%</span>
                </div>
                <Progress value={result.progressPct} className="h-3" />
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm pt-1">
                <div>
                  <p className="text-muted-foreground text-xs">ความมั่งคั่งที่คาดไว้ (เกษียณ)</p>
                  <p className="font-bold text-lg text-blue-600">{thb(result.projectedWealth)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">เป้าหมาย corpus (4% rule)</p>
                  <p className="font-bold text-lg">{thb(result.corpusNeeded)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">ต้องออม/ลงทุนต่อเดือน</p>
                  <p className={`font-bold text-base ${result.monthlyNeeded <= plan.monthlyInvestable ? "text-emerald-600" : "text-red-500"}`}>
                    {thb(result.monthlyNeeded)}/เดือน
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">
                    {result.surplus >= 0 ? "ส่วนเกิน" : "ขาด"}
                  </p>
                  <p className={`font-bold text-base ${result.surplus >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {result.surplus >= 0 ? "+" : ""}{thb(result.surplus)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Wealth timeline chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">กราฟความมั่งคั่งตามอายุ</CardTitle>
              <CardDescription className="text-xs">เส้นสีน้ำเงิน = ความมั่งคั่งที่คาด | เส้นประแดง = corpus ที่ต้องการ</CardDescription>
            </CardHeader>
            <CardContent className="pt-0 pb-3">
              <WealthChart timeline={result.timeline} corpusNeeded={result.corpusNeeded} retirementAge={plan.retirementAge} />
            </CardContent>
          </Card>

          {/* Milestones */}
          {result.milestones.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">ไทม์ไลน์เป้าหมาย</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {result.milestones.map(m => (
                  <div key={m.label} className={cn(
                    "flex items-center justify-between p-2.5 rounded-lg border text-sm",
                    m.canAfford ? "border-emerald-200 bg-emerald-50/50" : "border-amber-200 bg-amber-50/50"
                  )}>
                    <div className="flex items-center gap-2">
                      <m.icon className={`h-4 w-4 ${m.canAfford ? "text-emerald-600" : "text-amber-600"}`} />
                      <div>
                        <p className="font-medium">{m.label}</p>
                        <p className="text-xs text-muted-foreground">อายุ {m.age} ปี (อีก {m.years} ปี)</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{thb(m.budget)}</p>
                      <p className={`text-xs ${m.canAfford ? "text-emerald-600" : "text-amber-600"}`}>
                        {m.canAfford ? "✓ เพียงพอ" : "⚠ ต้องเพิ่มออม"}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3;

export default function FinancialPlanPage() {
  const [step, setStep]     = useState<Step>(1);
  const [plan, setPlan]     = useState<Plan>(DEFAULT_PLAN);
  const [loading, setLoading]   = useState(true);
  const [saving,  setSaving]    = useState(false);
  const [saved,   setSaved]     = useState(false);

  const update = useCallback(<K extends keyof Plan>(k: K, v: Plan[K]) => {
    setPlan(prev => ({ ...prev, [k]: v }));
    setSaved(false);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/user/financial-plan").then(r => r.json()),
      fetch("/api/user/financial-profile").then(r => r.json()),
    ]).then(([planRes, profRes]) => {
      if (planRes.data) {
        // Merge DB values into plan, coercing Decimal strings to numbers
        const d = planRes.data;
        setPlan(prev => ({
          ...prev,
          currentAge: d.currentAge ?? prev.currentAge,
          maritalStatus: d.maritalStatus ?? prev.maritalStatus,
          numChildrenPlan: d.numChildrenPlan ?? prev.numChildrenPlan,
          retirementAge: d.retirementAge ?? prev.retirementAge,
          monthlyRetirementNeeds: Number(d.monthlyRetirementNeeds ?? prev.monthlyRetirementNeeds),
          hasHomeGoal: d.hasHomeGoal ?? prev.hasHomeGoal,
          homePurchaseYears: d.homePurchaseYears ?? prev.homePurchaseYears,
          homeBudget: Number(d.homeBudget ?? prev.homeBudget),
          hasCarGoal: d.hasCarGoal ?? prev.hasCarGoal,
          carPurchaseYears: d.carPurchaseYears ?? prev.carPurchaseYears,
          carBudget: Number(d.carBudget ?? prev.carBudget),
          hasEducationGoal: d.hasEducationGoal ?? prev.hasEducationGoal,
          educationYears: d.educationYears ?? prev.educationYears,
          educationBudget: Number(d.educationBudget ?? prev.educationBudget),
          emergencyFundMonths: d.emergencyFundMonths ?? prev.emergencyFundMonths,
          monthlyInvestable: Number(d.monthlyInvestable ?? prev.monthlyInvestable),
          currentSavings: Number(d.currentSavings ?? prev.currentSavings),
          expectedReturn: Number(d.expectedReturn ?? prev.expectedReturn),
          inflationRate: Number(d.inflationRate ?? prev.inflationRate),
          targetWealthOverride: d.targetWealthOverride !== null ? Number(d.targetWealthOverride) : null,
        }));
        // If plan exists, jump to step 3
        setStep(3);
      }
      // Pre-fill monthly investable + savings from profile if not set in plan
      if (!planRes.data && profRes.data) {
        const prof = profRes.data;
        const monthlyIncome = Number(prof.annualSalary ?? 0) / 12;
        const expenses = Number(prof.monthlyExpenses ?? 0);
        const debt = Number(prof.monthlyDebtPayment ?? 0);
        const investable = Math.max(0, monthlyIncome - expenses - debt);
        if (investable > 0) setPlan(p => ({ ...p, monthlyInvestable: Math.round(investable) }));
        if (Number(prof.emergencyFundAmount) > 0) {
          setPlan(p => ({ ...p, currentSavings: Number(prof.emergencyFundAmount) }));
        }
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/user/financial-plan", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(plan),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const result = useMemo(() => project(plan), [plan]);

  const STEPS = [
    { n: 1 as Step, label: "ข้อมูลส่วนตัว" },
    { n: 2 as Step, label: "เป้าหมายชีวิต" },
    { n: 3 as Step, label: "แผนการเงิน" },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MapPin className="h-6 w-6 text-primary" />
            แผนการเงิน
          </h1>
          <p className="text-muted-foreground text-sm">วางแผนความมั่งคั่งตั้งแต่วันนี้ถึงวันเกษียณ</p>
        </div>
        <Button onClick={handleSave} disabled={saving} variant="outline" size="sm">
          {saving
            ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />กำลังบันทึก...</>
            : saved
            ? <><CheckCircle2 className="h-4 w-4 mr-2 text-emerald-600" />บันทึกแล้ว</>
            : <><Save className="h-4 w-4 mr-2" />บันทึกแผน</>
          }
        </Button>
      </div>

      {/* Step progress bar */}
      <div className="flex items-center gap-0">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex items-center flex-1 last:flex-none">
            <button
              onClick={() => setStep(s.n)}
              className={cn(
                "flex items-center gap-2 text-sm font-medium transition-colors",
                step === s.n ? "text-primary" : step > s.n ? "text-emerald-600" : "text-muted-foreground"
              )}
            >
              <span className={cn(
                "flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold border-2 transition-colors",
                step === s.n ? "border-primary bg-primary text-white" :
                step > s.n  ? "border-emerald-500 bg-emerald-500 text-white" :
                              "border-muted-foreground/30 text-muted-foreground"
              )}>
                {step > s.n ? "✓" : s.n}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={cn("flex-1 mx-2 h-0.5", step > s.n ? "bg-emerald-400" : "bg-muted")} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      {/* Live mini-summary — always visible */}
      <div className={`flex flex-wrap items-center gap-3 px-4 py-2.5 rounded-xl text-sm border ${
        result.corpusNeeded === 0 ? "bg-muted/40 border-muted" :
        result.onTrack ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20" :
                         "bg-red-50 border-red-200 dark:bg-red-950/20"
      }`}>
        <span className="font-medium text-muted-foreground">คาดการณ์ (ตอนเกษียณอายุ {plan.retirementAge} ปี):</span>
        <span className="font-bold text-blue-600">{thb(result.projectedWealth)}</span>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium">{thb(result.corpusNeeded)} ที่ต้องการ</span>
        {result.corpusNeeded > 0 && (
          <span className={`ml-auto font-semibold ${
            result.onTrack ? "text-emerald-600" : "text-red-500"
          }`}>
            {result.onTrack ? "✓ อยู่ในเส้นทาง" : `⚠️ ขาด ${thb(Math.abs(result.surplus))}`}
          </span>
        )}
      </div>
      <div>
        {step === 1 && <Step1 plan={plan} update={update} />}
        {step === 2 && <Step2 plan={plan} update={update} />}
        {step === 3 && <Step3 plan={plan} update={update} result={result} />}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" disabled={step === 1} onClick={() => setStep((step - 1) as Step)}>
          <ChevronLeft className="h-4 w-4 mr-1" />ย้อนกลับ
        </Button>
        {step < 3 ? (
          <Button onClick={() => setStep((step + 1) as Step)}>
            ถัดไป<ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            บันทึกแผน
          </Button>
        )}
      </div>
    </div>
  );
}
