"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  User, Banknote, ShieldCheck, TrendingUp, AlertTriangle, CheckCircle2,
  ChevronRight, ChevronLeft, Save, RefreshCw, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FinancialProfile {
  filingStatus: string;
  numChildren: number;
  numParents: number;
  numDisabledDependents: number;
  annualSalary: number;
  bonus: number;
  otherIncome: number;
  spouseIncome: number;
  withheldTax: number;
  socialSecurity: number;
  providentFundRate: number;
  providentFundAmount: number;
  lifeInsurancePremium: number;
  healthInsurancePremium: number;
  parentHealthInsurancePremium: number;
  annuityInsurancePremium: number;
  spouseLifeInsurancePremium: number;
  ltfAmount: number;
  rmfAmount: number;
  ssfAmount: number;
  thaiEsgAmount: number;
  totalDebt: number;
  monthlyDebtPayment: number;
  emergencyFundAmount: number;
  monthlyExpenses: number;
}

const defaultProfile: FinancialProfile = {
  filingStatus: "single", numChildren: 0, numParents: 0, numDisabledDependents: 0,
  annualSalary: 0, bonus: 0, otherIncome: 0, spouseIncome: 0, withheldTax: 0,
  socialSecurity: 0, providentFundRate: 0, providentFundAmount: 0,
  lifeInsurancePremium: 0, healthInsurancePremium: 0, parentHealthInsurancePremium: 0,
  annuityInsurancePremium: 0, spouseLifeInsurancePremium: 0,
  ltfAmount: 0, rmfAmount: 0, ssfAmount: 0, thaiEsgAmount: 0,
  totalDebt: 0, monthlyDebtPayment: 0, emergencyFundAmount: 0, monthlyExpenses: 0,
};

// ─── Risk Assessment Questions ────────────────────────────────────────────────

