"use client";
import { useState, useEffect, useMemo } from "react";
import {
  MapPin, Loader2, CheckCircle2, TrendingUp, Banknote,
  ChevronRight, Target, Info, AlertCircle, Pencil, ChevronDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileData {
  annualSalary: number; bonus: number; otherIncome: number;
  monthlyExpenses: number; monthlyDebtPayment: number; totalDebt: number;
  emergencyFundAmount: number;
  rmfAmount: number; ssfAmount: number; thaiEsgAmount: number;
  ltfAmount: number; providentFundAmount: number;
  lifeInsurancePremium: number; healthInsurancePremium: number;
  annuityInsurancePremium: number;
}

interface PlanData {
  currentAge: number | null; retirementAge: number | null;
  monthlyRetirementNeeds: number | null; expectedReturn: number | null;
  currentSavings: number | null; monthlyInvestable: number | null;
}

interface RiskData { riskLevel: "conservative" | "moderate" | "aggressive"; }

// ─── Helpers ─────────────────────────────────────────────────────────────────

const thb  = (n: number) => `฿${Math.round(n).toLocaleString("th-TH")}`;
const thbM = (n: number) =>
  n >= 1_000_000 ? `฿${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `฿${Math.round(n / 1_000)}K`
  : thb(n);

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

// ─── Step Model ───────────────────────────────────────────────────────────────

type StepStatus = "done" | "partial" | "todo";
type Urgency    = "critical" | "important" | "good";

interface Step {
  id: string;
  title: string;
  status: StepStatus;
  urgency: Urgency;
  summary: string;
  why: string;
  how: string[];
  benefit: string;
  link?: { href: string; label: string };
}

// ─── Recommendation Engine ───────────────────────────────────────────────────

function buildSteps(p: ProfileData, plan: PlanData | null, risk: RiskData | null): Step[] {
  const steps: Step[] = [];
  const annualIncome  = p.annualSalary + p.bonus + p.otherIncome;
  const monthlyIncome = annualIncome / 12;
  const monthlyFree   = monthlyIncome - p.monthlyExpenses - p.monthlyDebtPayment;
  const marginalRate  = getMarginalRate(annualIncome);

  const riskConfig = risk ? {
    conservative: { label: "อนุรักษ์นิยม", portfolio: "ตราสารหนี้ 70% / หุ้น 30%",              ret: 4  },
    moderate:     { label: "สมดุล",        portfolio: "หุ้น 50% / ตราสารหนี้ 35% / REITs 15%", ret: 7  },
    aggressive:   { label: "เชิงรุก",      portfolio: "หุ้น 80% / สินทรัพย์ทางเลือก 20%",     ret: 10 },
  }[risk.riskLevel] : null;

  // ── Step 1: Emergency Fund ─────────────────────────────────────────────────
  const efMonths = p.monthlyExpenses > 0 ? p.emergencyFundAmount / p.monthlyExpenses : 0;
  const efTarget = p.monthlyExpenses * 6;
  const efGap    = Math.max(0, efTarget - p.emergencyFundAmount);
  steps.push({
    id: "emergency",
    title: "สร้างกองทุนฉุกเฉิน",
    status: efMonths >= 6 ? "done" : efMonths >= 3 ? "partial" : "todo",
    urgency: efMonths < 3 ? "critical" : efMonths < 6 ? "important" : "good",
    summary: efMonths >= 6
      ? `มีแล้ว ${efMonths.toFixed(1)} เดือน ✓`
      : `มีอยู่ ${efMonths.toFixed(1)} เดือน — ขาดอีก ${thb(efGap)}`,
    why: "กองทุนฉุกเฉินคือรากฐานของแผนการเงิน ป้องกันไม่ให้ต้องขายสินทรัพย์ลงทุนในยามฉุกเฉิน ควรมีอย่างน้อย 6 เดือนของรายจ่าย",
    how: efMonths >= 6 ? ["✓ กองทุนฉุกเฉินเพียงพอแล้ว"] : [
      `เก็บเพิ่มเดือนละ ${thb(Math.max(1000, Math.min(monthlyFree * 0.5, efGap / 12)))}`,
      `เป้าหมาย: ${thb(efTarget)} (6 เดือน × ค่าใช้จ่าย ${thb(p.monthlyExpenses)})`,
      "เก็บในบัญชีออมทรัพย์ดอกเบี้ยสูงหรือกองทุนตลาดเงิน (ถอนได้ทุกวัน)",
    ],
    benefit: efMonths >= 6 ? "พร้อมรับเหตุฉุกเฉินโดยไม่กระทบแผนลงทุน" : `เมื่อครบ ${thb(efTarget)} แล้ว นำเงินส่วนที่เหลือไปลงทุนได้เลย`,
    link: { href: "/my-data?tab=debts", label: "อัปเดตยอดเงินสำรอง" },
  });

  // ── Step 2: Debt ──────────────────────────────────────────────────────────
  if (p.totalDebt > 0 || p.monthlyDebtPayment > 0) {
    const dti = monthlyIncome > 0 ? p.monthlyDebtPayment / monthlyIncome : 0;
    steps.push({
      id: "debt",
      title: "จัดการภาระหนี้",
      status: dti < 0.2 ? "done" : dti < 0.35 ? "partial" : "todo",
      urgency: dti > 0.5 ? "critical" : dti > 0.35 ? "important" : "good",
      summary: `DTI ${Math.round(dti * 100)}% — ${dti < 0.3 ? "อยู่ในเกณฑ์ดี" : "สูงเกินไป ควรเร่งปิด"}`,
      why: "ดอกเบี้ยหนี้บัตรเครดิตและสินเชื่อส่วนบุคคลอยู่ที่ 18-28%/ปี สูงกว่าผลตอบแทนการลงทุนปกติ ควรปิดหนี้เหล่านี้ก่อนลงทุนเพิ่ม",
      how: [
        `ภาระผ่อนต่อเดือน: ${thb(p.monthlyDebtPayment)} = ${Math.round(dti * 100)}% ของรายได้ (เป้า < 30%)`,
        "วิธี Avalanche: โอนเงินพิเศษไปปิดหนี้ดอกเบี้ยสูงสุดก่อน ประหยัดดอกเบี้ยได้มากสุด",
        "หลีกเลี่ยงการก่อหนี้ใหม่ทุกชนิดระหว่างปิดหนี้",
        dti > 0.3 ? `ลด DTI ให้ถึง 30% = ต้องลดผ่อนเดือนละ ${thb(p.monthlyDebtPayment - monthlyIncome * 0.3)}` : "✓ อยู่ในเกณฑ์ดี",
      ],
      benefit: `เมื่อปลดหนี้ได้ จะมีเงินลงทุนเพิ่ม ${thb(p.monthlyDebtPayment * 0.5)}-${thb(p.monthlyDebtPayment)}/เดือน`,
      link: { href: "/my-data?tab=debts", label: "ดูข้อมูลหนี้สิน" },
    });
  }

  // ── Step 3: Tax Optimization ──────────────────────────────────────────────
  if (annualIncome > 150_000 && marginalRate > 0) {
    const ssfRoom     = Math.max(0, Math.min(annualIncome * 0.30, 200_000) - p.ssfAmount);
    const rmfRoom     = Math.max(0, Math.min(annualIncome * 0.30, 500_000) - p.rmfAmount);
    const esgRoom     = Math.max(0, Math.min(annualIncome * 0.30, 300_000) - p.thaiEsgAmount);
    const lifeRoom    = Math.max(0, 100_000  - p.lifeInsurancePremium);
    const annuityRoom = Math.max(0, 200_000  - p.annuityInsurancePremium);
    const totalRoom   = ssfRoom + rmfRoom + esgRoom + lifeRoom + annuityRoom;
    const taxSaving   = Math.round(totalRoom * marginalRate);
    const investRoom  = ssfRoom + rmfRoom + esgRoom;

    const howList: string[] = [];
    if (ssfRoom  > 0) howList.push(`SSF: ลงทุนเพิ่ม ${thb(ssfRoom)} → ประหยัดภาษี ${thb(Math.round(ssfRoom * marginalRate))}`);
    if (rmfRoom  > 0) howList.push(`RMF: ลงทุนเพิ่ม ${thb(rmfRoom)} → ประหยัดภาษี ${thb(Math.round(rmfRoom * marginalRate))}`);
    if (esgRoom  > 0) howList.push(`Thai ESG: ลงทุนเพิ่ม ${thb(esgRoom)} → ประหยัดภาษี ${thb(Math.round(esgRoom * marginalRate))}`);
    if (lifeRoom > 0) howList.push(`ประกันชีวิต: เพิ่มเบี้ย ${thb(lifeRoom)} → ประหยัดภาษี ${thb(Math.round(lifeRoom * marginalRate))}`);
    if (annuityRoom > 0) howList.push(`ประกันบำนาญ: เบี้ย ${thb(annuityRoom)} → ประหยัดภาษี ${thb(Math.round(annuityRoom * marginalRate))}`);

    steps.push({
      id: "tax",
      title: "ลดหย่อนภาษีให้สูงสุดก่อนลงทุน",
      status: totalRoom < 5_000 ? "done" : investRoom > 100_000 ? "todo" : "partial",
      urgency: totalRoom < 5_000 ? "good" : investRoom > 50_000 ? "important" : "good",
      summary: totalRoom < 5_000
        ? "ใช้สิทธิ์ลดหย่อนครบแล้ว ✓"
        : `ยังเหลือสิทธิ์ ${thb(totalRoom)} → ประหยัดภาษีได้ ${thb(taxSaving)}/ปี`,
      why: `ขั้นภาษีของคุณ ${Math.round(marginalRate * 100)}% — ลงทุน SSF/RMF ทุก ฿1 ได้ภาษีคืนทันที ${Math.round(marginalRate * 100)} สตางค์ ก่อนที่ผลตอบแทนจะสะสม นี่คือผลตอบแทน "ฟรี" ที่ไม่ควรพลาด`,
      how: howList.length > 0 ? howList : ["✓ ใช้สิทธิ์ลดหย่อนครบทุกประเภทแล้ว"],
      benefit: totalRoom < 5_000
        ? "เพิ่มประสิทธิภาพภาษีสูงสุดแล้ว"
        : `ประหยัดภาษี ${thb(taxSaving)}/ปี และยังได้ผลตอบแทนจากการลงทุนเพิ่มอีก`,
      link: { href: "/tax", label: "คำนวณภาษีโดยละเอียด" },
    });
  }

  // ── Step 4: Invest Consistently ───────────────────────────────────────────
  const totalInvested = p.rmfAmount + p.ssfAmount + p.thaiEsgAmount + p.ltfAmount + p.providentFundAmount;
  const investRatio   = annualIncome > 0 ? totalInvested / annualIncome : 0;
  steps.push({
    id: "invest",
    title: "ลงทุนสม่ำเสมอตามระดับความเสี่ยง",
    status: investRatio >= 0.15 ? "done" : investRatio > 0 ? "partial" : "todo",
    urgency: totalInvested === 0 ? "important" : "good",
    summary: risk
      ? `ระดับ: ${riskConfig?.label} · ลงทุน ${thb(totalInvested)}/ปี (${Math.round(investRatio * 100)}% รายได้)`
      : `ลงทุนแล้ว ${thb(totalInvested)}/ปี — ยังไม่ได้ประเมินความเสี่ยง`,
    why: "ลงทุนสม่ำเสมอทุกเดือน (DCA) ลดความเสี่ยงจากการเข้าผิดจังหวะ ดอกเบี้ยทบต้นทำงานดีที่สุดเมื่อเริ่มเร็วและสม่ำเสมอ",
    how: [
      riskConfig ? `พอร์ตที่เหมาะกับคุณ: ${riskConfig.portfolio}` : "ทำแบบประเมินความเสี่ยงก่อนเพื่อรับคำแนะนำพอร์ตที่เหมาะ",
      monthlyFree > 0
        ? `ตั้ง DCA อัตโนมัติ ${thb(Math.round(monthlyFree * 0.7))}/เดือน (70% ของเงินคงเหลือ)`
        : "ลดค่าใช้จ่ายเพื่อสร้างเงินลงทุน",
      investRatio < 0.15
        ? `เป้าหมาย: ลงทุน 15% ของรายได้ = ${thb(annualIncome * 0.15)}/ปี (ปัจจุบัน ${Math.round(investRatio * 100)}%)`
        : "✓ ลงทุนถึง 15% ของรายได้แล้ว",
      "SSF, RMF, Thai ESG ได้ทั้งผลตอบแทนและลดหย่อนภาษี — เริ่มที่นี่ก่อน",
    ],
    benefit: riskConfig
      ? `ลงทุน ${thb(Math.round(monthlyFree * 0.7))}/เดือน ตามพอร์ต ${riskConfig.label} คาดผลตอบแทน ~${riskConfig.ret}%/ปี`
      : "สร้างความมั่งคั่งระยะยาวด้วยพลังดอกเบี้ยทบต้น",
    link: risk ? { href: "/tools/risk", label: "ดูผลประเมินความเสี่ยง" } : { href: "/tools/risk", label: "ประเมินความเสี่ยงตอนนี้" },
  });

  // ── Step 5: Retirement Projection ────────────────────────────────────────
  if (plan?.currentAge && plan?.retirementAge && plan?.monthlyRetirementNeeds) {
    const yrs       = Math.max(1, plan.retirementAge - plan.currentAge);
    const ret       = ((plan.expectedReturn ?? riskConfig?.ret ?? 7)) / 100;
    const pv        = plan.currentSavings ?? (p.emergencyFundAmount / 2);
    const pmt       = plan.monthlyInvestable ?? Math.max(0, monthlyFree * 0.7);
    const projected = calcFV(pv, ret, yrs, pmt);
    const realNeeds = plan.monthlyRetirementNeeds * Math.pow(1.03, yrs);
    const corpus    = (realNeeds * 12) / 0.04;
    const pct       = corpus > 0 ? Math.min(100, Math.round((projected / corpus) * 100)) : 100;
    const onTrack   = projected >= corpus;
    const gap       = Math.max(0, corpus - projected);
    const r12       = (1 + ret) ** (1 / 12) - 1;
    const fvF       = Math.abs(r12) > 1e-9 ? ((1 + r12) ** (yrs * 12) - 1) / r12 : yrs * 12;
    const pvFV      = pv * (1 + r12) ** (yrs * 12);
    const addNeeded = Math.max(0, (corpus - pvFV) / fvF);

    steps.push({
      id: "retirement",
      title: "ฉายภาพแผนเกษียณ",
      status: onTrack ? "done" : pct >= 60 ? "partial" : "todo",
      urgency: onTrack ? "good" : pct < 50 ? "critical" : "important",
      summary: onTrack
        ? `อยู่ในเส้นทาง ✓ คาด ${thbM(projected)} เมื่ออายุ ${plan.retirementAge} ปี`
        : `ถึงเป้า ${pct}% — ขาดอีก ${thbM(gap)}`,
      why: `เกษียณอายุ ${plan.retirementAge} ปี (อีก ${yrs} ปี) ใช้จ่าย ${thb(plan.monthlyRetirementNeeds)}/เดือน → ต้องการ corpus ${thbM(corpus)} ตามกฎ 4%`,
      how: onTrack ? [
        `✓ คาดการณ์ความมั่งคั่ง: ${thbM(projected)}`,
        `เป้าหมาย corpus: ${thbM(corpus)}`,
        "รักษาอัตราออมและลงทุนในระดับนี้ต่อไป ทบทวนแผนทุกปี",
      ] : [
        `คาดการณ์ปัจจุบัน ${thbM(projected)} vs ต้องการ ${thbM(corpus)}`,
        addNeeded > 0 ? `ต้องเพิ่มการออม ${thb(addNeeded)}/เดือน เพื่อให้ถึงเป้า` : "",
        `หรือปรับพอร์ตเป็นเชิงรุกขึ้น — ผลตอบแทนเพิ่ม 1% ทำให้ corpus เพิ่ม ~${Math.round(yrs * 3)}%`,
        `หรือลดค่าใช้จ่ายหลังเกษียณ จาก ${thb(plan.monthlyRetirementNeeds)} เป็น ${thb(Math.round(plan.monthlyRetirementNeeds * (projected / corpus)))}`,
      ].filter(Boolean),
      benefit: onTrack
        ? "แผนเกษียณอยู่ในเส้นทาง"
        : addNeeded > 0 ? `เพิ่มออม ${thb(addNeeded)}/เดือน → เกษียณได้ตามแผน` : "ปรับกลยุทธ์เพื่อถึงเป้าหมาย",
      link: { href: "/goals", label: "แก้ไขข้อมูลเกษียณ" },
    });
  } else {
    steps.push({
      id: "retirement",
      title: "กำหนดแผนเกษียณ",
      status: "todo",
      urgency: "important",
      summary: "ยังไม่ได้กำหนดข้อมูลเกษียณ",
      why: "ยิ่งเริ่มวางแผนเกษียณเร็ว ยิ่งต้องออมน้อยลงต่อเดือน เพราะดอกเบี้ยทบต้นมีเวลาทำงานนานขึ้น",
      how: [
        "กรอกอายุปัจจุบัน, อายุเกษียณเป้าหมาย, ค่าใช้จ่ายหลังเกษียณ",
        "ระบบจะคำนวณว่าต้องออมเดือนละเท่าไหร่และคุณอยู่ในเส้นทางหรือไม่",
      ],
      benefit: "รู้ตัวเลขที่ชัดเจน ออมได้ถูกต้อง ไม่มากไม่น้อยเกินไป",
      link: { href: "/goals", label: "กำหนดข้อมูลเกษียณ →" },
    });
  }

  return steps;
}

// ─── Missing Data Detector ──────────────────────────────────────────────────────

interface MissingItem {
  label: string;
  detail: string;
  href: string;
  priority: "critical" | "important" | "optional";
}

function computeMissing(profile: ProfileData | null, plan: PlanData | null, risk: RiskData | null): MissingItem[] {
  const items: MissingItem[] = [];
  if (!profile || (profile.annualSalary + profile.bonus + profile.otherIncome) === 0) {
    items.push({ label: "รายได้", detail: "ยังไม่มีข้อมูลรายได้ — จำเป็นในทุกการคำนวณ", href: "/my-data?tab=income", priority: "critical" });
  }
  if (profile && profile.monthlyExpenses === 0) {
    items.push({ label: "ค่าใช้จ่าย/เดือน", detail: "ใช้คำนวณกระแสเงินสดและเงินสำรอง", href: "/my-data?tab=income", priority: "critical" });
  }
  if (profile && profile.emergencyFundAmount === 0) {
    items.push({ label: "เงินสำรองฉุกเฉิน", detail: "กรอกยอดเงินสำรองที่มีอยู่ (0 = ไม่มี หรือยังไม่ได้กรอก)", href: "/my-data?tab=debts", priority: "critical" });
  }
  if (!risk) {
    items.push({ label: "ระดับความเสี่ยง", detail: "ยังไม่ได้ประเมิน — ใช้คำนวณพอร์ตลงทุนที่เหมาะสม", href: "/tools/risk", priority: "important" });
  }
  if (!plan?.currentAge || !plan?.retirementAge || !plan?.monthlyRetirementNeeds) {
    items.push({ label: "ข้อมูลเกษียณ", detail: "อายุ, อายุเกษียณ, ค่าใช้จ่ายหลังเกษียณ — ใช้คำนวณการฉายภาพเกษียณ", href: "/goals", priority: "important" });
  }
  if (profile && profile.lifeInsurancePremium === 0 && profile.healthInsurancePremium === 0) {
    items.push({ label: "ข้อมูลประกัน", detail: "ยังไม่ได้กรอกเบี้ยประกันชีวิต/สุขภาพ — ใช้คำนวณลดหย่อนภาษี", href: "/my-data?tab=insurance", priority: "optional" });
  }
  return items;
}

interface MissingBannerProps { items: MissingItem[]; }
function MissingDataBanner({ items }: MissingBannerProps) {
  const [open, setOpen] = useState(items.length > 0);
  if (items.length === 0) return null;
  const critical  = items.filter(i => i.priority === "critical").length;
  const important = items.filter(i => i.priority === "important").length;
  const color = critical > 0 ? "amber" : "blue";
  return (
    <div className={cn(
      "rounded-xl border p-4 space-y-3",
      color === "amber"
        ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200"
        : "bg-blue-50 dark:bg-blue-950/20 border-blue-200"
    )}>
      <button className="w-full flex items-center justify-between" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-2">
          <Pencil className={cn("h-4 w-4 shrink-0 mt-0.5", color === "amber" ? "text-amber-600" : "text-blue-600")} />
          <div className="text-left">
            <p className={cn("font-semibold text-sm", color === "amber" ? "text-amber-800 dark:text-amber-300" : "text-blue-800 dark:text-blue-300")}>
              ข้อมูลที่ยังขาด {items.length} รายการ
              {critical > 0 && <span className="ml-2 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">จำเป็น {critical}</span>}
              {important > 0 && <span className="ml-1 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">สำคัญ {important}</span>}
            </p>
            <p className={cn("text-xs mt-0.5", color === "amber" ? "text-amber-700/70" : "text-blue-600/70")}>
              กรอกข้อมูลเพิ่มเติมให้ครบถ้วน — คำแนะนำจะแม่นยำขึ้น
            </p>
          </div>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="grid sm:grid-cols-2 gap-2">
          {items.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm hover:opacity-80 transition-opacity",
                item.priority === "critical"  ? "bg-red-50 border-red-200" :
                item.priority === "important" ? "bg-amber-50 border-amber-200" :
                "bg-muted/60 border-muted"
              )}
            >
              <AlertCircle className={cn("h-3.5 w-3.5 shrink-0 mt-0.5",
                item.priority === "critical"  ? "text-red-500" :
                item.priority === "important" ? "text-amber-500" :
                "text-muted-foreground"
              )} />
              <div className="min-w-0">
                <p className="font-semibold text-xs">{item.label}</p>
                <p className="text-xs text-muted-foreground truncate">{item.detail}</p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-auto" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Step Card UI ─────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<StepStatus, string> = {
  done:    "bg-emerald-100 text-emerald-700 border-emerald-200",
  partial: "bg-amber-100 text-amber-700 border-amber-200",
  todo:    "bg-red-100 text-red-600 border-red-200",
};
const STATUS_LABEL: Record<StepStatus, string> = {
  done: "เสร็จแล้ว", partial: "กำลังดำเนินการ", todo: "ยังไม่ทำ",
};
const URGENCY_BORDER: Record<Urgency, string> = {
  critical: "border-l-red-500", important: "border-l-amber-400", good: "border-l-emerald-400",
};

function StepCard({ step, idx }: { step: Step; idx: number }) {
  const [open, setOpen] = useState(step.status !== "done");
  return (
    <Card className={cn("border-l-4", URGENCY_BORDER[step.urgency])}>
      <button className="w-full text-left" onClick={() => setOpen(o => !o)}>
        <CardHeader className="pb-2 pt-4">
          <div className="flex items-center gap-3">
            <span className={cn(
              "flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold shrink-0",
              step.status === "done" ? "bg-emerald-100 text-emerald-700"
              : step.urgency === "critical" ? "bg-red-100 text-red-600"
              : "bg-amber-100 text-amber-700"
            )}>
              {step.status === "done" ? "✓" : idx}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold">{step.title}</span>
                <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", STATUS_STYLE[step.status])}>
                  {STATUS_LABEL[step.status]}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{step.summary}</p>
            </div>
            <ChevronRight className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-150", open && "rotate-90")} />
          </div>
        </CardHeader>
      </button>

      {open && (
        <CardContent className="pb-4 pt-0 space-y-3 pl-[52px]">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">ทำไมถึงสำคัญ</p>
            <p className="text-sm leading-relaxed">{step.why}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">ทำอย่างไร</p>
            <ul className="space-y-1.5">
              {step.how.map((h, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-primary shrink-0 font-bold mt-0.5">→</span>{h}
                </li>
              ))}
            </ul>
          </div>
          <div className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium",
            step.status === "done" ? "bg-emerald-50 text-emerald-700" : "bg-primary/5 text-primary"
          )}>
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {step.benefit}
          </div>
          {step.link && (
            <Link href={step.link.href} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              {step.link.label} →
            </Link>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ─── Situation Row ────────────────────────────────────────────────────────────

function Row({ label, value, sub, ok }: { label: string; value: string; sub?: string; ok?: boolean }) {
  return (
    <div className="flex justify-between items-start py-1.5 border-b last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="text-right">
        <span className={cn("text-sm font-semibold tabular-nums",
          ok === true ? "text-emerald-600" : ok === false ? "text-red-500" : ""
        )}>{value}</span>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FinancialPlanPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [plan,    setPlan]    = useState<PlanData | null>(null);
  const [risk,    setRisk]    = useState<RiskData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/user/financial-profile").then(r => r.json()),
      fetch("/api/user/financial-plan").then(r => r.json()),
      fetch("/api/user/risk-assessment").then(r => r.json()),
    ]).then(([profRes, planRes, riskRes]) => {
      if (profRes.data) {
        const d = profRes.data;
        setProfile({
          annualSalary: Number(d.annualSalary ?? 0), bonus: Number(d.bonus ?? 0), otherIncome: Number(d.otherIncome ?? 0),
          monthlyExpenses: Number(d.monthlyExpenses ?? 0), monthlyDebtPayment: Number(d.monthlyDebtPayment ?? 0), totalDebt: Number(d.totalDebt ?? 0),
          emergencyFundAmount: Number(d.emergencyFundAmount ?? 0),
          rmfAmount: Number(d.rmfAmount ?? 0), ssfAmount: Number(d.ssfAmount ?? 0), thaiEsgAmount: Number(d.thaiEsgAmount ?? 0),
          ltfAmount: Number(d.ltfAmount ?? 0), providentFundAmount: Number(d.providentFundAmount ?? 0),
          lifeInsurancePremium: Number(d.lifeInsurancePremium ?? 0), healthInsurancePremium: Number(d.healthInsurancePremium ?? 0),
          annuityInsurancePremium: Number(d.annuityInsurancePremium ?? 0),
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
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const steps = useMemo(() => {
    if (!profile) return [];
    return buildSteps(profile, plan, risk);
  }, [profile, plan, risk]);

  const annualIncome  = profile ? profile.annualSalary + profile.bonus + profile.otherIncome : 0;
  const monthlyIncome = annualIncome / 12;
  const monthlyFree   = profile ? monthlyIncome - profile.monthlyExpenses - profile.monthlyDebtPayment : 0;
  const totalInvested = profile ? profile.rmfAmount + profile.ssfAmount + profile.thaiEsgAmount + profile.ltfAmount + profile.providentFundAmount : 0;
  const efMonths      = profile && profile.monthlyExpenses > 0 ? profile.emergencyFundAmount / profile.monthlyExpenses : null;
  const doneCount     = steps.filter(s => s.status === "done").length;
  const missingItems  = useMemo(() => computeMissing(profile, plan, risk), [profile, plan, risk]);

  if (loading) return (
    <div className="flex justify-center py-24">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  if (!profile || annualIncome === 0) return (
    <div className="max-w-xl mx-auto space-y-5 pt-8 text-center">
      <MapPin className="h-12 w-12 text-muted-foreground/30 mx-auto" />
      <h2 className="text-xl font-bold">กรอกข้อมูลก่อนเพื่อดูแผนการเงิน</h2>
      <p className="text-muted-foreground text-sm max-w-sm mx-auto">
        ระบบจะวิเคราะห์สถานการณ์ของคุณและสร้างแผนแนะนำเฉพาะบุคคลโดยอัตโนมัติ ไม่ต้องกรอกซ้ำ
      </p>
      <Link href="/my-data">
        <Button><Banknote className="h-4 w-4 mr-2" />ไปกรอกข้อมูล My Data →</Button>
      </Link>
    </div>
  );

  const yearsToRetire = plan?.currentAge && plan?.retirementAge
    ? Math.max(0, plan.retirementAge - plan.currentAge)
    : null;

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MapPin className="h-6 w-6 text-primary" />แผนการเงินส่วนตัว
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          วิเคราะห์จากข้อมูล My Data ของคุณ — {doneCount}/{steps.length} ขั้นตอนเสร็จแล้ว
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Progress value={(doneCount / Math.max(steps.length, 1)) * 100} className="h-2 flex-1" />
        <span className="text-sm font-semibold shrink-0">{doneCount}/{steps.length}</span>
      </div>

      {/* Missing Data Banner */}
      <MissingDataBanner items={missingItems} />

      <div className="grid lg:grid-cols-[320px_1fr] gap-6 items-start">
        {/* ── Left: Situation panel ── */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Banknote className="h-4 w-4 text-blue-500" />กระแสเงินสด/เดือน
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <Row label="รายได้" value={thb(monthlyIncome)} />
              <Row label="ค่าใช้จ่าย" value={`−${thb(profile.monthlyExpenses)}`} />
              <Row label="ผ่อนหนี้" value={`−${thb(profile.monthlyDebtPayment)}`} />
              <Row label="เหลือลงทุนได้" value={thb(Math.max(0, monthlyFree))} ok={monthlyFree > 0} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4 text-emerald-500" />เงินสำรอง & หนี้
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <Row label="กองทุนฉุกเฉิน" value={thb(profile.emergencyFundAmount)}
                sub={efMonths !== null ? `${efMonths.toFixed(1)} เดือน (เป้า 6)` : undefined}
                ok={efMonths !== null && efMonths >= 6} />
              <Row label="หนี้สินรวม" value={profile.totalDebt > 0 ? thb(profile.totalDebt) : "ไม่มีหนี้ ✓"} ok={profile.totalDebt === 0} />
              <Row label="DTI (ผ่อน/รายได้)"
                value={monthlyIncome > 0 ? `${Math.round((profile.monthlyDebtPayment / monthlyIncome) * 100)}%` : "—"}
                sub="เป้า < 30%"
                ok={monthlyIncome > 0 && profile.monthlyDebtPayment / monthlyIncome < 0.3} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-500" />การลงทุน
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <Row label="รวมลงทุน/ปี" value={thb(totalInvested)}
                sub={annualIncome > 0 ? `${Math.round((totalInvested / annualIncome) * 100)}% ของรายได้ (เป้า 15%)` : undefined}
                ok={annualIncome > 0 && totalInvested / annualIncome >= 0.15} />
              <Row label="SSF" value={thb(profile.ssfAmount)} />
              <Row label="RMF" value={thb(profile.rmfAmount)} />
              <Row label="Thai ESG" value={thb(profile.thaiEsgAmount)} />
              {risk && (
                <Row label="ระดับความเสี่ยง"
                  value={risk.riskLevel === "conservative" ? "ระมัดระวัง" : risk.riskLevel === "moderate" ? "สมดุล" : "เชิงรุก"} />
              )}
            </CardContent>
          </Card>

          {plan?.currentAge ? (
            <Card>
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-indigo-500" />แผนเกษียณ
                  </CardTitle>
                  <Link href="/my-data?tab=retirement" className="text-xs text-primary hover:underline">แก้ไข →</Link>
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                <Row label="อายุปัจจุบัน" value={`${plan.currentAge} ปี`} />
                <Row label="เกษียณอายุ" value={`${plan.retirementAge} ปี`}
                  sub={yearsToRetire !== null ? `อีก ${yearsToRetire} ปี` : undefined} />
                <Row label="ค่าใช้จ่าย/เดือน (หลังเกษียณ)"
                  value={plan.monthlyRetirementNeeds ? thb(plan.monthlyRetirementNeeds) : "—"} />
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="pt-4 pb-4 text-center space-y-2">
                <AlertCircle className="h-6 w-6 text-amber-500 mx-auto" />
                <p className="text-sm text-muted-foreground">ยังไม่มีข้อมูลแผนเกษียณ</p>
                <Link href="/my-data?tab=retirement">
                  <Button size="sm" variant="outline">กำหนดแผนเกษียณ →</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Right: Action Plan ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">แผนแนะนำ — ทำตามลำดับนี้</h2>
            <span className="text-xs text-muted-foreground">คลิกที่แต่ละขั้นเพื่อดูรายละเอียด</span>
          </div>
          {steps.map((step, idx) => (
            <StepCard key={step.id} step={step} idx={idx + 1} />
          ))}
          <div className="flex items-start gap-2 text-xs text-muted-foreground pt-2 border-t">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <p>แผนนี้คำนวณจากข้อมูลที่คุณกรอกใน My Data อัปเดตข้อมูลให้ครบถ้วนเพื่อให้คำแนะนำแม่นยำยิ่งขึ้น</p>
          </div>
        </div>
      </div>
    </div>
  );
}
