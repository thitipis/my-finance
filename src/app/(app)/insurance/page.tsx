"use client";
import { useState, useEffect } from "react";
import { ShieldCheck, Info, Loader2 } from "lucide-react";
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

const FIELDS: InsuranceField[] = [
  { id: "lifeInsurancePremium",         label: "ประกันชีวิตทั่วไป",           sublabel: "Life Insurance",               maxDeduct: 100000, tip: "หักได้สูงสุด 100,000 บาท" },
  { id: "healthInsurancePremium",       label: "ประกันสุขภาพ (ตนเอง)",        sublabel: "Health Insurance",             maxDeduct: 25000,  tip: "หักได้สูงสุด 25,000 บาท (รวมกับประกันชีวิตไม่เกิน 100,000 บาท)" },
  { id: "parentHealthInsurancePremium", label: "ประกันสุขภาพ (บิดามารดา)",    sublabel: "Parent Health Insurance",      maxDeduct: 15000,  tip: "หักได้สูงสุด 15,000 บาท" },
  { id: "annuityInsurancePremium",      label: "ประกันชีวิตแบบบำนาญ",         sublabel: "Annuity Insurance",            maxDeduct: null,   tip: "หักได้ 15% ของเงินได้ สูงสุด 200,000 บาท (รวมกลุ่ม SSF/RMF)" },
  { id: "spouseLifeInsurancePremium",   label: "ประกันชีวิตคู่สมรส (ไม่มีรายได้)", sublabel: "Spouse Life Insurance",   maxDeduct: 10000,  tip: "หักได้สูงสุด 10,000 บาท (คู่สมรสไม่มีรายได้)" },
];

export default function InsurancePage() {
  const [values, setValues] = useState<InsuranceState>({
    lifeInsurancePremium: 0,
    healthInsurancePremium: 0,
    parentHealthInsurancePremium: 0,
    annuityInsurancePremium: 0,
    spouseLifeInsurancePremium: 0,
  });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/insurance")
      .then(r => r.json())
      .then(d => {
        if (d.data) {
          setValues({
            lifeInsurancePremium: Number(d.data.lifeInsurancePremium ?? 0),
            healthInsurancePremium: Number(d.data.healthInsurancePremium ?? 0),
            parentHealthInsurancePremium: Number(d.data.parentHealthInsurancePremium ?? 0),
            annuityInsurancePremium: Number(d.data.annuityInsurancePremium ?? 0),
            spouseLifeInsurancePremium: Number(d.data.spouseLifeInsurancePremium ?? 0),
          });
        }
      })
      .finally(() => setLoading(false));
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
      body: JSON.stringify(values),
    });
    setSaving(false);
    setSaved(true);
  };

  const total = Object.values(values).reduce((a, b) => a + b, 0);

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
          ข้อมูลประกันภัย
        </h1>
        <p className="text-muted-foreground text-sm">บันทึกเบี้ยประกันเพื่อใช้หักลดหย่อนภาษีโดยอัตโนมัติ</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">เบี้ยประกันที่จ่ายในปีนี้</CardTitle>
          <CardDescription>กรอกยอดเบี้ยที่จ่ายจริง ระบบจะใช้ข้อมูลนี้ในการคำนวณภาษีโดยอัตโนมัติ</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {FIELDS.map(f => (
            <div key={f.id} className="space-y-1">
              <div className="flex items-center gap-1">
                <Label>{f.label}</Label>
                <span className="text-xs text-muted-foreground">({f.sublabel})</span>
                {f.maxDeduct && (
                  <Badge variant="secondary" className="text-xs ml-auto">{`ลดหย่อนได้สูงสุด ${f.maxDeduct.toLocaleString()} บาท`}</Badge>
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
