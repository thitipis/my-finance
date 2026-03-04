import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Calculator,
  Target,
  Shield,
  MessageSquareText,
  TrendingUp,
  AlertTriangle,
  Lock,
} from "lucide-react";

// Mock data — will be replaced with real DB fetches once connected
const mockHealthScore = 72;
const mockGoals = [
  { name: "กองทุนฉุกเฉิน", progress: 45, target: 180000, current: 81000 },
  { name: "เกษียณอายุ",     progress: 12, target: 15000000, current: 1800000 },
];
const mockTaxSummary = {
  effectiveRate: 8.4,
  taxOwed: 24500,
  isRefund: false,
  unusedDeductionRoom: 150000,
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">แดชบอร์ด</h1>
        <p className="text-muted-foreground text-sm">สรุปสถานะการเงินของคุณ — ปีภาษี 2025</p>
      </div>

      {/* Health Score */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            คะแนนสุขภาพการเงิน
          </CardTitle>
          <Badge variant="secondary">ฟรี</Badge>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 mb-3">
            <span className="text-5xl font-bold text-primary">{mockHealthScore}</span>
            <span className="text-muted-foreground mb-1">/ 100</span>
          </div>
          <Progress value={mockHealthScore} className="h-3" />
          {/* AI explanation locked for free users */}
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="h-4 w-4" />
            <span>คำอธิบายโดย AI — สำหรับผู้ใช้ Premium</span>
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings">อัปเกรด</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: "/tax",       icon: Calculator,        label: "คำนวณภาษี",      color: "text-blue-500" },
          { href: "/goals",     icon: Target,            label: "เป้าหมายการเงิน", color: "text-emerald-500" },
          { href: "/insurance", icon: Shield,            label: "ตรวจเช็คประกัน",  color: "text-amber-500" },
          { href: "/ai-chat",   icon: MessageSquareText, label: "AI ที่ปรึกษา",   color: "text-purple-500" },
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

      {/* Tax Summary + Goals side by side */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Tax Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="h-4 w-4 text-blue-500" />
              สรุปภาษี 2025
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">อัตราภาษีที่แท้จริง</span>
              <span className="font-semibold">{mockTaxSummary.effectiveRate}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">ภาษีที่ต้องชำระเพิ่ม</span>
              <span className={`font-semibold ${mockTaxSummary.isRefund ? "text-emerald-600" : "text-red-500"}`}>
                ฿{mockTaxSummary.taxOwed.toLocaleString("th-TH")}
              </span>
            </div>
            {mockTaxSummary.unusedDeductionRoom > 0 && (
              <div className="flex items-start gap-2 mt-2 p-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>คุณยังลดหย่อนได้อีก ฿{mockTaxSummary.unusedDeductionRoom.toLocaleString("th-TH")} — คำนวณเพื่อดูโอกาสประหยัดภาษี</span>
              </div>
            )}
            <Button variant="outline" size="sm" className="w-full mt-1" asChild>
              <Link href="/tax">คำนวณภาษีเต็ม →</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Goals Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-emerald-500" />
              เป้าหมายการเงิน
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockGoals.map((goal) => (
              <div key={goal.name} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{goal.name}</span>
                  <span className="text-muted-foreground">{goal.progress}%</span>
                </div>
                <Progress value={goal.progress} />
                <p className="text-xs text-muted-foreground">
                  ฿{goal.current.toLocaleString("th-TH")} / ฿{goal.target.toLocaleString("th-TH")}
                </p>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link href="/goals">ดูเป้าหมายทั้งหมด →</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
