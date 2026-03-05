"use client";
import { useState, useEffect } from "react";
import {
  ShieldCheck, ShieldAlert, Info, Loader2, Sparkles, AlertCircle, CheckCircle2,
  Heart, Activity, AlertTriangle, UserCheck, Wallet, Users, Plus, X, Pencil, Check,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

// ── Types ────────────────────────────────────────────────────────────────────

type InsuranceState = {
  lifeInsurancePremium: number;
  healthInsurancePremium: number;
  parentHealthInsurancePremium: number;
  annuityInsurancePremium: number;
  spouseLifeInsurancePremium: number;
  lifeCoverageAmount: number;
  healthCoveragePerYear: number;
  hasAccidentInsurance: boolean;
  hasCriticalIllness: boolean;
  hasDisabilityInsurance: boolean;
};

interface Recommendation {
  type: string;
  titleTh: string;
  priority: "critical" | "high" | "medium" | "low";
  reason: string;
  suggestedAmount?: string;
  highlighted: boolean;
}

// ── Insurance type catalogue ─────────────────────────────────────────────────

type InsuranceTypeId = "life" | "health" | "accident" | "critical" | "disability" | "annuity" | "parentHealth" | "spouseLife";

type InsuranceTypeDef = {
  id: InsuranceTypeId;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  colorBg: string;
  colorIcon: string;
  colorBorder: string;
  premiumField: keyof InsuranceState | null;
  coverageField: keyof InsuranceState | null;
  coverageLabel: string | null;
  coveragePlaceholder: string | null;
  maxDeduct: number | null;
  tip: string;
};

const INSURANCE_TYPES: InsuranceTypeDef[] = [
  {
    id: "life", label: "ประกันชีวิต", sublabel: "Life Insurance",
    icon: Heart, colorBg: "bg-blue-100 dark:bg-blue-950", colorIcon: "text-blue-600", colorBorder: "border-blue-200",
    premiumField: "lifeInsurancePremium", coverageField: "lifeCoverageAmount",
    coverageLabel: "ทุนประกันชีวิต (บาท)", coveragePlaceholder: "เช่น 3,000,000",
    maxDeduct: 100000, tip: "หักลดหย่อนได้สูงสุด 100,000 บาท",
  },
  {
    id: "health", label: "ประกันสุขภาพ", sublabel: "Health Insurance",
    icon: Activity, colorBg: "bg-emerald-100 dark:bg-emerald-950", colorIcon: "text-emerald-600", colorBorder: "border-emerald-200",
    premiumField: "healthInsurancePremium", coverageField: "healthCoveragePerYear",
    coverageLabel: "วงเงินคุ้มครองต่อปี (บาท)", coveragePlaceholder: "เช่น 500,000",
    maxDeduct: 25000, tip: "หักได้ 25,000 บาท (รวมกับประกันชีวิตไม่เกิน 100,000 บาท)",
  },
  {
    id: "accident", label: "ประกันอุบัติเหตุ", sublabel: "Accident (PA)",
    icon: ShieldAlert, colorBg: "bg-orange-100 dark:bg-orange-950", colorIcon: "text-orange-600", colorBorder: "border-orange-200",
    premiumField: null, coverageField: "hasAccidentInsurance",
    coverageLabel: null, coveragePlaceholder: null,
    maxDeduct: null, tip: "คุ้มครองกรณีเสียชีวิต บาดเจ็บ หรือทุพพลภาพจากอุบัติเหตุ",
  },
  {
    id: "critical", label: "ประกันโรคร้ายแรง", sublabel: "Critical Illness",
    icon: AlertTriangle, colorBg: "bg-red-100 dark:bg-red-950", colorIcon: "text-red-600", colorBorder: "border-red-200",
    premiumField: null, coverageField: "hasCriticalIllness",
    coverageLabel: null, coveragePlaceholder: null,
    maxDeduct: null, tip: "คุ้มครองโรคร้ายแรง เช่น มะเร็ง โรคหัวใจ เส้นเลือดในสมอง",
  },
  {
    id: "disability", label: "ประกันทุพพลภาพ", sublabel: "Disability Insurance",
    icon: UserCheck, colorBg: "bg-purple-100 dark:bg-purple-950", colorIcon: "text-purple-600", colorBorder: "border-purple-200",
    premiumField: null, coverageField: "hasDisabilityInsurance",
    coverageLabel: null, coveragePlaceholder: null,
    maxDeduct: null, tip: "คุ้มครองกรณีทุพพลภาพถาวรไม่สามารถทำงานได้",
  },
  {
    id: "annuity", label: "ประกันบำนาญ", sublabel: "Annuity Insurance",
    icon: Wallet, colorBg: "bg-teal-100 dark:bg-teal-950", colorIcon: "text-teal-600", colorBorder: "border-teal-200",
    premiumField: "annuityInsurancePremium", coverageField: null,
    coverageLabel: null, coveragePlaceholder: null,
    maxDeduct: 200000, tip: "หักลดหย่อนได้ 15% ของรายได้ สูงสุด 200,000 บาท",
  },
  {
    id: "parentHealth", label: "ประกันสุขภาพบิดามารดา", sublabel: "Parent Health",
    icon: Users, colorBg: "bg-sky-100 dark:bg-sky-950", colorIcon: "text-sky-600", colorBorder: "border-sky-200",
    premiumField: "parentHealthInsurancePremium", coverageField: null,
    coverageLabel: null, coveragePlaceholder: null,
    maxDeduct: 15000, tip: "หักลดหย่อนได้สูงสุด 15,000 บาท (บิดามารดาอายุ 60 ปีขึ้นไป)",
  },
  {
    id: "spouseLife", label: "ประกันชีวิตคู่สมรส", sublabel: "Spouse Life",
    icon: Heart, colorBg: "bg-pink-100 dark:bg-pink-950", colorIcon: "text-pink-600", colorBorder: "border-pink-200",
    premiumField: "spouseLifeInsurancePremium", coverageField: null,
    coverageLabel: null, coveragePlaceholder: null,
    maxDeduct: 10000, tip: "คู่สมรสไม่มีรายได้ หักลดหย่อนได้สูงสุด 10,000 บาท",
  },
];

const PRIORITY_CONFIG = {
  critical: { label: "เร่งด่วน",   className: "bg-red-100 text-red-700 border-red-300" },
  high:     { label: "สำคัญมาก",  className: "bg-orange-100 text-orange-700 border-orange-300" },
  medium:   { label: "แนะนำ",     className: "bg-blue-100 text-blue-700 border-blue-300" },
  low:      { label: "ทางเลือก",  className: "bg-gray-100 text-gray-700 border-gray-300" },
};

function isTypeActive(type: InsuranceTypeDef, data: InsuranceState): boolean {
  if (type.premiumField && (data[type.premiumField] as number) > 0) return true;
  if (type.coverageField) {
    const v = data[type.coverageField];
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return v > 0;
  }
  return false;
}

// ── Score ring ────────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * score / 100;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : score >= 40 ? "#f97316" : "#ef4444";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} strokeWidth={8} stroke="currentColor" className="text-muted/20" fill="none" />
      <circle cx={size/2} cy={size/2} r={r} strokeWidth={8} stroke={color} fill="none"
        strokeDasharray={`${dash.toFixed(1)} ${circ.toFixed(1)}`} strokeLinecap="round" />
    </svg>
  );
}

