"use client";
import Link from "next/link";
import {
  ClipboardList, Brain, Target, BookOpen,
  ChevronRight, CheckCircle2, Clock, AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface AssessmentStatus {
  risk: boolean;
  personality: boolean;
  knowledge: boolean;
  goals: boolean;
}

const assessments = [
  {
    key: "risk" as const,
    href: "/assessment/risk",
    icon: ClipboardList,
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200",
    title: "ประเมินความเสี่ยงการลงทุน",
    titleEn: "Risk Tolerance",
    desc: "วัดระดับความสามารถในการรับความเสี่ยง ตามมาตรฐาน กลต. ผสมบริบทการเงินส่วนตัว",
    questions: 11,
    time: "5–8 นาที",
    impact: "กำหนดประเภทสินทรัพย์ที่เหมาะสม",
  },
  {
    key: "personality" as const,
    href: "/assessment/personality",
    icon: Brain,
    color: "text-purple-600",
    bg: "bg-purple-50 border-purple-200",
    title: "บุคลิกภาพทางการเงิน",
    titleEn: "Financial Personality",
    desc: "วิเคราะห์พฤติกรรมการใช้จ่าย ทัศนคติต่อเงิน และแบบแผนการตัดสินใจทางการเงิน",
    questions: 12,
    time: "5–7 นาที",
    impact: "เข้าใจจุดแข็ง-จุดอ่อนด้านเงิน",
  },
  {
    key: "knowledge" as const,
    href: "/assessment/knowledge",
    icon: BookOpen,
    color: "text-emerald-600",
    bg: "bg-emerald-50 border-emerald-200",
    title: "ความรู้ทางการเงิน",
    titleEn: "Financial Literacy",
    desc: "ทดสอบความเข้าใจด้านการลงทุน ภาษี ประกัน และการวางแผนการเงิน",
    questions: 15,
    time: "8–10 นาที",
    impact: "ระบุช่องว่างความรู้ที่ควรพัฒนา",
  },
  {
    key: "goals" as const,
    href: "/assessment/goals",
    icon: Target,
    color: "text-orange-600",
    bg: "bg-orange-50 border-orange-200",
    title: "ความชัดเจนเป้าหมายการเงิน",
    titleEn: "Financial Goals Clarity",
    desc: "ประเมินความชัดเจน ความสมจริง และความสอดคล้องของเป้าหมายการเงินที่คุณตั้งไว้",
    questions: 10,
    time: "5–6 นาที",
    impact: "วางแผนเป้าหมายให้แม่นยำขึ้น",
  },
];

export default function AssessmentHubPage() {
  const [status, setStatus] = useState<AssessmentStatus>({ risk: false, personality: false, knowledge: false, goals: false });

  useEffect(() => {
    // Check which assessments have been completed (stored in localStorage)
    const done: Partial<AssessmentStatus> = {};
    done.risk = !!localStorage.getItem("assessment_risk_done");
    done.personality = !!localStorage.getItem("assessment_personality_done");
    done.knowledge = !!localStorage.getItem("assessment_knowledge_done");
    done.goals = !!localStorage.getItem("assessment_goals_done");
    setStatus(done as AssessmentStatus);
  }, []);

  const completed = Object.values(status).filter(Boolean).length;
  const total = assessments.length;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-primary" />
          Self Assessment
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          แบบประเมินตนเองมาตรฐาน — ผลลัพธ์จะถูกนำไปปรับแผนการเงินและคำแนะนำการลงทุน
        </p>
      </div>

      {/* Progress overview */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">ความคืบหน้า</p>
              <p className="text-xs text-muted-foreground mt-0.5">ทำแบบประเมินแล้ว {completed}/{total} ชุด</p>
            </div>
            <div className="text-3xl font-black text-primary">{completed}<span className="text-base font-normal text-muted-foreground">/{total}</span></div>
          </div>
          <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(completed / total) * 100}%` }} />
          </div>
          {completed === total && (
            <p className="text-xs text-emerald-600 font-medium mt-2 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />ทำครบทุกแบบประเมินแล้ว — ระบบมีข้อมูลเพียงพอสำหรับการวิเคราะห์ที่แม่นยำ
            </p>
          )}
        </CardContent>
      </Card>

      {/* Assessment cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        {assessments.map(a => {
          const Icon = a.icon;
          const done = status[a.key];
          return (
            <Link key={a.key} href={a.href} className="block group">
              <Card className={cn(
                "h-full border transition-all group-hover:shadow-md",
                done ? "border-emerald-200 bg-emerald-50/30" : ""
              )}>
                <CardContent className="pt-4 pb-4 flex flex-col gap-3">
                  {/* Icon + title */}
                  <div className="flex items-start justify-between gap-2">
                    <div className={cn("p-2 rounded-lg border", a.bg)}>
                      <Icon className={cn("h-5 w-5", a.color)} />
                    </div>
                    {done
                      ? <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full"><CheckCircle2 className="h-3 w-3" />เสร็จแล้ว</span>
                      : <span className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full"><AlertCircle className="h-3 w-3" />ยังไม่ได้ทำ</span>
                    }
                  </div>
                  {/* Content */}
                  <div>
                    <p className="font-semibold text-sm">{a.title}</p>
                    <p className="text-[10px] text-muted-foreground">{a.titleEn}</p>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{a.desc}</p>
                  </div>
                  {/* Meta */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span className="flex items-center gap-1"><ClipboardList className="h-3 w-3" />{a.questions} ข้อ</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{a.time}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  {/* Impact */}
                  <div className={cn("text-[10px] font-medium px-2 py-1 rounded-md border", a.bg, a.color)}>
                    💡 {a.impact}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Info */}
      <Card className="border-dashed">
        <CardContent className="pt-4 pb-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">ทำไมต้องประเมินตนเอง?</span>
            {" "}ผลการประเมินช่วยให้ระบบเข้าใจโปรไฟล์ทางการเงินของคุณอย่างรอบด้าน
            — ไม่ใช่เพียงแค่ตัวเลขรายได้และหนี้สิน แต่รวมถึงพฤติกรรม ความเข้าใจ
            และเป้าหมายที่แท้จริง เพื่อให้คำแนะนำที่แม่นยำและเป็นประโยชน์มากขึ้น
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
