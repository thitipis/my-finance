"use client";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Brain, CheckCircle2, RefreshCw, ChevronLeft, ChevronRight,
  ShoppingBag, PiggyBank, TrendingUp, Scale,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ─── Questions ────────────────────────────────────────────────────────────────

const questions = [
  {
    id: "spending_trigger",
    category: "พฤติกรรมการใช้จ่าย",
    question: "เมื่อคุณรู้สึกเครียดหรือเหนื่อย คุณมักจะ...",
    options: [
      { label: "ซื้อของเพื่อให้รู้สึกดีขึ้น", type: "spender" },
      { label: "ออมเพิ่มเพื่อความมั่นคง", type: "saver" },
      { label: "ลงทุนเพิ่มเพื่อสร้างผลตอบแทน", type: "investor" },
      { label: "วิเคราะห์สาเหตุและวางแผนแก้ไข", type: "planner" },
    ],
  },
  {
    id: "windfall",
    category: "พฤติกรรมการใช้จ่าย",
    question: "ถ้าคุณได้รับเงินคืนภาษีหรือโบนัสพิเศษ ฿50,000 คุณจะทำอย่างไร?",
    options: [
      { label: "ซื้อของที่อยากได้มานาน / ท่องเที่ยว", type: "spender" },
      { label: "เก็บเข้ากองทุนฉุกเฉินทันที", type: "saver" },
      { label: "ลงทุนในหุ้นหรือกองทุน", type: "investor" },
      { label: "แบ่งสัดส่วนตามแผนที่วางไว้", type: "planner" },
    ],
  },
  {
    id: "money_view",
    category: "ทัศนคติต่อเงิน",
    question: "สำหรับคุณ เงินหมายถึง...",
    options: [
      { label: "เสรีภาพ — ซื้อสิ่งที่ต้องการได้", type: "spender" },
      { label: "ความปลอดภัย — ป้องกันความไม่แน่นอน", type: "saver" },
      { label: "เครื่องมือ — สร้างความมั่งคั่งระยะยาว", type: "investor" },
      { label: "พลังงาน — ขับเคลื่อนเป้าหมายชีวิต", type: "planner" },
    ],
  },
  {
    id: "budget_habit",
    category: "ทัศนคติต่อเงิน",
    question: "คุณมักจะทำอะไรกับงบประมาณรายเดือน?",
    options: [
      { label: "ไม่ได้วางงบ ใช้ตามที่รู้สึก", type: "spender" },
      { label: "วางงบแต่เน้นประหยัดสูงสุด", type: "saver" },
      { label: "วางงบเพื่อให้เหลือลงทุนให้มากที่สุด", type: "investor" },
      { label: "วางงบละเอียดทุกหมวดและติดตามจริง", type: "planner" },
    ],
  },
  {
    id: "regret_pattern",
    category: "รูปแบบความรู้สึก",
    question: "คุณมักเสียใจเรื่องเงินเพราะอะไรมากที่สุด?",
    options: [
      { label: "ซื้อของโดยไม่จำเป็น / ใช้จ่ายเกิน", type: "spender" },
      { label: "ออมมากเกินจนขาดความสุขในปัจจุบัน", type: "saver" },
      { label: "ไม่ได้ลงทุนเร็วพอ / เลือกสินทรัพย์ผิด", type: "investor" },
      { label: "ไม่ได้วางแผนให้รัดกุมพอ", type: "planner" },
    ],
  },
  {
    id: "social_money",
    category: "รูปแบบความรู้สึก",
    question: "เมื่อเพื่อนซื้อของหรือลงทุนแล้วได้ผลดี คุณรู้สึกอย่างไร?",
    options: [
      { label: "อยากซื้อ/ทำตามบ้าง", type: "spender" },
      { label: "ดีใจให้เพื่อน แต่ยังไม่อยากเสี่ยง", type: "saver" },
      { label: "ศึกษาเพื่อลงทุนแบบเดียวกัน", type: "investor" },
      { label: "วิเคราะห์ว่าเหมาะกับแผนตัวเองไหม", type: "planner" },
    ],
  },
  {
    id: "decision_speed",
    category: "สไตล์การตัดสินใจ",
    question: "เมื่อต้องตัดสินใจซื้อสินค้าราคาแพง คุณ...",
    options: [
      { label: "ซื้อทันทีถ้าอยากได้", type: "spender" },
      { label: "รอจนมีเงินเดือนหน้าและยังอยากได้", type: "saver" },
      { label: "คิดว่าเงินนี้ลงทุนแทนได้เท่าไหร่", type: "investor" },
      { label: "เปรียบราคา ดูรีวิว แล้วค่อยตัดสินใจ", type: "planner" },
    ],
  },
  {
    id: "information_seek",
    category: "สไตล์การตัดสินใจ",
    question: "คุณได้รับข้อมูลเรื่องเงิน/การลงทุนจากที่ไหนมากที่สุด?",
    options: [
      { label: "โซเชียลมีเดีย / อินฟลูเอนเซอร์", type: "spender" },
      { label: "ธนาคาร / สถาบันที่น่าเชื่อถือ", type: "saver" },
      { label: "กลุ่มนักลงทุน / พอดแคสต์ / หนังสือการเงิน", type: "investor" },
      { label: "วิเคราะห์ข้อมูลหลายแหล่งด้วยตัวเอง", type: "planner" },
    ],
  },
  {
    id: "future_priority",
    category: "มุมมองต่ออนาคต",
    question: "คุณให้ความสำคัญกับอะไรมากกว่า?",
    options: [
      { label: "ความสุขและประสบการณ์ในปัจจุบัน", type: "spender" },
      { label: "ความมั่นคงและปลอดภัยในอนาคต", type: "saver" },
      { label: "การเติบโตของความมั่งคั่งระยะยาว", type: "investor" },
      { label: "สมดุลระหว่างปัจจุบันและอนาคตตามแผน", type: "planner" },
    ],
  },
  {
    id: "financial_stress",
    category: "มุมมองต่ออนาคต",
    question: "สิ่งที่ทำให้คุณเครียดเรื่องเงินมากที่สุดคือ?",
    options: [
      { label: "เงินหมดก่อนสิ้นเดือน / เกินงบ", type: "spender" },
      { label: "เงินออมไม่พอสำหรับเหตุฉุกเฉิน", type: "saver" },
      { label: "พอร์ตลงทุนไม่เติบโตเพียงพอ", type: "investor" },
      { label: "ไม่มีแผนระยะยาวที่ชัดเจน", type: "planner" },
    ],
  },
  {
    id: "giving_style",
    category: "ค่านิยม",
    question: "เมื่อต้องบริจาคหรือช่วยเหลือคนอื่น คุณมักจะ...",
    options: [
      { label: "ให้ทันทีตามความรู้สึก ไม่ได้วางแผน", type: "spender" },
      { label: "ให้แต่พอดี ยังต้องเก็บเผื่อตัวเองก่อน", type: "saver" },
      { label: "ลงทุนในสิ่งที่สร้างคุณค่าระยะยาวแทน", type: "investor" },
      { label: "มีงบประมาณการบริจาคที่วางแผนล่วงหน้า", type: "planner" },
    ],
  },
  {
    id: "tracking",
    category: "ค่านิยม",
    question: "คุณติดตามรายรับ-รายจ่ายของตัวเองอย่างไร?",
    options: [
      { label: "ไม่ได้ติดตาม รู้สึกเอาเอง", type: "spender" },
      { label: "ดูยอดบัญชีแต่ไม่ได้บันทึกละเอียด", type: "saver" },
      { label: "ดู statement เพื่อวิเคราะห์โอกาสลงทุน", type: "investor" },
      { label: "บันทึกทุกรายการในแอปหรือสเปรดชีต", type: "planner" },
    ],
  },
];