const riskQuestions = [
  // Part 1: SEC standard
  {
    id: "experience", part: 1,
    question: "คุณมีประสบการณ์ลงทุนมากี่ปี?",
    options: [
      { label: "ไม่มีประสบการณ์", score: 0 },
      { label: "น้อยกว่า 1 ปี", score: 1 },
      { label: "1–3 ปี", score: 3 },
      { label: "3–5 ปี", score: 5 },
      { label: "มากกว่า 5 ปี", score: 7 },
    ],
  },
  {
    id: "horizon", part: 1,
    question: "คุณวางแผนลงทุนระยะใด?",
    options: [
      { label: "น้อยกว่า 1 ปี", score: 0 },
      { label: "1–3 ปี", score: 2 },
      { label: "3–5 ปี", score: 4 },
      { label: "5–10 ปี", score: 6 },
      { label: "มากกว่า 10 ปี", score: 8 },
    ],
  },
  {
    id: "loss_reaction", part: 1,
    question: "ถ้าพอร์ตลงทุนของคุณลดลง 20% ใน 1 เดือน คุณจะทำอย่างไร?",
    options: [
      { label: "ขายทันทีเพื่อลดความเสี่ยง", score: 0 },
      { label: "ขายบางส่วนเพื่อรักษาเงินต้น", score: 2 },
      { label: "ถือต่อ รอให้ราคาฟื้น", score: 4 },
      { label: "ซื้อเพิ่ม เพราะราคาถูกลง", score: 6 },
    ],
  },
  {
    id: "income_stability", part: 1,
    question: "รายได้ของคุณมีความมั่นคงเพียงใด?",
    options: [
      { label: "ไม่แน่นอน / สัญญาระยะสั้น", score: 0 },
      { label: "ค่อนข้างแน่นอน", score: 2 },
      { label: "มั่นคง (ข้าราชการ / บริษัทใหญ่)", score: 4 },
      { label: "มีรายได้หลายแหล่ง", score: 6 },
    ],
  },
  {
    id: "goal", part: 1,
    question: "เป้าหมายหลักของการลงทุนของคุณคืออะไร?",
    options: [
      { label: "รักษาเงินต้น ไม่ยอมขาดทุนเลย", score: 0 },
      { label: "ผลตอบแทนเล็กน้อย รับความเสี่ยงต่ำ", score: 2 },
      { label: "ผลตอบแทนปานกลาง รับความผันผวนได้บ้าง", score: 4 },
      { label: "ผลตอบแทนสูงสุด ยอมรับความผันผวนได้มาก", score: 6 },
    ],
  },
  {
    id: "asset_pref", part: 1,
    question: "คุณชอบลงทุนในสินทรัพย์ประเภทใด?",
    options: [
      { label: "เงินฝาก / ตราสารหนี้ล้วน", score: 0 },
      { label: "กองทุนผสม (หุ้น + ตราสารหนี้)", score: 2 },
      { label: "กองทุนหุ้นในประเทศ", score: 4 },
      { label: "หุ้นทั้งในและต่างประเทศ / สินทรัพย์ทางเลือก", score: 6 },
    ],
  },
  {
    id: "current_portfolio", part: 1,
    question: "ปัจจุบันคุณถือสินทรัพย์ประเภทใดบ้าง?",
    options: [
      { label: "เงินฝากธนาคาร / พันธบัตรล้วน", score: 0 },
      { label: "มีกองทุนรวมบ้าง", score: 2 },
      { label: "มีหุ้นรายตัวหรือกองทุนหุ้น", score: 4 },
      { label: "มีทั้งหุ้น กองทุน และสินทรัพย์ทางเลือก (ทอง / REITs / คริปโต)", score: 6 },
    ],
  },
  // Part 2: MyFinance extension
  {
    id: "emergency_fund", part: 2,
    question: "เงินสำรองฉุกเฉินของคุณครอบคลุมค่าใช้จ่ายได้กี่เดือน?",
    options: [
      { label: "น้อยกว่า 3 เดือน", score: 0 },
      { label: "3–6 เดือน", score: 2 },
      { label: "6–12 เดือน", score: 3 },
      { label: "มากกว่า 12 เดือน", score: 4 },
    ],
  },
  {
    id: "debt_ratio", part: 2,
    question: "ภาระผ่อนชำระหนี้คิดเป็นกี่เปอร์เซ็นต์ของรายได้ต่อเดือน?",
    options: [
      { label: "มากกว่า 50%", score: 0 },
      { label: "30–50%", score: 1 },
      { label: "น้อยกว่า 30%", score: 3 },
      { label: "ไม่มีหนี้", score: 4 },
    ],
  },
  {
    id: "insurance_coverage", part: 2,
    question: "คุณมีประกันชีวิตและประกันสุขภาพที่เพียงพอหรือไม่?",
    options: [
      { label: "ไม่มีประกันใดเลย", score: 0 },
      { label: "มีบางส่วน แต่ไม่เพียงพอ", score: 1 },
      { label: "มีประกันที่ครอบคลุมพอสมควร", score: 3 },
      { label: "มีประกันครบถ้วน (ชีวิต+สุขภาพ+อุบัติเหตุ)", score: 4 },
    ],
  },
  {
    id: "next_goal_timing", part: 2,
    question: "เป้าหมายการเงินสำคัญถัดไปของคุณต้องการเงินเมื่อใด?",
    options: [
      { label: "ภายใน 1 ปี", score: 0 },
      { label: "1–3 ปี", score: 1 },
      { label: "3–5 ปี", score: 3 },
      { label: "5 ปีขึ้นไป", score: 4 },
    ],
  },
];

const MAX_SCORE = riskQuestions.reduce((sum, q) => sum + Math.max(...q.options.map(o => o.score)), 0);

function calcRiskLevel(score: number): "conservative" | "moderate" | "aggressive" {
  const pct = (score / MAX_SCORE) * 100;
  if (pct <= 35) return "conservative";
  if (pct <= 65) return "moderate";
  return "aggressive";
}

const riskInfo = {
  conservative: { label: "ระมัดระวัง", color: "text-blue-600", bg: "bg-blue-50 border-blue-200", desc: "เน้นรักษาเงินต้น ผลตอบแทนมั่นคง รับความผันผวนได้น้อย" },
  moderate:     { label: "ปานกลาง",   color: "text-amber-600", bg: "bg-amber-50 border-amber-200", desc: "สมดุลระหว่างการเจริญเติบโตและความปลอดภัย รับความผันผวนได้ปานกลาง" },
  aggressive:   { label: "เชิงรุก",   color: "text-green-600", bg: "bg-green-50 border-green-200", desc: "เน้นผลตอบแทนสูงสุด ยอมรับความผันผวนได้มาก" },
};

// ─── Helper Component ─────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children, className }: {
  title: string; icon: React.ElementType; children: React.ReactNode; className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</CardContent>
    </Card>
  );
}

