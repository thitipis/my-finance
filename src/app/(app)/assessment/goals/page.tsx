"use client";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Target, CheckCircle2, RefreshCw, ChevronLeft, ChevronRight,
  AlertCircle, History,
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

// ─── Questions ────────────────────────────────────────────────────────────────

const questions = [
  {
    id: "has_written_goals",
    category: "ความชัดเจนของเป้าหมาย",
    question: "คุณมีเป้าหมายการเงินที่เป็นลายลักษณ์อักษรและชัดเจนหรือไม่?",
    options: [
      { label: "ไม่มี — คิดแค่ในหัว", score: 0 },
      { label: "มีบ้าง แต่ไม่ครบและไม่ชัดเจน", score: 1 },
      { label: "มีบันทึกไว้ แต่ไม่ได้ดูบ่อย", score: 2 },
      { label: "มีชัดเจน ระบุจำนวนเงินและเวลา", score: 3 },
    ],
  },
  {
    id: "goal_timeline",
    category: "ความชัดเจนของเป้าหมาย",
    question: "เป้าหมายการเงินของคุณมีกรอบเวลาที่แน่นอนหรือไม่?",
    options: [
      { label: "ไม่มีกรอบเวลา", score: 0 },
      { label: "มีคร่าวๆ เช่น \"ใน 5 ปี\"", score: 1 },
      { label: "มีปีที่ชัดเจน เช่น \"ภายในปี 2030\"", score: 2 },
      { label: "มีทั้งปีและเดือน พร้อมแผนงาน", score: 3 },
    ],
  },
  {
    id: "goal_amount",
    category: "ความสมจริงของเป้าหมาย",
    question: "คุณรู้จำนวนเงินที่ต้องการสำหรับแต่ละเป้าหมายหรือไม่?",
    options: [
      { label: "ไม่รู้ — แค่รู้ว่าอยากได้", score: 0 },
      { label: "ประมาณคร่าวๆ", score: 1 },
      { label: "รู้และคำนวณแล้ว", score: 2 },
      { label: "รู้ชัดเจน คำนวณรวมเงินเฟ้อและผลตอบแทนแล้ว", score: 3 },
    ],
  },
  {
    id: "goal_realism",
    category: "ความสมจริงของเป้าหมาย",
    question: "เมื่อเทียบรายได้ปัจจุบัน เป้าหมายของคุณเป็นไปได้แค่ไหน?",
    options: [
      { label: "ยังไม่รู้ ไม่ได้คำนวณ", score: 0 },
      { label: "ยากมาก ต้องใช้ความพยายามสูง", score: 1 },
      { label: "ท้าทาย แต่ทำได้หากวินัยดี", score: 2 },
      { label: "สมเหตุสมผล มีแผนรองรับชัดเจน", score: 3 },
    ],
  },
  {
    id: "priority",
    category: "การจัดลำดับความสำคัญ",
    question: "คุณจัดลำดับความสำคัญของเป้าหมายการเงินแต่ละข้อได้หรือไม่?",
    options: [
      { label: "ไม่ได้จัดเลย — อยากได้ทุกอย่างพร้อมกัน", score: 0 },
      { label: "จัดคร่าวๆ แต่ยังลังเล", score: 1 },
      { label: "มีลำดับชัดเจน 1–2–3", score: 2 },
      { label: "มีลำดับและรู้ว่าจะทำแต่ละข้อเมื่อใด", score: 3 },
    ],
  },
  {
    id: "conflict",
    category: "การจัดลำดับความสำคัญ",
    question: "เป้าหมายของคุณขัดแย้งกันเองหรือไม่? เช่น ซื้อบ้านเร็ว vs เกษียณเร็ว",
    options: [
      { label: "ขัดแย้งกัน และไม่รู้จะแก้ยังไง", score: 0 },
      { label: "ขัดแย้งบ้าง กำลังหาทางออก", score: 1 },
      { label: "ขัดแย้งน้อย จัดการได้พอประมาณ", score: 2 },
      { label: "ไม่มีความขัดแย้ง หรือจัดการได้ชัดเจน", score: 3 },
    ],
  },
  {
    id: "tracking",
    category: "การติดตามและปรับแผน",
    question: "คุณติดตามความคืบหน้าของเป้าหมายบ่อยแค่ไหน?",
    options: [
      { label: "ไม่เคยติดตามเลย", score: 0 },
      { label: "ติดตามเป็นครั้งคราว ไม่แน่นอน", score: 1 },
      { label: "ทบทวนทุกไตรมาส", score: 2 },
      { label: "ทบทวนอย่างน้อยทุกเดือน", score: 3 },
    ],
  },
  {
    id: "adjustable",
    category: "การติดตามและปรับแผน",
    question: "หากสถานการณ์เปลี่ยน (เช่น รายได้ลด) คุณพร้อมปรับเป้าหมายได้ทันทีหรือไม่?",
    options: [
      { label: "ไม่ได้คิดเรื่องนี้เลย", score: 0 },
      { label: "คิดอยู่ แต่ยังไม่มีแผนสำรอง", score: 1 },
      { label: "มีแผนสำรองคร่าวๆ", score: 2 },
      { label: "มีแผนสำรองชัดเจน พร้อมปรับได้ทันที", score: 3 },
    ],
  },
  {
    id: "emergency_goal",
    category: "ความครบถ้วนของเป้าหมาย",
    question: "คุณมีเป้าหมายสร้างกองทุนฉุกเฉินที่ชัดเจนหรือไม่?",
    options: [
      { label: "ไม่มี / ไม่เคยคิดถึง", score: 0 },
      { label: "รู้ว่าควรมี แต่ยังไม่ได้ตั้งเป้า", score: 1 },
      { label: "มีเป้า แต่ยังไม่ครบ 3 เดือน", score: 2 },
      { label: "มีกองทุนฉุกเฉิน 6+ เดือน แล้ว", score: 3 },
    ],
  },
  {
    id: "retirement_goal",
    category: "ความครบถ้วนของเป้าหมาย",
    question: "คุณมีการวางแผนเกษียณอายุที่เป็นรูปธรรมหรือไม่?",
    options: [
      { label: "ยังไม่ได้คิดเรื่องเกษียณ", score: 0 },
      { label: "คิดบ้าง แต่ไม่มีตัวเลข", score: 1 },
      { label: "มีอายุเกษียณและจำนวนเงินเป้าหมาย", score: 2 },
      { label: "มีแผนละเอียด พร้อมระบบออมเพื่อเกษียณ", score: 3 },
    ],
  },
];

