"use client";
import { useState, useEffect, useCallback } from "react";
import { Calculator, ChevronDown, ChevronUp, Info, Sparkles, Database, Save, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import type { TaxCalculationResult } from "@/types";

type FilingStatus = "single" | "married_no_income" | "married_separate" | "married_joint";

const FILING_STATUS_OPTIONS: { value: FilingStatus; label: string }[] = [
  { value: "single",             label: "โสด" },
  { value: "married_no_income",  label: "คู่สมรสไม่มีรายได้" },
  { value: "married_separate",   label: "คู่สมรสมีรายได้ (แยกยื่น)" },
  { value: "married_joint",      label: "คู่สมรสมีรายได้ (รวมยื่น)" },
];

interface DeductionTypeConfig {
  id: string;
  code: string;
  nameTh: string;
  maxAmount: number | null;
  maxRateOfIncome: number | null;
}

interface TaxYearOption {
  id: string;
  year: number;
  labelTh: string;
}

// Map FinancialProfile field names → deduction type codes
const PROFILE_DEDUCTION_MAP: Record<string, string> = {
  lifeInsurancePremium:         "life_insurance",
  healthInsurancePremium:       "health_insurance",
  parentHealthInsurancePremium: "parent_health_insurance",
  annuityInsurancePremium:      "annuity_insurance",
  spouseLifeInsurancePremium:   "spouse_life_insurance",
  rmfAmount:                    "rmf_fund",
  ssfAmount:                    "ssf_fund",
  thaiEsgAmount:                "thai_esg",
  ltfAmount:                    "ltf_fund",
};

export default function TaxPage() {
  const [year, setYear]                   = useState(2025);
  const [years, setYears]                 = useState<TaxYearOption[]>([]);
  const [filingStatus, setFilingStatus]   = useState<FilingStatus>("single");
  const [deductionTypes, setDeductionTypes] = useState<DeductionTypeConfig[]>([]);
  const [showAllDeductions, setShowAllDeductions] = useState(false);

  // Income fields
  const [annualSalary, setAnnualSalary]   = useState("");
  const [bonus, setBonus]                 = useState("");
  const [otherIncome, setOtherIncome]     = useState("");
  const [spouseIncome, setSpouseIncome]   = useState("");
  const [withheldTax, setWithheldTax]     = useState("");
  const [providentFund, setProvidentFund] = useState("");
  const [socialSecurity, setSocialSecurity] = useState("");
  const [numChildren, setNumChildren]     = useState("0");
  const [numParents, setNumParents]       = useState("0");

  // Deduction amounts
  const [deductionAmounts, setDeductionAmounts] = useState<Record<string, string>>({});

  // Results
  const [result, setResult]       = useState<TaxCalculationResult | null>(null);
  const [lastBody, setLastBody]   = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  // Profile loading
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileLoaded, setProfileLoaded]   = useState(false);

  // Save result
  const [savingResult, setSavingResult]   = useState(false);
  const [savedResultId, setSavedResultId] = useState<string | null>(null);

  // History
  interface TaxHistoryItem {
    id: string;
    taxOwed: number;
    taxRefund: number;
    effectiveRate: number;
    createdAt: string;
    taxYear: { year: number; labelTh: string };
  }
  const [history, setHistory]           = useState<TaxHistoryItem[]>([]);
  const [showHistory, setShowHistory]   = useState(false);
  const [deletingId, setDeletingId]     = useState<string | null>(null);

  // Load tax years + config
  useEffect(() => {
    fetch("/api/tax/years")
      .then((r) => r.json())
      .then((d) => { if (d.success) setYears(d.data); });
    // Load history
    fetch("/api/tax/results")
      .then(r => r.json())
      .then(d => { if (d.data) setHistory(d.data); });
  }, []);

  useEffect(() => {
    fetch(`/api/tax/config/${year}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setDeductionTypes(d.data.deductionTypes);
      });
  }, [year]);

  const num = (v: string) => parseFloat(v.replace(/,/g, "")) || 0;

  const handleLoadProfile = useCallback(async () => {
    setLoadingProfile(true);
    try {
      const res = await fetch("/api/user/financial-profile");
      const data = await res.json();
      const p = data.data;
      if (!p) return;

      // Populate simple income fields
      if (p.filingStatus) setFilingStatus(p.filingStatus as FilingStatus);
      if (p.annualSalary  != null) setAnnualSalary(String(p.annualSalary));
      if (p.bonus         != null) setBonus(String(p.bonus));
      if (p.otherIncome   != null) setOtherIncome(String(p.otherIncome));
      if (p.spouseIncome  != null) setSpouseIncome(String(p.spouseIncome));
      if (p.withheldTax   != null) setWithheldTax(String(p.withheldTax));
      if (p.socialSecurity      != null) setSocialSecurity(String(p.socialSecurity));
      if (p.providentFundAmount != null) setProvidentFund(String(p.providentFundAmount));
      if (p.numChildren   != null) setNumChildren(String(p.numChildren));
      if (p.numParents    != null) setNumParents(String(p.numParents));

      // Populate deduction amounts by code
      const newDeductions: Record<string, string> = { ...deductionAmounts };
      for (const [profileKey, code] of Object.entries(PROFILE_DEDUCTION_MAP)) {
        const val = p[profileKey];
        if (val != null && Number(val) > 0) {
          const dt = deductionTypes.find((d) => d.code === code);
          if (dt) newDeductions[dt.id] = String(val);
        }
      }
      setDeductionAmounts(newDeductions);
      setProfileLoaded(true);
      setResult(null);
      setSavedResultId(null);
    } catch {
      // silently ignore
    } finally {
      setLoadingProfile(false);
    }
  }, [deductionTypes, deductionAmounts]);

  const handleCalculate = async () => {
    setLoading(true);
    setError("");
    setSavedResultId(null);
    try {
      const body = {
        year,
        filingStatus,
        annualSalary: num(annualSalary),
        bonus: num(bonus),
        otherIncome: num(otherIncome),
        spouseIncome: num(spouseIncome),
        withheldTax: num(withheldTax),
        providentFund: num(providentFund),
        socialSecurity: num(socialSecurity),
        numChildren: parseInt(numChildren) || 0,
        numParents: parseInt(numParents) || 0,
        deductions: deductionTypes.map((dt) => ({
          deductionTypeId: dt.id,
          code: dt.code,
          amount: num(deductionAmounts[dt.id] ?? "0"),
        })).filter((d) => d.amount > 0),
      };

      const res = await fetch("/api/tax/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.data);
        setLastBody(body as Record<string, unknown>);
      } else {
        setError(data.error || "เกิดข้อผิดพลาด กรุณาลองใหม่");
      }
    } catch {
      setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveResult = async () => {
    if (!result || !lastBody) return;
    setSavingResult(true);
    try {
      const taxYearId = years.find((y) => y.year === year)?.id;
      if (!taxYearId) throw new Error("No year ID");

      const payload = {
        taxYearId,
        inputSnapshot: lastBody,
        totalIncome: result.grossIncome,
        totalDeductions: result.expenseDeduction + result.personalAllowances + result.otherDeductions,
        netIncome: result.taxableIncome,
        taxOwed: result.taxBeforeCredit,
        withheldTax: result.withheldTax,
        taxRefund: result.isRefund ? Math.abs(result.taxOwed) : -Math.abs(result.taxOwed),
        effectiveRate: result.effectiveRate,
        marginalRate: result.marginalBracket,
      };
      const res = await fetch("/api/tax/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.data?.id) {
        setSavedResultId(data.data.id);
        setHistory(prev => [data.data, ...prev]);
      }
    } catch {
      // ignore
    } finally {
      setSavingResult(false);
    }
  };

  const handleDeleteHistory = async (id: string) => {
    if (!confirm("ลบประวัติการคำนวณนี้?")) return;
    setDeletingId(id);
    await fetch(`/api/tax/results/${id}`, { method: "DELETE" });
    setHistory(prev => prev.filter(h => h.id !== id));
    setDeletingId(null);
  };

  const visibleDeductions = showAllDeductions ? deductionTypes : deductionTypes.slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="h-6 w-6 text-blue-500" />
            คำนวณภาษี
          </h1>
          <p className="text-muted-foreground text-sm">ภาษีเงินได้บุคคลธรรมดา (ภงด.91)</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleLoadProfile}
          disabled={loadingProfile || deductionTypes.length === 0}
          className="shrink-0"
        >
          {loadingProfile
            ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />กำลังโหลด...</>
            : <><Database className="h-4 w-4 mr-2" />โหลดจากข้อมูลของฉัน</>
          }
        </Button>
      </div>

      {profileLoaded && (
        <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          โหลดข้อมูลจากโปรไฟล์การเงินของคุณแล้ว — ตรวจสอบและแก้ไขก่อนคำนวณ
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* ─ Left: Inputs ─ */}
        <div className="space-y-4">
          {/* Year + Filing Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">ปีภาษีและสถานภาพ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Tax Year */}
              <div className="space-y-1">
                <Label>ปีภาษี</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                >
                  {years.map((y) => (
                    <option key={y.year} value={y.year}>{y.labelTh}</option>
                  ))}
                </select>
              </div>
              {/* Filing Status */}
              <div className="space-y-1">
                <Label>สถานภาพการยื่น</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={filingStatus}
                  onChange={(e) => setFilingStatus(e.target.value as FilingStatus)}
                >
                  {FILING_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Income */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">รายได้</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "เงินเดือนทั้งปี (บาท)", value: annualSalary, set: setAnnualSalary, placeholder: "เช่น 840,000" },
                { label: "โบนัส (บาท)", value: bonus, set: setBonus, placeholder: "เช่น 70,000" },
                { label: "รายได้อื่น (บาท)", value: otherIncome, set: setOtherIncome, placeholder: "0" },
                ...(filingStatus === "married_joint" ? [{ label: "รายได้คู่สมรส (บาท)", value: spouseIncome, set: setSpouseIncome, placeholder: "0" }] : []),
                { label: "ภาษีหักณที่จ่าย (บาท)", value: withheldTax, set: setWithheldTax, placeholder: "0" },
              ].map(({ label, value, set, placeholder }) => (
                <div key={label} className="space-y-1">
                  <Label>{label}</Label>
                  <Input value={value} onChange={(e) => set(e.target.value)} placeholder={placeholder} />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Personal Allowances */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">ค่าลดหย่อนส่วนตัว</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "กองทุนสำรองเลี้ยงชีพ (บาท)", value: providentFund, set: setProvidentFund },
                { label: "ประกันสังคม (บาท)", value: socialSecurity, set: setSocialSecurity, placeholder: "~9,000" },
                { label: "จำนวนบุตร (คน)", value: numChildren, set: setNumChildren, type: "number" },
                { label: "จำนวนบิดามารดา (คน, สูงสุด 2)", value: numParents, set: setNumParents, type: "number" },
              ].map(({ label, value, set, placeholder, type }) => (
                <div key={label} className="space-y-1">
                  <Label>{label}</Label>
                  <Input
                    type={type ?? "text"}
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    placeholder={placeholder ?? "0"}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Deductions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">ค่าลดหย่อนการลงทุน / ประกัน</CardTitle>
              <CardDescription className="text-xs">ใส่เฉพาะรายการที่คุณมีจริง</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {visibleDeductions.map((dt) => (
                <div key={dt.id} className="space-y-1">
                  <Label className="flex items-center justify-between">
                    <span>{dt.nameTh}</span>
                    {dt.maxAmount && (
                      <span className="text-xs text-muted-foreground font-normal">
                        สูงสุด ฿{dt.maxAmount.toLocaleString("th-TH")}
                      </span>
                    )}
                  </Label>
                  <Input
                    value={deductionAmounts[dt.id] ?? ""}
                    onChange={(e) =>
                      setDeductionAmounts((prev) => ({ ...prev, [dt.id]: e.target.value }))
                    }
                    placeholder="0"
                  />
                </div>
              ))}
              {deductionTypes.length > 4 && (
                <button
                  onClick={() => setShowAllDeductions(!showAllDeductions)}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  {showAllDeductions ? (
                    <><ChevronUp className="h-3 w-3" />ย่อลง</>
                  ) : (
                    <><ChevronDown className="h-3 w-3" />ดูค่าลดหย่อนทั้งหมด ({deductionTypes.length - 4} รายการ)</>
                  )}
                </button>
              )}
            </CardContent>
          </Card>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button className="w-full" size="lg" onClick={handleCalculate} disabled={loading}>
            {loading ? "กำลังคำนวณ..." : "คำนวณภาษี"}
          </Button>
        </div>

        {/* ─ Right: Results ─ */}
        <div className="space-y-4">
          {!result ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <Calculator className="h-12 w-12 text-muted-foreground/30" />
                <p className="text-muted-foreground text-sm">กรอกข้อมูลรายได้แล้วกด "คำนวณภาษี"<br />เพื่อดูผลลัพธ์</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Main result */}
              <Card className={result.isRefund ? "border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/10" : "border-red-200 bg-red-50/50 dark:bg-red-950/10"}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    {result.isRefund ? "🎉 ได้รับคืนภาษี" : "💳 ต้องชำระภาษีเพิ่ม"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className={`text-4xl font-bold ${result.isRefund ? "text-emerald-600" : "text-red-500"}`}>
                    {result.isRefund ? "+" : ""}{formatCurrency(Math.abs(result.taxOwed))}
                  </div>
                  {/* Stat pills */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      { label: "อัตราจริง", value: `${result.effectiveRate}%` },
                      { label: "ขั้นภาษีสูงสุด", value: `${result.marginalBracket}%` },
                      { label: "เงินได้สุทธิ์", value: formatCurrency(result.taxableIncome) },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-background/60 rounded-lg py-1.5 px-1">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="text-sm font-bold">{value}</p>
                      </div>
                    ))}
                  </div>
                  {/* Effective rate bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0%</span><span>อัตราภาษีจริง {result.effectiveRate}%</span><span>35%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${result.effectiveRate <= 10 ? "bg-emerald-500" : result.effectiveRate <= 20 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${Math.min(100, (result.effectiveRate / 35) * 100)}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Breakdown */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">รายละเอียดการคำนวณ</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {[
                    { label: "รายได้รวม", value: result.grossIncome, highlight: false },
                    { label: "หักค่าใช้จ่าย (50%)", value: -result.expenseDeduction, highlight: false },
                    { label: "หักค่าลดหย่อนส่วนตัว", value: -result.personalAllowances, highlight: false },
                    { label: "หักค่าลดหย่อนอื่น", value: -result.otherDeductions, highlight: false },
                    { label: "เงินได้สุทธิ", value: result.taxableIncome, highlight: true },
                    { label: "ภาษีที่คำนวณได้", value: result.taxBeforeCredit, highlight: false },
                    { label: "ภาษีหักณที่จ่าย", value: -result.withheldTax, highlight: false },
                  ].map(({ label, value, highlight }) => (
                    <div key={label} className={`flex justify-between ${highlight ? "font-semibold border-t pt-2 mt-2" : ""}`}>
                      <span className={highlight ? "" : "text-muted-foreground"}>{label}</span>
                      <span className={value < 0 ? "text-emerald-600" : ""}>{formatCurrency(value)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Save result */}
              {savedResultId ? (
                <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  บันทึกผลการคำนวณแล้ว — แสดงในหน้า Dashboard
                </div>
              ) : (
                <Button variant="outline" className="w-full" onClick={handleSaveResult} disabled={savingResult}>
                  {savingResult
                    ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />กำลังบันทึก...</>
                    : <><Save className="h-4 w-4 mr-2" />บันทึกผลการคำนวณ</>
                  }
                </Button>
              )}

              {/* Unused deduction room */}
              {result.breakdown.unusedDeductionRoom.length > 0 && (
                <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      โอกาสประหยัดภาษีที่เหลืออยู่
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {result.breakdown.unusedDeductionRoom.slice(0, 5).map((r) => (
                      <div key={r.code} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{r.nameTh}</span>
                        <div className="text-right">
                          <span className="text-amber-600 font-medium">ประหยัดได้ {formatCurrency(r.potentialSaving)}</span>
                          <p className="text-xs text-muted-foreground">(ลดหย่อนเพิ่มได้ {formatCurrency(r.roomLeft)})</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <p>ผลการคำนวณเป็นการประมาณการเท่านั้น ควรตรวจสอบกับสรรพากรหรือนักวางแผนการเงินที่ได้รับอนุญาต</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tax History */}
      {history.length > 0 && (
        <Card>
          <CardHeader
            className="pb-3 cursor-pointer"
            onClick={() => setShowHistory(v => !v)}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                ประวัติการคำนวณ ({history.length} รายการ)
              </CardTitle>
              {showHistory
                ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground" />
              }
            </div>
          </CardHeader>
          {showHistory && (
            <CardContent className="space-y-2">
              {history.map(h => (
                <div
                  key={h.id}
                  className="flex items-center justify-between p-3 rounded-lg border text-sm"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium">{h.taxYear.labelTh}</p>
                      <p className="text-xs text-muted-foreground">
                        บันทึกเมื่อ {new Date(h.createdAt).toLocaleDateString("th-TH")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={Number(h.taxRefund) >= 0 ? "text-emerald-600 font-medium" : "text-red-500 font-medium"}>
                        {Number(h.taxRefund) >= 0
                          ? `คืน ฿${Number(h.taxRefund).toLocaleString("th-TH")}`
                          : `จ่ายเพิ่ม ฿${Math.abs(Number(h.taxRefund)).toLocaleString("th-TH")}`
                        }
                      </p>
                      <p className="text-xs text-muted-foreground">
                        อัตราจริง {Number(h.effectiveRate).toFixed(2)}%
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteHistory(h.id)}
                      disabled={deletingId === h.id}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      {deletingId === h.id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Trash2 className="h-4 w-4" />
                      }
                    </button>
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}

