"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  User, Banknote, ShieldCheck, TrendingUp, AlertTriangle,
  Save, Loader2, CheckCircle2, Wallet, Building2,
  MapPin, Coins, BarChart3, Globe, Layers, Bitcoin,
  ChevronDown, ChevronUp, ChevronLeft, Landmark, Plus, Trash2, X, LayoutGrid, Search, Pencil, Sparkles,
  PiggyBank, Target, Copy, Bot,
} from "lucide-react";
import Link from "next/link";
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
  taxRefundAmount: number;
  dividendIncome: number;
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
  debtInterestRate: number;
  emergencyFundAmount: number;
  monthlyExpenses: number;
  cashOnHand: number;
  savingsDeposit: number;
  fixedDeposit: number;
  monthlySavingsGoal: number;
  // Monthly budget breakdown
  budgetHousing: number;
  budgetFood: number;
  budgetTransport: number;
  budgetUtilities: number;
  budgetHealthcare: number;
  budgetEntertainment: number;
  budgetEducation: number;
  budgetPersonalCare: number;
  budgetOther: number;
  // Monthly investment targets
  monthlyInvestTax: number;
  monthlyInvestPersonal: number;
}

// ─── Insurance coverage state (saved to InsuranceData, separate from premium) ─

interface InsuranceState {
  lifeCoverageAmount: number;
  healthCoveragePerYear: number;
  parentHealthCoveragePerYear: number;
  annuityCoverageAmount: number;
  spouseLifeCoverageAmount: number;
}

const defaultInsurance: InsuranceState = {
  lifeCoverageAmount: 0,
  healthCoveragePerYear: 0,
  parentHealthCoveragePerYear: 0,
  annuityCoverageAmount: 0,
  spouseLifeCoverageAmount: 0,
};

const defaultProfile: FinancialProfile = {
  filingStatus: "single", numChildren: 0, numParents: 0, numDisabledDependents: 0,
  annualSalary: 0, bonus: 0, otherIncome: 0, spouseIncome: 0, withheldTax: 0,
  taxRefundAmount: 0, dividendIncome: 0,
  socialSecurity: 0, providentFundRate: 0, providentFundAmount: 0,
  lifeInsurancePremium: 0, healthInsurancePremium: 0, parentHealthInsurancePremium: 0,
  annuityInsurancePremium: 0, spouseLifeInsurancePremium: 0,
  ltfAmount: 0, rmfAmount: 0, ssfAmount: 0, thaiEsgAmount: 0,
  goldAmount: 0, cryptoAmount: 0, etfAmount: 0, thaiStockAmount: 0, foreignStockAmount: 0, otherInvestAmount: 0,
  totalDebt: 0, monthlyDebtPayment: 0, debtInterestRate: 0, emergencyFundAmount: 0, monthlyExpenses: 0,
  cashOnHand: 0, savingsDeposit: 0, fixedDeposit: 0, monthlySavingsGoal: 0,
  budgetHousing: 0, budgetFood: 0, budgetTransport: 0, budgetUtilities: 0,
  budgetHealthcare: 0, budgetEntertainment: 0, budgetEducation: 0, budgetPersonalCare: 0, budgetOther: 0,
  monthlyInvestTax: 0, monthlyInvestPersonal: 0,
};

// ─── Tab Types ───────────────────────────────────────────────────────────────

type TabKey = "income" | "insurance" | "investment" | "debts" | "savings" | "goals";