export default function InsurancePage() {
  const defaultState: InsuranceState = {
    lifeInsurancePremium: 0, healthInsurancePremium: 0, parentHealthInsurancePremium: 0,
    annuityInsurancePremium: 0, spouseLifeInsurancePremium: 0,
    lifeCoverageAmount: 0, healthCoveragePerYear: 0,
    hasAccidentInsurance: false, hasCriticalIllness: false, hasDisabilityInsurance: false,
  };

  const [data, setData]             = useState<InsuranceState>(defaultState);
  const [saved, setSaved]           = useState(false);
  const [saving, setSaving]         = useState(false);
  const [loading, setLoading]       = useState(true);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [recLoading, setRecLoading] = useState(true);
  // Add flow
  const [showAdd, setShowAdd]       = useState(false);
  const [addStep, setAddStep]       = useState<"select" | "details">("select");
  const [addTypeId, setAddTypeId]   = useState<InsuranceTypeId | null>(null);
  const [addPremium, setAddPremium] = useState("");
  const [addCoverage, setAddCoverage] = useState("");
  // Edit inline
  const [editingId, setEditingId]   = useState<InsuranceTypeId | null>(null);
  const [editPremium, setEditPremium] = useState("");
  const [editCoverage, setEditCoverage] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/insurance").then(r => r.json()),
      fetch("/api/insurance/recommend").then(r => r.json()),
    ]).then(([insRes, recRes]) => {
      if (insRes.data) {
        setData({
          lifeInsurancePremium:         Number(insRes.data.lifeInsurancePremium ?? 0),
          healthInsurancePremium:       Number(insRes.data.healthInsurancePremium ?? 0),
          parentHealthInsurancePremium: Number(insRes.data.parentHealthInsurancePremium ?? 0),
          annuityInsurancePremium:      Number(insRes.data.annuityInsurancePremium ?? 0),
          spouseLifeInsurancePremium:   Number(insRes.data.spouseLifeInsurancePremium ?? 0),
          lifeCoverageAmount:           Number(insRes.data.lifeCoverageAmount ?? 0),
          healthCoveragePerYear:        Number(insRes.data.healthCoveragePerYear ?? 0),
          hasAccidentInsurance:         Boolean(insRes.data.hasAccidentInsurance),
          hasCriticalIllness:           Boolean(insRes.data.hasCriticalIllness),
          hasDisabilityInsurance:       Boolean(insRes.data.hasDisabilityInsurance),
        });
      }
      setLoading(false);
      const recData = recRes.data?.recommendations ?? recRes.recommendations ?? recRes.data ?? [];
      setRecommendations(Array.isArray(recData) ? recData : []);
      setRecLoading(false);
    }).catch(() => { setLoading(false); setRecLoading(false); });
  }, []);

  const persist = async (next: InsuranceState) => {
    setSaving(true);
    await fetch("/api/insurance", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const removeType = (type: InsuranceTypeDef) => {
    const next = { ...data };
    if (type.premiumField) (next[type.premiumField] as number) = 0;
    if (type.coverageField) {
      const v = data[type.coverageField];
      if (typeof v === "boolean") (next[type.coverageField] as boolean) = false;
      else (next[type.coverageField] as number) = 0;
    }
    setData(next); persist(next);
  };

  const confirmAdd = () => {
    if (!addTypeId) return;
    const type = INSURANCE_TYPES.find(t => t.id === addTypeId)!;
    const next = { ...data };
    if (type.premiumField) (next[type.premiumField] as number) = parseFloat(addPremium) || 0;
    if (type.coverageField) {
      const v = data[type.coverageField];
      if (typeof v === "boolean") (next[type.coverageField] as boolean) = true;
      else (next[type.coverageField] as number) = parseFloat(addCoverage) || 0;
    }
    setData(next); persist(next);
    setShowAdd(false); setAddTypeId(null); setAddPremium(""); setAddCoverage("");
  };

  const saveEdit = (type: InsuranceTypeDef) => {
    const next = { ...data };
    if (type.premiumField) (next[type.premiumField] as number) = parseFloat(editPremium) || 0;
    if (type.coverageField && typeof data[type.coverageField] === "number")
      (next[type.coverageField] as number) = parseFloat(editCoverage) || 0;
    setData(next); persist(next); setEditingId(null);
  };

  // ── Derived ─────────────────────────────────────────────────────────────
  const activeTypes   = INSURANCE_TYPES.filter(t => isTypeActive(t, data));
  const inactiveTypes = INSURANCE_TYPES.filter(t => !isTypeActive(t, data));
  const totalPremium  = [
    data.lifeInsurancePremium, data.healthInsurancePremium,
    data.parentHealthInsurancePremium, data.annuityInsurancePremium,
    data.spouseLifeInsurancePremium,
  ].reduce((a, b) => a + b, 0);
  const criticalCount = recommendations.filter(r => r.priority === "critical").length;
  const protectionScore = Math.min(100, Math.round(
    (data.hasAccidentInsurance   ? 20 : 0) +
    (data.hasCriticalIllness     ? 20 : 0) +
    (data.hasDisabilityInsurance ? 15 : 0) +
    (data.lifeCoverageAmount > 0 ? 20 : 0) +
    (data.healthCoveragePerYear > 0 ? 15 : 0) +
    (criticalCount === 0 && !recLoading ? 10 : 0)
  ));
  const scoreLabel =
    protectionScore >= 80 ? "ความคุ้มครองดีมาก" :
    protectionScore >= 60 ? "ความคุ้มครองพอใช้" :
    protectionScore >= 40 ? "ต้องเพิ่มความคุ้มครอง" :
    "ความคุ้มครองไม่เพียงพอ";

  const addType = addTypeId ? INSURANCE_TYPES.find(t => t.id === addTypeId)! : null;

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-emerald-500" />
            ประกันภัยของฉัน
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">จัดการและติดตามความคุ้มครองประกันภัยของคุณ</p>
        </div>
        <Button
          onClick={() => { setShowAdd(true); setAddStep("select"); setAddTypeId(null); setAddPremium(""); setAddCoverage(""); }}
          className="shrink-0"
        >
          <Plus className="h-4 w-4 mr-1" />
          เพิ่มประกัน
        </Button>
      </div>

      {/* ── Protection score card ── */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              <ScoreRing score={protectionScore} size={80} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold">{protectionScore}</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{scoreLabel}</p>
              <p className="text-xs text-muted-foreground mt-0.5">คะแนนความคุ้มครองโดยรวม (0–100)</p>
              <div className="flex flex-wrap gap-3 mt-2 text-sm">
                <span className={activeTypes.length > 0 ? "text-emerald-600 font-medium" : "text-muted-foreground"}>
                  🛡️ {activeTypes.length} ประเภท
                </span>
                <span className={totalPremium > 0 ? "text-emerald-600 font-medium" : "text-muted-foreground"}>
                  💰 {totalPremium > 0 ? `฿${totalPremium.toLocaleString("th-TH")}/ปี` : "ยังไม่บันทึกเบี้ย"}
                </span>
                <span className={criticalCount === 0 ? "text-emerald-600" : "text-red-600"}>
                  {recLoading ? "⏳ โหลด..." : criticalCount === 0 ? "✓ ครบถ้วนดี" : `⚠️ ขาด ${criticalCount} รายการ`}
                </span>
              </div>
            </div>
            {saved && (
              <div className="flex items-center gap-1 text-emerald-600 text-sm shrink-0">
                <Check className="h-4 w-4" /> บันทึกแล้ว
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Add insurance panel ── */}
      {showAdd && (
        <Card className="border-primary/40 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {addStep === "select" ? "เลือกประเภทประกัน" : `เพิ่ม ${addType?.label}`}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowAdd(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {addStep === "select" && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {inactiveTypes.map(type => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      onClick={() => { setAddTypeId(type.id); setAddStep("details"); }}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl border hover:border-primary hover:bg-primary/5 transition-all text-center group"
                    >
                      <div className={`rounded-full p-3 ${type.colorBg} group-hover:scale-110 transition-transform`}>
                        <Icon className={`h-5 w-5 ${type.colorIcon}`} />
                      </div>
                      <span className="text-xs font-medium leading-tight">{type.label}</span>
                      <span className="text-[10px] text-muted-foreground leading-tight">{type.sublabel}</span>
                    </button>
                  );
                })}
                {inactiveTypes.length === 0 && (
                  <div className="col-span-4 text-center py-6 space-y-2">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                    <p className="text-sm text-muted-foreground">คุณมีประกันครบทุกประเภทแล้ว 🎉</p>
                  </div>
                )}
              </div>
            )}
            {addStep === "details" && addType && (
              <div className="space-y-4">
                <div className={`flex items-center gap-3 p-3 rounded-lg ${addType.colorBg} border ${addType.colorBorder}`}>
                  <div className="rounded-full p-2 bg-white/50 dark:bg-black/20">
                    <addType.icon className={`h-5 w-5 ${addType.colorIcon}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{addType.label}</p>
                    <p className="text-xs opacity-70">{addType.tip}</p>
                  </div>
                </div>
                {addType.premiumField && (
                  <div className="space-y-1">
                    <Label>เบี้ยประกันต่อปี (บาท)</Label>
                    <Input type="number" min={0} placeholder="เช่น 12,000" value={addPremium} onChange={e => setAddPremium(e.target.value)} />
                    {addType.maxDeduct && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Info className="h-3 w-3" /> {addType.tip}
                      </p>
                    )}
                  </div>
                )}
                {addType.coverageField && addType.coverageLabel && (
                  <div className="space-y-1">
                    <Label>{addType.coverageLabel}</Label>
                    <Input type="number" min={0} placeholder={addType.coveragePlaceholder ?? ""} value={addCoverage} onChange={e => setAddCoverage(e.target.value)} />
                  </div>
                )}
                {addType.coverageField && !addType.coverageLabel && (
                  <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg p-3">
                    ✅ กดยืนยันเพื่อบันทึกว่าคุณมี{addType.label}
                  </p>
                )}
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => setAddStep("select")}>ย้อนกลับ</Button>
                  <Button size="sm" onClick={confirmAdd} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                    ยืนยัน
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Active policies grid ── */}
      {activeTypes.length === 0 && !showAdd && (
        <Card className="border-dashed">
          <CardContent className="py-14 flex flex-col items-center gap-4 text-center">
            <div className="rounded-full bg-muted/50 p-5">
              <ShieldCheck className="h-10 w-10 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold">ยังไม่มีประกันที่บันทึกไว้</p>
              <p className="text-sm text-muted-foreground mt-1">
                เพิ่มประกันที่คุณมีเพื่อวิเคราะห์ความคุ้มครองและประเมินช่องว่างความเสี่ยง
              </p>
            </div>
            <Button onClick={() => { setShowAdd(true); setAddStep("select"); setAddTypeId(null); }}>
              <Plus className="h-4 w-4 mr-1" /> เพิ่มประกันแรกของคุณ
            </Button>
          </CardContent>
        </Card>
      )}

      {activeTypes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {activeTypes.map(type => {
            const Icon = type.icon;
            const premium = type.premiumField ? (data[type.premiumField] as number) : 0;
            const coverageVal = type.coverageField ? data[type.coverageField] : null;
            const isEditing = editingId === type.id;
            const canEdit = !!(type.premiumField || (type.coverageField && typeof coverageVal === "number"));

            return (
              <Card key={type.id} className={`border ${type.colorBorder}`}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`rounded-full p-2.5 ${type.colorBg}`}>
                        <Icon className={`h-5 w-5 ${type.colorIcon}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{type.label}</p>
                        <p className="text-xs text-muted-foreground">{type.sublabel}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {canEdit && !isEditing && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                          setEditingId(type.id);
                          setEditPremium(premium > 0 ? String(premium) : "");
                          setEditCoverage(type.coverageField && typeof coverageVal === "number" ? String(coverageVal) : "");
                        }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => removeType(type)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="space-y-2">
                      {type.premiumField && (
                        <div className="space-y-1">
                          <Label className="text-xs">เบี้ยประกันต่อปี (บาท)</Label>
                          <Input type="number" min={0} className="h-8 text-sm" value={editPremium} onChange={e => setEditPremium(e.target.value)} />
                        </div>
                      )}
                      {type.coverageField && type.coverageLabel && (
                        <div className="space-y-1">
                          <Label className="text-xs">{type.coverageLabel}</Label>
                          <Input type="number" min={0} className="h-8 text-sm" value={editCoverage} onChange={e => setEditCoverage(e.target.value)} />
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button size="sm" className="h-7 text-xs" onClick={() => saveEdit(type)} disabled={saving}>บันทึก</Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditingId(null)}>ยกเลิก</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 text-sm">
                      {premium > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">เบี้ยประกัน/ปี</span>
                          <span className="font-medium">฿{premium.toLocaleString("th-TH")}</span>
                        </div>
                      )}
                      {typeof coverageVal === "number" && coverageVal > 0 && type.coverageLabel && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{type.coverageLabel}</span>
                          <span className="font-medium">฿{(coverageVal as number).toLocaleString("th-TH")}</span>
                        </div>
                      )}
                      {typeof coverageVal === "boolean" && coverageVal && (
                        <div className="flex items-center gap-1.5 text-emerald-600">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>มีความคุ้มครอง</span>
                        </div>
                      )}
                      {type.maxDeduct && premium > 0 && (
                        <div className="pt-2 border-t mt-2">
                          <Badge variant="secondary" className="text-xs">
                            ลดหย่อนภาษีได้ ฿{Math.min(premium, type.maxDeduct).toLocaleString("th-TH")}
                          </Badge>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── AI Recommendations ── */}
      {!recLoading && recommendations.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <h2 className="font-semibold text-sm">คำแนะนำตามโปรไฟล์ของคุณ</h2>
          </div>
          {recommendations.map(rec => (
            <Card key={rec.type} className={rec.highlighted ? "border-amber-200 bg-amber-50/50 dark:bg-amber-950/10" : ""}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  {rec.highlighted
                    ? <AlertCircle className={`h-5 w-5 shrink-0 mt-0.5 ${rec.priority === "critical" ? "text-red-500" : rec.priority === "high" ? "text-orange-500" : "text-blue-500"}`} />
                    : <Info className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium text-sm">{rec.titleTh}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PRIORITY_CONFIG[rec.priority].className}`}>
                        {PRIORITY_CONFIG[rec.priority].label}
                      </span>
                      {rec.highlighted && <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">⭐ ตรงกับโปรไฟล์คุณ</span>}
                    </div>
                    <p className="text-sm text-muted-foreground">{rec.reason}</p>
                    {rec.suggestedAmount && <p className="text-xs text-emerald-700 mt-1 font-medium">💡 {rec.suggestedAmount}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!recLoading && recommendations.length === 0 && activeTypes.length > 0 && (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <p className="text-sm text-emerald-700">ยอดเยี่ยม! ความคุ้มครองของคุณครบถ้วนดีแล้ว</p>
          </CardContent>
        </Card>
      )}

      {/* ── Tax note (only when relevant) ── */}
      {totalPremium > 0 && (
        <Card className="bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800">
          <CardContent className="pt-4 pb-4 text-sm text-amber-800 dark:text-amber-200 space-y-1">
            <p className="font-semibold">💡 หมายเหตุการลดหย่อนภาษี</p>
            <ul className="list-disc list-inside space-y-1 text-amber-700 dark:text-amber-300">
              <li>เบี้ยประกันชีวิตและสุขภาพ (ตนเอง) รวมกันสูงสุดไม่เกิน 100,000 บาท</li>
              <li>ประกันบำนาญ + RMF + SSF + กองทุนสำรองเลี้ยงชีพ รวมกันสูงสุดไม่เกิน 500,000 บาท</li>
              <li>ต้องได้รับใบรับรองจากบริษัทที่ได้รับอนุญาตจาก คปภ.</li>
            </ul>
          </CardContent>
        </Card>
      )}

    </div>
  );
}







