"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  User, Banknote, ShieldCheck, TrendingUp, AlertTriangle,
  Save, Loader2, CheckCircle2, Wallet, Building2, Heart,
  ShieldAlert, Activity, UserCheck, AlertCircle, ExternalLink,
  MapPin, Coins, BarChart3, Globe, Layers, Bitcoin,
  ChevronDown, ChevronUp, Landmark, Plus, Trash2, X, LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

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
  // Personal portfolio (market value)
  goldAmount: number;
  cryptoAmount: number;
  etfAmount: number;
  thaiStockAmount: number;
  foreignStockAmount: number;
  otherInvestAmount: number;
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
  goldAmount: 0, cryptoAmount: 0, etfAmount: 0, thaiStockAmount: 0, foreignStockAmount: 0, otherInvestAmount: 0,
  totalDebt: 0, monthlyDebtPayment: 0, emergencyFundAmount: 0, monthlyExpenses: 0,
};

// ─── Tab Types ───────────────────────────────────────────────────────────────

type TabKey = "income" | "insurance" | "investment" | "debts";

const TABS: { key: TabKey; label: string; icon: React.ElementType; color: string }[] = [
  { key: "income",     label: "รายได้ & ครอบครัว",  icon: Banknote,    color: "text-blue-500" },
  { key: "insurance",  label: "ประกัน",              icon: ShieldCheck, color: "text-emerald-500" },
  { key: "investment", label: "การลงทุน",            icon: TrendingUp,  color: "text-purple-500" },
  { key: "debts",      label: "หนี้สิน & เงินสำรอง", icon: Wallet,      color: "text-amber-500" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const thb = (n: number) => n > 0 ? `฿${n.toLocaleString("th-TH")}` : "—";

function NumField({ label, value, onChange, hint, suffix }: {
  label: string; value: number; onChange: (v: number) => void; hint?: string; suffix?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="relative">
        <Input
          type="number" min={0} value={value || ""}
          onChange={e => onChange(Number(e.target.value) || 0)}
          placeholder="0" className={suffix ? "pr-8" : ""}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function SummaryPill({ label, value, color = "" }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-semibold", color)}>{value}</span>
    </div>
  );
}

function SectionCard({ title, icon: Icon, iconColor, children }: {
  title: string; icon: React.ElementType; iconColor: string; children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3 pt-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Icon className={cn("h-4 w-4", iconColor)} />{title}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 pb-5">{children}</CardContent>
    </Card>
  );
}

// ─── Tab: Income ──────────────────────────────────────────────────────────────

function IncomeTab({ p, upd }: { p: FinancialProfile; upd: <K extends keyof FinancialProfile>(k: K, v: FinancialProfile[K]) => void }) {
  const totalAnnual = p.annualSalary + p.bonus + p.otherIncome;
  const monthlyNet = totalAnnual > 0 ? Math.round((totalAnnual - p.monthlyExpenses * 12) / 12) : 0;
  return (
    <div className="space-y-4">
      {totalAnnual > 0 && (
        <div className="flex flex-wrap gap-6 px-4 py-3 rounded-xl bg-muted/50 border">
          <SummaryPill label="รายได้รวม/ปี" value={thb(totalAnnual)} color="text-blue-600" />
          <SummaryPill label="รายได้/เดือน" value={thb(Math.round(totalAnnual / 12))} />
          <SummaryPill label="ภาษีหัก ณ ที่จ่าย" value={thb(p.withheldTax)} />
          {monthlyNet > 0 && <SummaryPill label="เงินเหลือสุทธิ/เดือน" value={thb(monthlyNet)} color="text-emerald-600" />}
        </div>
      )}
      <SectionCard title="สถานะและครอบครัว" icon={User} iconColor="text-primary">
        <div className="sm:col-span-2 space-y-1">
          <Label className="text-sm font-medium">สถานะการยื่นภาษี</Label>
          <Select value={p.filingStatus} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => upd("filingStatus", e.target.value)}>
            <option value="single">โสด</option>
            <option value="married_no_income">สมรส — คู่สมรสไม่มีรายได้</option>
            <option value="married_separate">สมรส — ยื่นภาษีแยก</option>
            <option value="married_joint">สมรส — ยื่นภาษีรวม</option>
          </Select>
        </div>
        <NumField label="จำนวนบุตร" value={p.numChildren} onChange={v => upd("numChildren", v)} suffix="คน" />
        <NumField label="บิดา/มารดาที่ดูแล (สูงสุด 2 คน)" value={p.numParents} onChange={v => upd("numParents", Math.min(v, 2))} suffix="คน" />
        <NumField label="ผู้พิการ/ทุพพลภาพที่ดูแล" value={p.numDisabledDependents} onChange={v => upd("numDisabledDependents", v)} suffix="คน" />
      </SectionCard>
      <SectionCard title="รายได้ประจำปี" icon={Banknote} iconColor="text-blue-500">
        <NumField label="เงินเดือนรวมทั้งปี" value={p.annualSalary} onChange={v => upd("annualSalary", v)} hint="ก่อนหักภาษี" />
        <NumField label="โบนัส" value={p.bonus} onChange={v => upd("bonus", v)} />
        <NumField label="รายได้อื่น ๆ" value={p.otherIncome} onChange={v => upd("otherIncome", v)} hint="ฟรีแลนซ์ ดอกเบี้ย เงินปันผล" />
        <NumField label="รายได้คู่สมรส (ต่อปี)" value={p.spouseIncome} onChange={v => upd("spouseIncome", v)} />
        <NumField label="ภาษีหัก ณ ที่จ่าย" value={p.withheldTax} onChange={v => upd("withheldTax", v)} hint="จากสลิปเงินเดือนทั้งปี" />
        <NumField label="ค่าใช้จ่าย/เดือน" value={p.monthlyExpenses} onChange={v => upd("monthlyExpenses", v)} hint="ใช้คำนวณเงินสำรองและแผนการเงิน" />
      </SectionCard>
      <SectionCard title="สวัสดิการและกองทุน" icon={Building2} iconColor="text-indigo-500">
        <NumField label="ประกันสังคม (บาท/ปี)" value={p.socialSecurity} onChange={v => upd("socialSecurity", v)} hint="สูงสุด 9,000 บาท/ปี" />
        <NumField label="อัตราสมทบ PVD" value={p.providentFundRate} onChange={v => upd("providentFundRate", v)} suffix="%" hint="5%, 10%, 15%" />
        <NumField label="กองทุนสำรองเลี้ยงชีพ (ต่อปี)" value={p.providentFundAmount} onChange={v => upd("providentFundAmount", v)} hint="ฝั่งลูกจ้างเท่านั้น" />
      </SectionCard>
    </div>
  );
}

// ─── Tab: Insurance ───────────────────────────────────────────────────────────

type InsuranceCoverage = {
  key: keyof FinancialProfile;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  iconColor: string;
  bg: string;
  border: string;
  risk: string;       // what happens without it
  deductHint: string;
  maxDeduct: number | null;
};

const COVERAGE_TYPES: InsuranceCoverage[] = [
  {
    key: "lifeInsurancePremium", label: "ประกันชีวิต", sublabel: "Life Insurance",
    icon: Heart, iconColor: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200",
    risk: "หากเสียชีวิตกะทันหัน ครอบครัวจะไม่มีรายได้ทดแทน",
    deductHint: "ลดหย่อนได้สูงสุด 100,000 บาท", maxDeduct: 100000,
  },
  {
    key: "healthInsurancePremium", label: "ประกันสุขภาพ", sublabel: "Health Insurance",
    icon: Activity, iconColor: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200",
    risk: "ค่ารักษาพยาบาลอาจสูงถึงหลักล้าน ทำให้เงินออมหมดในพริบตา",
    deductHint: "ลดหย่อนได้สูงสุด 25,000 บาท", maxDeduct: 25000,
  },
  {
    key: "parentHealthInsurancePremium", label: "ประกันสุขภาพบิดา/มารดา", sublabel: "Parent Health",
    icon: UserCheck, iconColor: "text-sky-600", bg: "bg-sky-50 dark:bg-sky-950/30", border: "border-sky-200",
    risk: "ค่ารักษาผู้สูงอายุแพงมาก อาจกระทบรายได้ทั้งครอบครัว",
    deductHint: "ลดหย่อนได้สูงสุด 15,000 บาท", maxDeduct: 15000,
  },
  {
    key: "annuityInsurancePremium", label: "ประกันบำนาญ", sublabel: "Annuity Insurance",
    icon: Wallet, iconColor: "text-teal-600", bg: "bg-teal-50 dark:bg-teal-950/30", border: "border-teal-200",
    risk: "เกษียณแล้วเงินอาจหมดก่อนอายุขัย หากไม่มีรายได้สม่ำเสมอ",
    deductHint: "ลดหย่อนได้ 15% ของรายได้ สูงสุด 200,000 บาท", maxDeduct: 200000,
  },
  {
    key: "spouseLifeInsurancePremium", label: "ประกันชีวิตคู่สมรส", sublabel: "Spouse Life",
    icon: Heart, iconColor: "text-pink-600", bg: "bg-pink-50 dark:bg-pink-950/30", border: "border-pink-200",
    risk: "คู่สมรสที่ไม่มีรายได้ควรมีหลักประกันหากเกิดเหตุไม่คาดฝัน",
    deductHint: "ลดหย่อนได้สูงสุด 10,000 บาท (คู่สมรสไม่มีรายได้)", maxDeduct: 10000,
  },
];

function InsuranceTab({ p, upd }: { p: FinancialProfile; upd: <K extends keyof FinancialProfile>(k: K, v: FinancialProfile[K]) => void }) {
  const totalPremium = (p.lifeInsurancePremium + p.healthInsurancePremium + p.parentHealthInsurancePremium + p.annuityInsurancePremium + p.spouseLifeInsurancePremium);
  const coveredCount = COVERAGE_TYPES.filter(t => (p[t.key] as number) > 0).length;
  const missingCount = COVERAGE_TYPES.length - coveredCount;

  return (
    <div className="space-y-4">

      {/* ── Awareness banner ── */}
      <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 p-4">
        <div className="flex items-start gap-3">
          <ShieldAlert className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 dark:text-amber-300">ประกันคือโล่กำบังทางการเงินของคุณ</p>
            <p className="text-sm text-amber-700/80 dark:text-amber-400 mt-1">
              คนไทยกว่า 70% ไม่มีประกันสุขภาพเพียงพอ ค่ารักษาพยาบาลเพียงครั้งเดียวอาจทำลายแผนเกษียณของคุณทั้งชีวิต
            </p>
            {missingCount > 0 && (
              <p className="text-sm font-medium text-red-600 mt-2 flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4" />
                คุณยังขาดความคุ้มครอง {missingCount} ประเภท — ควรพิจารณาเพิ่มเติม
              </p>
            )}
            {missingCount === 0 && (
              <p className="text-sm font-medium text-emerald-600 mt-2 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                ครบทุกประเภทแล้ว — ความคุ้มครองของคุณดีมาก!
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Coverage status bar ── */}
      <div className="flex flex-wrap gap-2 text-sm">
        <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">✓ มีแล้ว {coveredCount} ประเภท</span>
        {missingCount > 0 && <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 font-medium">⚠ ขาด {missingCount} ประเภท</span>}
        {totalPremium > 0 && <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground">เบี้ยรวม ฿{totalPremium.toLocaleString("th-TH")}/ปี</span>}
      </div>

      {/* ── Coverage cards ── */}
      <div className="space-y-3">
        {COVERAGE_TYPES.map(type => {
          const Icon = type.icon;
          const premium = p[type.key] as number;
          const hasCoverage = premium > 0;
          const taxSaving = type.maxDeduct ? Math.min(premium, type.maxDeduct) : 0;

          return (
            <div key={type.key} className={`rounded-xl border p-4 transition-all ${hasCoverage ? `${type.bg} ${type.border}` : "border-dashed border-muted-foreground/30 hover:border-muted-foreground/50"}`}>
              <div className="flex items-start gap-3">
                <div className={`rounded-full p-2 shrink-0 ${hasCoverage ? type.bg : "bg-muted/50"}`}>
                  <Icon className={`h-4 w-4 ${hasCoverage ? type.iconColor : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{type.label}</span>
                    <span className="text-xs text-muted-foreground">{type.sublabel}</span>
                    {hasCoverage
                      ? <span className="ml-auto text-xs text-emerald-600 font-medium flex items-center gap-0.5"><CheckCircle2 className="h-3.5 w-3.5" /> มีแล้ว</span>
                      : <span className="ml-auto text-xs text-red-500 font-medium flex items-center gap-0.5"><AlertCircle className="h-3.5 w-3.5" /> ยังไม่มี</span>
                    }
                  </div>

                  {!hasCoverage && (
                    <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
                      ⚠️ {type.risk}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-1">
                    <Label className="text-xs shrink-0 text-muted-foreground">เบี้ย/ปี (บาท)</Label>
                    <Input
                      type="number" min={0}
                      className="h-7 text-sm"
                      value={premium || ""}
                      placeholder="0"
                      onChange={e => upd(type.key, (parseFloat(e.target.value) || 0) as FinancialProfile[typeof type.key])}
                    />
                  </div>
                  {hasCoverage && taxSaving > 0 && (
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1.5">
                      💡 {type.deductHint} · คุณลดหย่อนได้ ฿{taxSaving.toLocaleString("th-TH")}
                    </p>
                  )}
                  {!hasCoverage && (
                    <p className="text-xs text-muted-foreground mt-1">{type.deductHint}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── CTA to dedicated insurance page ── */}
      <Link href="/insurance">
        <div className="rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors p-4 flex items-center justify-between cursor-pointer group">
          <div>
            <p className="font-semibold text-sm">วิเคราะห์ความคุ้มครองเชิงลึก</p>
            <p className="text-xs text-muted-foreground mt-0.5">ดูคะแนนความคุ้มครอง · คำแนะนำเฉพาะตัว · จัดการประกันทั้งหมด</p>
          </div>
          <ExternalLink className="h-4 w-4 text-primary shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </Link>

    </div>
  );
}

// ─── Tab: Investment ──────────────────────────────────────────────────────────

const TAX_FUNDS = [
  {
    key: "rmfAmount" as keyof FinancialProfile,
    label: "RMF", sublabel: "Retirement Mutual Fund",
    icon: Landmark, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/30", border: "border-violet-200",
    capFn: (income: number) => Math.min(income * 0.30, 500_000),
    hint: "30% ของรายได้ รวมกลุ่ม ≤ 500,000",
  },
  {
    key: "ssfAmount" as keyof FinancialProfile,
    label: "SSF", sublabel: "Super Savings Fund",
    icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200",
    capFn: (income: number) => Math.min(income * 0.30, 200_000),
    hint: "30% ของรายได้ ≤ 200,000",
  },
  {
    key: "thaiEsgAmount" as keyof FinancialProfile,
    label: "Thai ESG", sublabel: "Thai ESG Fund",
    icon: Globe, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200",
    capFn: (income: number) => Math.min(income * 0.30, 300_000),
    hint: "30% ของรายได้ ≤ 300,000",
  },
  {
    key: "ltfAmount" as keyof FinancialProfile,
    label: "LTF", sublabel: "กองทุนเก่า (pre-2020)",
    icon: Coins, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200",
    capFn: (income: number) => Math.min(income * 0.15, 500_000),
    hint: "15% ของรายได้ ≤ 500,000 (สำหรับผู้ที่ซื้อก่อน 2020)",
  },
  {
    key: "providentFundAmount" as keyof FinancialProfile,
    label: "PVD", sublabel: "กองทุนสำรองเลี้ยงชีพ",
    icon: Building2, color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-950/30", border: "border-indigo-200",
    capFn: (income: number) => Math.min(income * 0.15, 500_000),
    hint: "ฝั่งลูกจ้าง ≤ 15% หรือ 500,000 (รวมกลุ่ม)",
  },
];

const PERSONAL_EMOJIS = ["💰","📈","🏠","🚗","🌾","💎","🏦","🪙","🎯","🌐","🏗️","🛢️","☁️","🤖"];

type PortfolioAsset = {
  id: string; name: string;
  group: "thai" | "international" | "other";
  emoji: string; currentValue: number; isBuiltIn: boolean; sortOrder: number;
};

const GROUP_CONFIG: Record<string, { label: string; borderColor: string; bg: string }> = {
  thai:          { label: "🇹🇭 ไทย",          borderColor: "border-red-300",   bg: "bg-red-50/60 dark:bg-red-950/20" },
  international: { label: "🌎 ต่างประเทศ",   borderColor: "border-blue-300",  bg: "bg-blue-50/60 dark:bg-blue-950/20" },
  other:         { label: "💰 อื่น ๆ",         borderColor: "border-slate-300", bg: "bg-slate-50/60 dark:bg-slate-950/20" },
};

function InvestmentTab({ p, upd }: { p: FinancialProfile; upd: <K extends keyof FinancialProfile>(k: K, v: FinancialProfile[K]) => void }) {
  const [view, setView] = useState<"tax" | "personal">("tax");
  const [assets, setAssets]         = useState<PortfolioAsset[]>([]);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [addingGroup, setAddingGroup] = useState<string | null>(null);
  const [addForm, setAddForm]         = useState({ name: "", emoji: "💰", currentValue: "" });
  const [addSaving, setAddSaving]     = useState(false);
  const updateTimers = useState<Record<string, ReturnType<typeof setTimeout>>>({})[0];

  const annualIncome = p.annualSalary + p.bonus + p.otherIncome;
  const taxTotal    = p.rmfAmount + p.ssfAmount + p.thaiEsgAmount + p.ltfAmount + p.providentFundAmount;
  const ssfCap      = Math.min(p.ssfAmount, 200_000, annualIncome * 0.30);
  const rmfCap      = Math.min(p.rmfAmount + p.providentFundAmount, annualIncome * 0.30, 500_000);
  const esgCap      = Math.min(p.thaiEsgAmount, 300_000, annualIncome * 0.30);
  const deductGrp   = Math.min(ssfCap + rmfCap + esgCap + Math.min(p.ltfAmount, annualIncome * 0.15), 500_000);
  const persTotal   = assets.reduce((s, a) => s + a.currentValue, 0);
  const grandTotal  = taxTotal + persTotal;

  const fetchAssets = () => {
    setAssetsLoading(true);
    fetch("/api/user/portfolio-assets").then(r => r.json()).then(d => {
      setAssets(d.data?.map((a: PortfolioAsset) => ({ ...a, currentValue: Number(a.currentValue) })) ?? []);
      setAssetsLoaded(true);
      setAssetsLoading(false);
    }).catch(() => setAssetsLoading(false));
  };

  useEffect(() => {
    if (view === "personal" && !assetsLoaded) fetchAssets();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const handleValueChange = (id: string, val: number) => {
    setAssets(prev => prev.map(a => a.id === id ? { ...a, currentValue: val } : a));
    if (updateTimers[id]) clearTimeout(updateTimers[id]);
    updateTimers[id] = setTimeout(() => {
      fetch(`/api/user/portfolio-assets/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentValue: val }),
      });
    }, 600);
  };

  const handleRemove = async (id: string, isBuiltIn: boolean) => {
    await fetch(`/api/user/portfolio-assets/${id}`, { method: "DELETE" });
    if (isBuiltIn) {
      // Built-in: API zeroes the value; reflect locally
      setAssets(prev => prev.map(a => a.id === id ? { ...a, currentValue: 0 } : a));
    } else {
      setAssets(prev => prev.filter(a => a.id !== id));
    }
  };

  const handleAdd = async (group: string) => {
    if (!addForm.name.trim()) return;
    setAddSaving(true);
    const res = await fetch("/api/user/portfolio-assets", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: addForm.name.trim(), emoji: addForm.emoji, group, currentValue: parseFloat(addForm.currentValue) || 0 }),
    });
    const data = await res.json();
    if (res.ok && data.data) setAssets(prev => [...prev, { ...data.data, currentValue: Number(data.data.currentValue) }]);
    setAddSaving(false);
    setAddingGroup(null);
    setAddForm({ name: "", emoji: "💰", currentValue: "" });
  };

  return (
    <div className="space-y-4">
      {/* Zone Toggle */}
      <div className="flex p-1 rounded-xl bg-muted/50 border gap-1">
        {(["tax", "personal"] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={cn("flex-1 rounded-lg py-2 text-sm font-semibold transition-all",
              view === v ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            {v === "tax" ? "🏛️ กองทุนลดหย่อนภาษี" : "📈 พอร์ตลงทุนส่วนตัว"}
          </button>
        ))}
      </div>

      {/* Grand total banner */}
      {grandTotal > 0 && (
        <div className="flex flex-wrap gap-4 px-4 py-3 rounded-xl bg-muted/50 border">
          <SummaryPill label="รวมทุกสินทรัพย์" value={thb(grandTotal)} color="text-indigo-600" />
          {taxTotal > 0 && <SummaryPill label="กองทุนภาษี/ปี" value={thb(taxTotal)} color="text-violet-600" />}
          {persTotal > 0 && <SummaryPill label="พอร์ตส่วนตัว" value={thb(persTotal)} color="text-blue-600" />}
          {annualIncome > 0 && grandTotal > 0 && <SummaryPill label="ลงทุน/รายได้" value={`${((grandTotal / annualIncome) * 100).toFixed(0)}%`} />}
        </div>
      )}

      {/* ── TAX ZONE ── */}
      {view === "tax" && (
        <div className="space-y-3">
          {deductGrp > 0 && (
            <div className="rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-200 p-3 flex items-center gap-3">
              <Landmark className="h-5 w-5 text-violet-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-violet-800 dark:text-violet-300">ลดหย่อนได้ {thb(deductGrp)}/ปี</p>
                <p className="text-xs text-violet-600/70">
                  {annualIncome > 0 ? `ยังเหลือสิทธิ์ได้อีก ${thb(Math.max(0, Math.min(annualIncome * 0.30, 500_000) - deductGrp))}` : "กรอกรายได้เพื่อดูสิทธิ์คงเหลือ"}
                </p>
              </div>
            </div>
          )}
          {TAX_FUNDS.map(fund => {
            const Icon  = fund.icon;
            const value = p[fund.key] as number;
            const cap   = annualIncome > 0 ? fund.capFn(annualIncome) : null;
            const pct   = cap && cap > 0 ? Math.min(100, (value / cap) * 100) : null;
            const room  = cap ? Math.max(0, cap - value) : null;
            return (
              <div key={fund.key} className={cn(
                "rounded-xl border p-4 transition-all",
                value > 0 ? `${fund.bg} ${fund.border}` : "border-dashed border-muted-foreground/30"
              )}>
                <div className="flex items-start gap-3">
                  <div className={cn("rounded-full p-2 shrink-0", value > 0 ? fund.bg : "bg-muted/50")}>
                    <Icon className={cn("h-4 w-4", value > 0 ? fund.color : "text-muted-foreground")} />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{fund.label}</span>
                      <span className="text-xs text-muted-foreground">{fund.sublabel}</span>
                      {value > 0 && cap !== null && (
                        <span className={cn("ml-auto text-xs font-medium px-2 py-0.5 rounded-full",
                          pct! >= 100 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
                          {pct! >= 100 ? "ใช้ครบ ✓" : `${pct!.toFixed(0)}%`}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs shrink-0 text-muted-foreground whitespace-nowrap">บาท/ปี</Label>
                      <Input type="number" min={0} className="h-8 text-sm" value={value || ""} placeholder="0"
                        onChange={e => upd(fund.key, (parseFloat(e.target.value) || 0) as FinancialProfile[typeof fund.key])}
                      />
                    </div>
                    {pct !== null && value > 0 && (
                      <div className="space-y-1">
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className={cn("h-full rounded-full transition-all", pct >= 100 ? "bg-emerald-500" : "bg-violet-400")}
                            style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                        {room !== null && room > 0 && <p className="text-xs text-muted-foreground">{fund.hint} · เหลือ {thb(room)}</p>}
                        {room === 0 && <p className="text-xs text-emerald-600">✓ ใช้สิทธิ์เต็มแล้ว!</p>}
                      </div>
                    )}
                    {value === 0 && <p className="text-xs text-muted-foreground">{fund.hint}</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── PERSONAL PORTFOLIO ZONE ── */}
      {view === "personal" && (
        <div className="space-y-4">
          {assetsLoading && (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          )}

          {/* Allocation bar */}
          {!assetsLoading && persTotal > 0 && (
            <div className="rounded-xl border p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">สัดส่วนพอร์ต</p>
              <div className="h-3 rounded-full overflow-hidden flex gap-px bg-muted">
                {(["thai", "international", "other"] as const).map(g => {
                  const groupTotal = assets.filter(a => a.group === g).reduce((s, a) => s + a.currentValue, 0);
                  const pct = (groupTotal / persTotal) * 100;
                  return pct > 0 ? (
                    <div key={g} title={`${GROUP_CONFIG[g].label}: ${pct.toFixed(0)}%`}
                      className={cn("h-full transition-all",
                        g === "thai" ? "bg-red-400" : g === "international" ? "bg-blue-400" : "bg-slate-400"
                      )}
                      style={{ width: `${pct}%` }} />
                  ) : null;
                })}
              </div>
              <div className="flex flex-wrap gap-3">
                {(["thai", "international", "other"] as const).map(g => {
                  const groupTotal = assets.filter(a => a.group === g).reduce((s, a) => s + a.currentValue, 0);
                  return groupTotal > 0 ? (
                    <span key={g} className="text-xs flex items-center gap-1">
                      <span className={cn("h-2 w-2 rounded-full inline-block",
                        g === "thai" ? "bg-red-400" : g === "international" ? "bg-blue-400" : "bg-slate-400"
                      )} />
                      <span className="text-muted-foreground">{GROUP_CONFIG[g].label}</span>
                      <span className="font-semibold">{((groupTotal / persTotal) * 100).toFixed(0)}%</span>
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* Asset groups */}
          {!assetsLoading && (["thai", "international", "other"] as const).map(g => {
            const cfg        = GROUP_CONFIG[g];
            const groupAssets = assets.filter(a => a.group === g);
            const groupTotal  = groupAssets.reduce((s, a) => s + a.currentValue, 0);
            const isAdding    = addingGroup === g;

            return (
              <div key={g} className={cn("rounded-xl border-2 p-4 space-y-3", cfg.borderColor, cfg.bg)}>
                {/* Group header */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{cfg.label}</p>
                    {groupTotal > 0 && <p className="text-xs text-muted-foreground">{thb(groupTotal)} · {groupAssets.filter(a => a.currentValue > 0).length} รายการ</p>}
                  </div>
                  <button
                    onClick={() => { setAddingGroup(isAdding ? null : g); setAddForm({ name: "", emoji: "💰", currentValue: "" }); }}
                    className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-background/80 border hover:bg-muted transition-colors"
                  >
                    {isAdding ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    {isAdding ? "ยกเลิก" : "เพิ่มสินทรัพย์"}
                  </button>
                </div>

                {/* Add form */}
                {isAdding && (
                  <div className="rounded-xl border bg-background/90 p-3 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground">เพิ่มสินทรัพย์ในกลุ่ม {cfg.label}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {PERSONAL_EMOJIS.map(e => (
                        <button key={e}
                          onClick={() => setAddForm(f => ({ ...f, emoji: e }))}
                          className={cn("text-lg rounded-lg p-1 transition-all hover:scale-110", addForm.emoji === e ? "ring-2 ring-primary bg-primary/10" : "hover:bg-muted")}
                        >{e}</button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input placeholder="ชื่อสินทรัพย์" value={addForm.name}
                        onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} className="flex-1 h-8 text-sm" />
                      <Input type="number" min={0} placeholder="มูลค่า (บาท)" value={addForm.currentValue}
                        onChange={e => setAddForm(f => ({ ...f, currentValue: e.target.value }))} className="w-36 h-8 text-sm" />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" disabled={addSaving || !addForm.name.trim()}
                        onClick={() => handleAdd(g)}>
                        {addSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}บันทึก
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setAddingGroup(null)}>ยกเลิก</Button>
                    </div>
                  </div>
                )}

                {/* Asset cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {groupAssets.map(asset => (
                    <div key={asset.id} className={cn(
                      "flex items-center gap-2 rounded-xl border bg-background/80 px-3 py-2.5 transition-all",
                      asset.currentValue > 0 ? "border-border" : "border-dashed border-muted-foreground/30"
                    )}>
                      <span className="text-xl shrink-0">{asset.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{asset.name}</p>
                        <Input
                          type="number" min={0}
                          className="h-7 text-sm mt-1 bg-transparent border-0 px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                          value={asset.currentValue || ""}
                          placeholder="มูลค่า (บาท)"
                          onChange={e => handleValueChange(asset.id, parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <button
                        onClick={() => handleRemove(asset.id, asset.isBuiltIn)}
                        className="text-muted-foreground/50 hover:text-destructive transition-colors p-1 shrink-0"
                        title={asset.isBuiltIn ? "ตั้งค่าเป็น 0" : "ลบออก"}
                      >
                        {asset.isBuiltIn ? <X className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>

                {groupAssets.length === 0 && !isAdding && (
                  <p className="text-xs text-muted-foreground text-center py-2">ยังไม่มีสินทรัพย์ — กด "เพิ่มสินทรัพย์" เพื่อเริ่มต้น</p>
                )}
              </div>
            );
          })}

          {!assetsLoading && (
            <Card className="bg-muted/30">
              <CardContent className="pt-4 pb-4 text-sm space-y-1">
                <p className="font-semibold">💡 อัปเดตมูลค่าพอร์ตทุกเดือน</p>
                <p className="text-muted-foreground text-xs">ระบบใช้ข้อมูลนี้คำนวณแผนเกษียณและฉายภาพความมั่งคั่งระยะยาว</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Debts ───────────────────────────────────────────────────────────────

function DebtsTab({ p, upd }: { p: FinancialProfile; upd: <K extends keyof FinancialProfile>(k: K, v: FinancialProfile[K]) => void }) {
  const monthlyIncome   = (p.annualSalary + p.bonus + p.otherIncome) / 12;
  const dti             = monthlyIncome > 0 ? (p.monthlyDebtPayment / monthlyIncome) * 100 : 0;
  const emergencyMonths = p.monthlyExpenses > 0 ? p.emergencyFundAmount / p.monthlyExpenses : 0;
  const dtiColor = dti === 0 ? "" : dti < 30 ? "text-emerald-600" : dti < 50 ? "text-amber-600" : "text-red-500";
  const efColor  = emergencyMonths === 0 ? "" : emergencyMonths < 3 ? "text-red-500" : emergencyMonths < 6 ? "text-amber-600" : "text-emerald-600";
  return (
    <div className="space-y-4">
      {(p.totalDebt > 0 || p.emergencyFundAmount > 0) && (
        <div className="flex flex-wrap gap-6 px-4 py-3 rounded-xl bg-muted/50 border">
          <SummaryPill label="หนี้สินรวม" value={thb(p.totalDebt)} color={p.totalDebt > 0 ? "text-amber-600" : ""} />
          <SummaryPill label="ผ่อนชำระ/เดือน" value={thb(p.monthlyDebtPayment)} />
          {dti > 0 && <SummaryPill label="สัดส่วนหนี้/รายได้" value={`${dti.toFixed(1)}%`} color={dtiColor} />}
          <SummaryPill label="เงินสำรองฉุกเฉิน" value={thb(p.emergencyFundAmount)} />
          {emergencyMonths > 0 && <SummaryPill label="ครอบคลุม" value={`${emergencyMonths.toFixed(1)} เดือน`} color={efColor} />}
        </div>
      )}
      <SectionCard title="ภาระหนี้สิน" icon={AlertTriangle} iconColor="text-amber-500">
        <NumField label="หนี้สินรวมทั้งหมด (บาท)" value={p.totalDebt} onChange={v => upd("totalDebt", v)} hint="บ้าน รถ บัตรเครดิต สินเชื่อส่วนตัว" />
        <NumField label="ยอดผ่อนชำระ/เดือน (บาท)" value={p.monthlyDebtPayment} onChange={v => upd("monthlyDebtPayment", v)} hint="ทุกบัญชีรวมกัน" />
      </SectionCard>
      <SectionCard title="เงินออมและสำรอง" icon={Wallet} iconColor="text-emerald-500">
        <NumField label="เงินสำรองฉุกเฉิน (บาท)" value={p.emergencyFundAmount} onChange={v => upd("emergencyFundAmount", v)} hint="เงินที่พร้อมถอนใช้ได้ทันที" />
        <NumField label="ค่าใช้จ่ายต่อเดือน (บาท)" value={p.monthlyExpenses} onChange={v => upd("monthlyExpenses", v)} hint="ใช้คำนวณจำนวนเดือนที่สำรองได้" />
      </SectionCard>
      <div className="grid sm:grid-cols-2 gap-3">
        {dti > 0 && (
          <Card className={cn("border", dti < 30 ? "border-emerald-200 bg-emerald-50/50" : dti < 50 ? "border-amber-200 bg-amber-50/50" : "border-red-200 bg-red-50/50")}>
            <CardContent className="pt-3 pb-3 text-sm">
              <p className="font-semibold">{dti < 30 ? "✅ ภาระหนี้อยู่ในเกณฑ์ดี" : dti < 50 ? "⚠️ ภาระหนี้ควรระวัง" : "🚨 ภาระหนี้สูงเกินไป"}</p>
              <p className="text-muted-foreground mt-0.5">DTI {dti.toFixed(1)}% — แนะนำไม่เกิน 30%</p>
            </CardContent>
          </Card>
        )}
        {emergencyMonths > 0 && (
          <Card className={cn("border", emergencyMonths >= 6 ? "border-emerald-200 bg-emerald-50/50" : emergencyMonths >= 3 ? "border-amber-200 bg-amber-50/50" : "border-red-200 bg-red-50/50")}>
            <CardContent className="pt-3 pb-3 text-sm">
              <p className="font-semibold">{emergencyMonths >= 6 ? "✅ เงินสำรองเพียงพอ" : emergencyMonths >= 3 ? "⚠️ เงินสำรองควรเพิ่ม" : "🚨 เงินสำรองไม่เพียงพอ"}</p>
              <p className="text-muted-foreground mt-0.5">{emergencyMonths.toFixed(1)} เดือน — แนะนำอย่างน้อย 6 เดือน</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function MyDataPage() {
  const [tab, setTab] = useState<TabKey>("income");

  // Honour ?tab= URL param (e.g. from Dashboard Investment card)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("tab") as TabKey;
    if (t && ["income", "insurance", "investment", "debts"].includes(t)) {
      setTab(t);
    }
  }, []);
  const [profile, setProfile] = useState<FinancialProfile>(defaultProfile);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

  useEffect(() => {
    fetch("/api/user/financial-profile").then(r => r.json()).then(res => {
      if (res.data) {
        const d = res.data;
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
          goldAmount: Number(d.goldAmount ?? 0),
          cryptoAmount: Number(d.cryptoAmount ?? 0),
          etfAmount: Number(d.etfAmount ?? 0),
          thaiStockAmount: Number(d.thaiStockAmount ?? 0),
          foreignStockAmount: Number(d.foreignStockAmount ?? 0),
          otherInvestAmount: Number(d.otherInvestAmount ?? 0),
          totalDebt: Number(d.totalDebt ?? 0),
          monthlyDebtPayment: Number(d.monthlyDebtPayment ?? 0),
          emergencyFundAmount: Number(d.emergencyFundAmount ?? 0),
          monthlyExpenses: Number(d.monthlyExpenses ?? 0),
        });
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const upd = useCallback(<K extends keyof FinancialProfile>(k: K, v: FinancialProfile[K]) => {
    setProfile(p => ({ ...p, [k]: v }));
    setSaved(false);
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch("/api/user/financial-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">ข้อมูลของฉัน</h1>
          <p className="text-sm text-muted-foreground mt-1">
            ข้อมูลนี้ถูกใช้โดย AI ที่ปรึกษา · คำนวณภาษี · วิเคราะห์ประกัน · แผนการเงิน
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : saved ? <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-400" /> : <Save className="h-4 w-4 mr-2" />}
          {saving ? "กำลังบันทึก..." : saved ? "บันทึกแล้ว" : "บันทึก"}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap shrink-0",
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon className={cn("h-3.5 w-3.5", tab === t.key ? t.color : "text-muted-foreground")} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "income"      && <IncomeTab      p={profile} upd={upd} />}
      {tab === "insurance"   && <InsuranceTab   p={profile} upd={upd} />}
      {tab === "investment"  && <InvestmentTab  p={profile} upd={upd} />}
      {tab === "debts"       && <DebtsTab       p={profile} upd={upd} />}

      {/* Bottom save */}
      <div className="flex items-center gap-3 pt-2 border-t">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          {saving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
        </Button>
        {saved && <span className="flex items-center gap-1 text-sm text-emerald-600"><CheckCircle2 className="h-4 w-4" />บันทึกสำเร็จ</span>}
      </div>
    </div>
  );
}
