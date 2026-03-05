"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ClipboardList, CheckCircle2, RefreshCw, Loader2, ChevronLeft, ChevronRight,
  ShieldAlert, Shield, TrendingUp, MapPin,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ─── Questions ────────────────────────────────────────────────────────────────

const riskQuestions = [
  { id: "experience", part: 1, question: "คุณมีประสบการณ์ลงทุนมากี่ปี?", options: [{ label: "ไม่มีประสบการณ์", score: 0 }, { label: "น้อยกว่า 1 ปี", score: 1 }, { label: "1–3 ปี", score: 3 }, { label: "3–5 ปี", score: 5 }, { label: "มากกว่า 5 ปี", score: 7 }] },
  { id: "horizon", part: 1, question: "คุณวางแผนลงทุนระยะใด?", options: [{ label: "น้อยกว่า 1 ปี", score: 0 }, { label: "1–3 ปี", score: 2 }, { label: "3–5 ปี", score: 4 }, { label: "5–10 ปี", score: 6 }, { label: "มากกว่า 10 ปี", score: 8 }] },
  { id: "loss_reaction", part: 1, question: "ถ้าพอร์ตลงทุนของคุณลดลง 20% ใน 1 เดือน คุณจะทำอย่างไร?", options: [{ label: "ขายทันทีเพื่อลดความเสี่ยง", score: 0 }, { label: "ขายบางส่วนเพื่อรักษาเงินต้น", score: 2 }, { label: "ถือต่อ รอให้ราคาฟื้น", score: 4 }, { label: "ซื้อเพิ่ม เพราะราคาถูกลง", score: 6 }] },
  { id: "income_stability", part: 1, question: "รายได้ของคุณมีความมั่นคงเพียงใด?", options: [{ label: "ไม่แน่นอน / สัญญาระยะสั้น", score: 0 }, { label: "ค่อนข้างแน่นอน", score: 2 }, { label: "มั่นคง (ข้าราชการ / บริษัทใหญ่)", score: 4 }, { label: "มีรายได้หลายแหล่ง", score: 6 }] },
  { id: "goal", part: 1, question: "เป้าหมายหลักของการลงทุนของคุณคืออะไร?", options: [{ label: "รักษาเงินต้น ไม่ยอมขาดทุนเลย", score: 0 }, { label: "ผลตอบแทนเล็กน้อย รับความเสี่ยงต่ำ", score: 2 }, { label: "ผลตอบแทนปานกลาง รับความผันผวนได้บ้าง", score: 4 }, { label: "ผลตอบแทนสูงสุด ยอมรับความผันผวนได้มาก", score: 6 }] },
  { id: "asset_pref", part: 1, question: "คุณชอบลงทุนในสินทรัพย์ประเภทใด?", options: [{ label: "เงินฝาก / ตราสารหนี้ล้วน", score: 0 }, { label: "กองทุนผสม (หุ้น + ตราสารหนี้)", score: 2 }, { label: "กองทุนหุ้นในประเทศ", score: 4 }, { label: "หุ้นทั้งในและต่างประเทศ / สินทรัพย์ทางเลือก", score: 6 }] },
  { id: "current_portfolio", part: 1, question: "ปัจจุบันคุณถือสินทรัพย์ประเภทใดบ้าง?", options: [{ label: "เงินฝากธนาคาร / พันธบัตรล้วน", score: 0 }, { label: "มีกองทุนรวมบ้าง", score: 2 }, { label: "มีหุ้นรายตัวหรือกองทุนหุ้น", score: 4 }, { label: "มีทั้งหุ้น กองทุน และสินทรัพย์ทางเลือก (ทอง / REITs / คริปโต)", score: 6 }] },
  { id: "emergency_fund", part: 2, question: "เงินสำรองฉุกเฉินของคุณครอบคลุมค่าใช้จ่ายได้กี่เดือน?", options: [{ label: "น้อยกว่า 3 เดือน", score: 0 }, { label: "3–6 เดือน", score: 2 }, { label: "6–12 เดือน", score: 3 }, { label: "มากกว่า 12 เดือน", score: 4 }] },
  { id: "debt_ratio", part: 2, question: "ภาระผ่อนชำระหนี้คิดเป็นกี่เปอร์เซ็นต์ของรายได้ต่อเดือน?", options: [{ label: "มากกว่า 50%", score: 0 }, { label: "30–50%", score: 1 }, { label: "น้อยกว่า 30%", score: 3 }, { label: "ไม่มีหนี้", score: 4 }] },
  { id: "insurance_coverage", part: 2, question: "คุณมีประกันชีวิตและประกันสุขภาพที่เพียงพอหรือไม่?", options: [{ label: "ไม่มีประกันใดเลย", score: 0 }, { label: "มีบางส่วน แต่ไม่เพียงพอ", score: 1 }, { label: "มีประกันที่ครอบคลุมพอสมควร", score: 3 }, { label: "มีประกันครบถ้วน (ชีวิต+สุขภาพ+อุบัติเหตุ)", score: 4 }] },
  { id: "next_goal_timing", part: 2, question: "เป้าหมายการเงินสำคัญถัดไปของคุณต้องการเงินเมื่อใด?", options: [{ label: "ภายใน 1 ปี", score: 0 }, { label: "1–3 ปี", score: 1 }, { label: "3–5 ปี", score: 3 }, { label: "5 ปีขึ้นไป", score: 4 }] },
];