function NumField({ label, value, onChange, hint }: {
  label: string; value: number; onChange: (v: number) => void; hint?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-sm">{label}</Label>
      <Input
        type="number" min={0} value={value || ""}
        onChange={e => onChange(Number(e.target.value) || 0)}
        placeholder="0"
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "profile" | "risk";

export default function MyDataPage() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>(
    (searchParams.get("tab") as Tab | null) === "risk" ? "risk" : "profile"
  );

  // Financial profile state
  const [profile, setProfile] = useState<FinancialProfile>(defaultProfile);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Risk assessment state
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [riskPart, setRiskPart] = useState<1 | 2>(1);
  const [riskResult, setRiskResult] = useState<{ score: number; level: "conservative" | "moderate" | "aggressive" } | null>(null);
  const [riskLoading, setRiskLoading] = useState(true);
  const [riskSaving, setRiskSaving] = useState(false);

  // Load data
  useEffect(() => {
    Promise.all([
      fetch("/api/user/financial-profile").then(r => r.json()),
      fetch("/api/user/risk-assessment").then(r => r.json()),
    ]).then(([profRes, riskRes]) => {
      if (profRes.data) {
        const d = profRes.data;
        setProfile({
          filingStatus: d.filingStatus ?? "single",
          numChildren: Number(d.numChildren ?? 0),
          numParents: Number(d.numParents ?? 0),
          numDisabledDependents: Number(d.numDisabledDependents ?? 0),
          annualSalary: Number(d.annualSalary ?? 0),
          bonus: Number(d.bonus ?? 0),
          otherIncome: Number(d.otherIncome ?? 0),
          spouseIncome: Number(d.spouseIncome ?? 0),
          withheldTax: Number(d.withheldTax ?? 0),
          socialSecurity: Number(d.socialSecurity ?? 0),
          providentFundRate: Number(d.providentFundRate ?? 0),
          providentFundAmount: Number(d.providentFundAmount ?? 0),
          lifeInsurancePremium: Number(d.lifeInsurancePremium ?? 0),
          healthInsurancePremium: Number(d.healthInsurancePremium ?? 0),
          parentHealthInsurancePremium: Number(d.parentHealthInsurancePremium ?? 0),
          annuityInsurancePremium: Number(d.annuityInsurancePremium ?? 0),
          spouseLifeInsurancePremium: Number(d.spouseLifeInsurancePremium ?? 0),
          ltfAmount: Number(d.ltfAmount ?? 0),
          rmfAmount: Number(d.rmfAmount ?? 0),
          ssfAmount: Number(d.ssfAmount ?? 0),
          thaiEsgAmount: Number(d.thaiEsgAmount ?? 0),
          totalDebt: Number(d.totalDebt ?? 0),
          monthlyDebtPayment: Number(d.monthlyDebtPayment ?? 0),
          emergencyFundAmount: Number(d.emergencyFundAmount ?? 0),
          monthlyExpenses: Number(d.monthlyExpenses ?? 0),
        });
      }
      setProfileLoading(false);

      if (riskRes.data) {
        const a: Record<string, string> = {};
        (riskRes.data.answers as Array<{questionId: string; answer: string; score: number}>).forEach((ans) => { a[ans.questionId] = ans.answer; });
        setAnswers(a);
        setRiskResult({ score: riskRes.data.score, level: riskRes.data.riskLevel });
      }
      setRiskLoading(false);
    }).catch(() => { setProfileLoading(false); setRiskLoading(false); });
  }, []);

  const upd = useCallback(<K extends keyof FinancialProfile>(key: K, val: FinancialProfile[K]) => {
    setProfile(p => ({ ...p, [key]: val }));
  }, []);

  async function saveProfile() {
    setProfileSaving(true);
    try {
      await fetch("/api/user/financial-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } finally {
      setProfileSaving(false);
    }
  }

  async function saveRisk() {
    const answeredAll = riskQuestions.every(q => answers[q.id] !== undefined);
    if (!answeredAll) return;

    const answerArr = riskQuestions.map(q => {
      const opt = q.options.find(o => o.label === answers[q.id]);
      return { questionId: q.id, answer: answers[q.id], score: opt?.score ?? 0 };
    });
    const totalScore = answerArr.reduce((s, a) => s + a.score, 0);
    const level = calcRiskLevel(totalScore);

    setRiskSaving(true);
    try {
      await fetch("/api/user/risk-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answerArr, score: totalScore, riskLevel: level }),
      });
      setRiskResult({ score: totalScore, level });
    } finally {
      setRiskSaving(false);
    }
  }

  const part1Qs = riskQuestions.filter(q => q.part === 1);
  const part2Qs = riskQuestions.filter(q => q.part === 2);
  const currentPartQs = riskPart === 1 ? part1Qs : part2Qs;
  const part1Done = part1Qs.every(q => answers[q.id]);
  const allDone = riskQuestions.every(q => answers[q.id]);
  const currentProgress = (Object.keys(answers).length / riskQuestions.length) * 100;

  if (profileLoading || riskLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">ข้อมูลของฉัน</h1>
        <p className="text-muted-foreground text-sm mt-1">ข้อมูลนี้จะถูกใช้โดย AI ที่ปรึกษา เครื่องมือคำนวณภาษี และการวิเคราะห์ประกัน</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b gap-1">
        {([["profile", "โปรไฟล์การเงิน"], ["risk", "ประเมินความเสี่ยง"]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
            {key === "risk" && riskResult && (
              <span className={cn("ml-2 text-xs font-normal", riskInfo[riskResult.level].color)}>
                [{riskInfo[riskResult.level].label}]
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Financial Profile Tab ── */}
      {tab === "profile" && (
        <div className="space-y-4">
          {/* Personal */}
          <Section title="ข้อมูลส่วนตัว" icon={User}>
            <div className="space-y-1 sm:col-span-2">
              <Label>สถานะการยื่นภาษี</Label>
              <Select value={profile.filingStatus} onChange={e => upd("filingStatus", e.target.value)}>
                <option value="single">โสด</option>
                <option value="married_no_income">สมรส — คู่สมรสไม่มีรายได้</option>
                <option value="married_separate">สมรส — ยื่นแยก</option>
                <option value="married_joint">สมรส — ยื่นรวม</option>
              </Select>
            </div>
            <NumField label="จำนวนบุตร (คน)" value={profile.numChildren} onChange={v => upd("numChildren", v)} />
            <NumField label="บิดา/มารดาที่ดูแล (คน, สูงสุด 2)" value={profile.numParents} onChange={v => upd("numParents", Math.min(v, 2))} />
            <NumField label="ผู้พิการ/ทุพพลภาพที่ดูแล (คน)" value={profile.numDisabledDependents} onChange={v => upd("numDisabledDependents", v)} />
          </Section>

          {/* Income */}
          <Section title="รายได้ (บาท/ปี)" icon={Banknote}>
            <NumField label="เงินเดือนทั้งปี" value={profile.annualSalary} onChange={v => upd("annualSalary", v)} />
            <NumField label="โบนัส" value={profile.bonus} onChange={v => upd("bonus", v)} />
            <NumField label="รายได้อื่น" value={profile.otherIncome} onChange={v => upd("otherIncome", v)} />
            <NumField label="รายได้คู่สมรส" value={profile.spouseIncome} onChange={v => upd("spouseIncome", v)} />
            <NumField label="ภาษีหักณที่จ่าย" value={profile.withheldTax} onChange={v => upd("withheldTax", v)} />
            <NumField label="ค่าใช้จ่าย/เดือน" value={profile.monthlyExpenses} onChange={v => upd("monthlyExpenses", v)} hint="ใช้คำนวณเงินสำรองฉุกเฉิน" />
          </Section>

          {/* Payroll */}
          <Section title="ประกันสังคม & กองทุนสำรองเลี้ยงชีพ" icon={ShieldCheck}>
            <NumField label="ประกันสังคม (บาท/ปี)" value={profile.socialSecurity} onChange={v => upd("socialSecurity", v)} hint="เช่น 9,000" />
            <NumField label="อัตราสมทบ PVD (%)" value={profile.providentFundRate} onChange={v => upd("providentFundRate", v)} hint="เช่น 5, 10, 15" />
            <NumField label="PVD รวมทั้งปี (บาท)" value={profile.providentFundAmount} onChange={v => upd("providentFundAmount", v)} hint="เงินสมทบฝั่งลูกจ้างเท่านั้น" />
          </Section>

          {/* Insurance */}
          <Section title="เบี้ยประกัน (บาท/ปี)" icon={ShieldCheck}>
            <NumField label="ประกันชีวิต" value={profile.lifeInsurancePremium} onChange={v => upd("lifeInsurancePremium", v)} />
            <NumField label="ประกันสุขภาพ" value={profile.healthInsurancePremium} onChange={v => upd("healthInsurancePremium", v)} />
            <NumField label="ประกันสุขภาพบิดา/มารดา" value={profile.parentHealthInsurancePremium} onChange={v => upd("parentHealthInsurancePremium", v)} />
            <NumField label="ประกันบำนาญ/แบบสะสมทรัพย์" value={profile.annuityInsurancePremium} onChange={v => upd("annuityInsurancePremium", v)} />
            <NumField label="ประกันชีวิตคู่สมรส" value={profile.spouseLifeInsurancePremium} onChange={v => upd("spouseLifeInsurancePremium", v)} />
          </Section>

          {/* Investments */}
          <Section title="การลงทุนเพื่อลดหย่อนภาษี (บาท/ปี)" icon={TrendingUp}>
            <NumField label="RMF" value={profile.rmfAmount} onChange={v => upd("rmfAmount", v)} />
            <NumField label="SSF" value={profile.ssfAmount} onChange={v => upd("ssfAmount", v)} />
            <NumField label="Thai ESG" value={profile.thaiEsgAmount} onChange={v => upd("thaiEsgAmount", v)} />
            <NumField label="LTF (กองทุนเก่า)" value={profile.ltfAmount} onChange={v => upd("ltfAmount", v)} />
          </Section>

          {/* Liabilities + Emergency Fund */}
          <Section title="หนี้สิน & เงินสำรอง" icon={AlertTriangle}>
            <NumField label="หนี้สินรวม (บาท)" value={profile.totalDebt} onChange={v => upd("totalDebt", v)} />
            <NumField label="ยอดผ่อนชำระ/เดือน (บาท)" value={profile.monthlyDebtPayment} onChange={v => upd("monthlyDebtPayment", v)} />
            <NumField label="เงินสำรองฉุกเฉิน (บาท)" value={profile.emergencyFundAmount} onChange={v => upd("emergencyFundAmount", v)} hint="เงินออมที่พร้อมใช้ได้ทันที" />
          </Section>

          <div className="flex items-center gap-3">
            <Button onClick={saveProfile} disabled={profileSaving} className="min-w-32">
              {profileSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {profileSaving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
            </Button>
            {profileSaved && (
              <span className="flex items-center gap-1 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" /> บันทึกสำเร็จ
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Risk Assessment Tab ── */}
      {tab === "risk" && (
        <div className="space-y-4">
          {/* Progress */}
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-2">
                <span>ความคืบหน้า: {Object.keys(answers).length}/{riskQuestions.length} คำถาม</span>
                <span>ส่วนที่ {riskPart}/2 — {riskPart === 1 ? "มาตรฐาน กลต." : "เพิ่มเติม MyFinance"}</span>
              </div>
              <Progress value={currentProgress} className="h-2" />
            </CardContent>
          </Card>

          {/* Current result banner */}
          {riskResult && (
            <Card className={cn("border", riskInfo[riskResult.level].bg)}>
              <CardContent className="pt-4 pb-3 flex items-center gap-3">
                <CheckCircle2 className={cn("h-5 w-5", riskInfo[riskResult.level].color)} />
                <div>
                  <p className="font-semibold text-sm">ระดับความเสี่ยงของคุณ: <span className={riskInfo[riskResult.level].color}>{riskInfo[riskResult.level].label}</span> ({riskResult.score}/{MAX_SCORE} คะแนน)</p>
                  <p className="text-xs text-muted-foreground">{riskInfo[riskResult.level].desc}</p>
                </div>
                <Button variant="ghost" size="sm" className="ml-auto" onClick={() => { setAnswers({}); setRiskResult(null); setRiskPart(1); }}>
                  <RefreshCw className="h-4 w-4 mr-1" /> ทำใหม่
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Questions */}
          <div className="space-y-4">
            <CardDescription className="font-medium text-foreground">
              {riskPart === 1 ? "ส่วนที่ 1: แบบประเมินมาตรฐาน (7 คำถาม)" : "ส่วนที่ 2: บริบทการเงินส่วนตัว (4 คำถาม)"}
            </CardDescription>
            {currentPartQs.map((q, i) => (
              <Card key={q.id} className={cn(answers[q.id] ? "border-primary/30" : "")}>
                <CardContent className="pt-4 pb-4">
                  <p className="text-sm font-medium mb-3">{i + 1}. {q.question}</p>
                  <div className="grid gap-2">
                    {q.options.map(opt => (
                      <button
                        key={opt.label}
                        onClick={() => setAnswers(a => ({ ...a, [q.id]: opt.label }))}
                        className={cn(
                          "text-left px-3 py-2 rounded-md border text-sm transition-colors",
                          answers[q.id] === opt.label
                            ? "border-primary bg-primary/10 text-primary font-medium"
                            : "border-border hover:border-primary/50 hover:bg-accent"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            {riskPart === 2 ? (
              <Button variant="outline" onClick={() => setRiskPart(1)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> ส่วนที่ 1
              </Button>
            ) : <div />}

            {riskPart === 1 ? (
              <Button onClick={() => setRiskPart(2)} disabled={!part1Done}>
                ส่วนที่ 2 <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={saveRisk} disabled={!allDone || riskSaving} className="min-w-36">
                {riskSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                {riskSaving ? "กำลังบันทึก..." : "บันทึกผลประเมิน"}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
