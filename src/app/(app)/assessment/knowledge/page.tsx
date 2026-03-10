"use client";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen, CheckCircle2, XCircle, RefreshCw, ChevronLeft, History,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface AssessmentSession {
  id: string;
  score: number;
  maxScore: number;
  result: Record<string, string>;
  takenAt: string;
}

// ─── Quiz questions ──────────────────────────────────────────────────────────

type Question = {
  id: string;
  category: string;
  question: string;
  options: string[];
  answer: number; // 0-indexed correct answer
  explanation: string;
};

const questions: Question[] = [
  // ── พื้นฐานการเงินส่วนบุคคล ─────────────────────────────────────────────
  {
    id: "compound",
    category: "พื้นฐานการเงินส่วนบุคคล",
    question: "Compound Interest (ดอกเบี้ยทบต้น) คืออะไร?",
    options: [
      "ดอกเบี้ยที่คำนวณจากเงินต้นเท่านั้น",
      "ดอกเบี้ยที่คำนวณจากเงินต้นและดอกเบี้ยสะสมที่ผ่านมา",
      "ดอกเบี้ยที่ธนาคารหักจากเงินฝาก",
      "ดอกเบี้ยที่เท่ากันทุกปีตลอดอายุการลงทุน",
    ],
    answer: 1,
    explanation:
      "ดอกเบี้ยทบต้นคำนวณจากเงินต้น + ดอกเบี้ยที่สะสมมาแล้ว ทำให้เงินเติบโตแบบ Exponential เมื่อเวลาผ่านไป",
  },
  {
    id: "emergency",
    category: "พื้นฐานการเงินส่วนบุคคล",
    question: "กองทุนฉุกเฉินที่เหมาะสมควรมีขนาดเท่าไหร่?",
    options: [
      "เงินเดือน 1–2 เดือน",
      "เงินเดือน 3–6 เดือน",
      "เงินเดือน 12 เดือน",
      "ขึ้นอยู่กับอายุ ไม่มีเกณฑ์มาตรฐาน",
    ],
    answer: 1,
    explanation:
      "มาตรฐานสากลแนะนำ 3–6 เดือน สำหรับรับมือกับเหตุฉุกเฉิน เช่น ตกงาน หรือค่าใช้จ่ายที่ไม่คาดคิด",
  },
  {
    id: "dti",
    category: "พื้นฐานการเงินส่วนบุคคล",
    question: "อัตรา DTI (Debt-to-Income) สูงสุดที่แนะนำสำหรับหนี้รวมต่อเดือนคือเท่าไหร่?",
    options: ["20%", "36%", "50%", "65%"],
    answer: 1,
    explanation:
      "กฎทั่วไปคือ DTI ไม่ควรเกิน 36% ของรายได้ต่อเดือน หากเกิน 50% ถือว่าอยู่ในเขตอันตราย",
  },
  {
    id: "inflation",
    category: "พื้นฐานการเงินส่วนบุคคล",
    question: "ถ้าเงินเฟ้อ 3% ต่อปี และเงินฝากออมทรัพย์ได้ดอกเบี้ย 1% ต่อปี ผลที่เกิดขึ้นจริงคือ?",
    options: [
      "ได้ดอกเบี้ย 1% จริงๆ ตามที่ธนาคารบอก",
      "กำลังซื้อเพิ่มขึ้น 2% ต่อปี",
      "กำลังซื้อลดลง 2% ต่อปี เพราะเงินเฟ้อสูงกว่าดอกเบี้ย",
      "เงินต้นลดลง 3% ต่อปี",
    ],
    answer: 2,
    explanation:
      "Real Return = ดอกเบี้ย − เงินเฟ้อ = 1% − 3% = −2% กำลังซื้อจริงลดลง 2% ต่อปีแม้เงินในบัญชีเพิ่มขึ้น",
  },
  // ── การลงทุน ──────────────────────────────────────────────────────────────
  {
    id: "diversification",
    category: "การลงทุน",
    question: "การกระจายความเสี่ยง (Diversification) ช่วยลดความเสี่ยงประเภทใดได้?",
    options: [
      "ความเสี่ยงจากตลาดรวม (Systematic Risk)",
      "ความเสี่ยงเฉพาะหลักทรัพย์ (Unsystematic Risk)",
      "ความเสี่ยงเงินเฟ้อ",
      "ความเสี่ยงทั้งหมด",
    ],
    answer: 1,
    explanation:
      "Diversification ลด Unsystematic Risk (ความเสี่ยงเฉพาะหุ้น/บริษัท) ได้ แต่ไม่ลด Systematic Risk (ตลาดทั้งหมดตก)",
  },
  {
    id: "rule72",
    category: "การลงทุน",
    question: "กฎ 72 (Rule of 72) ใช้ประมาณอะไร?",
    options: [
      "จำนวนปีที่เงินลดครึ่งหนึ่งจากเงินเฟ้อ",
      "ผลตอบแทนขั้นต่ำที่ควรได้จากการลงทุน",
      "จำนวนปีที่เงินจะเป็นสองเท่า โดยหาร 72 ด้วยอัตราผลตอบแทน",
      "อัตราส่วนการลงทุนต่อรายได้ที่เหมาะสม",
    ],
    answer: 2,
    explanation:
      "Rule of 72: ปีที่เงินสองเท่า ≈ 72 ÷ อัตราดอกเบี้ย เช่น ได้ผลตอบแทน 8% → เงินสองเท่าในประมาณ 9 ปี",
  },
  {
    id: "etf_vs_fund",
    category: "การลงทุน",
    question: "ข้อแตกต่างหลักระหว่าง ETF และกองทุนรวม (Mutual Fund) คือ?",
    options: [
      "ETF ให้ผลตอบแทนสูงกว่าเสมอ",
      "ETF ซื้อขายในตลาดหลักทรัพย์ได้ตลอดเวลา Mutual Fund ซื้อขายที่ NAV รายวัน",
      "Mutual Fund ไม่มีค่าธรรมเนียมใดๆ",
      "ETF ลงทุนได้เฉพาะหุ้น ส่วน Mutual Fund ลงทุนได้ทุกสินทรัพย์",
    ],
    answer: 1,
    explanation:
      "ETF (Exchange-Traded Fund) ซื้อขายผ่านตลาดหุ้นได้ตลอดวันเหมือนหุ้น ขณะที่ Mutual Fund ราคา NAV คำนวณปิดตลาด",
  },
  {
    id: "rebalance",
    category: "การลงทุน",
    question: "ทำไมต้อง Rebalance พอร์ตลงทุน?",
    options: [
      "เพื่อขายสินทรัพย์ที่ขาดทุนทิ้งเสมอ",
      "เพื่อปรับสัดส่วนพอร์ตให้กลับมาตามที่วางแผนไว้หลังราคาเปลี่ยน",
      "เพื่อเพิ่มผลตอบแทนสูงสุดระยะสั้น",
      "เพื่อหนีภาษีจากกำไร",
    ],
    answer: 1,
    explanation:
      "เมื่อสินทรัพย์บางประเภทมีมูลค่าเพิ่ม สัดส่วนพอร์ตจะเบี่ยงเบน การ Rebalance นำพอร์ตกลับสู่ความเสี่ยงที่ตั้งใจไว้",
  },
  // ── ภาษีและการวางแผน ─────────────────────────────────────────────────────
  {
    id: "rmf",
    category: "ภาษีและสิทธิประโยชน์",
    question: "กองทุน RMF ลดหย่อนภาษีได้สูงสุดเท่าไหร่?",
    options: [
      "ไม่เกิน 15% ของรายได้ และไม่เกิน 500,000 บาท รวมกับ SSF/PVD/กบข.",
      "ไม่เกิน 30% ของรายได้ แยกอิสระจาก SSF",
      "สูงสุด 100,000 บาทต่อปีเสมอ",
      "ไม่มีเพดาน ลดได้ทั้งหมดที่ลงทุน",
    ],
    answer: 0,
    explanation:
      "RMF ลดหย่อนได้ไม่เกิน 30% ของรายได้ และเมื่อรวมกับ SSF, PVD, กบข., ประกันชีวิตแบบบำนาญ ต้องไม่เกิน 500,000 บาท",
  },
  {
    id: "ssf",
    category: "ภาษีและสิทธิประโยชน์",
    question: "กองทุน SSF (Super Savings Fund) มีเงื่อนไขการถือครองนานแค่ไหน?",
    options: ["5 ปีนับจากวันซื้อ", "7 ปีนับจากวันซื้อ", "10 ปีนับจากวันซื้อ", "ถืออายุ 55 ปีถึงจะขายได้"],
    answer: 2,
    explanation:
      "SSF ต้องถือครองอย่างน้อย 10 ปีนับจากวันที่ซื้อ (ต่างจาก RMF ที่ต้องถือถึงอายุ 55 ปี)",
  },
  {
    id: "ltf_status",
    category: "ภาษีและสิทธิประโยชน์",
    question: "กองทุน LTF ยังคงมีสิทธิลดหย่อนภาษีสำหรับการลงทุนใหม่หรือไม่ (ปี 2566 เป็นต้นไป)?",
    options: [
      "ยังมี ลดหย่อนได้ 15% ของรายได้",
      "ไม่มีแล้ว ถูกยกเลิกสิทธิลดหย่อนตั้งแต่ปี 2563",
      "มีแต่เฉพาะผู้ที่ลงทุนมาก่อน 2563",
      "ถูกแทนที่ด้วย RMF ที่มีเงื่อนไขเดียวกัน",
    ],
    answer: 1,
    explanation:
      "LTF ถูกยกเลิกสิทธิลดหย่อนภาษีสำหรับการลงทุนใหม่ตั้งแต่ปี 2563 ถูกแทนที่ด้วย SSF",
  },
  // ── ประกัน ──────────────────────────────────────────────────────────────
  {
    id: "term_vs_whole",
    category: "ประกันภัย",
    question: "ข้อแตกต่างหลักระหว่างประกันชีวิตแบบ Term กับ Whole Life คือ?",
    options: [
      "Term คุ้มครองตลอดชีพ Whole Life คุ้มครองชั่วคราว",
      "Term คุ้มครองชั่วคราวเบี้ยต่ำ Whole Life คุ้มครองตลอดชีพมีมูลค่าเวนคืน",
      "Term ไม่มีทุนประกัน ส่วน Whole Life มีทุนประกันสูง",
      "Whole Life เบี้ยถูกกว่าตลอดอายุการใช้งาน",
    ],
    answer: 1,
    explanation:
      "Term ประกันชีวิตชั่วคราว เบี้ยต่ำ ไม่มีมูลค่าเวนคืน ส่วน Whole Life คุ้มครองตลอดชีพ มีการสะสมมูลค่า",
  },
  {
    id: "critical_illness",
    category: "ประกันภัย",
    question: "ประกันโรคร้ายแรง (Critical Illness) จ่ายเงินเมื่อใด?",
    options: [
      "จ่ายเฉพาะค่ารักษาพยาบาลจริงที่เกิดขึ้น",
      "จ่ายเงินก้อนเมื่อตรวจพบโรคร้ายแรงที่ระบุในกรมธรรม์",
      "จ่ายเฉพาะกรณีเสียชีวิตจากโรคร้ายแรง",
      "จ่ายเป็นรายเดือนตลอดชีวิต",
    ],
    answer: 1,
    explanation:
      "ประกันโรคร้ายแรงจ่ายเงินก้อนทันทีเมื่อวินิจฉัยพบโรค ไม่ขึ้นกับค่ารักษาจริง ใช้เป็นชดเชยรายได้ได้",
  },
  // ── เกษียณ ───────────────────────────────────────────────────────────────
  {
    id: "four_percent",
    category: "การวางแผนเกษียณ",
    question: "กฎ 4% (4% Rule) ในการวางแผนเกษียณหมายความว่าอย่างไร?",
    options: [
      "ลงทุน 4% ของรายได้ทุกเดือนเพื่อเกษียณ",
      "ถอนเงิน 4% ของพอร์ตต่อปี ทำให้เงินไม่หมดใน 30 ปี",
      "พอร์ตต้องได้ผลตอบแทน 4% ต่อปีจึงจะเกษียณได้",
      "ต้องมีเงิน 4 เท่าของรายจ่ายปัจจุบันจึงเกษียณได้",
    ],
    answer: 1,
    explanation:
      "4% Rule บอกว่าถ้าถอนเงิน 4% ของพอร์ตต่อปี (ปรับเงินเฟ้อ) เงินมักไม่หมดใน 30 ปี หมายความว่าต้องมีเงิน 25× รายจ่ายต่อปี",
  },
  {
    id: "fire_number",
    category: "การวางแผนเกษียณ",
    question: "ถ้าคุณต้องการรายจ่าย ฿50,000/เดือน ในวัยเกษียณ ตามกฎ 4% ต้องมีเงินเกษียณเท่าไหร่?",
    options: ["฿6,000,000", "฿10,000,000", "฿15,000,000", "฿20,000,000"],
    answer: 2,
    explanation:
      "รายจ่ายปีละ 50,000×12 = 600,000 บาท × 25 (= 1/4%) = 15,000,000 บาท คือ FIRE Number ของคุณ",
  },
];

