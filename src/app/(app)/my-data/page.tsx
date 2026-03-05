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
  Calendar, MapPin,
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

// ─── Tab Types ───────────────────────────────────────────────────────────────

type TabKey = "income" | "insurance" | "investment" | "debts" | "retirement";

const TABS: { key: TabKey; label: string; icon: React.ElementType; color: string }[] = [
  { key: "income",     label: "รายได้ & ครอบครัว",  icon: Banknote,    color: "text-blue-500" },
  { key: "insurance",  label: "ประกัน",              icon: ShieldCheck, color: "text-emerald-500" },
  { key: "investment", label: "การลงทุน",            icon: TrendingUp,  color: "text-purple-500" },
  { key: "debts",      label: "หนี้สิน & เงินสำรอง", icon: Wallet,      color: "text-amber-500" },
  { key: "retirement", label: "แผนเกษียณ",        icon: Calendar,    color: "text-indigo-500" },
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

function InvestmentTab({ p, upd }: { p: FinancialProfile; upd: <K extends keyof FinancialProfile>(k: K, v: FinancialProfile[K]) => void }) {
  const annualIncome = p.annualSalary + p.bonus + p.otherIncome;
  const totalInvest  = p.rmfAmount + p.ssfAmount + p.thaiEsgAmount + p.ltfAmount;
  const ssfCap  = Math.min(p.ssfAmount, 200000, annualIncome * 0.30);
  const rmfCap  = Math.min(p.rmfAmount, annualIncome * 0.30);
  const esgCap  = Math.min(p.thaiEsgAmount, 300000, annualIncome * 0.30);
  const deductGroup = Math.min(ssfCap + rmfCap + esgCap + Math.min(p.ltfAmount, annualIncome * 0.15), 500000);
  return (
    <div className="space-y-4">
      {totalInvest > 0 && (
        <div className="flex flex-wrap gap-6 px-4 py-3 rounded-xl bg-muted/50 border">
          <SummaryPill label="ลงทุนรวม/ปี" value={thb(totalInvest)} color="text-purple-600" />
          <SummaryPill label="ลดหย่อนได้ (รวมกลุ่ม)" value={thb(deductGroup)} color="text-emerald-600" />
          {annualIncome > 0 && <SummaryPill label="% ของรายได้" value={`${((totalInvest / annualIncome) * 100).toFixed(1)}%`} />}
        </div>
      )}
      <SectionCard title="กองทุนลดหย่อนภาษี (บาท/ปี)" icon={TrendingUp} iconColor="text-purple-500">
        <NumField label="RMF" value={p.rmfAmount} onChange={v => upd("rmfAmount", v)} hint="30% ของรายได้ รวมกลุ่มสูงสุด 500,000 บาท" />
        <NumField label="SSF" value={p.ssfAmount} onChange={v => upd("ssfAmount", v)} hint="30% ของรายได้ สูงสุด 200,000 บาท" />
        <NumField label="Thai ESG" value={p.thaiEsgAmount} onChange={v => upd("thaiEsgAmount", v)} hint="30% ของรายได้ สูงสุด 300,000 บาท" />
        <NumField label="LTF (กองทุนเก่า)" value={p.ltfAmount} onChange={v => upd("ltfAmount", v)} hint="15% ของรายได้ สูงสุด 500,000 บาท" />
      </SectionCard>
      {totalInvest === 0 && (
        <Card className="bg-purple-50/50 border-purple-200 dark:bg-purple-950/10">
          <CardContent className="pt-4 pb-4 text-sm space-y-1">
            <p className="font-semibold text-purple-700">📈 ยังไม่มีการลงทุน?</p>
            <p className="text-muted-foreground">การลงทุนใน RMF/SSF/Thai ESG ช่วยลดภาษีได้สูงสุด 500,000 บาท พร้อมสร้างความมั่งคั่งระยะยาว</p>
            <Link href="/ai-chat" className="text-primary underline underline-offset-2 block mt-1">ปรึกษา AI ที่ปรึกษา →</Link>
          </CardContent>
        </Card>
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

// ─── Tab: Retirement ─────────────────────────────────────────────────────────

function RetirementTab({ profile }: { profile: FinancialProfile }) {
  const [form, setForm] = useState({ currentAge: 30, retirementAge: 60, monthlyRetirementNeeds: 50000 });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  useEffect(() => {
    fetch("/api/user/financial-plan").then(r => r.json()).then(d => {
      if (d.data) setForm(prev => ({
        ...prev,
        currentAge: d.data.currentAge ?? prev.currentAge,
        retirementAge: d.data.retirementAge ?? prev.retirementAge,
        monthlyRetirementNeeds: Number(d.data.monthlyRetirementNeeds || prev.monthlyRetirementNeeds),
      }));
    }).catch(() => {});
  }, []);

  const monthlyIncome = Math.round((profile.annualSalary + profile.bonus + profile.otherIncome) / 12);
  const monthlyFree   = Math.max(0, monthlyIncome - profile.monthlyExpenses - profile.monthlyDebtPayment);
  const yearsToRetire = Math.max(0, form.retirementAge - form.currentAge);
  const corpusNeeded  = form.monthlyRetirementNeeds > 0
    ? Math.round((form.monthlyRetirementNeeds * 12) / 0.04)
    : 0;

  const save = async () => {
    setSaving(true);
    await fetch("/api/user/financial-plan", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentAge: form.currentAge,
        retirementAge: form.retirementAge,
        monthlyRetirementNeeds: form.monthlyRetirementNeeds,
        monthlyInvestable: monthlyFree,
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-4">
      <div className="px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-200 dark:bg-indigo-950/20 dark:border-indigo-800">
        <p className="text-sm font-medium text-indigo-800 dark:text-indigo-300">ข้อมูลนี้ใช้สร้างแผนการเงินส่วนตัวของคุณ</p>
        <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">
          ระบบจะคำนวณว่าคุณต้องออมเท่าไหร่ต่อเดือน และคุณอยู่ในเส้นทางที่ถูกต้องหรือไม่
        </p>
      </div>

      <SectionCard title="เป้าหมายเกษียณ" icon={Calendar} iconColor="text-indigo-500">
        <NumField label="อายุปัจจุบัน" value={form.currentAge}
          onChange={v => setForm(p => ({ ...p, currentAge: v }))} suffix="ปี" />
        <NumField label="อายุเกษียณเป้าหมาย" value={form.retirementAge}
          onChange={v => setForm(p => ({ ...p, retirementAge: v }))} suffix="ปี"
          hint={yearsToRetire > 0 ? `อีก ${yearsToRetire} ปี` : ""} />
        <NumField label="ค่าใช้จ่ายหลังเกษียณ/เดือน" value={form.monthlyRetirementNeeds}
          onChange={v => setForm(p => ({ ...p, monthlyRetirementNeeds: v }))}
          hint="ณ มูลค่าเงินปัจจุบัน (ก่อนเงินเฟ้อ)" />
      </SectionCard>

      {/* Derived summary */}
      <Card className="bg-muted/40 border-dashed">
        <CardContent className="pt-4 pb-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">สรุปคำนวณอัตโนมัติ</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">เงินลงทุนได้/เดือน (จากรายได้)</p>
              <p className={cn("font-bold text-base", monthlyFree > 0 ? "text-emerald-600" : "text-muted-foreground")}>
                {monthlyIncome > 0 ? thb(monthlyFree) : "กรอกรายได้ก่อน"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">เงินที่ต้องมีตอนเกษียณ (4% rule)</p>
              <p className="font-bold text-base text-indigo-600">
                {corpusNeeded > 0 ? `฿${(corpusNeeded / 1_000_000).toFixed(1)}M` : "—"}
              </p>
            </div>
          </div>
          {monthlyIncome === 0 && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              กรอกรายได้ในแท็บ "รายได้ & ครอบครัว" เพื่อดูยอดลงทุนที่คำนวณ
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 flex-wrap">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          บันทึกข้อมูลเกษียณ
        </Button>
        {saved && <span className="flex items-center gap-1 text-sm text-emerald-600"><CheckCircle2 className="h-4 w-4" />บันทึกแล้ว</span>}
        <Link href="/financial-plan" className="ml-auto text-sm text-primary hover:underline flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" />ดูแผนการเงิน →
        </Link>
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
    if (t && ["income", "insurance", "investment", "debts", "retirement"].includes(t)) {
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
      {tab === "retirement"  && <RetirementTab  profile={profile} />}

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