const MAX_SCORE = riskQuestions.reduce((s, q) => s + Math.max(...q.options.map(o => o.score)), 0);

function calcRiskLevel(score: number): "conservative" | "moderate" | "aggressive" {
  const pct = (score / MAX_SCORE) * 100;
  if (pct <= 35) return "conservative";
  if (pct <= 65) return "moderate";
  return "aggressive";
}

const riskInfo = {
  conservative: {
    label: "ระมัดระวัง", Icon: ShieldAlert,
    color: "text-blue-600", bg: "bg-blue-50 border-blue-200 dark:bg-blue-950/20",
    desc: "เน้นรักษาเงินต้น ผลตอบแทนมั่นคง รับความผันผวนได้น้อย",
    portfolio: "เงินฝาก 60% | ตราสารหนี้ 30% | หุ้น 10%",
    products: ["เงินฝากประจำ", "พันธบัตรรัฐบาล", "กองทุนตราสารหนี้", "RMF ตราสารหนี้"],
  },
  moderate: {
    label: "ปานกลาง", Icon: Shield,
    color: "text-amber-600", bg: "bg-amber-50 border-amber-200 dark:bg-amber-950/20",
    desc: "สมดุลระหว่างการเจริญเติบโตและความปลอดภัย รับความผันผวนได้ปานกลาง",
    portfolio: "หุ้น 50% | ตราสารหนี้ 35% | สินทรัพย์ทางเลือก 15%",
    products: ["กองทุนผสม", "SSF/RMF กองทุนหุ้น", "Thai ESG", "กองทุน REITs"],
  },
  aggressive: {
    label: "เชิงรุก", Icon: TrendingUp,
    color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20",
    desc: "เน้นผลตอบแทนสูงสุด ยอมรับความผันผวนได้มาก และมีระยะเวลาลงทุนยาว",
    portfolio: "หุ้น 80% | สินทรัพย์ทางเลือก 15% | ตราสารหนี้ 5%",
    products: ["กองทุนหุ้นไทย/ต่างประเทศ", "SSF/RMF หุ้น", "Thai ESG", "ทอง / REITs"],
  },
};

