"use client";
import { useEffect, useState } from "react";
import { FileText, ChevronDown, ChevronUp, ToggleLeft, ToggleRight } from "lucide-react";

type TaxBracket = { id: string; minIncome: number; maxIncome: number | null; rate: number; sortOrder: number };
type PersonalAllowance = { selfAmount: number; spouseAmount: number; childAmountPerChild: number; parentAmountPerParent: number; expenseDeductionRate: number; expenseDeductionMax: number };
type DeductionLimit = { id: string; maxAmount: number | null; maxRateOfIncome: number | null; combinedCapGroup: string | null; deductionType: { nameTh: string; code: string } };
type TaxYear = { id: string; year: number; isActive: boolean; labelTh: string; taxBrackets: TaxBracket[]; personalAllowance: PersonalAllowance | null; deductionLimits: DeductionLimit[] };

const fmt = (n: number) => n.toLocaleString("th-TH");

export default function TaxConfigPage() {
  const [years, setYears] = useState<TaxYear[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const adminKey = () => sessionStorage.getItem("admin_key") ?? "";

  const load = () => {
    setLoading(true);
    fetch("/api/admin/tax-config", { headers: { "x-admin-key": adminKey() } })
      .then(r => r.json())
      .then(d => { setYears(d.data ?? []); if (d.data?.length) setExpanded(d.data[0].id); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleActive = async (y: TaxYear) => {
    await fetch("/api/admin/tax-config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-key": adminKey() },
      body: JSON.stringify({ yearId: y.id, isActive: !y.isActive }),
    });
    setYears(prev => prev.map(yr => yr.id === y.id ? { ...yr, isActive: !yr.isActive } : yr));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          Tax Configuration
        </h1>
        <p className="text-sm text-muted-foreground">View and manage Thai tax brackets and deduction limits per year</p>
      </div>

      {loading && <p className="text-muted-foreground text-sm">Loading...</p>}

      <div className="space-y-3">
        {years.map(y => (
          <div key={y.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-750"
              onClick={() => setExpanded(expanded === y.id ? null : y.id)}
            >
              <div className="flex items-center gap-3">
                {expanded === y.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                <span className="font-semibold">{y.labelTh} ({y.year})</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${y.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {y.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <button
                onClick={e => { e.stopPropagation(); toggleActive(y); }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {y.isActive ? <ToggleRight className="h-5 w-5 text-emerald-500" /> : <ToggleLeft className="h-5 w-5" />}
                {y.isActive ? "Deactivate" : "Activate"}
              </button>
            </div>

            {expanded === y.id && (
              <div className="border-t border-slate-200 dark:border-slate-700 px-5 py-4 space-y-5">

                {/* Tax Brackets */}
                <div>
                  <h3 className="font-medium text-sm mb-2">อัตราภาษีก้าวหน้า</h3>
                  <table className="w-full text-xs">
                    <thead className="text-muted-foreground">
                      <tr>
                        <th className="text-left pb-1">เงินได้สุทธิ (บาท)</th>
                        <th className="text-right pb-1">อัตราภาษี</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {y.taxBrackets.map(b => (
                        <tr key={b.id}>
                          <td className="py-1">
                            {fmt(b.minIncome)} – {b.maxIncome ? fmt(b.maxIncome) : "ไม่จำกัด"}
                          </td>
                          <td className="py-1 text-right font-semibold">{b.rate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Personal Allowance */}
                {y.personalAllowance && (
                  <div>
                    <h3 className="font-medium text-sm mb-2">ค่าลดหย่อนส่วนตัว</h3>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        ["ผู้มีเงินได้", fmt(y.personalAllowance.selfAmount)],
                        ["คู่สมรส", fmt(y.personalAllowance.spouseAmount)],
                        ["บุตร / คน", fmt(y.personalAllowance.childAmountPerChild)],
                        ["บิดามารดา / คน", fmt(y.personalAllowance.parentAmountPerParent)],
                        ["ค่าใช้จ่าย", `${y.personalAllowance.expenseDeductionRate}% (สูงสุด ${fmt(y.personalAllowance.expenseDeductionMax)})`],
                      ].map(([label, val]) => (
                        <div key={label as string} className="flex justify-between">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-medium">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Deduction Limits */}
                <div>
                  <h3 className="font-medium text-sm mb-2">วงเงินลดหย่อน</h3>
                  <table className="w-full text-xs">
                    <thead className="text-muted-foreground">
                      <tr>
                        <th className="text-left pb-1">ประเภท</th>
                        <th className="text-right pb-1">วงเงิน</th>
                        <th className="text-right pb-1">กลุ่มรวม</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {y.deductionLimits.map(d => (
                        <tr key={d.id}>
                          <td className="py-1">{d.deductionType.nameTh}</td>
                          <td className="py-1 text-right">
                            {d.maxAmount ? `${fmt(d.maxAmount)} บาท` : d.maxRateOfIncome ? `${d.maxRateOfIncome}%` : "ไม่จำกัด"}
                          </td>
                          <td className="py-1 text-right text-muted-foreground">{d.combinedCapGroup ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