const TABS: { key: TabKey; label: string; icon: React.ElementType; color: string }[] = [
  { key: "income",     label: "รายได้ & ครอบครัว",  icon: Banknote,    color: "text-blue-500" },
  { key: "insurance",  label: "ประกัน",              icon: ShieldCheck, color: "text-emerald-500" },
  { key: "investment", label: "การลงทุน",            icon: TrendingUp,  color: "text-purple-500" },
  { key: "debts",      label: "หนี้สิน",             icon: Wallet,      color: "text-amber-500" },
  { key: "savings",    label: "เงินออม",              icon: PiggyBank,   color: "text-teal-500" },
  { key: "goals",      label: "เป้าหมาย",            icon: Target,      color: "text-rose-500" },
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
        <NumField label="รายได้อื่น ๆ" value={p.otherIncome} onChange={v => upd("otherIncome", v)} hint="ฟรีแลนซ์ ดอกเบี้ย" />
        <NumField label="เงินปันผล จากหุ้น/ปี" value={p.dividendIncome} onChange={v => upd("dividendIncome", v)} hint="ปันผลรายปีจากหุ้น/กองทุน" />
        <NumField label="เงินคืนภาษี/ปี" value={p.taxRefundAmount} onChange={v => upd("taxRefundAmount", v)} hint="เงินที่ได้คืนจากสรรพากร" />
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

type InsuranceCoverageDef = {
  premiumKey: keyof FinancialProfile;
  coverageKey: keyof InsuranceState;
  label: string;
  deductHint: string;
  maxDeduct: number | null;
  coverageLabel: string;
  coverageHint: string;
};

const COVERAGE_TYPES: InsuranceCoverageDef[] = [
  {
    premiumKey: "lifeInsurancePremium", coverageKey: "lifeCoverageAmount",
    label: "ประกันชีวิต",
    deductHint: "ลดหย่อนได้สูงสุด 100,000 บาท", maxDeduct: 100000,
    coverageLabel: "ทุนประกันชีวิต (บาท)", coverageHint: "เงินที่ครอบครัวได้รับเมื่อเสียชีวิต",
  },
  {
    premiumKey: "healthInsurancePremium", coverageKey: "healthCoveragePerYear",
    label: "ประกันสุขภาพ",
    deductHint: "ลดหย่อนได้สูงสุด 25,000 บาท", maxDeduct: 25000,
    coverageLabel: "วงเงินสุขภาพ/ปี (บาท)", coverageHint: "ค่ารักษาพยาบาลที่ประกันจ่ายให้ต่อปี",
  },
  {
    premiumKey: "parentHealthInsurancePremium", coverageKey: "parentHealthCoveragePerYear",
    label: "ประกันสุขภาพบิดา/มารดา",
    deductHint: "ลดหย่อนได้สูงสุด 15,000 บาท", maxDeduct: 15000,
    coverageLabel: "วงเงินสุขภาพพ่อแม่/ปี (บาท)", coverageHint: "วงเงินคุ้มครองค่ารักษาบิดา/มารดา",
  },
  {
    premiumKey: "annuityInsurancePremium", coverageKey: "annuityCoverageAmount",
    label: "ประกันบำนาญ",
    deductHint: "ลดหย่อน 15% ของรายได้ สูงสุด 200,000 บาท", maxDeduct: 200000,
    coverageLabel: "เงินบำนาญ/ปี (บาท)", coverageHint: "รายได้บำนาญที่ได้รับต่อปีหลังเกษียณ",
  },
  {
    premiumKey: "spouseLifeInsurancePremium", coverageKey: "spouseLifeCoverageAmount",
    label: "ประกันชีวิตคู่สมรส",
    deductHint: "ลดหย่อนได้สูงสุด 10,000 บาท", maxDeduct: 10000,
    coverageLabel: "ทุนประกันคู่สมรส (บาท)", coverageHint: "เงินที่ได้รับเมื่อคู่สมรสเสียชีวิต",
  },
];

function InsuranceTab({
  p, upd, ins, updIns,
}: {
  p: FinancialProfile;
  upd: <K extends keyof FinancialProfile>(k: K, v: FinancialProfile[K]) => void;
  ins: InsuranceState;
  updIns: (k: keyof InsuranceState, v: number) => void;
}) {
  const totalAnnual = COVERAGE_TYPES.reduce((sum, t) => sum + (p[t.premiumKey] as number), 0);
  const coveredCount = COVERAGE_TYPES.filter(t => (p[t.premiumKey] as number) > 0).length;
  const totalMonthly = Math.round(totalAnnual / 12);

  return (
    <div className="space-y-4">

      {/* ── Summary strip ── */}
      {totalAnnual > 0 && (
        <div className="flex flex-wrap gap-6 px-4 py-3 rounded-xl bg-muted/50 border">
          <SummaryPill label="เบี้ยรวม/เดือน" value={thb(totalMonthly)} color="text-emerald-600" />
          <SummaryPill label="เบี้ยรวม/ปี" value={thb(totalAnnual)} />
          <SummaryPill label="ประเภทที่มี" value={`${coveredCount} / ${COVERAGE_TYPES.length}`} />
        </div>
      )}

      {/* ── Per-insurance cards: premium + sum insured grouped ── */}
      {COVERAGE_TYPES.map(type => {
        const annual = p[type.premiumKey] as number;
        const monthly = annual > 0 ? Math.round(annual / 12) : 0;
        return (
          <Card key={type.premiumKey}>
            <CardHeader className="pb-3 pt-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                {type.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 pb-5">
              {/* Monthly premium */}
              <div className="space-y-1">
                <Label className="text-sm font-medium">เบี้ย/เดือน (บาท)</Label>
                <Input
                  type="number" min={0} value={monthly || ""} placeholder="0"
                  onChange={e => upd(type.premiumKey, (Math.round((Number(e.target.value) || 0) * 12)) as FinancialProfile[typeof type.premiumKey])}
                />
                {annual > 0
                  ? <p className="text-xs text-muted-foreground">= {thb(annual)}/ปี · {type.deductHint}</p>
                  : <p className="text-xs text-muted-foreground">{type.deductHint}</p>
                }
              </div>
              {/* Sum insured / coverage */}
              <NumField
                label={type.coverageLabel}
                value={ins[type.coverageKey]}
                onChange={v => updIns(type.coverageKey, v)}
                hint={type.coverageHint}
              />
            </CardContent>
          </Card>
        );
      })}

    </div>
  );
}

// ─── Tab: Investment ──────────────────────────────────────────────────────────

const TAX_ASSET_TYPES = ["rmf", "ssf", "thai_esg", "ltf", "provident_fund"] as const;
const TAX_FUNDS = [
  {
    code: "rmf",
    key: "rmfAmount" as keyof FinancialProfile,
    label: "RMF", sublabel: "Retirement Mutual Fund",
    icon: Landmark, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/30", border: "border-violet-200",
    capFn: (income: number) => Math.min(income * 0.30, 500_000),
    hint: "30% ของรายได้ รวมกลุ่ม ≤ 500,000",
  },
  {
    code: "ssf",
    key: "ssfAmount" as keyof FinancialProfile,
    label: "SSF", sublabel: "Super Savings Fund",
    icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200",
    capFn: (income: number) => Math.min(income * 0.30, 200_000),
    hint: "30% ของรายได้ ≤ 200,000",
  },
  {
    code: "thai_esg",
    key: "thaiEsgAmount" as keyof FinancialProfile,
    label: "Thai ESG", sublabel: "Thai ESG Fund",
    icon: Globe, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200",
    capFn: (income: number) => Math.min(income * 0.30, 300_000),
    hint: "30% ของรายได้ ≤ 300,000",
  },
  {
    code: "ltf",
    key: "ltfAmount" as keyof FinancialProfile,
    label: "LTF", sublabel: "กองทุนเก่า (pre-2020)",
    icon: Coins, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200",
    capFn: (income: number) => Math.min(income * 0.15, 500_000),
    hint: "15% ของรายได้ ≤ 500,000 (สำหรับผู้ที่ซื้อก่อน 2020)",
  },
  {
    code: "provident_fund",
    key: "providentFundAmount" as keyof FinancialProfile,
    label: "PVD", sublabel: "กองทุนสำรองเลี้ยงชีพ",
    icon: Building2, color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-950/30", border: "border-indigo-200",
    capFn: (income: number) => Math.min(income * 0.15, 500_000),
    hint: "ฝั่งลูกจ้าง ≤ 15% หรือ 500,000 (รวมกลุ่ม)",
  },
];

type PortfolioAsset = {
  id: string; name: string;
  group: "thai" | "international" | "other" | "tax";
  emoji: string; currentValue: number; isBuiltIn: boolean; sortOrder: number;
  ticker?: string | null; units?: number | null; avgCostPerUnit?: number | null;
  assetType?: string | null; expectedReturn?: number | null;
  annualInvestment?: number | null;
};

type AssetTypeDef = {
  code: string; label: string; labelEn: string;
  emoji: string; group: "thai" | "international" | "other"; desc: string;
};

const ASSET_TYPE_CATALOG: AssetTypeDef[] = [
  // ── Thai ──
  { code: "thai_stock",    label: "หุ้นไทย",              labelEn: "Thai Stocks",     emoji: "📈", group: "thai",          desc: "หุ้นในตลาดหลักทรัพย์ SET / MAI" },
  { code: "thai_fund",     label: "กองทุนรวมไทย",         labelEn: "Thai Mutual Fund", emoji: "🏦", group: "thai",          desc: "กองทุนตราสารทุน / ตราสารหนี้" },
  { code: "thai_reit",     label: "REIT ไทย",             labelEn: "Thai REITs",      emoji: "🏢", group: "thai",          desc: "กองทรัสต์อสังหาริมทรัพย์" },
  { code: "thai_bond",     label: "พันธบัตรรัฐบาล",      labelEn: "Gov Bond",         emoji: "📜", group: "thai",          desc: "พันธบัตรรัฐบาล / หุ้นกู้" },
  { code: "thai_property", label: "อสังหาริมทรัพย์",     labelEn: "Real Estate",      emoji: "🏠", group: "thai",          desc: "บ้าน คอนโด ที่ดิน" },
  // ── International ──
  { code: "us_stock",      label: "หุ้นสหรัฐ",           labelEn: "US Stocks",        emoji: "🇺🇸", group: "international", desc: "S&P500, NASDAQ, หุ้นรายตัว" },
  { code: "world_etf",     label: "ETF ทั่วโลก",         labelEn: "World ETF",        emoji: "🌍", group: "international", desc: "VT, VXUS, MSCI World" },
  { code: "asia_stock",    label: "หุ้นเอเชีย",          labelEn: "Asia Stocks",      emoji: "🌏", group: "international", desc: "จีน ญี่ปุ่น เกาหลี อินเดีย" },
  { code: "intl_bond",     label: "ตราสารหนี้ต่างประเทศ", labelEn: "Intl Bonds",      emoji: "📋", group: "international", desc: "พันธบัตรต่างประเทศ" },
  { code: "intl_reit",     label: "REIT ต่างประเทศ",     labelEn: "Global REITs",     emoji: "🏗️", group: "international", desc: "กองทรัสต์อสังหาฯ ต่างประเทศ" },
  // ── Other ──
  { code: "gold",          label: "ทองคำ",               labelEn: "Gold",             emoji: "🥇", group: "other",         desc: "ทองแท่ง ทองรูปพรรณ Gold Online" },
  { code: "crypto",        label: "คริปโตเคอร์เรนซี",   labelEn: "Cryptocurrency",   emoji: "₿",  group: "other",         desc: "Bitcoin, Ethereum, Altcoin" },
  { code: "deposit",       label: "เงินฝากประจำ",        labelEn: "Fixed Deposit",    emoji: "🏛️", group: "other",         desc: "เงินฝากประจำ ตั๋วแลกเงิน" },
  { code: "commodity",     label: "สินค้าโภคภัณฑ์",     labelEn: "Commodities",      emoji: "🛢️", group: "other",         desc: "น้ำมัน เงิน ทองแดง" },
  { code: "startup",       label: "หุ้นนอกตลาด",        labelEn: "Private Equity",   emoji: "🚀", group: "other",         desc: "Startup / หุ้นที่ไม่อยู่ใน SET" },
  { code: "custom",        label: "กำหนดเอง",            labelEn: "Custom",           emoji: "✏️", group: "other",         desc: "ระบุชื่อสินทรัพย์เอง" },
];

const CATALOG_BY_GROUP = (g: string) =>
  ASSET_TYPE_CATALOG.filter(t => t.group === g || t.code === "custom");

const GROUP_CONFIG: Record<string, { label: string; tab: string; activeTab: string; dot: string }> = {
  thai:          { label: "🇹🇭 ไทย",        tab: "text-red-600 border-red-400",   activeTab: "bg-red-50 border-red-400 text-red-700",   dot: "bg-red-400" },
  international: { label: "🌎 ต่างประเทศ",  tab: "text-blue-600 border-blue-400", activeTab: "bg-blue-50 border-blue-400 text-blue-700", dot: "bg-blue-400" },
  other:         { label: "💰 อื่น ๆ",       tab: "text-slate-600 border-slate-400", activeTab: "bg-slate-100 border-slate-400 text-slate-700", dot: "bg-slate-400" },
};

type SearchResult = {
  id: string; assetType: string; ticker: string;
  nameTh?: string; nameEn?: string; exchange?: string; provider?: string; sector?: string;
};

function InvestmentTab({ p, upd }: { p: FinancialProfile; upd: <K extends keyof FinancialProfile>(k: K, v: FinancialProfile[K]) => void }) {
  const [view, setView]           = useState<"tax" | "personal">("tax");
  const [groupTab, setGroupTab]   = useState<"thai" | "international" | "other">("thai");
  const [assets, setAssets]       = useState<PortfolioAsset[]>([]);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [assetsLoading, setAssetsLoading] = useState(false);
  // Add form state — one inline add form per type card
  const [activeAddCode, setActiveAddCode]   = useState<string | null>(null);
  const [addFormStep, setAddFormStep]       = useState<"search" | "details">("search");
  // Instrument search
  const [searchQ, setSearchQ]               = useState("");
  const [searchResults, setSearchResults]   = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading]   = useState(false);
  const [pickedInstrument, setPickedInstrument] = useState<SearchResult | null>(null);
  const [customName, setCustomName]         = useState("");
  // Values
  const [addValue, setAddValue]             = useState("");
  const [addUnits, setAddUnits]             = useState("");
  const [addAvgCost, setAddAvgCost]         = useState("");
  const [addSaving, setAddSaving]           = useState(false);
  // Edit existing asset
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editUnits, setEditUnits]   = useState("");
  const [editCost, setEditCost]     = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [typeRates, setTypeRates]   = useState<Record<string, number>>({});
  const [taxFundRates, setTaxFundRates] = useState<Record<string, number>>({});
  const [aiRateLoading, setAiRateLoading] = useState(false);
  const searchTimer = useState<ReturnType<typeof setTimeout> | null>(null);
  const updateTimers = useState<Record<string, ReturnType<typeof setTimeout>>>({})[0];

  const annualIncome = p.annualSalary + p.bonus + p.otherIncome;
  const taxTotal    = p.rmfAmount + p.ssfAmount + p.thaiEsgAmount + p.ltfAmount + p.providentFundAmount;
  const ssfCap      = Math.min(p.ssfAmount, 200_000, annualIncome * 0.30);
  const rmfCap      = Math.min(p.rmfAmount + p.providentFundAmount, annualIncome * 0.30, 500_000);
  const esgCap      = Math.min(p.thaiEsgAmount, 300_000, annualIncome * 0.30);
  const deductGrp   = Math.min(ssfCap + rmfCap + esgCap + Math.min(p.ltfAmount, annualIncome * 0.15), 500_000);
  const persAssets  = assets.filter(a => !(TAX_ASSET_TYPES as readonly string[]).includes(a.assetType ?? ""));
  const persTotal   = persAssets.reduce((s, a) => s + a.currentValue, 0);
  const grandTotal  = taxTotal + persTotal;
  // Weighted average expected return across personal portfolio
  const portfolioWeightedReturn = persTotal > 0
    ? persAssets.reduce((sum, a) => sum + a.currentValue * (a.expectedReturn ?? typeRates[a.assetType ?? ""] ?? 0), 0) / persTotal
    : 0;
  // Weighted average expected return across tax-deduction funds
  const taxWeightedReturn = taxTotal > 0
    ? TAX_FUNDS.reduce((sum, f) => {
        const rate = taxFundRates[f.code] ?? 0;
        const taxAssets = assets.filter(a => a.assetType === f.code);
        const val = taxAssets.length > 0
          ? taxAssets.reduce((s, a) => s + a.currentValue, 0)
          : (p[f.key] as number);
        return sum + val * rate;
      }, 0) / taxTotal
    : 0;

  // Budget tracking
  const taxBudgetAnnual = p.monthlyInvestTax;
  // Effective annual amount per fund: child assets sum OR manual p[fund.key]
  const getFundEffective = (fund: typeof TAX_FUNDS[0]) => {
    const children = assets.filter(a => a.assetType === fund.code);
    return children.length > 0
      ? children.reduce((s, a) => s + (a.annualInvestment ?? 0), 0)
      : (p[fund.key] as number);
  };
  const taxAnnualUsed = TAX_FUNDS.reduce((s, f) => s + getFundEffective(f), 0);
  const taxAnnualRemaining = Math.max(0, taxBudgetAnnual - taxAnnualUsed);
  // Per-fund budget remaining = total budget minus all OTHER funds
  const getFundBudgetRemaining = (fund: typeof TAX_FUNDS[0]) => {
    if (taxBudgetAnnual === 0) return Infinity;
    return Math.max(0, taxBudgetAnnual - (taxAnnualUsed - getFundEffective(fund)));
  };

  const persBudgetAnnual = p.monthlyInvestPersonal;
  const persAnnualUsed = persAssets.reduce((s, a) => s + (a.annualInvestment ?? 0), 0);
  const persAnnualRemaining = Math.max(0, persBudgetAnnual - persAnnualUsed);

  const fetchAssets = () => {
    setAssetsLoading(true);
    fetch("/api/user/portfolio-assets").then(r => r.json()).then(d => {
      setAssets(d.data?.map((a: PortfolioAsset) => ({ ...a, currentValue: Number(a.currentValue), expectedReturn: a.expectedReturn != null ? Number(a.expectedReturn) : null, annualInvestment: a.annualInvestment != null ? Number(a.annualInvestment) : null })) ?? []);
      // Seed typeRates from first asset of each type that has a rate
      const rates: Record<string, number> = {};
      d.data?.forEach((a: PortfolioAsset) => {
        if (a.assetType && a.expectedReturn != null && !rates[a.assetType]) {
          rates[a.assetType] = Number(a.expectedReturn);
        }
      });
      setTypeRates(prev => ({ ...prev, ...rates }));
      setAssetsLoaded(true);
      setAssetsLoading(false);
    }).catch(() => setAssetsLoading(false));
  };

  useEffect(() => {
    fetchAssets();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleValueChange = (id: string, val: number) => {
    const asset = assets.find(a => a.id === id);
    setAssets(prev => prev.map(a => a.id === id ? { ...a, currentValue: val } : a));
    if (updateTimers[id]) clearTimeout(updateTimers[id]);
    updateTimers[id] = setTimeout(() => {
      fetch(`/api/user/portfolio-assets/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentValue: val }),
      });
    }, 600);
    if (asset) {
      const taxFund = TAX_FUNDS.find(f => f.code === asset.assetType);
      if (taxFund) {
        const newTotal = assets.map(a => a.id === id ? { ...a, currentValue: val } : a)
          .filter(a => a.assetType === taxFund.code)
          .reduce((s, a) => s + a.currentValue, 0);
        upd(taxFund.key, newTotal as FinancialProfile[typeof taxFund.key]);
      }
    }
  };

  const handleAnnualChange = (id: string, val: number) => {
    const asset = assets.find(a => a.id === id);
    const updated = assets.map(a => a.id === id ? { ...a, annualInvestment: val } : a);
    setAssets(updated);
    if (asset?.assetType) {
      const taxFund = TAX_FUNDS.find(f => f.code === asset.assetType);
      if (taxFund) {
        const newTotal = updated.filter(a => a.assetType === taxFund.code).reduce((s, a) => s + (a.annualInvestment ?? 0), 0);
        upd(taxFund.key, newTotal as FinancialProfile[typeof taxFund.key]);
      }
    }
    const key = `annual_${id}`;
    if (updateTimers[key]) clearTimeout(updateTimers[key]);
    updateTimers[key] = setTimeout(() => {
      fetch(`/api/user/portfolio-assets/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ annualInvestment: val || null }),
      });
    }, 600);
  };

  const handleRemove = async (id: string, isBuiltIn: boolean) => {
    const asset = assets.find(a => a.id === id);
    await fetch(`/api/user/portfolio-assets/${id}`, { method: "DELETE" });
    let newAssets: PortfolioAsset[];
    if (isBuiltIn) {
      newAssets = assets.map(a => a.id === id ? { ...a, currentValue: 0 } : a);
    } else {
      newAssets = assets.filter(a => a.id !== id);
    }
    setAssets(newAssets);
    if (asset) {
      const taxFund = TAX_FUNDS.find(f => f.code === asset.assetType);
      if (taxFund) {
        const newTotal = newAssets.filter(a => a.assetType === taxFund.code).reduce((s, a) => s + a.currentValue, 0);
        upd(taxFund.key, newTotal as FinancialProfile[typeof taxFund.key]);
      }
    }
  };

  const resetAddForm = () => {
    setActiveAddCode(null);
    setAddFormStep("search");
    setPickedInstrument(null);
    setSearchQ("");
    setSearchResults([]);
    setCustomName("");
    setAddValue("");
    setAddUnits("");
    setAddAvgCost("");
  };

  const doSearch = useCallback(async (q: string, assetType: string) => {
    setSearchLoading(true);
    const params = new URLSearchParams({ q, limit: "12" });
    if (assetType) params.set("type", assetType);
    const res = await fetch(`/api/instruments?${params}`);
    const data = await res.json();
    setSearchResults(data.data ?? []);
    setSearchLoading(false);
  }, []);

  const handleSearchChange = (q: string, assetType: string) => {
    setSearchQ(q);
    setPickedInstrument(null);
    if (searchTimer[0]) clearTimeout(searchTimer[0]);
    searchTimer[0] = setTimeout(() => doSearch(q, assetType), 300);
  };

  const handleStartAdd = (type: AssetTypeDef) => {
    resetAddForm();
    setActiveAddCode(type.code);
    setAddFormStep("search");
    if (type.code !== "custom") doSearch("", type.code);
  };

  const handleStartTaxAdd = (fund: (typeof TAX_FUNDS)[0]) => {
    resetAddForm();
    setActiveAddCode(fund.code);
    setAddFormStep("search");
  };

  const handleAddTaxFund = async (fund: (typeof TAX_FUNDS)[0]) => {
    const name = pickedInstrument
      ? (pickedInstrument.nameTh ?? pickedInstrument.nameEn ?? pickedInstrument.ticker ?? "")
      : customName.trim();
    const ticker = pickedInstrument?.ticker;
    const finalName = name || ticker || "";
    if (!finalName) return;
    setAddSaving(true);
    const annualAmount = parseFloat(addValue) || 0;
    const res = await fetch("/api/user/portfolio-assets", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assetType: fund.code, ticker, name: finalName,
        emoji: "🏦", group: "tax", currentValue: 0, annualInvestment: annualAmount,
      }),
    });
    const data = await res.json();
    if (res.ok && data.data) {
      const newAssets = [...assets, { ...data.data, currentValue: 0, annualInvestment: annualAmount }];
      setAssets(newAssets);
      const newTotal = newAssets.filter(a => a.assetType === fund.code).reduce((s, a) => s + (a.annualInvestment ?? 0), 0);
      upd(fund.key, newTotal as FinancialProfile[typeof fund.key]);
    }
    setAddSaving(false);
    resetAddForm();
  };

  const handleAdd = async (type: AssetTypeDef) => {
    const name = pickedInstrument
      ? (pickedInstrument.nameTh ?? pickedInstrument.nameEn ?? pickedInstrument.ticker ?? "")
      : customName.trim();
    const ticker = pickedInstrument?.ticker;
    const finalName = name || ticker || "";
    if (!finalName) return;
    const costValue = (parseFloat(addUnits || "0") || 0) * (parseFloat(addAvgCost || "0") || 0);
    setAddSaving(true);
    const res = await fetch("/api/user/portfolio-assets", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assetType: type.code,
        ticker,
        name: finalName,
        emoji: type.emoji,
        group: type.group,
        currentValue: parseFloat(addValue) || costValue || 0,
        units: addUnits ? parseFloat(addUnits) : null,
        avgCostPerUnit: addAvgCost ? parseFloat(addAvgCost) : null,
      }),
    });
    const data = await res.json();
    if (res.ok && data.data) {
      setAssets(prev => [...prev, { ...data.data, currentValue: Number(data.data.currentValue) }]);
    }
    setAddSaving(false);
    resetAddForm();
  };

  const handleLumpSumChange = (type: AssetTypeDef, val: number) => {
    const lump = assets.find(a => a.assetType === type.code && !a.ticker);
    if (lump) {
      handleValueChange(lump.id, val);
    } else if (val > 0) {
      const key = `lump_${type.code}`;
      if (updateTimers[key]) clearTimeout(updateTimers[key]);
      updateTimers[key] = setTimeout(async () => {
        const res = await fetch("/api/user/portfolio-assets", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assetType: type.code, name: type.label, emoji: type.emoji, group: type.group, currentValue: val }),
        });
        const data = await res.json();
        if (res.ok && data.data) setAssets(prev => [...prev, { ...data.data, currentValue: val }]);
      }, 800);
    }
  };

  const openEdit = (asset: PortfolioAsset) => {
    setEditingId(asset.id);
    setEditUnits(asset.units != null ? String(asset.units) : "");
    setEditCost(asset.avgCostPerUnit != null ? String(asset.avgCostPerUnit) : "");
  };

  const handleTaxFundRateChange = (fundCode: string, rate: number) => {
    setTaxFundRates(prev => ({ ...prev, [fundCode]: rate }));
    // Persist to any child assets of this tax fund
    const taxAssets = assets.filter(a => a.assetType === fundCode);
    const timerKey = `taxrate_${fundCode}`;
    if (updateTimers[timerKey]) clearTimeout(updateTimers[timerKey]);
    updateTimers[timerKey] = setTimeout(() => {
      taxAssets.forEach(a => {
        fetch(`/api/user/portfolio-assets/${a.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ expectedReturn: rate || null }),
        });
      });
    }, 700);
  };

  const handleAiSuggestRates = async (assetCodes: string[], target: "tax" | "portfolio") => {
    setAiRateLoading(true);
    try {
      const res = await fetch("/api/ai/suggest-rates", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetTypes: assetCodes }),
      });
      const data = await res.json();
      if (res.ok && data.rates) {
        if (target === "tax") {
          setTaxFundRates(prev => ({ ...prev, ...data.rates }));
        } else {
          setTypeRates(prev => ({ ...prev, ...data.rates }));
          setAssets(prev => prev.map(a => {
            const r = a.assetType ? data.rates[a.assetType] : undefined;
            return r !== undefined ? { ...a, expectedReturn: r } : a;
          }));
        }
      }
    } catch {
      // silently fail — user can retry
    }
    setAiRateLoading(false);
  };

  const handleReturnRateChange = (assetTypeCode: string, rate: number) => {
    setTypeRates(prev => ({ ...prev, [assetTypeCode]: rate }));
    setAssets(prev => prev.map(a => a.assetType === assetTypeCode ? { ...a, expectedReturn: rate } : a));
    const typeAssets = assets.filter(a => a.assetType === assetTypeCode);
    const timerKey = `rate_${assetTypeCode}`;
    if (updateTimers[timerKey]) clearTimeout(updateTimers[timerKey]);
    updateTimers[timerKey] = setTimeout(() => {
      typeAssets.forEach(a => {
        fetch(`/api/user/portfolio-assets/${a.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ expectedReturn: rate || null }),
        });
      });
    }, 700);
  };

  const handleEditSave = async (id: string) => {
    setEditSaving(true);
    const units = editUnits !== "" ? parseFloat(editUnits) : null;
    const avgCostPerUnit = editCost !== "" ? parseFloat(editCost) : null;
    const res = await fetch(`/api/user/portfolio-assets/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ units, avgCostPerUnit }),
    });
    if (res.ok) {
      setAssets(prev => prev.map(a => a.id === id ? { ...a, units, avgCostPerUnit } : a));
      setEditingId(null);
    }
    setEditSaving(false);
  };

  const groupAssets   = assets.filter(a => a.group === groupTab);
  const groupTotal    = groupAssets.reduce((s, a) => s + a.currentValue, 0);

  return (
    <div className="space-y-4">
      {/* Monthly investment targets */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <p className="text-sm font-semibold">💰 แผนเงินลงทุน/ปี</p>
        <p className="text-xs text-muted-foreground">กรอกงบลงทุนรายปีก่อน เพื่อติดตามว่าลงทุนไปเท่าไรจากงบที่ตั้งไว้</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <NumField
              label="ลงทุนลดหย่อนภาษี/ปี"
              value={p.monthlyInvestTax}
              onChange={v => upd("monthlyInvestTax", v)}
              hint="SSF, RMF, ThaiESG ฯลฯ"
            />
            {p.monthlyInvestTax > 0 && assetsLoaded && (
              <div className="space-y-0.5 pt-0.5">
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-violet-500 transition-all"
                    style={{ width: `${Math.min(100, (taxAnnualUsed / taxBudgetAnnual) * 100)}%` }} />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  ใช้แล้ว <span className="font-semibold text-violet-600">{thb(taxAnnualUsed)}</span>{" "}
                  · เหลือ <span className={cn("font-semibold", taxAnnualRemaining > 0 ? "text-emerald-600" : "text-rose-500")}>{thb(taxAnnualRemaining)}</span>/ปี
                </p>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <NumField
              label="ลงทุนส่วนตัว/ปี"
              value={p.monthlyInvestPersonal}
              onChange={v => upd("monthlyInvestPersonal", v)}
              hint="หุ้น, ETF, ทอง ฯลฯ"
            />
            {p.monthlyInvestPersonal > 0 && assetsLoaded && (
              <div className="space-y-0.5 pt-0.5">
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-blue-500 transition-all"
                    style={{ width: `${Math.min(100, (persAnnualUsed / persBudgetAnnual) * 100)}%` }} />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  ใช้แล้ว <span className="font-semibold text-blue-600">{thb(persAnnualUsed)}</span>{" "}
                  · เหลือ <span className={cn("font-semibold", persAnnualRemaining > 0 ? "text-emerald-600" : "text-rose-500")}>{thb(persAnnualRemaining)}</span>/ปี
                </p>
              </div>
            )}
          </div>
        </div>
        {(p.monthlyInvestTax === 0 && p.monthlyInvestPersonal === 0) && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
            <span className="text-amber-600 text-sm shrink-0">⚠️</span>
            <p className="text-xs text-amber-800 dark:text-amber-300">กรอกงบลงทุน/ปีด้านบนก่อน เพื่อตรวจสอบว่ากองทุนที่เพิ่มไม่เกินงบที่ตั้งไว้</p>
          </div>
        )}
      </div>

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
          {taxWeightedReturn > 0 && <SummaryPill label="ผลตอบแทนภาษี" value={`~${taxWeightedReturn.toFixed(1)}%/ปี`} color="text-violet-500" />}
          {persTotal > 0 && <SummaryPill label="พอร์ตส่วนตัว" value={thb(persTotal)} color="text-blue-600" />}
          {annualIncome > 0 && grandTotal > 0 && <SummaryPill label="ลงทุน/รายได้" value={`${((grandTotal / annualIncome) * 100).toFixed(0)}%`} />}
        </div>
      )}

      {/* ── TAX ZONE ── */}
      {view === "tax" && (
        <div className="space-y-3">
          {/* Summary row */}
          <div className="rounded-xl border p-3 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              {deductGrp > 0 ? (
                <>
                  <p className="text-sm font-semibold">ลดหย่อนได้ {thb(deductGrp)}/ปี</p>
                  <p className="text-xs text-muted-foreground">
                    {annualIncome > 0
                      ? `เหลือสิทธิ์อีก ${thb(Math.max(0, Math.min(annualIncome * 0.30, 500_000) - deductGrp))}`
                      : "กรอกรายได้เพื่อดูสิทธิ์คงเหลือ"}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">ยังไม่มีการลงทุนลดหย่อนภาษี</p>
              )}
            </div>
            <button
              onClick={() => handleAiSuggestRates(TAX_FUNDS.map(f => f.code), "tax")}
              disabled={aiRateLoading}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-dashed rounded-lg px-3 py-1.5 hover:bg-muted transition-colors disabled:opacity-50 shrink-0">
              {aiRateLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              AI ประมาณผลตอบแทน
            </button>
          </div>

          {/* Fund list — single clean card, no per-fund colors */}
          {taxBudgetAnnual === 0 && (
            <div className="rounded-xl border border-dashed p-6 flex flex-col items-center gap-2 text-center">
              <span className="text-2xl">🏛️</span>
              <p className="text-sm font-medium">กรอกงบลงทุนลดหย่อนภาษี/ปีก่อน</p>
              <p className="text-xs text-muted-foreground">กรอกวงเงินในช่อง "ลงทุนลดหย่อนภาษี/ปี" ด้านบนก่อน<br/>ระบบจะแสดงกองทุนที่สามารถเพิ่มได้</p>
            </div>
          )}
          {taxBudgetAnnual > 0 && <div className="rounded-xl border overflow-hidden divide-y">
            {TAX_FUNDS.map(fund => {
              const Icon = fund.icon;
              const cap = annualIncome > 0 ? fund.capFn(annualIncome) : null;
              const fundChildren = assets.filter(a => a.assetType === fund.code);
              const thisFundAmount = getFundEffective(fund);
              const budgetLeft = getFundBudgetRemaining(fund);
              // Max total allowed in this fund
              const fundMax = (() => {
                const bMax = taxBudgetAnnual > 0 ? budgetLeft : Infinity;
                const cMax = cap ?? Infinity;
                const m = Math.min(bMax, cMax);
                return m === Infinity ? null : m;
              })();
              const canAddMore = fundMax !== null ? Math.max(0, fundMax - thisFundAmount) : null;
              const capLeft = cap !== null ? Math.max(0, cap - thisFundAmount) : null;
              const isAddingHere = activeAddCode === fund.code;
              return (
                <div key={fund.key}>
                  {/* Fund header row */}
                  <div className="flex items-start gap-3 px-4 py-3">
                    <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">{fund.label}</span>
                        <span className="text-xs text-muted-foreground">{fund.sublabel}</span>
                        <div className="flex items-center gap-1 ml-auto shrink-0">
                          <Input
                            type="number" min={0} max={30} step="0.5"
                            className="h-7 w-14 text-xs text-center px-1 border-dashed"
                            placeholder="0%"
                            value={taxFundRates[fund.code] ?? ""}
                            onChange={e => handleTaxFundRateChange(fund.code, parseFloat(e.target.value) || 0)}
                            title="ผลตอบแทนคาดหวัง %/ปี"
                          />
                          <span className="text-[10px] text-muted-foreground">%/ปี</span>
                        </div>
                      </div>
                      {/* Per-fund status line */}
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                        <span className="text-muted-foreground">{fund.hint}</span>
                        {thisFundAmount > 0 && (
                          <span>ลงทุนแล้ว <span className="font-semibold">{thb(thisFundAmount)}</span></span>
                        )}
                        {taxBudgetAnnual > 0 && (
                          budgetLeft > 0
                            ? <span className="text-emerald-600 font-semibold">เหลืองบ {thb(budgetLeft)}</span>
                            : <span className="text-rose-500 font-semibold">งบเต็มแล้ว</span>
                        )}
                        {capLeft !== null && capLeft === 0 && (
                          <span className="text-emerald-600 font-semibold">ใช้สิทธิ์ครบ ✓</span>
                        )}
                        {cap !== null && thisFundAmount === 0 && (
                          <span className="text-muted-foreground">สิทธิ์สูงสุด {thb(cap)}</span>
                        )}
                        {capLeft !== null && capLeft > 0 && thisFundAmount > 0 && (
                          <span className="text-muted-foreground">สิทธิ์เหลือ {thb(capLeft)}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Child fund list */}
                  {fundChildren.length > 0 && (
                    <div className="border-t bg-muted/20 divide-y">
                      {fundChildren.map(child => {
                        const childAnnual = child.annualInvestment ?? 0;
                        const capForChild = cap !== null ? Math.max(0, cap - (thisFundAmount - childAnnual)) : null;
                        const budgetForChild = taxAnnualRemaining + childAnnual;
                        const maxForChild = capForChild !== null ? Math.min(capForChild, budgetForChild) : budgetForChild;
                        return (
                          <div key={child.id} className="px-4 py-2.5">
                            <div className="flex items-center gap-2 mb-1.5">
                              {child.ticker && (
                                <span className="font-mono text-xs font-bold bg-muted px-1.5 py-0.5 rounded shrink-0">{child.ticker}</span>
                              )}
                              <span className="text-sm flex-1 min-w-0 truncate">{child.name}</span>
                              <button onClick={() => handleRemove(child.id, false)}
                                className="p-1 text-muted-foreground/40 hover:text-destructive transition-colors rounded shrink-0">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-[11px] text-muted-foreground">ลงทุน/ปี (฿)</Label>
                                <Input type="number" min={0}
                                  max={taxBudgetAnnual > 0 ? maxForChild : (capForChild ?? undefined)}
                                  className="h-8 text-sm"
                                  value={childAnnual || ""} placeholder="0"
                                  onChange={e => {
                                    const v = parseFloat(e.target.value) || 0;
                                    if (capForChild !== null && v > capForChild) return;
                                    if (taxBudgetAnnual > 0 && v > budgetForChild) return;
                                    handleAnnualChange(child.id, v);
                                  }}
                                />
                                <p className="text-[10px] text-muted-foreground">
                                  {capForChild !== null && `สิทธิ์ ${thb(capForChild)}`}
                                  {taxBudgetAnnual > 0 && capForChild !== null && " · "}
                                  {taxBudgetAnnual > 0 && `งบเหลือ ${thb(budgetForChild)}`}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[11px] text-muted-foreground">NAV ปัจจุบัน (฿)</Label>
                                <Input type="number" min={0}
                                  className="h-8 text-sm"
                                  value={child.currentValue || ""} placeholder="0"
                                  onChange={e => handleValueChange(child.id, parseFloat(e.target.value) || 0)}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div className="px-4 py-1.5 text-xs text-muted-foreground flex justify-between">
                        <span>รวม {fund.label}: <span className="font-semibold text-foreground">{thb(thisFundAmount)}</span></span>
                        {fundChildren.reduce((s, a) => s + a.currentValue, 0) > 0 && (
                          <span>NAV <span className="font-semibold text-foreground">{thb(fundChildren.reduce((s, a) => s + a.currentValue, 0))}</span></span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Manual input (no child holdings) */}
                  {fundChildren.length === 0 && (
                    <div className="border-t px-4 py-2.5 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground shrink-0">
                        {canAddMore !== null && canAddMore > 0
                          ? `ลงได้อีก ${thb(canAddMore)}`
                          : capLeft === 0 ? "ใช้สิทธิ์ครบ"
                          : "฿/ปี"}
                      </span>
                      <Input type="number" min={0}
                        max={fundMax ?? undefined}
                        className="h-8 text-sm flex-1"
                        placeholder="0"
                        value={(p[fund.key] as number) || ""}
                        onChange={e => {
                          const v = parseFloat(e.target.value) || 0;
                          if (cap !== null && v > cap) return;
                          if (taxBudgetAnnual > 0 && v > getFundBudgetRemaining(fund)) return;
                          upd(fund.key, v as FinancialProfile[typeof fund.key]);
                        }}
                      />
                    </div>
                  )}

                  {/* Add fund */}
                  <div className="border-t px-4 py-2">
                    {isAddingHere ? (
                      <div className="space-y-2 py-0.5">
                        {addFormStep === "search" && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-semibold text-muted-foreground flex-1">ค้นหากองทุน {fund.label}</p>
                              <button onClick={resetAddForm}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>
                            </div>
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                              <Input autoFocus placeholder="เช่น KMASTER, SCBDV, K-ESG"
                                value={searchQ}
                                onChange={e => handleSearchChange(e.target.value, "")}
                                className="h-8 text-sm pl-8" />
                              {searchLoading && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                            </div>
                            {searchResults.length > 0 && (
                              <div className="border rounded-lg divide-y overflow-hidden max-h-40 overflow-y-auto">
                                {searchResults.map(r => (
                                  <button key={r.id}
                                    onClick={() => { setPickedInstrument(r); setAddFormStep("details"); }}
                                    className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted/60 transition-colors">
                                    <span className="font-mono text-xs font-bold shrink-0">{r.ticker}</span>
                                    <span className="text-xs text-muted-foreground truncate flex-1">{r.nameTh ?? r.nameEn}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                            {!searchLoading && searchQ.trim().length > 0 && searchResults.length === 0 && (
                              <div className="text-center py-1">
                                <button onClick={() => { setCustomName(searchQ.trim()); setAddFormStep("details"); }}
                                  className="inline-flex items-center gap-1.5 text-xs text-primary border border-dashed border-primary/40 rounded-lg px-3 py-1.5 hover:bg-primary/5">
                                  <Plus className="h-3 w-3" /> ใช้ &ldquo;{searchQ.trim()}&rdquo;
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        {addFormStep === "details" && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <button onClick={() => { setAddFormStep("search"); setPickedInstrument(null); }}>
                                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                              </button>
                              <p className="text-sm font-semibold flex-1 min-w-0 truncate">
                                {pickedInstrument ? `${pickedInstrument.ticker} – ${pickedInstrument.nameTh ?? pickedInstrument.ticker}` : customName}
                              </p>
                              <button onClick={resetAddForm}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>
                            </div>
                            <div className="flex gap-2 items-end">
                              <div className="flex-1 space-y-1">
                                <Label className="text-xs">ลงทุน/ปี (฿)</Label>
                                <Input type="number" min={0}
                                  max={fundMax ?? undefined}
                                  placeholder="0" value={addValue}
                                  onChange={e => setAddValue(e.target.value)}
                                  className="h-8 text-sm" />
                                {canAddMore !== null && <p className="text-[10px] text-muted-foreground">ลงได้อีก {thb(canAddMore)}</p>}
                              </div>
                              <Button size="sm" disabled={addSaving} onClick={() => handleAddTaxFund(fund)}>
                                {addSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                              </Button>
                              <Button size="sm" variant="outline" onClick={resetAddForm}>ยกเลิก</Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <button onClick={() => handleStartTaxAdd(fund)}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                        <Plus className="h-3.5 w-3.5" /> เพิ่มกองทุน {fund.label}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>}
        </div>
      )}

      {/* ── PERSONAL PORTFOLIO ZONE ── */}
      {view === "personal" && (
        <div className="space-y-4">
          {assetsLoading && (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          )}

          {!assetsLoading && (
            <>
              {/* Allocation bar */}
              {persTotal > 0 && (
                <div className="rounded-xl border p-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">สัดส่วนพอร์ต</p>
                  <div className="h-2.5 rounded-full overflow-hidden flex gap-px bg-muted">
                    {(["thai", "international", "other"] as const).map(g => {
                      const gt = assets.filter(a => a.group === g).reduce((s, a) => s + a.currentValue, 0);
                      const pct = (gt / persTotal) * 100;
                      return pct > 0 ? (
                        <div key={g} title={`${GROUP_CONFIG[g].label}: ${pct.toFixed(0)}%`}
                          className={cn("h-full transition-all",
                            g === "thai" ? "bg-red-400" : g === "international" ? "bg-blue-400" : "bg-slate-400"
                          )} style={{ width: `${pct}%` }} />
                      ) : null;
                    })}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {(["thai", "international", "other"] as const).map(g => {
                      const gt = assets.filter(a => a.group === g).reduce((s, a) => s + a.currentValue, 0);
                      return gt > 0 ? (
                        <span key={g} className="text-xs flex items-center gap-1.5">
                          <span className={cn("h-2 w-2 rounded-full inline-block",
                            g === "thai" ? "bg-red-400" : g === "international" ? "bg-blue-400" : "bg-slate-400"
                          )} />
                          <span className="text-muted-foreground">{GROUP_CONFIG[g].label}</span>
                          <span className="font-semibold">{((gt / persTotal) * 100).toFixed(0)}%</span>
                          <span className="text-muted-foreground">· {thb(gt)}</span>
                        </span>
                      ) : null;
                    })}
                    {portfolioWeightedReturn > 0 && (
                      <span className="ml-auto text-xs flex items-center gap-1 text-emerald-600 font-semibold">
                        <TrendingUp className="h-3 w-3" />
                        ผลตอบแทนเฉลี่ย ~{portfolioWeightedReturn.toFixed(1)}%/ปี
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Group tabs */}
              <div className="flex gap-1 border-b">
                {(["thai", "international", "other"] as const).map(g => {
                  const gt   = assets.filter(a => a.group === g).reduce((s, a) => s + a.currentValue, 0);
                  const cnt  = assets.filter(a => a.group === g && a.currentValue > 0).length;
                  const cfg  = GROUP_CONFIG[g];
                  const active = groupTab === g;
                  return (
                    <button key={g} onClick={() => { setGroupTab(g); resetAddForm(); }}
                      className={cn(
                        "flex-1 flex flex-col items-center gap-0.5 px-2 py-2.5 text-xs font-semibold border-b-2 transition-all",
                        active
                          ? "border-primary text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                      )}>
                      <span>{cfg.label}</span>
                      {cnt > 0 && (
                        <span className={cn("text-[10px] px-1.5 rounded-full font-medium",
                          active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                          {cnt} · {thb(gt)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Type-based market cards */}
              <div className="flex justify-end mb-1">
                <button
                  onClick={() => handleAiSuggestRates(
                    ASSET_TYPE_CATALOG.filter(t => t.group === groupTab).map(t => t.code),
                    "portfolio"
                  )}
                  disabled={aiRateLoading}
                  className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 border border-dashed border-primary/40 rounded-lg px-3 py-1.5 hover:bg-primary/5 transition-colors disabled:opacity-50">
                  {aiRateLoading
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Sparkles className="h-3.5 w-3.5" />}
                  AI ประมาณผลตอบแทน
                </button>
              </div>
              <div className="space-y-3">
                {ASSET_TYPE_CATALOG.filter(t => t.group === groupTab).map(type => {
                  const stockAssets  = assets.filter(a => a.assetType === type.code && a.ticker);
                  const lumpAsset    = assets.find(a => a.assetType === type.code && !a.ticker);
                  const typeTotal    = assets.filter(a => a.assetType === type.code).reduce((s, a) => s + a.currentValue, 0);
                  const isAddingHere = activeAddCode === type.code;
                  const currentRate  = typeRates[type.code] ?? 0;
                  return (
                    <div key={type.code} className={cn(
                      "rounded-xl border bg-card overflow-hidden",
                      typeTotal > 0 ? "border-border shadow-sm" : "border-muted-foreground/20"
                    )}>
                      {/* Card header */}
                      <div className="flex items-center gap-3 px-4 py-3">
                        <span className="text-2xl shrink-0">{type.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold leading-tight">{type.label}</p>
                          <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{type.desc}</p>
                        </div>
                        {/* Expected return % input */}
                        <div className="flex items-center gap-1 shrink-0">
                          <Input
                            type="number" min={0} max={100} step="0.5"
                            className="h-7 w-16 text-xs text-center px-1 border-dashed"
                            placeholder="0"
                            value={currentRate || ""}
                            onChange={e => handleReturnRateChange(type.code, parseFloat(e.target.value) || 0)}
                            title="ผลตอบแทนคาดหวัง %/ปี"
                          />
                          <span className="text-[10px] text-muted-foreground">%/ปี</span>
                        </div>
                        {typeTotal > 0 && (
                          <span className="text-sm font-semibold shrink-0">{thb(typeTotal)}</span>
                        )}
                      </div>

                      {/* Individual instruments */}
                      {stockAssets.length > 0 && (
                        <div className="border-t divide-y">
                          {stockAssets.map(asset => {
                            const isEditing = editingId === asset.id;
                            const assetAnnual = asset.annualInvestment ?? 0;
                            const maxAnnual = persAnnualRemaining + assetAnnual;
                            return (
                              <div key={asset.id} className="px-4 py-2.5 space-y-2">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 min-w-0">
                                    {asset.ticker && (
                                      <span className="inline-block font-mono text-xs font-bold bg-muted px-1.5 py-0.5 rounded mr-1.5">{asset.ticker}</span>
                                    )}
                                    <span className="text-sm font-medium">{asset.name}</span>
                                    {!isEditing && asset.units != null && asset.avgCostPerUnit != null && (
                                      <p className="text-[11px] text-muted-foreground mt-0.5">
                                        {Number(asset.units).toLocaleString("th-TH")} หน่วย · ฿{Number(asset.avgCostPerUnit).toLocaleString("th-TH")}/หน่วย
                                      </p>
                                    )}
                                  </div>
                                  <button onClick={() => isEditing ? setEditingId(null) : openEdit(asset)}
                                    className={cn("p-1 rounded transition-colors shrink-0",
                                      isEditing ? "text-primary" : "text-muted-foreground/40 hover:text-foreground")}
                                    title="แก้ไข">
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button onClick={() => handleRemove(asset.id, asset.isBuiltIn)}
                                    className="p-1 text-muted-foreground/40 hover:text-destructive transition-colors rounded shrink-0">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                                {/* Dual inputs: annual investment + current NAV */}
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <Label className="text-[11px] text-muted-foreground font-medium">ลงทุน/ปี (฿)</Label>
                                    <Input type="number" min={0}
                                      max={persBudgetAnnual > 0 ? maxAnnual : undefined}
                                      className="h-7 text-sm bg-muted/40 border-0 focus-visible:ring-1 rounded-lg px-2"
                                      value={assetAnnual || ""} placeholder="0"
                                      onChange={e => {
                                        const v = parseFloat(e.target.value) || 0;
                                        if (persBudgetAnnual > 0 && v > maxAnnual) return;
                                        handleAnnualChange(asset.id, v);
                                      }}
                                    />
                                    {persBudgetAnnual > 0 && (
                                      <p className="text-[10px] text-muted-foreground">งบคงเหลือ {thb(persAnnualRemaining)}/ปี</p>
                                    )}
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-[11px] text-muted-foreground font-medium">มูลค่าปัจจุบัน (฿)</Label>
                                    <Input type="number" min={0}
                                      className="h-7 text-sm bg-muted/40 border-0 focus-visible:ring-1 rounded-lg px-2"
                                      value={asset.currentValue || ""} placeholder="0"
                                      onChange={e => handleValueChange(asset.id, parseFloat(e.target.value) || 0)}
                                    />
                                  </div>
                                </div>
                                {isEditing && (
                                  <div className="ml-2 pl-3 border-l-2 border-primary/20 space-y-2 pb-1">
                                    <div className="grid grid-cols-2 gap-2">
                                      <div className="space-y-1">
                                        <Label className="text-xs font-medium">จำนวน (หน่วย/หุ้น)</Label>
                                        <Input type="number" min={0} placeholder="0" value={editUnits}
                                          onChange={e => setEditUnits(e.target.value)} className="h-8 text-sm" />
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-xs font-medium">ต้นทุนเฉลี่ย/หน่วย (฿)</Label>
                                        <Input type="number" min={0} placeholder="0" value={editCost}
                                          onChange={e => setEditCost(e.target.value)} className="h-8 text-sm" />
                                      </div>
                                    </div>
                                    {editUnits && editCost && parseFloat(editUnits) > 0 && parseFloat(editCost) > 0 && (
                                      <p className="text-xs text-muted-foreground">
                                        ต้นทุนรวม:{" "}
                                        <span className="font-semibold text-foreground">
                                          ฿{(parseFloat(editUnits) * parseFloat(editCost)).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                      </p>
                                    )}
                                    <div className="flex gap-2">
                                      <Button size="sm" disabled={editSaving} onClick={() => handleEditSave(asset.id)}>
                                        {editSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                                        บันทึก
                                      </Button>
                                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>ยกเลิก</Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Lump sum row — only when no individual instruments */}
                      {stockAssets.length === 0 ? (
                      <div className="border-t px-4 py-3 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">ยอดรวม ฿</span>
                        <Input
                          type="number" min={0}
                          className="h-8 text-sm flex-1"
                          placeholder="0 — หรือเพิ่มรายหุ้นด้านล่าง"
                          key={`lump-${type.code}-${lumpAsset?.id ?? "new"}`}
                          defaultValue={lumpAsset?.currentValue || ""}
                          onChange={e => handleLumpSumChange(type, parseFloat(e.target.value) || 0)}
                        />
                        {lumpAsset && (
                          <button onClick={() => handleRemove(lumpAsset.id, false)}
                            className="p-1 text-muted-foreground/40 hover:text-destructive transition-colors rounded shrink-0">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      ) : null}

                      {/* Per-card inline add form */}
                      <div className="border-t px-4 py-2.5">
                        {isAddingHere ? (
                          <div className="space-y-3 pt-0.5">
                            {/* Search step */}
                            {addFormStep === "search" && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <p className="text-xs font-semibold flex-1 text-muted-foreground">
                                    {type.code === "custom" ? "ชื่อสินทรัพย์" : `ค้นหา${type.label}`}
                                  </p>
                                  <button onClick={resetAddForm} className="text-muted-foreground hover:text-foreground">
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                                {type.code === "custom" ? (
                                  <>
                                    <Input autoFocus
                                      placeholder="เช่น หุ้น XYZ, Bitcoin wallet, ที่ดิน"
                                      value={customName} onChange={e => setCustomName(e.target.value)}
                                      className="h-9 text-sm" />
                                    <Button size="sm" disabled={!customName.trim()}
                                      onClick={() => setAddFormStep("details")}>ถัดไป →</Button>
                                  </>
                                ) : (
                                  <>
                                    <div className="relative">
                                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                      <Input autoFocus placeholder={`เช่น ${type.desc}`}
                                        value={searchQ}
                                        onChange={e => handleSearchChange(e.target.value, type.code)}
                                        className="h-9 text-sm pl-8" />
                                      {searchLoading && (
                                        <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                                      )}
                                    </div>
                                    {searchResults.length > 0 && (
                                      <div className="border rounded-lg divide-y overflow-hidden max-h-44 overflow-y-auto">
                                        {searchResults.map(r => (
                                          <button key={r.id}
                                            onClick={() => { setPickedInstrument(r); setAddFormStep("details"); }}
                                            className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted/60 transition-colors">
                                            <span className="font-mono text-xs font-bold shrink-0">{r.ticker}</span>
                                            <span className="text-xs text-muted-foreground truncate flex-1">{r.nameTh ?? r.nameEn}</span>
                                            {r.exchange && <span className="text-[10px] text-muted-foreground shrink-0">{r.exchange}</span>}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                    {!searchLoading && searchQ.trim().length > 0 && searchResults.length === 0 && (
                                      <div className="text-center space-y-1.5 py-1">
                                        <p className="text-xs text-muted-foreground">ไม่พบใน catalog</p>
                                        <button
                                          onClick={() => { setCustomName(searchQ.trim()); setAddFormStep("details"); }}
                                          className="inline-flex items-center gap-1.5 text-xs text-primary border border-dashed border-primary/40 rounded-lg px-3 py-1.5 hover:bg-primary/5 transition-colors"
                                        >
                                          <Plus className="h-3 w-3" />
                                          ใช้ &ldquo;{searchQ.trim()}&rdquo; เป็นชื่อ
                                        </button>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            )}

                            {/* Details step */}
                            {addFormStep === "details" && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  {type.code !== "custom" && (
                                    <button onClick={() => { setAddFormStep("search"); setPickedInstrument(null); }}
                                      className="text-muted-foreground hover:text-foreground shrink-0">
                                      <ChevronLeft className="h-4 w-4" />
                                    </button>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold leading-tight truncate">
                                      {pickedInstrument
                                        ? `${pickedInstrument.ticker} – ${pickedInstrument.nameTh ?? pickedInstrument.nameEn ?? pickedInstrument.ticker}`
                                        : customName || type.label}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">{type.label}</p>
                                  </div>
                                  <button onClick={resetAddForm} className="text-muted-foreground hover:text-foreground shrink-0">
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <Label className="text-xs font-medium">จำนวน (หน่วย/หุ้น)</Label>
                                    <Input type="number" min={0} placeholder="0"
                                      value={addUnits} onChange={e => setAddUnits(e.target.value)}
                                      className="h-8 text-sm" />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs font-medium">ต้นทุนเฉลี่ย/หน่วย (฿)</Label>
                                    <Input type="number" min={0} placeholder="0"
                                      value={addAvgCost} onChange={e => setAddAvgCost(e.target.value)}
                                      className="h-8 text-sm" />
                                  </div>
                                </div>
                                {addUnits && addAvgCost && parseFloat(addUnits) > 0 && parseFloat(addAvgCost) > 0 && (
                                  <p className="text-xs text-muted-foreground">
                                    ต้นทุนรวม:{" "}
                                    <span className="font-semibold text-foreground">
                                      ฿{(parseFloat(addUnits) * parseFloat(addAvgCost)).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  </p>
                                )}
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium">มูลค่าปัจจุบัน (฿) — ถ้าต่างจากต้นทุน</Label>
                                  <Input type="number" min={0}
                                    placeholder={addUnits && addAvgCost ? String(parseFloat(addUnits || "0") * parseFloat(addAvgCost || "0")) : "0"}
                                    value={addValue} onChange={e => setAddValue(e.target.value)}
                                    className="h-8 text-sm" />
                                </div>
                                <div className="flex gap-2">
                                  <Button size="sm" className="flex-1" disabled={addSaving}
                                    onClick={() => handleAdd(type)}>
                                    {addSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />}
                                    เพิ่ม
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={resetAddForm}>ยกเลิก</Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <button onClick={() => handleStartAdd(type)}
                            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                            <Plus className="h-3.5 w-3.5" /> เพิ่มรายหุ้น / กองทุน
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <Card className="bg-muted/30">
                <CardContent className="pt-4 pb-4 text-sm space-y-1">
                  <p className="font-semibold">💡 อัปเดตมูลค่าพอร์ตทุกเดือน</p>
                  <p className="text-muted-foreground text-xs">ระบบใช้ข้อมูลนี้คำนวณแผนเกษียณและฉายภาพความมั่งคั่งระยะยาว</p>
                </CardContent>
              </Card>
            </>
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

  // Debt interest calculations
  const interestRate    = p.debtInterestRate ?? 0; // annual %
  const annualInterest  = p.totalDebt > 0 && interestRate > 0 ? p.totalDebt * interestRate / 100 : 0;
  const monthlyInterest = annualInterest / 12;
  // Simple amortization payoff estimate: months = -ln(1 - r*B/M) / ln(1+r)
  //   where r = monthly rate, B = balance, M = monthly payment
  const monthlyRate = interestRate / 100 / 12;
  let debtFreeMonths: number | null = null;
  if (p.totalDebt > 0 && p.monthlyDebtPayment > 0) {
    if (interestRate <= 0) {
      debtFreeMonths = Math.ceil(p.totalDebt / p.monthlyDebtPayment);
    } else if (p.monthlyDebtPayment > monthlyInterest) {
      debtFreeMonths = Math.ceil(-Math.log(1 - monthlyRate * p.totalDebt / p.monthlyDebtPayment) / Math.log(1 + monthlyRate));
    }
  }

  return (
    <div className="space-y-4">
      {p.totalDebt > 0 && (
        <div className="flex flex-wrap gap-6 px-4 py-3 rounded-xl bg-muted/50 border">
          <SummaryPill label="หนี้สินรวม" value={thb(p.totalDebt)} color={p.totalDebt > 0 ? "text-amber-600" : ""} />
          <SummaryPill label="ผ่อนชำระ/เดือน" value={thb(p.monthlyDebtPayment)} />
          {dti > 0 && <SummaryPill label="สัดส่วนหนี้/รายได้" value={`${dti.toFixed(1)}%`} color={dtiColor} />}
          {annualInterest > 0 && <SummaryPill label="ดอกเบี้ย/ปี" value={thb(annualInterest)} color="text-red-500" />}
          {debtFreeMonths !== null && <SummaryPill label="ปลดหนี้ใน" value={debtFreeMonths <= 120 ? `${debtFreeMonths} เดือน` : `${(debtFreeMonths/12).toFixed(0)} ปี`} />}
        </div>
      )}
      <SectionCard title="ภาระหนี้สิน" icon={AlertTriangle} iconColor="text-amber-500">
        <NumField label="หนี้สินรวมทั้งหมด (บาท)" value={p.totalDebt} onChange={v => upd("totalDebt", v)} hint="บ้าน รถ บัตรเครดิต สินเชื่อส่วนตัว" />
        <NumField label="ยอดผ่อนชำระ/เดือน (บาท)" value={p.monthlyDebtPayment} onChange={v => upd("monthlyDebtPayment", v)} hint="ทุกบัญชีรวมกัน" />
        <NumField
          label="อัตราดอกเบี้ยเฉลี่ย (%/ปี)"
          value={p.debtInterestRate ?? 0}
          onChange={v => upd("debtInterestRate", v)}
          hint={
            annualInterest > 0
              ? `ดอกเบี้ยต่อปีประมาณ ${thb(annualInterest)}${debtFreeMonths ? ` · ปลดหนี้ใน ~${debtFreeMonths} เดือน` : ""}`
              : "บัตรเครดิต ~20%/ปี • สินเชื่อส่วนบุคคล ~15-25%/ปี • บ้าน ~3-7%/ปี • รถ ~3-6%/ปี"
          }
        />
      </SectionCard>
      <SectionCard title="เงินออมและสำรอง" icon={Wallet} iconColor="text-emerald-500">
        <p className="text-sm text-muted-foreground col-span-2">ดูและแก้ไขข้อมูลเงินออมได้ที่แท็บ <button onClick={() => {}} className="text-primary underline">เงินออม</button></p>
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


// ─── Tab: Savings ─────────────────────────────────────────────────────────────

function SavingsTab({ p, upd }: { p: FinancialProfile; upd: <K extends keyof FinancialProfile>(k: K, v: FinancialProfile[K]) => void }) {
  const totalLiquidity   = p.cashOnHand + p.savingsDeposit + p.fixedDeposit + p.emergencyFundAmount;
  const emergencyMonths  = p.monthlyExpenses > 0 ? p.emergencyFundAmount / p.monthlyExpenses : 0;
  const totalMonths      = p.monthlyExpenses > 0 ? totalLiquidity / p.monthlyExpenses : 0;
  const efColor          = emergencyMonths === 0 ? "" : emergencyMonths < 3 ? "text-red-500" : emergencyMonths < 6 ? "text-amber-600" : "text-emerald-600";
  const totalColor       = totalMonths === 0 ? "" : totalMonths < 3 ? "text-red-500" : totalMonths < 6 ? "text-amber-600" : "text-emerald-600";

  const savingsRate = (() => {
    const monthlyIncome = (p.annualSalary + p.bonus + p.otherIncome) / 12;
    if (monthlyIncome <= 0 || p.monthlySavingsGoal <= 0) return null;
    return (p.monthlySavingsGoal / monthlyIncome) * 100;
  })();

  return (
    <div className="space-y-4">
      {totalLiquidity > 0 && (
        <div className="flex flex-wrap gap-6 px-4 py-3 rounded-xl bg-muted/50 border">
          <SummaryPill label="รวมสภาพคล่อง" value={totalLiquidity > 0 ? `฿${totalLiquidity.toLocaleString("th-TH")}` : "—"} color="text-teal-600" />
          {totalMonths > 0 && <SummaryPill label="ครอบคลุม" value={`${totalMonths.toFixed(1)} เดือน`} color={totalColor} />}
          {p.emergencyFundAmount > 0 && <SummaryPill label="กองทุนฉุกเฉิน" value={`฿${p.emergencyFundAmount.toLocaleString("th-TH")}`} />}
          {emergencyMonths > 0 && <SummaryPill label="ฉุกเฉินครอบคลุม" value={`${emergencyMonths.toFixed(1)} เดือน`} color={efColor} />}
          {savingsRate !== null && <SummaryPill label="อัตราออม" value={`${savingsRate.toFixed(1)}%/เดือน`} color={savingsRate >= 20 ? "text-emerald-600" : savingsRate >= 10 ? "text-amber-600" : "text-red-500"} />}
        </div>
      )}

      <SectionCard title="สภาพคล่องและเงินออม" icon={PiggyBank} iconColor="text-teal-500">
        <NumField label="กองทุนฉุกเฉิน (บาท)" value={p.emergencyFundAmount} onChange={v => upd("emergencyFundAmount", v)} hint="เงินสำรองฉุกเฉิน พร้อมถอนได้ทันที" />
        <NumField label="เงินสดในมือ (บาท)" value={p.cashOnHand} onChange={v => upd("cashOnHand", v)} hint="เงินสดในมือและกระเป๋าสตางค์" />
        <NumField label="เงินฝากออมทรัพย์ (บาท)" value={p.savingsDeposit} onChange={v => upd("savingsDeposit", v)} hint="ยอดรวมบัญชีออมทรัพย์ทุกธนาคาร" />
        <NumField label="เงินฝากประจำ (บาท)" value={p.fixedDeposit} onChange={v => upd("fixedDeposit", v)} hint="Fixed deposit / บัญชีเงินฝากประจำ" />
      </SectionCard>

      <SectionCard title="ค่าใช้จ่ายและเป้าหมาย" icon={Target} iconColor="text-blue-500">
        <NumField label="ค่าใช้จ่ายต่อเดือน (บาท)" value={p.monthlyExpenses} onChange={v => upd("monthlyExpenses", v)} hint="รวมค่าใช้จ่ายทั้งหมดต่อเดือน" />
        <NumField label="เป้าหมายออม/เดือน (บาท)" value={p.monthlySavingsGoal} onChange={v => upd("monthlySavingsGoal", v)} hint="จำนวนเงินที่ตั้งใจออมต่อเดือน" />
      </SectionCard>

      <div className="grid sm:grid-cols-2 gap-3">
        {emergencyMonths > 0 && (
          <Card className={cn("border", emergencyMonths >= 6 ? "border-emerald-200 bg-emerald-50/50" : emergencyMonths >= 3 ? "border-amber-200 bg-amber-50/50" : "border-red-200 bg-red-50/50")}>
            <CardContent className="pt-3 pb-3 text-sm">
              <p className="font-semibold">{emergencyMonths >= 6 ? "✅ กองทุนฉุกเฉินเพียงพอ" : emergencyMonths >= 3 ? "⚠️ ควรเพิ่มกองทุนฉุกเฉิน" : "🚨 กองทุนฉุกเฉินไม่เพียงพอ"}</p>
              <p className="text-muted-foreground mt-0.5">{emergencyMonths.toFixed(1)} เดือน — แนะนำอย่างน้อย 6 เดือน</p>
            </CardContent>
          </Card>
        )}
        {savingsRate !== null && (
          <Card className={cn("border", savingsRate >= 20 ? "border-emerald-200 bg-emerald-50/50" : savingsRate >= 10 ? "border-amber-200 bg-amber-50/50" : "border-red-200 bg-red-50/50")}>
            <CardContent className="pt-3 pb-3 text-sm">
              <p className="font-semibold">{savingsRate >= 20 ? "✅ อัตราออมดีมาก" : savingsRate >= 10 ? "⚠️ อัตราออมพอใช้" : "🚨 ควรเพิ่มอัตราออม"}</p>
              <p className="text-muted-foreground mt-0.5">ออม {savingsRate.toFixed(1)}% ของรายได้ — แนะนำ 20%+</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}


// ─── Tab: Goals ──────────────────────────────────────────────────────────────

interface Goal {
  id: string;
  name: string;
  goalType: string;
  targetAmount: number;
  currentAmount: number;
  monthlyContribution: number;
  annualReturnRate: number;
  targetDate: string | null;
  projection?: {
    progressPercent: number;
    onTrack: boolean;
    monthsRemaining: number | null;
    projectedCompletionDate: string | null;
  };
}

const GOAL_TYPE_LABELS: Record<string, string> = {
  retirement: "เกษียณ",
  emergency_fund: "ฉุกเฉิน",
  investment: "ลงทุน",
  home_car: "บ้าน / รถ",
  education: "การศึกษา",
  custom: "อื่นๆ",
};
const GOAL_TYPE_EMOJI: Record<string, string> = {
  retirement: "🏖️",
  emergency_fund: "🛡️",
  investment: "📈",
  home_car: "🏠",
  education: "🎓",
  custom: "🎯",
};

const defaultGoalForm = {
  name: "",
  goalType: "custom",
  targetAmount: 0,
  currentAmount: 0,
  monthlyContribution: 0,
  annualReturnRate: 5,
  targetDate: "",
};

function GoalsTab({ p }: { p: FinancialProfile }) {
  const [goals, setGoals]           = useState<Goal[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editGoal, setEditGoal]     = useState<Goal | null>(null);
  const [form, setForm]             = useState(defaultGoalForm);
  const [formSaving, setFormSaving] = useState(false);
  const [deleteId, setDeleteId]     = useState<string | null>(null);

  const loadGoals = useCallback(async () => {
    setGoalsLoading(true);
    try {
      const res  = await fetch("/api/goals");
      const json = await res.json();
      setGoals(json.data ?? []);
    } finally {
      setGoalsLoading(false);
    }
  }, []);

  useEffect(() => { loadGoals(); }, [loadGoals]);

  const totalMonthly   = goals.reduce((s, g) => s + Number(g.monthlyContribution), 0);
  const monthlyIncome  = (p.annualSalary + p.bonus + p.otherIncome) / 12;
  const totalInsurance = (
    p.lifeInsurancePremium + p.healthInsurancePremium +
    p.parentHealthInsurancePremium + p.annuityInsurancePremium +
    p.spouseLifeInsurancePremium
  ) / 12;
  const remainingToInvest = monthlyIncome - p.monthlyExpenses - p.monthlyDebtPayment - totalInsurance - totalMonthly;

  function openAdd() {
    setEditGoal(null);
    setForm(defaultGoalForm);
    setShowForm(true);
  }

  function openEdit(g: Goal) {
    setEditGoal(g);
    setForm({
      name: g.name,
      goalType: g.goalType,
      targetAmount: Number(g.targetAmount),
      currentAmount: Number(g.currentAmount),
      monthlyContribution: Number(g.monthlyContribution),
      annualReturnRate: Number(g.annualReturnRate),
      targetDate: g.targetDate ? g.targetDate.slice(0, 10) : "",
    });
    setShowForm(true);
  }

  async function handleSubmit() {
    if (!form.name.trim() || form.targetAmount <= 0) return;
    setFormSaving(true);
    try {
      const body = {
        ...form,
        targetAmount: Number(form.targetAmount),
        currentAmount: Number(form.currentAmount),
        monthlyContribution: Number(form.monthlyContribution),
        annualReturnRate: Number(form.annualReturnRate),
        targetDate: form.targetDate ? new Date(form.targetDate).toISOString() : undefined,
      };
      if (editGoal) {
        await fetch(`/api/goals/${editGoal.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        await fetch("/api/goals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      setShowForm(false);
      await loadGoals();
    } finally {
      setFormSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleteId(id);
    try {
      await fetch(`/api/goals/${id}`, { method: "DELETE" });
      await loadGoals();
    } finally {
      setDeleteId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Summary banner */}
      {monthlyIncome > 0 && (
        <div className="flex flex-wrap gap-6 px-4 py-3 rounded-xl bg-muted/50 border">
          <SummaryPill label="รายได้/เดือน"        value={thb(Math.round(monthlyIncome))}    color="text-blue-600" />
          {totalMonthly > 0  && <SummaryPill label="ออมตามเป้าหมาย/เดือน" value={thb(totalMonthly)}    color="text-rose-500" />}
          <SummaryPill
            label="เหลือลงทุน/เดือน"
            value={remainingToInvest > 0 ? thb(Math.round(remainingToInvest)) : "—"}
            color={remainingToInvest > 0 ? "text-emerald-600" : "text-red-500"}
          />
        </div>
      )}

      {/* Goals list */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">เป้าหมายทั้งหมด ({goals.length})</h3>
        <Button size="sm" onClick={openAdd} className="gap-1.5"><Plus className="h-3.5 w-3.5" />เพิ่มเป้าหมาย</Button>
      </div>

      {goalsLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : goals.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <Target className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">ยังไม่มีเป้าหมาย กด &quot;เพิ่มเป้าหมาย&quot; เพื่อเริ่มต้น</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {goals.map(g => {
            const pct    = g.projection?.progressPercent ?? (g.targetAmount > 0 ? Math.min(100, (Number(g.currentAmount) / Number(g.targetAmount)) * 100) : 0);
            const months = g.projection?.monthsRemaining;
            const onTrack = g.projection?.onTrack;
            return (
              <Card key={g.id} className="overflow-hidden">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{GOAL_TYPE_EMOJI[g.goalType] ?? "🎯"}</span>
                      <div>
                        <p className="font-semibold text-sm leading-tight">{g.name}</p>
                        <p className="text-xs text-muted-foreground">{GOAL_TYPE_LABELS[g.goalType] ?? g.goalType}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(g)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-600" onClick={() => handleDelete(g.id)} disabled={deleteId === g.id}>
                        {deleteId === g.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-2">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>฿{Number(g.currentAmount).toLocaleString("th-TH")} / ฿{Number(g.targetAmount).toLocaleString("th-TH")}</span>
                      <span>{pct.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-rose-500 transition-all" style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                    {Number(g.monthlyContribution) > 0 && <span>ออม ฿{Number(g.monthlyContribution).toLocaleString("th-TH")}/เดือน</span>}
                    {Number(g.annualReturnRate) > 0    && <span>ผลตอบแทน {Number(g.annualReturnRate)}%/ปี</span>}
                    {g.targetDate && <span>เป้า {new Date(g.targetDate).toLocaleDateString("th-TH", { year: "numeric", month: "short" })}</span>}
                    {months !== null && months !== undefined && (
                      <span className={onTrack ? "text-emerald-600 font-medium" : "text-amber-600 font-medium"}>
                        {onTrack ? "✅" : "⚠️"} {months <= 0 ? "ถึงเป้าแล้ว" : months < 24 ? `อีก ${months} เดือน` : `อีก ${(months / 12).toFixed(1)} ปี`}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Cash flow insight */}
      {monthlyIncome > 0 && goals.length > 0 && (
        <Card className={cn("border", remainingToInvest > 0 ? "border-emerald-200 bg-emerald-50/50" : "border-red-200 bg-red-50/50")}>
          <CardContent className="pt-3 pb-3 text-sm space-y-1">
            <p className="font-semibold">{remainingToInvest > 0 ? "✅ มีเงินเหลือลงทุน" : "🚨 รายได้ไม่พอครอบคลุมภาระทั้งหมด"}</p>
            <div className="text-muted-foreground space-y-0.5 text-xs">
              <p>รายได้/เดือน: ฿{Math.round(monthlyIncome).toLocaleString("th-TH")}</p>
              {p.monthlyExpenses > 0 && <p className="ml-2">− ค่าใช้จ่าย: ฿{p.monthlyExpenses.toLocaleString("th-TH")}</p>}
              {p.monthlyDebtPayment > 0 && <p className="ml-2">− ผ่อนหนี้: ฿{p.monthlyDebtPayment.toLocaleString("th-TH")}</p>}
              {totalInsurance > 0 && <p className="ml-2">− เบี้ยประกัน: ฿{Math.round(totalInsurance).toLocaleString("th-TH")}</p>}
              {totalMonthly > 0 && <p className="ml-2">− ออมตามเป้าหมาย: ฿{totalMonthly.toLocaleString("th-TH")}</p>}
              <p className={cn("font-semibold mt-1", remainingToInvest > 0 ? "text-emerald-700" : "text-red-600")}>
                = {remainingToInvest > 0 ? "เหลือลงทุน" : "ขาด"}: ฿{Math.abs(Math.round(remainingToInvest)).toLocaleString("th-TH")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader className="pb-3 pt-4">
              <CardTitle className="text-base flex items-center justify-between">
                {editGoal ? "แก้ไขเป้าหมาย" : "เพิ่มเป้าหมายใหม่"}
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pb-5">
              <div className="space-y-1">
                <Label className="text-sm font-medium">ชื่อเป้าหมาย</Label>
                <Input
                  placeholder="เช่น ซื้อบ้าน, เกษียณอายุ 55"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium">ประเภท</Label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={form.goalType}
                  onChange={e => setForm(f => ({ ...f, goalType: e.target.value }))}
                >
                  {Object.entries(GOAL_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{GOAL_TYPE_EMOJI[k]} {v}</option>
                  ))}
                </select>
              </div>

              <NumField label="เป้าหมายเงิน (บาท)" value={form.targetAmount} onChange={v => setForm(f => ({ ...f, targetAmount: v }))} hint="จำนวนเงินที่ต้องการสะสม" />
              <NumField label="มีอยู่แล้ว (บาท)" value={form.currentAmount} onChange={v => setForm(f => ({ ...f, currentAmount: v }))} hint="เงินที่สะสมไว้แล้วถึงตอนนี้" />
              <NumField label="ออม/เดือน (บาท)" value={form.monthlyContribution} onChange={v => setForm(f => ({ ...f, monthlyContribution: v }))} hint="จำนวนที่ตั้งใจออมต่อเดือน" />
              <NumField label="ผลตอบแทนคาดหวัง (%/ปี)" value={form.annualReturnRate} onChange={v => setForm(f => ({ ...f, annualReturnRate: v }))} hint="เช่น 5 สำหรับ RMF/หุ้น, 1.5 สำหรับออมทรัพย์" />

              <div className="space-y-1">
                <Label className="text-sm font-medium">วันที่เป้าหมาย</Label>
                <Input
                  type="date"
                  value={form.targetDate}
                  onChange={e => setForm(f => ({ ...f, targetDate: e.target.value }))}
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button className="flex-1" onClick={handleSubmit} disabled={formSaving || !form.name.trim() || form.targetAmount <= 0}>
                  {formSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  {editGoal ? "บันทึกการแก้ไข" : "เพิ่มเป้าหมาย"}
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>ยกเลิก</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function MyDataPage() {
  const [tab, setTab] = useState<TabKey>("income");

  // Honour ?tab= URL param (e.g. from Dashboard Investment card)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("tab") as TabKey;
    if (t && ["income", "insurance", "investment", "debts", "savings", "goals"].includes(t)) {
      setTab(t);
    }
  }, []);
  const [profile, setProfile] = useState<FinancialProfile>(defaultProfile);
  const [ins, setIns]           = useState<InsuranceState>(defaultInsurance);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [copied, setCopied]     = useState(false);

  function buildPrompt(): string {
    const fmt = (n: number) => n.toLocaleString("th-TH");
    const filingMap: Record<string, string> = {
      single: "โสด",
      married_filing_jointly: "แต่งงาน (ยื่นร่วม)",
      married_filing_separately: "แต่งงาน (ยื่นแยก)",
      head_of_household: "หัวหน้าครัวเรือน",
    };
    const p = profile;
    const monthlyIncome = Math.round((p.annualSalary + p.bonus + p.otherIncome + p.spouseIncome + p.dividendIncome + p.taxRefundAmount) / 12);
    const totalInvest = p.goldAmount + p.cryptoAmount + p.etfAmount + p.thaiStockAmount + p.foreignStockAmount + p.otherInvestAmount;
    const totalLiquid = p.cashOnHand + p.savingsDeposit + p.fixedDeposit;
    const totalTaxSaving = p.providentFundAmount + p.lifeInsurancePremium + p.healthInsurancePremium + p.parentHealthInsurancePremium + p.annuityInsurancePremium + p.rmfAmount + p.ssfAmount + p.thaiEsgAmount;

    return `คุณเป็น AI ที่ปรึกษาการเงินส่วนบุคคล โปรดช่วยวิเคราะห์สุขภาพการเงิน (Financial Analysis) จากข้อมูลด้านล่างนี้ และให้คำแนะนำที่ครบถ้วนนำไปปฏิบัติได้จริง

═══════════════════════════════
📋 ข้อมูลส่วนตัวและครอบครัว
═══════════════════════════════
สถานะ: ${filingMap[p.filingStatus] ?? p.filingStatus}
บุตร: ${p.numChildren} คน  ผู้ปกครอง: ${p.numParents} คน${p.numDisabledDependents > 0 ? `  ผู้พิการ: ${p.numDisabledDependents} คน` : ""}

═══════════════════════════════
💰 รายได้
═══════════════════════════════
เงินเดือน/ปี: ${fmt(p.annualSalary)} บาท${p.bonus > 0 ? `\nโบนัส/ปี: ${fmt(p.bonus)} บาท` : ""}${p.otherIncome > 0 ? `\nรายได้อื่นๆ/ปี: ${fmt(p.otherIncome)} บาท` : ""}${p.spouseIncome > 0 ? `\nรายได้คู่สมรส/ปี: ${fmt(p.spouseIncome)} บาท` : ""}${p.dividendIncome > 0 ? `\nเงินปันผล/ปี: ${fmt(p.dividendIncome)} บาท` : ""}${p.taxRefundAmount > 0 ? `\nเงินคืนภาษี/ปี: ${fmt(p.taxRefundAmount)} บาท` : ""}
รายได้รวม/เดือน (ประมาณ): ${fmt(monthlyIncome)} บาท
ภาษีหัก ณ ที่จ่าย/ปี: ${fmt(p.withheldTax)} บาท
ประกันสังคม/ปี: ${fmt(p.socialSecurity)} บาท

═══════════════════════════════
🏠 ค่าใช้จ่ายรายเดือน
═══════════════════════════════
ค่าใช้จ่ายรวม/เดือน: ${fmt(p.monthlyExpenses)} บาท${p.budgetHousing > 0 ? `\n  ที่อยู่อาศัย: ${fmt(p.budgetHousing)} บาท` : ""}${p.budgetFood > 0 ? `\n  อาหาร: ${fmt(p.budgetFood)} บาท` : ""}${p.budgetTransport > 0 ? `\n  การเดินทาง: ${fmt(p.budgetTransport)} บาท` : ""}${p.budgetUtilities > 0 ? `\n  สาธารณูปโภค: ${fmt(p.budgetUtilities)} บาท` : ""}${p.budgetHealthcare > 0 ? `\n  สุขภาพ: ${fmt(p.budgetHealthcare)} บาท` : ""}${p.budgetEntertainment > 0 ? `\n  ความบันเทิง: ${fmt(p.budgetEntertainment)} บาท` : ""}${p.budgetEducation > 0 ? `\n  การศึกษา: ${fmt(p.budgetEducation)} บาท` : ""}${p.budgetPersonalCare > 0 ? `\n  ดูแลตัวเอง: ${fmt(p.budgetPersonalCare)} บาท` : ""}${p.budgetOther > 0 ? `\n  อื่นๆ: ${fmt(p.budgetOther)} บาท` : ""}

═══════════════════════════════
🛡️ ประกันภัย
═══════════════════════════════${p.lifeInsurancePremium > 0 ? `\nประกันชีวิต: เบี้ย ${fmt(p.lifeInsurancePremium)} บาท/ปี${ins.lifeCoverageAmount > 0 ? ` | ทุนประกัน ${fmt(ins.lifeCoverageAmount)} บาท` : ""}` : "\nประกันชีวิต: ไม่มี"}${p.healthInsurancePremium > 0 ? `\nประกันสุขภาพ: เบี้ย ${fmt(p.healthInsurancePremium)} บาท/ปี${ins.healthCoveragePerYear > 0 ? ` | วงเงิน ${fmt(ins.healthCoveragePerYear)} บาท/ปี` : ""}` : "\nประกันสุขภาพ: ไม่มี"}${p.parentHealthInsurancePremium > 0 ? `\nประกันสุขภาพบิดา/มารดา: เบี้ย ${fmt(p.parentHealthInsurancePremium)} บาท/ปี` : ""}${p.annuityInsurancePremium > 0 ? `\nประกันบำนาญ: เบี้ย ${fmt(p.annuityInsurancePremium)} บาท/ปี${ins.annuityCoverageAmount > 0 ? ` | บำนาญ ${fmt(ins.annuityCoverageAmount)} บาท/ปี` : ""}` : ""}${p.spouseLifeInsurancePremium > 0 ? `\nประกันชีวิตคู่สมรส: เบี้ย ${fmt(p.spouseLifeInsurancePremium)} บาท/ปี` : ""}

═══════════════════════════════
📈 การลงทุนและลดหย่อนภาษี
═══════════════════════════════
กองทุนสำรองเลี้ยงชีพ (PVD): อัตรา ${p.providentFundRate}% | ${fmt(p.providentFundAmount)} บาท/ปี${p.rmfAmount > 0 ? `\nRMF: ${fmt(p.rmfAmount)} บาท/ปี` : ""}${p.ssfAmount > 0 ? `\nSSF: ${fmt(p.ssfAmount)} บาท/ปี` : ""}${p.thaiEsgAmount > 0 ? `\nThai ESG: ${fmt(p.thaiEsgAmount)} บาท/ปี` : ""}
รวมลงทุนลดหย่อนภาษี/ปี: ${fmt(totalTaxSaving)} บาท
ลงทุนลดหย่อน/เดือน: ${fmt(p.monthlyInvestTax)} บาท

พอร์ตการลงทุนส่วนตัว (มูลค่าตลาด):${p.thaiStockAmount > 0 ? `\n  หุ้นไทย: ${fmt(p.thaiStockAmount)} บาท` : ""}${p.foreignStockAmount > 0 ? `\n  หุ้นต่างประเทศ: ${fmt(p.foreignStockAmount)} บาท` : ""}${p.etfAmount > 0 ? `\n  ETF/กองทุน: ${fmt(p.etfAmount)} บาท` : ""}${p.goldAmount > 0 ? `\n  ทอง: ${fmt(p.goldAmount)} บาท` : ""}${p.cryptoAmount > 0 ? `\n  Crypto: ${fmt(p.cryptoAmount)} บาท` : ""}${p.otherInvestAmount > 0 ? `\n  อื่นๆ: ${fmt(p.otherInvestAmount)} บาท` : ""}
รวมพอร์ตส่วนตัว: ${fmt(totalInvest)} บาท
ลงทุนส่วนตัว/เดือน: ${fmt(p.monthlyInvestPersonal)} บาท

═══════════════════════════════
🏦 เงินออมและสภาพคล่อง
═══════════════════════════════${p.cashOnHand > 0 ? `\nเงินสด: ${fmt(p.cashOnHand)} บาท` : ""}${p.savingsDeposit > 0 ? `\nเงินฝากออมทรัพย์: ${fmt(p.savingsDeposit)} บาท` : ""}${p.fixedDeposit > 0 ? `\nเงินฝากประจำ: ${fmt(p.fixedDeposit)} บาท` : ""}
รวมสภาพคล่อง: ${fmt(totalLiquid)} บาท
กองทุนฉุกเฉิน: ${fmt(p.emergencyFundAmount)} บาท
เป้าหมายออม/เดือน: ${fmt(p.monthlySavingsGoal)} บาท

═══════════════════════════════
💳 หนี้สิน
═══════════════════════════════
หนี้รวม: ${fmt(p.totalDebt)} บาท
ผ่อน/เดือน: ${fmt(p.monthlyDebtPayment)} บาท
ดอกเบี้ยเฉลี่ย: ${p.debtInterestRate}% ต่อปี

═══════════════════════════════
🎯 โปรดวิเคราะห์และแนะนำ:
═══════════════════════════════
1. สุขภาพ Cash Flow — รายรับ-รายจ่าย-เงินออม สมดุลดีหรือไม่?
2. กองทุนฉุกเฉิน — เพียงพอหรือไม่ ควรมีเท่าไหร่?
3. ภาระหนี้ — ควรจัดการอย่างไร มีความเสี่ยงหรือไม่?
4. ประกัน — ความคุ้มครองครบถ้วนหรือไม่ ควรเพิ่มอะไร?
5. การลงทุน — Portfolio การจัดสรรสินทรัพย์เหมาะสมหรือไม่?
6. ภาษี — มีโอกาสลดหย่อนเพิ่มได้อีกหรือไม่?
7. สิ่งที่ควรทำเร่งด่วน 3 อันดับแรก`;
  }

  const updIns = useCallback((k: keyof InsuranceState, v: number) => {
    setIns(s => ({ ...s, [k]: v }));
    setSaved(false);
  }, []);

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
          taxRefundAmount: Number(d.taxRefundAmount ?? 0),
          dividendIncome: Number(d.dividendIncome ?? 0),
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
          debtInterestRate: Number(d.debtInterestRate ?? 0),
          emergencyFundAmount: Number(d.emergencyFundAmount ?? 0),
          monthlyExpenses: Number(d.monthlyExpenses ?? 0),
          cashOnHand: Number(d.cashOnHand ?? 0),
          savingsDeposit: Number(d.savingsDeposit ?? 0),
          fixedDeposit: Number(d.fixedDeposit ?? 0),
          monthlySavingsGoal: Number(d.monthlySavingsGoal ?? 0),
          budgetHousing: Number(d.budgetHousing ?? 0),
          budgetFood: Number(d.budgetFood ?? 0),
          budgetTransport: Number(d.budgetTransport ?? 0),
          budgetUtilities: Number(d.budgetUtilities ?? 0),
          budgetHealthcare: Number(d.budgetHealthcare ?? 0),
          budgetEntertainment: Number(d.budgetEntertainment ?? 0),
          budgetEducation: Number(d.budgetEducation ?? 0),
          budgetPersonalCare: Number(d.budgetPersonalCare ?? 0),
          budgetOther: Number(d.budgetOther ?? 0),
          monthlyInvestTax: Number(d.monthlyInvestTax ?? 0),
          monthlyInvestPersonal: Number(d.monthlyInvestPersonal ?? 0),
        });
      }
      setLoading(false);
    }).catch(() => setLoading(false));

    fetch("/api/insurance").then(r => r.json()).then(res => {
      if (res.data) {
        setIns({
          lifeCoverageAmount:          Number(res.data.lifeCoverageAmount ?? 0),
          healthCoveragePerYear:       Number(res.data.healthCoveragePerYear ?? 0),
          parentHealthCoveragePerYear: Number(res.data.parentHealthCoveragePerYear ?? 0),
          annuityCoverageAmount:       Number(res.data.annuityCoverageAmount ?? 0),
          spouseLifeCoverageAmount:    Number(res.data.spouseLifeCoverageAmount ?? 0),
        });
      }
    }).catch(() => {});
  }, []);

  const upd = useCallback(<K extends keyof FinancialProfile>(k: K, v: FinancialProfile[K]) => {
    setProfile(p => ({ ...p, [k]: v }));
    setSaved(false);
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await Promise.all([
        fetch("/api/user/financial-profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profile),
        }),
        fetch("/api/insurance", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lifeInsurancePremium:         profile.lifeInsurancePremium,
            healthInsurancePremium:       profile.healthInsurancePremium,
            parentHealthInsurancePremium: profile.parentHealthInsurancePremium,
            annuityInsurancePremium:      profile.annuityInsurancePremium,
            spouseLifeInsurancePremium:   profile.spouseLifeInsurancePremium,
            ...ins,
          }),
        }),
      ]);
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPromptModal(true)}
            className="flex items-center gap-1.5 text-violet-600 border-violet-200 hover:bg-violet-50"
          >
            <Bot className="h-4 w-4" />
            <span className="hidden sm:inline">Export to AI Prompt</span>
            <span className="sm:hidden">AI</span>
          </Button>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : saved ? <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-400" /> : <Save className="h-4 w-4 mr-2" />}
            {saving ? "กำลังบันทึก..." : saved ? "บันทึกแล้ว" : "บันทึก"}
          </Button>
        </div>
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
      {tab === "insurance"   && <InsuranceTab   p={profile} upd={upd} ins={ins} updIns={updIns} />}
      {tab === "investment"  && <InvestmentTab  p={profile} upd={upd} />}
      {tab === "debts"       && <DebtsTab       p={profile} upd={upd} />}
      {tab === "savings"     && <SavingsTab     p={profile} upd={upd} />}
      {tab === "goals"       && <GoalsTab       p={profile} />}


      {/* Bottom save */}
      <div className="flex items-center gap-3 pt-2 border-t">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          {saving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
        </Button>
        {saved && <span className="flex items-center gap-1 text-sm text-emerald-600"><CheckCircle2 className="h-4 w-4" />บันทึกสำเร็จ</span>}
      </div>

      {/* AI Prompt Modal */}
      {showPromptModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowPromptModal(false); }}
        >
          <div className="bg-background border rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-violet-500" />
                <div>
                  <p className="font-semibold text-sm">AI Financial Analysis Prompt</p>
                  <p className="text-xs text-muted-foreground">คัดลอก prompt นี้ไปวางใน ChatGPT, Claude หรือ AI อื่นๆ</p>
                </div>
              </div>
              <button
                onClick={() => setShowPromptModal(false)}
                className="rounded-md p-1.5 hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Prompt Text */}
            <div className="flex-1 overflow-y-auto p-5">
              <pre className="text-xs leading-relaxed whitespace-pre-wrap font-mono bg-muted/50 rounded-lg p-4 border select-all">
                {buildPrompt()}
              </pre>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-t shrink-0">
              <p className="text-xs text-muted-foreground">คลิกที่ข้อความเพื่อเลือกทั้งหมด หรือกด Copy</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPromptModal(false)}
                >
                  ปิด
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    navigator.clipboard.writeText(buildPrompt()).then(() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }).catch(() => {});
                  }}
                >
                  {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "คัดลอกแล้ว!" : "Copy Prompt"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