export default function RiskAssessmentPage() {
  const [answers, setAnswers]     = useState<Record<string, string>>({});
  const [riskPart, setRiskPart]   = useState<1 | 2>(1);
  const [result, setResult]       = useState<{ score: number; level: "conservative" | "moderate" | "aggressive" } | null>(null);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    fetch("/api/user/risk-assessment").then(r => r.json()).then(res => {
      if (res.data?.answers) {
        const a: Record<string, string> = {};
        (res.data.answers as Array<{ questionId: string; answer: string }>).forEach(x => { a[x.questionId] = x.answer; });
        setAnswers(a);
        setResult({ score: res.data.score, level: res.data.riskLevel });
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const part1Qs = riskQuestions.filter(q => q.part === 1);
  const part2Qs = riskQuestions.filter(q => q.part === 2);
  const currentPartQs = riskPart === 1 ? part1Qs : part2Qs;
  const part1Done = part1Qs.every(q => answers[q.id]);
  const allDone = riskQuestions.every(q => answers[q.id]);
  const progress = (Object.keys(answers).length / riskQuestions.length) * 100;

  async function handleSave() {
    if (!allDone) return;
    const answerArr = riskQuestions.map(q => {
      const opt = q.options.find(o => o.label === answers[q.id]);
      return { questionId: q.id, answer: answers[q.id], score: opt?.score ?? 0 };
    });
    const totalScore = answerArr.reduce((s, a) => s + a.score, 0);
    const level = calcRiskLevel(totalScore);
    setSaving(true);
    try {
      await fetch("/api/user/risk-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answerArr, score: totalScore, riskLevel: level }),
      });
      setResult({ score: totalScore, level });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return (
    <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  );

  const info = result ? riskInfo[result.level] : null;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />ประเมินความเสี่ยงการลงทุน
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            แบบประเมินมาตรฐาน กลต. + บริบทการเงินส่วนตัว — {riskQuestions.length} คำถาม
          </p>
        </div>
        {result && (
          <Button variant="outline" size="sm" onClick={() => { setAnswers({}); setResult(null); setRiskPart(1); }}>
            <RefreshCw className="h-3 w-3 mr-1" />ทำใหม่
          </Button>
        )}
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-4 pb-3 space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{Object.keys(answers).length}/{riskQuestions.length} คำถาม</span>
            <span>ส่วนที่ {riskPart}/2 — {riskPart === 1 ? "มาตรฐาน กลต. (7 ข้อ)" : "บริบทการเงิน (4 ข้อ)"}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      {/* Result card */}
      {result && info && (
        <Card className={cn("border-2", info.bg)}>
          <CardContent className="pt-5 pb-4 space-y-4">
            <div className="flex items-start gap-3">
              <info.Icon className={cn("h-8 w-8 mt-0.5 shrink-0", info.color)} />
              <div>
                <p className="font-bold text-lg">
                  ระดับความเสี่ยง: <span className={info.color}>{info.label}</span>
                  <span className="text-sm font-normal text-muted-foreground ml-2">({result.score}/{MAX_SCORE} คะแนน)</span>
                </p>
                <p className="text-sm text-muted-foreground">{info.desc}</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 pt-1">
              <div className="bg-background/60 rounded-lg p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">พอร์ตที่แนะนำ</p>
                <p className="text-sm font-medium">{info.portfolio}</p>
              </div>
              <div className="bg-background/60 rounded-lg p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">ผลิตภัณฑ์ที่เหมาะสม</p>
                <ul className="text-sm space-y-0.5">
                  {info.products.map(p => <li key={p} className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />{p}</li>)}
                </ul>
              </div>
            </div>
            {/* CTA to Financial Plan */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t">
              <p className="text-xs text-muted-foreground">ผลประเมินนี้ถูกนำไปใช้ใน Financial Plan แล้ว</p>
              <Link href="/financial-plan">
                <Button size="sm" variant="outline" className="shrink-0 gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  ปรับแผนการเงิน →
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Questions */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {riskPart === 1 ? "ส่วนที่ 1 — แบบประเมินมาตรฐาน กลต." : "ส่วนที่ 2 — บริบทการเงินส่วนตัว"}
        </p>
        {currentPartQs.map((q, i) => (
          <Card key={q.id} className={cn(answers[q.id] ? "border-primary/40" : "")}>
            <CardContent className="pt-4 pb-4">
              <p className="text-sm font-medium mb-3">{(riskPart === 1 ? i + 1 : i + 8)}. {q.question}</p>
              <div className="grid gap-2">
                {q.options.map(opt => (
                  <button
                    key={opt.label}
                    onClick={() => setAnswers(a => ({ ...a, [q.id]: opt.label }))}
                    className={cn(
                      "text-left px-3 py-2.5 rounded-md border text-sm transition-all",
                      answers[q.id] === opt.label
                        ? "border-primary bg-primary/10 text-primary font-medium shadow-sm"
                        : "border-border hover:border-primary/40 hover:bg-accent"
                    )}
                  >
                    {answers[q.id] === opt.label && <CheckCircle2 className="inline h-3.5 w-3.5 mr-1.5 mb-0.5" />}
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
        {riskPart === 2
          ? <Button variant="outline" onClick={() => setRiskPart(1)}><ChevronLeft className="h-4 w-4 mr-1" />ส่วนที่ 1</Button>
          : <div />
        }
        {riskPart === 1
          ? <Button onClick={() => setRiskPart(2)} disabled={!part1Done}>ถัดไป — ส่วนที่ 2<ChevronRight className="h-4 w-4 ml-1" /></Button>
          : <Button onClick={handleSave} disabled={!allDone || saving} className="min-w-36">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              {saving ? "กำลังบันทึก..." : "บันทึกผลประเมิน"}
            </Button>
        }
      </div>
    </div>
  );
}