const MAX_SCORE = questions.reduce((s, q) => s + Math.max(...q.options.map(o => o.score)), 0);

type GoalLevel = "unclear" | "developing" | "clear" | "excellent";

function calcLevel(score: number): GoalLevel {
  const pct = (score / MAX_SCORE) * 100;
  if (pct < 30) return "unclear";
  if (pct < 55) return "developing";
  if (pct < 80) return "clear";
  return "excellent";
}

const levelInfo: Record<GoalLevel, { label: string; color: string; bg: string; desc: string; advice: string[] }> = {
  unclear: {
    label: "ยังไม่ชัดเจน",
    color: "text-red-600",
    bg: "bg-red-50 border-red-200",
    desc: "เป้าหมายการเงินยังกระจัดกระจาย ขาดความชัดเจนและกรอบเวลา",
    advice: [
      "เริ่มต้นด้วยการเขียนเป้าหมาย 3 อันดับแรกลงกระดาษ",
      "ทำแบบประเมิน Risk Tolerance เพื่อรู้จุดเริ่มต้นการลงทุน",
      "ตั้งเป้าหมายกองทุนฉุกเฉินก่อนเป็นอันดับแรก",
      "ใช้หลัก SMART (Specific, Measurable, Achievable, Relevant, Time-bound)",
    ],
  },
  developing: {
    label: "กำลังพัฒนา",
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200",
    desc: "มีเป้าหมายบ้าง แต่ยังขาดความชัดเจนหรือแผนรองรับที่แน่นอน",
    advice: [
      "เพิ่มความชัดเจนโดยระบุจำนวนเงินและปีที่ต้องการ",
      "จัดลำดับความสำคัญ — ทำได้ทีละเป้าหมาย",
      "ตั้งระบบทบทวนเป้าหมายทุกไตรมาส",
      "ใช้เครื่องมือ Goals ในแอปเพื่อติดตามความคืบหน้า",
    ],
  },
  clear: {
    label: "ชัดเจนดี",
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200",
    desc: "เป้าหมายชัดเจนและมีแผนรองรับ ยังมีจุดที่พัฒนาได้",
    advice: [
      "เพิ่มความละเอียดในการคำนวณเงินเฟ้อและผลตอบแทน",
      "สร้างแผนสำรองสำหรับกรณีรายได้ลดลง",
      "ทบทวนและปรับเป้าหมายทุกปี",
      "ลองใช้ Financial Analysis เพื่อดูว่าเป้าหมายเป็นไปได้แค่ไหน",
    ],
  },
  excellent: {
    label: "ยอดเยี่ยม",
    color: "text-emerald-600",
    bg: "bg-emerald-50 border-emerald-200",
    desc: "มีเป้าหมายที่ชัดเจน สมจริง จัดลำดับได้ และมีระบบติดตามที่ดี",
    advice: [
      "ดูแล Wealth Timeline ใน Financial Analysis เพื่อยืนยันเส้นทาง",
      "พิจารณาทำแบบประเมิน Investment Personality เพิ่มเติม",
      "Share เป้าหมายกับคนที่คุณไว้วางใจเพื่อเพิ่ม accountability",
      "อย่าลืม rebalance portfolio ให้สอดคล้องกับเป้าหมายที่เปลี่ยนไป",
    ],
  },
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GoalsClarityPage() {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [current, setCurrent] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [sessions, setSessions] = useState<AssessmentSession[]>([]);

  const loadSessions = useCallback(async () => {
    const res = await fetch("/api/assessment/sessions?type=goals");
    const json = await res.json();
    setSessions(json.data ?? []);
  }, []);

  useEffect(() => { loadSessions().catch(() => {}); }, [loadSessions]);

  // Save session to DB exactly once when the user submits
  useEffect(() => {
    if (!submitted) return;
    const totalScore = Object.values(answers).reduce((s, v) => s + v, 0);
    localStorage.setItem("assessment_goals_done", "1");
    fetch("/api/assessment/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "goals",
        score: totalScore,
        maxScore: MAX_SCORE,
        result: { label: levelInfo[calcLevel(totalScore)].label },
      }),
    })
      .then(() => loadSessions())
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted]);

  const q = questions[current];
  const answered = Object.keys(answers).length;
  const progressPct = (current / questions.length) * 100;

  function handleSelect(score: number) {
    setAnswers(prev => ({ ...prev, [q.id]: score }));
  }

  function handleNext() {
    if (current < questions.length - 1) setCurrent(c => c + 1);
    else setSubmitted(true);
  }

  function handleBack() {
    if (current > 0) setCurrent(c => c - 1);
  }

  function handleReset() {
    setAnswers({});
    setCurrent(0);
    setSubmitted(false);
    localStorage.removeItem("assessment_goals_done");
  }

  if (submitted) {
    const totalScore = Object.values(answers).reduce((s, v) => s + v, 0);
    const level = calcLevel(totalScore);
    const info = levelInfo[level];
    const scorePct = Math.round((totalScore / MAX_SCORE) * 100);
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-3">
          <Link href="/assessment" className="text-xs text-muted-foreground hover:text-foreground">← กลับ</Link>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Target className="h-5 w-5 text-orange-500" />ผลประเมินความชัดเจนเป้าหมาย
          </h1>
        </div>

        <Card className={cn("border-2", info.bg)}>
          <CardContent className="pt-6 pb-6 text-center">
            <div className={cn("text-5xl font-black tabular-nums", info.color)}>{scorePct}%</div>
            <div className={cn("mt-1 text-lg font-bold", info.color)}>{info.label}</div>
            <p className="text-sm text-muted-foreground mt-2">{info.desc}</p>
            <Progress value={scorePct} className="mt-4 h-3" />
            <p className="text-xs text-muted-foreground mt-1">{totalScore} / {MAX_SCORE} คะแนน</p>
          </CardContent>
        </Card>

        {/* Score by category */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">คะแนนรายหมวด</p>
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1.5 text-xs font-semibold text-muted-foreground">หมวด</th>
                  <th className="text-right py-1.5 text-xs font-semibold text-muted-foreground">คะแนน</th>
                  <th className="text-right py-1.5 text-xs font-semibold text-muted-foreground hidden sm:table-cell">% เต็ม</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {Array.from(new Set(questions.map(q => q.category))).map(cat => {
                  const catQs = questions.filter(q => q.category === cat);
                  const catMax = catQs.reduce((s, q) => s + Math.max(...q.options.map(o => o.score)), 0);
                  const catScore = catQs.reduce((s, q) => s + (answers[q.id] ?? 0), 0);
                  const catPct = Math.round((catScore / catMax) * 100);
                  return (
                    <tr key={cat}>
                      <td className="py-2 text-xs font-medium">{cat}</td>
                      <td className="py-2 text-xs text-right font-semibold tabular-nums">{catScore}/{catMax}</td>
                      <td className="py-2 text-xs text-right text-muted-foreground hidden sm:table-cell">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-orange-400 rounded-full" style={{ width: `${catPct}%` }} />
                          </div>
                          {catPct}%
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Advice */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">คำแนะนำจากผลประเมิน</p>
            <ul className="space-y-2">
              {info.advice.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className={cn("h-4 w-4 shrink-0 mt-0.5", info.color)} />
                  {a}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" onClick={handleReset} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />ทำใหม่
          </Button>
          <Link href="/assessment">
            <Button variant="outline">← กลับหน้าหลัก</Button>
          </Link>
          <Link href="/my-data?tab=goals">
            <Button className="flex items-center gap-2">
              <Target className="h-4 w-4" />จัดการเป้าหมาย →
            </Button>
          </Link>
        </div>

        {/* History */}
        {sessions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
              <History className="h-4 w-4" />ประวัติการทำแบบประเมิน ({sessions.length} ครั้ง)
            </p>
            <div className="space-y-1.5">
              {sessions.map((s, i) => {
                const lv = levelInfo[calcLevel(s.score)];
                return (
                  <div key={s.id} className="flex items-center justify-between px-3 py-2 rounded-lg border bg-muted/30 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs w-5 text-right">{i + 1}.</span>
                      <span className={cn("font-medium", lv?.color ?? "text-muted-foreground")}>{s.result.label}</span>
                      <span className="text-muted-foreground text-xs">{s.score}/{s.maxScore} คะแนน</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(s.takenAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/assessment" className="text-xs text-muted-foreground hover:text-foreground">← กลับ</Link>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Target className="h-5 w-5 text-orange-500" />ความชัดเจนเป้าหมายการเงิน
          </h1>
          <p className="text-xs text-muted-foreground">Financial Goals Clarity · 10 ข้อ · 5–6 นาที</p>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>ข้อ {current + 1} จาก {questions.length}</span>
          <span>{answered} ตอบแล้ว</span>
        </div>
        <Progress value={progressPct} className="h-2" />
        <p className="text-[10px] text-muted-foreground">{q.category}</p>
      </div>

      {/* Question */}
      <Card>
        <CardContent className="pt-6 pb-6">
          <p className="font-semibold text-base mb-5 leading-relaxed">{q.question}</p>
          <div className="space-y-2.5">
            {q.options.map((opt, i) => {
              const selected = answers[q.id] === opt.score && answers[q.id] !== undefined
                || (answers[q.id] === 0 && opt.score === 0 && q.id in answers);
              const isSelected = q.id in answers && answers[q.id] === opt.score;
              return (
                <button
                  key={i}
                  onClick={() => handleSelect(opt.score)}
                  className={cn(
                    "w-full text-left rounded-lg border px-4 py-3 text-sm transition-all",
                    isSelected
                      ? "border-orange-400 bg-orange-50 font-medium text-orange-800"
                      : "border-border hover:border-orange-300 hover:bg-orange-50/40"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center",
                      isSelected ? "border-orange-500 bg-orange-500" : "border-muted-foreground"
                    )}>
                      {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </div>
                    {opt.label}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleBack} disabled={current === 0} className="flex items-center gap-2">
          <ChevronLeft className="h-4 w-4" />ก่อนหน้า
        </Button>
        <Button
          onClick={handleNext}
          disabled={!(q.id in answers)}
          className="flex items-center gap-2"
        >
          {current === questions.length - 1 ? (
            <><CheckCircle2 className="h-4 w-4" />ดูผลลัพธ์</>
          ) : (
            <>ถัดไป<ChevronRight className="h-4 w-4" /></>
          )}
        </Button>
      </div>

      {/* Tip */}
      <Card className="border-dashed bg-orange-50/30">
        <CardContent className="pt-3 pb-3">
          <p className="text-xs text-muted-foreground">
            <AlertCircle className="h-3.5 w-3.5 inline mr-1 text-orange-500" />
            ตอบตามความเป็นจริง ไม่มีคำตอบที่ถูกหรือผิด — ผลประเมินจะช่วยวางแผนเป้าหมายให้แม่นยำขึ้น
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