type AnswerState = {
  selected: number;
  revealed: boolean;
};

function getScoreLevel(score: number) {
  if (score <= 5) return { label: "มือใหม่", color: "text-red-600", bg: "bg-red-50 border-red-200", desc: "ยังมีช่องว่างที่ต้องเรียนรู้ การพัฒนาความรู้พื้นฐานจะช่วยปกป้องเงินของคุณ" };
  if (score <= 10) return { label: "ปานกลาง", color: "text-amber-600", bg: "bg-amber-50 border-amber-200", desc: "มีความรู้พื้นฐานที่ดี การเพิ่มเติมในด้านภาษีและการลงทุนจะยิ่งเป็นประโยชน์" };
  return { label: "เชี่ยวชาญ", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", desc: "มีความรู้ทางการเงินที่แข็งแกร่ง นำความรู้ไปปฏิบัติอย่างสม่ำเสมอ" };
}

export default function KnowledgeAssessmentPage() {
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [submitted, setSubmitted] = useState(false);
  const [sessions, setSessions] = useState<AssessmentSession[]>([]);

  const loadSessions = useCallback(async () => {
    const res = await fetch("/api/assessment/sessions?type=knowledge");
    const json = await res.json();
    setSessions(json.data ?? []);
  }, []);

  useEffect(() => { loadSessions().catch(() => {}); }, [loadSessions]);

  const totalQ = questions.length;
  const answered = Object.keys(answers).filter(k => answers[k].selected !== -1).length;
  const progress = submitted ? 100 : (answered / totalQ) * 100;

  function handleSelect(qid: string, idx: number) {
    if (submitted) return;
    setAnswers(a => ({
      ...a,
      [qid]: { selected: idx, revealed: false },
    }));
  }

  async function handleSubmit() {
    if (answered < totalQ) return;
    setSubmitted(true);
    localStorage.setItem("assessment_knowledge_done", "1");
    const s = questions.filter(q => answers[q.id]?.selected === q.answer).length;
    const lv = getScoreLevel(s);
    await fetch("/api/assessment/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "knowledge", score: s, maxScore: totalQ, result: { label: lv.label } }),
    }).catch(() => {});
    await loadSessions().catch(() => {});
  }

  const score = submitted
    ? questions.filter(q => answers[q.id]?.selected === q.answer).length
    : 0;

  const level = getScoreLevel(score);
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
            <BookOpen className="h-6 w-6 text-emerald-600" />ความรู้ทางการเงิน
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Financial Literacy Quiz — {totalQ} คำถาม · ทดสอบความเข้าใจทางการเงินของคุณ
          </p>
        </div>
        {submitted && (
          <Button variant="outline" size="sm" onClick={() => { setAnswers({}); setSubmitted(false); }}>
            <RefreshCw className="h-3 w-3 mr-1" />ทำใหม่
          </Button>
        )}
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-4 pb-3 space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{submitted ? "ส่งแล้ว" : `${answered}/${totalQ} คำถาม`}</span>
            {submitted
              ? <span className={cn("font-bold", level.color)}>{score}/{totalQ} — {level.label}</span>
              : <span>{progress.toFixed(0)}% สมบูรณ์</span>}
          </div>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      {/* Score result */}
      {submitted && (
        <Card className={cn("border-2", level.bg)}>
          <CardContent className="pt-5 pb-4 space-y-3">
            <div className="flex items-start gap-3">
              <BookOpen className={cn("h-8 w-8 mt-0.5 shrink-0", level.color)} />
              <div>
                <p className="font-bold text-lg">
                  คะแนน <span className={level.color}>{score}/{totalQ}</span>{" "}
                  <span className="text-sm font-normal text-muted-foreground">— {level.label}</span>
                </p>
                <p className="text-sm text-muted-foreground mt-1">{level.desc}</p>
              </div>
            </div>

            {/* Category breakdown */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">คะแนนแต่ละหมวด</p>
              <div className="space-y-1.5">
                {categories.map(cat => {
                  const catQs = questions.filter(q => q.category === cat);
                  const catScore = catQs.filter(q => answers[q.id]?.selected === q.answer).length;
                  return (
                    <div key={cat} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-40 truncate">{cat}</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", catScore === catQs.length ? "bg-emerald-500" : catScore > 0 ? "bg-amber-400" : "bg-red-400")}
                          style={{ width: `${(catScore / catQs.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium tabular-nums">{catScore}/{catQs.length}</span>
                    </div>
                  );
                })}
              </div>
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
      )}

      {/* History */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
          <History className="h-4 w-4" />ประวัติการทำแบบประเมิน ({sessions.length} ครั้ง)
        </p>
        {sessions.length === 0 ? (
          <p className="text-xs text-muted-foreground px-3 py-2 rounded-lg border bg-muted/20">ยังไม่มีประวัติ — ส่งแบบประเมินเพื่อเริ่มติดตามพัฒนาการ</p>
        ) : (
          <div className="space-y-1.5">
            {sessions.map((s, i) => {
              const lv = getScoreLevel(s.score);
              return (
                <div key={s.id} className="flex items-center justify-between px-3 py-2 rounded-lg border bg-muted/30 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs w-5 text-right">{i + 1}.</span>
                    <span className={cn("font-medium", lv.color)}>{s.result.label ?? lv.label}</span>
                    <span className="text-muted-foreground text-xs">{s.score}/{s.maxScore} คะแนน</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(s.takenAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Questions */}
      <div className="space-y-6">
        {categories.map(cat => (
          <div key={cat}>
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">{cat}</p>
            <div className="space-y-3">
              {questions.filter(q => q.category === cat).map(q => {
                const globalIdx = questions.findIndex(x => x.id === q.id) + 1;
                const ans = answers[q.id];
                const isCorrect = ans?.selected === q.answer;

                return (
                  <Card key={q.id} className={cn(
                    submitted && isCorrect ? "border-emerald-400" :
                    submitted && !isCorrect ? "border-red-300" :
                    ans ? "border-primary/40" : ""
                  )}>
                    <CardContent className="pt-4 pb-4">
                      <p className="text-sm font-medium mb-3">{globalIdx}. {q.question}</p>
                      <div className="grid gap-2">
                        {q.options.map((opt, idx) => {
                          const isSelected = ans?.selected === idx;
                          const isAnswer = idx === q.answer;
                          let style = "border-muted hover:border-primary/40 hover:bg-muted/50";
                          if (submitted) {
                            if (isAnswer) style = "border-emerald-400 bg-emerald-50 text-emerald-800";
                            else if (isSelected) style = "border-red-300 bg-red-50 text-red-700";
                          } else if (isSelected) {
                            style = "border-primary bg-primary/10 text-primary font-medium";
                          }

                          return (
                            <button
                              key={opt}
                              disabled={submitted}
                              onClick={() => handleSelect(q.id, idx)}
                              className={cn(
                                "text-left px-3 py-2.5 rounded-md border text-sm transition-all",
                                style
                              )}
                            >
                              {submitted
                                ? isAnswer
                                  ? <CheckCircle2 className="h-3.5 w-3.5 inline mr-1.5 text-emerald-600" />
                                  : isSelected
                                    ? <XCircle className="h-3.5 w-3.5 inline mr-1.5 text-red-500" />
                                    : <span className="inline-block w-5" />
                                : isSelected
                                  ? <CheckCircle2 className="h-3.5 w-3.5 inline mr-1.5 text-primary" />
                                  : <span className="inline-block w-5" />}{opt}
                            </button>
                          );
                        })}
                      </div>
                      {submitted && (
                        <div className={cn("mt-3 text-xs rounded px-3 py-2",
                          isCorrect ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"
                        )}>
                          <span className="font-semibold">{isCorrect ? "✅ ถูกต้อง" : "💡 คำอธิบาย"}</span>{" — "}{q.explanation}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}

        {!submitted && (
          <Button onClick={handleSubmit} disabled={answered < totalQ} className="w-full">
            {answered < totalQ ? `ตอบอีก ${totalQ - answered} คำถาม` : "ตรวจคำตอบ →"}
          </Button>
        )}
      </div>
    </div>
  );
}
