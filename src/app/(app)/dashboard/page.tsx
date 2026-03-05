"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Calculator,
  Target,
  Shield,
  MessageSquareText,
  TrendingUp,
  Lock,
  Loader2,
} from "lucide-react";

interface Goal {
  id: string;
  name: string;
  goalType: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string | null;
}

function calcProgress(current: number, target: number) {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const userName = session?.user?.name ?? session?.user?.email ?? "คุณ";

  const [goals, setGoals]           = useState<Goal[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/goals")
      .then((r) => r.json())
      .then((data) => setGoals(Array.isArray(data) ? data.slice(0, 3) : []))
      .catch(() => setGoals([]))
      .finally(() => setGoalsLoading(false));
  }, []);

  const displayGoals = goals.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">สวัสดี, {userName} 👋</h1>
        <p className="text-muted-foreground text-sm">สรุปสถานะการเงินของคุณ — ปีภาษี 2025</p>
      </div>

      {/* Health Score — placeholder until backend score service is built */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            คะแนนสุขภาพการเงิน
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 mb-3">
            <span className="text-5xl font-bold text-muted-foreground">—</span>
            <span className="text-muted-foreground mb-1">/ 100</span>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            กรอกข้อมูลการเงินให้ครบเพื่อรับคะแนนสุขภาพการเงินของคุณ
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="h-4 w-4" />
            <span>คำวิเคราะห์โดย AI — สำหรับผู้ใช้ Premium</span>
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings">อัปเกรด</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: "/tax",       icon: Calculator,        label: "คำนวณภาษี",       color: "text-blue-500" },
          { href: "/goals",     icon: Target,            label: "เป้าหมายการเงิน", color: "text-emerald-500" },
          { href: "/insurance", icon: Shield,            label: "ตรวจเช็คประกัน",  color: "text-amber-500" },
          { href: "/ai-chat",   icon: MessageSquareText, label: "AI ที่ปรึกษา",    color: "text-purple-500" },
        ].map(({ href, icon: Icon, label, color }) => (
          <Link key={href} href={href}>
            <Card className="hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer">
              <CardContent className="flex flex-col items-center justify-center gap-2 py-5">
                <Icon className={`h-7 w-7 ${color}`} />
                <span className="text-sm font-medium text-center">{label}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Tax CTA + Goals side by side */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Tax — no stored result, prompt user to calculate */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="h-4 w-4 text-blue-500" />
              สรุปภาษี 2025
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-6 text-center">
            <Calculator className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              ยังไม่มีข้อมูลการคำนวณภาษี<br />
              คลิกด้านล่างเพื่อเริ่มคำนวณและดูสรุปภาษีของคุณ
            </p>
            <Button size="sm" asChild>
              <Link href="/tax">คำนวณภาษีเลย →</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Goals Summary — real data */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-emerald-500" />
              เป้าหมายการเงิน
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {goalsLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : displayGoals.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <Target className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">ยังไม่มีเป้าหมาย — เริ่มสร้างเป้าหมายแรกของคุณ</p>
                <Button size="sm" asChild>
                  <Link href="/goals">สร้างเป้าหมาย</Link>
                </Button>
              </div>
            ) : (
              <>
                {displayGoals.map((goal) => {
                  const pct = calcProgress(goal.currentAmount, goal.targetAmount);
                  return (
                    <div key={goal.id} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{goal.name}</span>
                        <span className="text-muted-foreground">{pct}%</span>
                      </div>
                      <Progress value={pct} />
                      <p className="text-xs text-muted-foreground">
                        ฿{goal.currentAmount.toLocaleString("th-TH")} / ฿{goal.targetAmount.toLocaleString("th-TH")}
                      </p>
                    </div>
                  );
                })}
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href="/goals">ดูเป้าหมายทั้งหมด →</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