type PersonalityType = "spender" | "saver" | "investor" | "planner";

const personalityInfo: Record<PersonalityType, {
  label: string; labelTh: string; icon: React.ElementType; color: string; bg: string;
  desc: string; strength: string; weakness: string; advice: string[];
}> = {
  spender: {
    label: "The Spender", labelTh: "นักใช้จ่าย",
    icon: ShoppingBag, color: "text-red-600", bg: "bg-red-50 border-red-200",
    desc: "คุณให้ความสำคัญกับความสุขและประสบการณ์ในปัจจุบัน ตัดสินใจตามความรู้สึกและโอกาส",
    strength: "ใช้ชีวิตเต็มที่ ไม่ยึดติด ปรับตัวเร็ว มีประสบการณ์ชีวิตที่หลากหลาย",
    weakness: "มีแนวโน้มใช้จ่ายเกินรายได้ เงินออมน้อย เป้าหมายระยะยาวไม่ชัด",
    advice: [
      "ตั้งระบบออมอัตโนมัติ ก่อนที่จะใช้",
      "กำหนด 'งบความสุข' ที่ชัดเจนต่อเดือน",
      "ใช้กฎ 24 ชั่วโมง ก่อนซื้อของที่ไม่ได้วางแผน",
      "เริ่มลงทุนแอป/กองทุนที่ล็อกเงินไว้ได้",
    ],
  },
  saver: {
    label: "The Saver", labelTh: "นักออม",
    icon: PiggyBank, color: "text-blue-600", bg: "bg-blue-50 border-blue-200",
    desc: "คุณให้ความสำคัญกับความมั่นคงและความปลอดภัย เก็บออมอย่างสม่ำเสมอ แต่บางครั้งอาจประหยัดจนเกินไป",
    strength: "มีวินัยทางการเงินสูง เงินสำรองฉุกเฉินพร้อม ไม่ก่อหนี้โดยไม่จำเป็น",
    weakness: "ผลตอบแทนต่ำเพราะเงินนอนอยู่เฉยๆ อาจขาดความสุขในปัจจุบัน",
    advice: [
      "นำเงินออมส่วนหนึ่งไปลงทุน ไม่ใช่แค่ฝากธนาคาร",
      "กำหนด 'งบความสุข' เพื่อให้ตัวเองได้ใช้ชีวิตด้วย",
      "เรียนรู้เรื่องการลงทุนเพิ่มเติม เช่น กองทุนดัชนี ETF",
      "ตั้งเป้าผลตอบแทนขั้นต่ำสำหรับเงินที่ออมไว้",
    ],
  },
  investor: {
    label: "The Investor", labelTh: "นักลงทุน",
    icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200",
    desc: "คุณมองเงินเป็นเครื่องมือสร้างความมั่งคั่ง มีความสนใจในการลงทุนและผลตอบแทนระยะยาว",
    strength: "เข้าใจพลังของ Compound Interest มองระยะยาว ไม่กลัวความผันผวน",
    weakness: "อาจละเลยการจัดการเงินในชีวิตประจำวัน บางครั้งรับความเสี่ยงมากเกินไป",
    advice: [
      "กระจายพอร์ตให้เหมาะกับระดับความเสี่ยงที่ประเมิน",
      "อย่าลืมกองทุนฉุกเฉินก่อนลงทุนเพิ่ม",
      "ตรวจสอบและ rebalance พอร์ตทุกปี",
      "ใช้สิทธิ์ลดหย่อนภาษี (RMF/SSF) ให้เต็มที่",
    ],
  },
  planner: {
    label: "The Planner", labelTh: "นักวางแผน",
    icon: Scale, color: "text-purple-600", bg: "bg-purple-50 border-purple-200",
    desc: "คุณมีวินัยสูง ชอบวางแผนและวิเคราะห์ข้อมูล สามารถสมดุลระหว่างปัจจุบันและอนาคตได้ดี",
    strength: "จัดการเงินได้เป็นระบบ มีเป้าหมายชัดเจน ตัดสินใจอย่างมีเหตุผล",
    weakness: "อาจใช้เวลามากเกินไปกับการวิเคราะห์ (Analysis Paralysis) ยืดหยุ่นน้อย",
    advice: [
      "วางแผนให้มีความยืดหยุ่น ชีวิตเปลี่ยนแปลงได้",
      "ทบทวนแผนทุกไตรมาส ไม่ใช่แค่ปีละครั้ง",
      "อย่าลืมวางแผน 'มีความสุข' ในปัจจุบันด้วย",
      "ใช้เทคโนโลยีช่วย automate สิ่งที่วางแผนไว้",
    ],
  },
};

