"use client";
import { useState, useEffect } from "react";
import { ShieldCheck, Info, Loader2, Sparkles, AlertCircle, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type InsuranceField = {
  id: keyof InsuranceState;
  label: string;
  sublabel: string;
  maxDeduct: number | null;
  tip: string;
};

type InsuranceState = {
  lifeInsurancePremium: number;
  healthInsurancePremium: number;
  parentHealthInsurancePremium: number;
  annuityInsurancePremium: number;
  spouseLifeInsurancePremium: number;
};

type CoverageState = {
  lifeCoverageAmount: number;
  healthCoveragePerYear: number;
  hasAccidentInsurance: boolean;
  hasCriticalIllness: boolean;
  hasDisabilityInsurance: boolean;
};

const defaultCoverage: CoverageState = {
  lifeCoverageAmount: 0,
  healthCoveragePerYear: 0,
  hasAccidentInsurance: false,
  hasCriticalIllness: false,
  hasDisabilityInsurance: false,
};

interface Recommendation {
  type: string;
  titleTh: string;
  priority: "critical" | "high" | "medium" | "low";
  reason: string;
  suggestedAmount?: string;
  highlighted: boolean;
}

const FIELDS: InsuranceField[] = [
  { id: "lifeInsurancePremium",         label: "ประกันชีวิตทั่วไป",           sublabel: "Life Insurance",               maxDeduct: 100000, tip: "หักได้สูงสุด 100,000 บาท" },
  { id: "healthInsurancePremium",       label: "ประกันสุขภาพ (ตนเอง)",        sublabel: "Health Insurance",             maxDeduct: 25000,  tip: "หักได้สูงสุด 25,000 บาท (รวมกับประกันชีวิตไม่เกิน 100,000 บาท)" },
  { id: "parentHealthInsurancePremium", label: "ประกันสุขภาพ (บิดามารดา)",    sublabel: "Parent Health Insurance",      maxDeduct: 15000,  tip: "หักได้สูงสุด 15,000 บาท" },
  { id: "annuityInsurancePremium",      label: "ประกันชีวิตแบบบำนาญ",         sublabel: "Annuity Insurance",            maxDeduct: null,   tip: "หักได้ 15% ของเงินได้ สูงสุด 200,000 บาท (รวมกลุ่ม SSF/RMF)" },
  { id: "spouseLifeInsurancePremium",   label: "ประกันชีวิตคู่สมรส (ไม่มีรายได้)", sublabel: "Spouse Life Insurance",   maxDeduct: 10000,  tip: "หักได้สูงสุด 10,000 บาท (คู่สมรสไม่มีรายได้)" },
];

const PRIORITY_CONFIG = {
  critical: { label: "เร่งด่วน",    className: "bg-red-100 text-red-700 border-red-300" },
  high:     { label: "สำคัญมาก",   className: "bg-orange-100 text-orange-700 border-orange-300" },
  medium:   { label: "แนะนำ",      className: "bg-blue-100 text-blue-700 border-blue-300" },
  low:      { label: "ทางเลือก",   className: "bg-gray-100 text-gray-700 border-gray-300" },
};

export default function InsurancePage() {
  const [values, setValues] = useState<InsuranceState>({
    lifeInsurancePremium: 0,
    healthInsurancePremium: 0,
    parentHealthInsurancePremium: 0,
    annuityInsurancePremium: 0,
    spouseLifeInsurancePremium: 0,
  });
  const [coverage, setCoverage]         = useState<CoverageState>(defaultCoverage);
  const [saved, setSaved]               = useState(false);
  const [saving, setSaving]             = useState(false);
  const [loading, setLoading]           = useState(true);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [recLoading, setRecLoading]     = useState(true);
  const [showEntryForm, setShowEntryForm] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/insurance").then(r => r.json()),
      fetch("/api/insurance/recommend").then(r => r.json()),
    ]).then(([insRes, recRes]) => {
      if (insRes.data) {
        setValues({
          lifeInsurancePremium: Number(insRes.data.lifeInsurancePremium ?? 0),
          healthInsurancePremium: Number(insRes.data.healthInsurancePremium ?? 0),
          parentHealthInsurancePremium: Number(insRes.data.parentHealthInsurancePremium ?? 0),
          annuityInsurancePremium: Number(insRes.data.annuityInsurancePremium ?? 0),
          spouseLifeInsurancePremium: Number(insRes.data.spouseLifeInsurancePremium ?? 0),
        });
        setCoverage({
          lifeCoverageAmount: Number(insRes.data.lifeCoverageAmount ?? 0),
          healthCoveragePerYear: Number(insRes.data.healthCoveragePerYear ?? 0),
          hasAccidentInsurance: Boolean(insRes.data.hasAccidentInsurance),
          hasCriticalIllness: Boolean(insRes.data.hasCriticalIllness),
          hasDisabilityInsurance: Boolean(insRes.data.hasDisabilityInsurance),
        });
      }
      setLoading(false);
      if (recRes.data) setRecommendations(recRes.data as Recommendation[]);
      setRecLoading(false);
    }).catch(() => { setLoading(false); setRecLoading(false); });
  }, []);

  const update = (field: keyof InsuranceState, val: string) => {
    setSaved(false);
    setValues(prev => ({ ...prev, [field]: parseFloat(val) || 0 }));
  };

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/insurance", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, ...coverage }),
    });
    setSaving(false);
    setSaved(true);
  };

  const total = Object.values(values).reduce((a, b) => a + b, 0);
  const criticalCount = recommendations.filter(r => r.priority === "critical").length;
  const highlightedRecs = recommendations.filter(r => r.highlighted);
  const otherRecs = recommendations.filter(r => !r.highlighted);

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-emerald-500" />
          ประกันภัย
        </h1>
        <p className="text-muted-foreground text-sm">วิเคราะห์ความคุ้มครองและบันทึกเบี้ยประกันเพื่อลดหย่อนภาษี</p>
      </div>

      {/* Current coverage summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className={total > 0 ? "border-emerald-200" : "border-dashed"}>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">เบี้ยประกันทั้งหมด/ปี</p>
            <p className={`text-xl font-bold ${total > 0 ? "text-emerald-600" : "text-muted-foreground"}`}>
              {total > 0 ? `฿${total.toLocaleString("th-TH")}` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card className={criticalCount === 0 ? "border-emerald-200" : "border-red-200"}>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">รายการเร่งด่วน</p>
            <p className={`text-xl font-bold ${criticalCount === 0 ? "text-emerald-600" : "text-red-600"}`}>
              {recLoading ? "..." : criticalCount === 0 ? "✓ ครบแล้ว" : `${criticalCount} รายการ`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">คำแนะนำทั้งหมด</p>
            <p className="text-xl font-bold">{recLoading ? "..." : recommendations.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      {!recLoading && recommendations.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <h2 className="font-semibold text-sm">คำแนะนำตามโปรไฟล์ของคุณ</h2>
            {highlightedRecs.length > 0 && (
              <Badge variant="secondary" className="text-xs">เลือกตามระดับความเสี่ยงของคุณ</Badge>
            )}
          </div>

          {/* Highlighted (matches user risk level) */}
          {highlightedRecs.map(rec => (
            <Card key={rec.type} className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/10">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className={`h-5 w-5 shrink-0 mt-0.5 ${rec.priority === "critical" ? "text-red-500" : rec.priority === "high" ? "text-orange-500" : "text-blue-500"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium text-sm">{rec.titleTh}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PRIORITY_CONFIG[rec.priority].className}`}>
                        {PRIORITY_CONFIG[rec.priority].label}
                      </span>
                      <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">⭐ ตรงกับโปรไฟล์คุณ</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{rec.reason}</p>
                    {rec.suggestedAmount && (
                      <p className="text-xs text-emerald-700 mt-1 font-medium">💡 {rec.suggestedAmount}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Other recommendations */}
          {otherRecs.map(rec => (
            <Card key={rec.type}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 shrink-0 mt-0.5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium text-sm">{rec.titleTh}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PRIORITY_CONFIG[rec.priority].className}`}>
                        {PRIORITY_CONFIG[rec.priority].label}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{rec.reason}</p>
                    {rec.suggestedAmount && (
                      <p className="text-xs text-emerald-700 mt-1 font-medium">💡 {rec.suggestedAmount}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {recommendations.length === 0 && (
            <Card className="border-emerald-200 bg-emerald-50/50">
              <CardContent className="pt-4 pb-4 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <p className="text-sm text-emerald-700">ยอดเยี่ยม! ความคุ้มครองของคุณครบถ้วนดีแล้ว</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Coverage details card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">ความคุ้มครองที่มีอยู่</CardTitle>
          <CardDescription>ระบุรายละเอียดเพื่อให้ระบบวิเคราะห์ช่องว่างได้ถูกต้อง</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Checkboxes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {([
              { key: "hasAccidentInsurance" as const, label: "ประกันอุบัติเหตุ (PA)" },
              { key: "hasCriticalIllness"   as const, label: "ประกันโรคร้ายแรง" },
              { key: "hasDisabilityInsurance" as const, label: "ประกันทุพพลภาพ" },
            ]).map(({ key, label }) => (
              <label key={key} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                coverage[key] ? "bg-emerald-50 border-emerald-300" : "hover:bg-muted/40"
              }`}>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-emerald-600"
                  checked={coverage[key]}
                  onChange={e => { setSaved(false); setCoverage(prev => ({ ...prev, [key]: e.target.checked })); }}
                />
                <span className="text-sm font-medium">{label}</span>
                {coverage[key] && <CheckCircle2 className="h-4 w-4 text-emerald-600 ml-auto" />}
              </label>
            ))}
          </div>
          {/* Coverage amounts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>ทุนประกันชีวิต (บาท)</Label>
              <Input
                type="number" min={0}
                value={coverage.lifeCoverageAmount || ""}
                onChange={e => { setSaved(false); setCoverage(p => ({ ...p, lifeCoverageAmount: Number(e.target.value) || 0 })); }}
                placeholder="เช่น 3,000,000"
              />
              <p className="text-xs text-muted-foreground">แนะนำ: 10 เท่าของรายได้ต่อปี</p>
            </div>
            <div className="space-y-1">
              <Label>วงเงินประกันสุขภาพต่อปี (บาท)</Label>
              <Input
                type="number" min={0}
                value={coverage.healthCoveragePerYear || ""}
                onChange={e => { setSaved(false); setCoverage(p => ({ ...p, healthCoveragePerYear: Number(e.target.value) || 0 })); }}
                placeholder="เช่น 500,000"
              />
              <p className="text-xs text-muted-foreground">วงเงินคุ้มครองค่ารักษาพยาบาลรวมต่อปี</p>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} size="sm">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />กำลังบันทึก…</> : "บันทึกข้อมูลความคุ้มครอง"}
            </Button>
            {saved && <span className="ml-3 text-sm text-emerald-600 self-center">✓ บันทึกแล้ว</span>}
          </div>
        </CardContent>
      </Card>

      {/* Premium entry form (collapsible) */}
      <Card>
        <CardHeader className="pb-3 cursor-pointer" onClick={() => setShowEntryForm(v => !v)}>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">เบี้ยประกันที่จ่ายในปีนี้</CardTitle>
              <CardDescription>บันทึกเพื่อใช้หักลดหย่อนภาษีและวิเคราะห์ความคุ้มครอง</CardDescription>
            </div>
            {showEntryForm ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </CardHeader>
        {showEntryForm && (
          <CardContent className="space-y-5">
            {FIELDS.map(f => (
              <div key={f.id} className="space-y-1">
                <div className="flex items-center gap-1">
                  <Label>{f.label}</Label>
                  <span className="text-xs text-muted-foreground">({f.sublabel})</span>
                  {f.maxDeduct && (
                    <Badge variant="secondary" className="text-xs ml-auto">{`สูงสุด ${f.maxDeduct.toLocaleString()} บาท`}</Badge>
                  )}
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    value={values[f.id] || ""}
                    onChange={e => update(f.id, e.target.value)}
                    placeholder="0"
                  />
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  {f.tip}
                </p>
              </div>
            ))}

            <div className="pt-3 border-t flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">รวมเบี้ยประกันทั้งหมด</p>
                <p className="text-xl font-bold text-emerald-600">
                  {total.toLocaleString("th-TH", { style: "currency", currency: "THB" })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {saved && <span className="text-sm text-emerald-600">✓ บันทึกแล้ว</span>}
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />กำลังบันทึก…</> : "บันทึก"}
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <Card className="bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800">
        <CardContent className="pt-4 pb-4 text-sm text-amber-800 dark:text-amber-200 space-y-1">
          <p className="font-semibold">⚠️ หมายเหตุสำคัญ</p>
          <ul className="list-disc list-inside space-y-1 text-amber-700 dark:text-amber-300">
            <li>เบี้ยประกันชีวิตและสุขภาพ (ตนเอง) รวมกันสูงสุดไม่เกิน 100,000 บาท</li>
            <li>ประกันบำนาญ + RMF + SSF + กองทุนสำรองเลี้ยงชีพ รวมกันสูงสุดไม่เกิน 500,000 บาท</li>
            <li>ต้องได้รับใบรับรองจากบริษัทประกันที่ได้รับอนุญาตจาก คปภ.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
