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
  socialSecurity: 0, providentFundRate: 0, providentFundAmount: 0,
  lifeInsurancePremium: 0, healthInsurancePremium: 0, parentHealthInsurancePremium: 0,
  annuityInsurancePremium: 0, spouseLifeInsurancePremium: 0,
  ltfAmount: 0, rmfAmount: 0, ssfAmount: 0, thaiEsgAmount: 0,
  goldAmount: 0, cryptoAmount: 0, etfAmount: 0, thaiStockAmount: 0, foreignStockAmount: 0, otherInvestAmount: 0,
  totalDebt: 0, monthlyDebtPayment: 0, debtInterestRate: 0, emergencyFundAmount: 0, monthlyExpenses: 0,
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

  const fetchAssets = () => {
    setAssetsLoading(true);
    fetch("/api/user/portfolio-assets").then(r => r.json()).then(d => {
      setAssets(d.data?.map((a: PortfolioAsset) => ({ ...a, currentValue: Number(a.currentValue), expectedReturn: a.expectedReturn != null ? Number(a.expectedReturn) : null })) ?? []);
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
        emoji: "🏦", group: "tax", currentValue: annualAmount,
      }),
    });
    const data = await res.json();
    if (res.ok && data.data) {
      const newAssets = [...assets, { ...data.data, currentValue: annualAmount }];
      setAssets(newAssets);
      const newTotal = newAssets.filter(a => a.assetType === fund.code).reduce((s, a) => s + a.currentValue, 0);
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
          {/* AI suggest rates for tax funds */}
          <div className="flex justify-end">
            <button
              onClick={() => handleAiSuggestRates(TAX_FUNDS.map(f => f.code), "tax")}
              disabled={aiRateLoading}
              className="flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-700 border border-dashed border-violet-300 rounded-lg px-3 py-1.5 hover:bg-violet-50 transition-colors disabled:opacity-50">
              {aiRateLoading
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Sparkles className="h-3.5 w-3.5" />}
              AI ประมาณผลตอบแทน
            </button>
          </div>
          {TAX_FUNDS.map(fund => {
            const Icon         = fund.icon;
            const fundChildren = assets.filter(a => a.assetType === fund.code);
            const childTotal   = fundChildren.reduce((s, a) => s + a.currentValue, 0);
            const effectiveValue = fundChildren.length > 0 ? childTotal : (p[fund.key] as number);
            const cap  = annualIncome > 0 ? fund.capFn(annualIncome) : null;
            const pct  = cap && cap > 0 ? Math.min(100, (effectiveValue / cap) * 100) : null;
            const room = cap ? Math.max(0, cap - effectiveValue) : null;
            const isAddingHere = activeAddCode === fund.code;
            return (
              <div key={fund.key} className={cn(
                "rounded-xl border overflow-hidden transition-all",
                effectiveValue > 0 ? `${fund.bg} ${fund.border}` : "border-dashed border-muted-foreground/30"
              )}>
                {/* Header */}
                <div className="flex items-start gap-3 p-4">
                  <div className={cn("rounded-full p-2 shrink-0", effectiveValue > 0 ? fund.bg : "bg-muted/50")}>
                    <Icon className={cn("h-4 w-4", effectiveValue > 0 ? fund.color : "text-muted-foreground")} />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{fund.label}</span>
                      <span className="text-xs text-muted-foreground">{fund.sublabel}</span>
                      <div className="flex items-center gap-1 ml-auto shrink-0">
                        <Input
                          type="number" min={0} max={100} step="0.5"
                          className="h-7 w-14 text-xs text-center px-1 border-dashed"
                          placeholder="0"
                          value={taxFundRates[fund.code] ?? ""}
                          onChange={e => handleTaxFundRateChange(fund.code, parseFloat(e.target.value) || 0)}
                          title="ผลตอบแทนคาดหวัง %/ปี"
                        />
                        <span className="text-[10px] text-muted-foreground shrink-0">%/ปี</span>
                      </div>
                      {effectiveValue > 0 && cap !== null && (
                        <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full",
                          pct! >= 100 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
                          {pct! >= 100 ? "ใช้ครบ ✓" : `${pct!.toFixed(0)}%`}
                        </span>
                      )}
                    </div>
                    {pct !== null && effectiveValue > 0 && (
                      <div className="space-y-0.5">
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className={cn("h-full rounded-full transition-all", pct >= 100 ? "bg-emerald-500" : "bg-violet-400")}
                            style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                        {room !== null && room > 0 && <p className="text-xs text-muted-foreground">{fund.hint} · เหลือ {thb(room)}</p>}
                        {room === 0 && <p className="text-xs text-emerald-600">✓ ใช้สิทธิ์เต็มแล้ว!</p>}
                      </div>
                    )}
                    {effectiveValue === 0 && <p className="text-xs text-muted-foreground">{fund.hint}</p>}
                  </div>
                </div>

                {/* Child fund holdings */}
                {fundChildren.length > 0 && (
                  <div className="border-t divide-y">
                    {fundChildren.map(child => (
                      <div key={child.id} className="px-4 py-2.5 flex items-center gap-2">
                        {child.ticker && (
                          <span className="inline-block font-mono text-xs font-bold bg-muted px-1.5 py-0.5 rounded shrink-0">{child.ticker}</span>
                        )}
                        <span className="text-sm flex-1 min-w-0 truncate">{child.name}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-xs text-muted-foreground">฿</span>
                          <Input type="number" min={0}
                            className="h-7 w-28 text-sm bg-muted/40 border-0 focus-visible:ring-1 rounded-lg px-2"
                            value={child.currentValue || ""} placeholder="0"
                            onChange={e => handleValueChange(child.id, parseFloat(e.target.value) || 0)}
                          />
                          <span className="text-xs text-muted-foreground">/ปี</span>
                        </div>
                        <button onClick={() => handleRemove(child.id, false)}
                          className="p-1 text-muted-foreground/40 hover:text-destructive transition-colors rounded shrink-0">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <div className="px-4 py-1.5 flex justify-end">
                      <span className="text-xs text-muted-foreground">รวม <span className="font-semibold text-foreground">{thb(childTotal)}/ปี</span></span>
                    </div>
                  </div>
                )}

                {/* Manual input when no child holdings */}
                {fundChildren.length === 0 && (
                  <div className="border-t px-4 py-3 flex items-center gap-2">
                    <Label className="text-xs shrink-0 text-muted-foreground whitespace-nowrap">บาท/ปี</Label>
                    <Input type="number" min={0} className="h-8 text-sm" value={(p[fund.key] as number) || ""} placeholder="0"
                      onChange={e => upd(fund.key, (parseFloat(e.target.value) || 0) as FinancialProfile[typeof fund.key])}
                    />
                  </div>
                )}

                {/* Inline add-fund form */}
                <div className="border-t px-4 py-2.5">
                  {isAddingHere ? (
                    <div className="space-y-2 pt-0.5">
                      {addFormStep === "search" && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-semibold flex-1 text-muted-foreground">ค้นหาชื่อกองทุน ({fund.label})</p>
                            <button onClick={resetAddForm} className="text-muted-foreground hover:text-foreground">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input autoFocus placeholder="เช่น KMASTER, SCBDV, K-ESG, ONE-ULT"
                              value={searchQ}
                              onChange={e => handleSearchChange(e.target.value, "")}
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
                                </button>
                              ))}
                            </div>
                          )}
                          {!searchLoading && searchQ.trim().length > 0 && searchResults.length === 0 && (
                            <div className="text-center space-y-1.5 py-1">
                              <p className="text-xs text-muted-foreground">ไม่พบใน catalog</p>
                              <button
                                onClick={() => { setCustomName(searchQ.trim()); setAddFormStep("details"); }}
                                className="inline-flex items-center gap-1.5 text-xs text-primary border border-dashed border-primary/40 rounded-lg px-3 py-1.5 hover:bg-primary/5 transition-colors">
                                <Plus className="h-3 w-3" />
                                ใช้ &ldquo;{searchQ.trim()}&rdquo; เป็นชื่อ
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      {addFormStep === "details" && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <button onClick={() => { setAddFormStep("search"); setPickedInstrument(null); }}
                              className="text-muted-foreground hover:text-foreground shrink-0">
                              <ChevronLeft className="h-4 w-4" />
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold leading-tight truncate">
                                {pickedInstrument
                                  ? `${pickedInstrument.ticker} – ${pickedInstrument.nameTh ?? pickedInstrument.nameEn ?? pickedInstrument.ticker}`
                                  : customName}
                              </p>
                              <p className="text-[11px] text-muted-foreground">{fund.label}</p>
                            </div>
                            <button onClick={resetAddForm} className="text-muted-foreground hover:text-foreground shrink-0">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-medium">ลงทุน/ปี (฿)</Label>
                            <Input type="number" min={0} placeholder="0"
                              value={addValue} onChange={e => setAddValue(e.target.value)}
                              className="h-8 text-sm" />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" className="flex-1" disabled={addSaving}
                              onClick={() => handleAddTaxFund(fund)}>
                              {addSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />}
                              เพิ่ม
                            </Button>
                            <Button size="sm" variant="outline" onClick={resetAddForm}>ยกเลิก</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button onClick={() => handleStartTaxAdd(fund)}
                      className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                      <Plus className="h-3.5 w-3.5" /> เพิ่มชื่อกองทุน
                    </button>
                  )}
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
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-muted-foreground">฿</span>
                                    <Input type="number" min={0}
                                      className="h-7 w-24 text-sm bg-muted/40 border-0 focus-visible:ring-1 rounded-lg px-2"
                                      value={asset.currentValue || ""} placeholder="0"
                                      onChange={e => handleValueChange(asset.id, parseFloat(e.target.value) || 0)}
                                    />
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

                      {/* Lump sum row — always available for quick total entry */}
                      <div className="border-t px-4 py-3 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                          {stockAssets.length > 0 ? "ก้อนอื่น ฿" : "ยอดรวม ฿"}
                        </span>
                        <Input
                          type="number" min={0}
                          className="h-8 text-sm flex-1"
                          placeholder={stockAssets.length > 0 ? "0 — ลงทุนรวมเพิ่มเติม" : "0 — หรือเพิ่มรายหุ้นด้านล่าง"}
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
      {(p.totalDebt > 0 || p.emergencyFundAmount > 0) && (
        <div className="flex flex-wrap gap-6 px-4 py-3 rounded-xl bg-muted/50 border">
          <SummaryPill label="หนี้สินรวม" value={thb(p.totalDebt)} color={p.totalDebt > 0 ? "text-amber-600" : ""} />
          <SummaryPill label="ผ่อนชำระ/เดือน" value={thb(p.monthlyDebtPayment)} />
          {dti > 0 && <SummaryPill label="สัดส่วนหนี้/รายได้" value={`${dti.toFixed(1)}%`} color={dtiColor} />}
          {annualInterest > 0 && <SummaryPill label="ดอกเบี้ย/ปี" value={thb(annualInterest)} color="text-red-500" />}
          {debtFreeMonths !== null && <SummaryPill label="ปลดหนี้ใน" value={debtFreeMonths <= 120 ? `${debtFreeMonths} เดือน` : `${(debtFreeMonths/12).toFixed(0)} ปี`} />}
          <SummaryPill label="เงินสำรองฉุกเฉิน" value={thb(p.emergencyFundAmount)} />
          {emergencyMonths > 0 && <SummaryPill label="ครอบคลุม" value={`${emergencyMonths.toFixed(1)} เดือน`} color={efColor} />}
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
  const [ins, setIns]           = useState<InsuranceState>(defaultInsurance);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

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
      {tab === "insurance"   && <InsuranceTab   p={profile} upd={upd} ins={ins} updIns={updIns} />}
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