function countTypes(answers: Record<string, PersonalityType>): Record<PersonalityType, number> {
  const counts: Record<PersonalityType, number> = { spender: 0, saver: 0, investor: 0, planner: 0 };
  Object.values(answers).forEach(t => { counts[t]++; });
  return counts;
}

function getDominantType(answers: Record<string, PersonalityType>): PersonalityType {
  const counts = countTypes(answers);
  return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]) as PersonalityType;
}

export default function PersonalityAssessmentPage() {
  const [answers, setAnswers] = useState<Record<string, PersonalityType>>({});
  const [result, setResult] = useState<PersonalityType | null>(null);

  const totalQ = questions.length;
  const answered = Object.keys(answers).length;
  const progress = (answered / totalQ) * 100;
  const allDone = answered === totalQ;

  function handleSubmit() {
    if (!allDone) return;
    const dominant = getDominantType(answers);
    setResult(dominant);
    localStorage.setItem("assessment_personality_done", "1");
  }

  const info = result ? personalityInfo[result] : null;
  const typeCounts = result ? countTypes(answers) : null;

  const categories = [...new Set(questions.map(q => q.category))];

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/assessment" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mb-2">
            <ChevronLeft className="h-3 w-3" /> กลับ Self Assessment
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-purple-600" />บุคลิกภาพทางการเงิน
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Financial Personality — {totalQ} คำถาม · วิเคราะห์พฤติกรรมและทัศนคติต่อเงิน
          </p>
        </div>
        {result && (
          <Button variant="outline" size="sm" onClick={() => { setAnswers({}); setResult(null); }}>
            <RefreshCw className="h-3 w-3 mr-1" />ทำใหม่
          </Button>
        )}
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-4 pb-3 space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{answered}/{totalQ} คำถาม</span>
            <span>{progress.toFixed(0)}% สมบูรณ์</span>
          </div>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      {/* Result */}
      {result && info && typeCounts && (() => {
        const Icon = info.icon;
        return (
          <Card className={cn("border-2", info.bg)}>
            <CardContent className="pt-5 pb-4 space-y-4">
              <div className="flex items-start gap-3">
                <Icon className={cn("h-8 w-8 mt-0.5 shrink-0", info.color)} />
                <div>
                  <p className="font-bold text-lg">
                    คุณคือ <span className={info.color}>{info.labelTh}</span>
                    <span className="text-sm font-normal text-muted-foreground ml-2">({info.label})</span>
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">{info.desc}</p>
                </div>
              </div>

              {/* Type distribution bar */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">การกระจายบุคลิกภาพ</p>
                <div className="space-y-1.5">
                  {(Object.entries(typeCounts) as [PersonalityType, number][]).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
                    const pi = personalityInfo[type];
                    const PIcon = pi.icon;
                    return (
                      <div key={type} className="flex items-center gap-2">
                        <PIcon className={cn("h-3.5 w-3.5 shrink-0", pi.color)} />
                        <span className="text-xs w-24 text-muted-foreground">{pi.labelTh}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full", type === result ? "bg-primary" : "bg-muted-foreground/30")}
                            style={{ width: `${(count / totalQ) * 100}%` }} />
                        </div>
                        <span className="text-xs font-medium w-6 text-right tabular-nums">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="bg-background/60 rounded-lg p-3">
                  <p className="text-xs font-semibold text-emerald-600 mb-1">✅ จุดแข็ง</p>
                  <p className="text-xs text-muted-foreground">{info.strength}</p>
                </div>
                <div className="bg-background/60 rounded-lg p-3">
                  <p className="text-xs font-semibold text-amber-600 mb-1">⚠️ จุดที่ต้องระวัง</p>
                  <p className="text-xs text-muted-foreground">{info.weakness}</p>
                </div>
              </div>

              <div className="bg-background/60 rounded-lg p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2">💡 คำแนะนำสำหรับคุณ</p>
                <ul className="space-y-1">
                  {info.advice.map(a => (
                    <li key={a} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />{a}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center justify-end pt-1 border-t">
                <Link href="/assessment">
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <ChevronLeft className="h-3.5 w-3.5" />กลับ Assessment
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Questions grouped by category */}
      {!result && (
        <div className="space-y-6">
          {categories.map(cat => (
            <div key={cat}>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">{cat}</p>
              <div className="space-y-3">
                {questions.filter(q => q.category === cat).map((q, i) => {
                  const globalIdx = questions.findIndex(x => x.id === q.id) + 1;
                  return (
                    <Card key={q.id} className={cn(answers[q.id] ? "border-primary/40" : "")}>
                      <CardContent className="pt-4 pb-4">
                        <p className="text-sm font-medium mb-3">{globalIdx}. {q.question}</p>
                        <div className="grid gap-2">
                          {q.options.map(opt => (
                            <button
                              key={opt.label}
                              onClick={() => setAnswers(a => ({ ...a, [q.id]: opt.type as PersonalityType }))}
                              className={cn(
                                "text-left px-3 py-2.5 rounded-md border text-sm transition-all",
                                answers[q.id] === opt.type
                                  ? "border-primary bg-primary/10 text-primary font-medium"
                                  : "border-muted hover:border-primary/40 hover:bg-muted/50"
                              )}
                            >
                              {answers[q.id] === opt.type
                                ? <CheckCircle2 className="h-3.5 w-3.5 inline mr-1.5 text-primary" />
                                : <span className="inline-block w-5" />}
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}

          <Button onClick={handleSubmit} disabled={!allDone} className="w-full">
            {allDone ? "ดูผลการประเมิน →" : `ตอบอีก ${totalQ - answered} คำถาม`}
          </Button>
        </div>
      )}
    </div>
  );
}
