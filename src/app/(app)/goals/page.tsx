"use client";
import { useState, useEffect, useCallback } from "react";
import { Target, Plus, TrendingUp, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

type Projection = { projectedCompletionDate: string | null; onTrack: boolean; progressPercent: number; monthsRemaining: number | null };
type Goal = { id: string; name: string; goalType: string; targetAmount: string; currentAmount: string; monthlyContribution: string; annualReturnRate: string; projection: Projection };
const EMPTY_FORM = { name: "", goalType: "retirement", targetAmount: "", currentAmount: "0", monthlyContribution: "", annualReturnRate: "7" };

const GOAL_TYPES = [
  { value: "retirement",     label: "เกษียณอายุ" },
  { value: "emergency_fund", label: "กองทุนฉุกเฉิน" },
  { value: "investment",     label: "การลงทุน" },
  { value: "home_car",       label: "บ้าน / รถ" },
  { value: "education",      label: "ค่าการศึกษา" },
  { value: "custom",         label: "อื่น ๆ" },
];

function GoalCard({ goal, onDelete }: { goal: Goal; onDelete: (id: string) => void }) {
  const progress = goal.projection.progressPercent;
  const typeLabel = GOAL_TYPES.find(t => t.value === goal.goalType)?.label ?? goal.goalType;
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("ลบเป้าหมายนี้?")) return;
    setDeleting(true);
    await fetch(`/api/goals/${goal.id}`, { method: "DELETE" });
    onDelete(goal.id);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{goal.name}</CardTitle>
            <CardDescription>{typeLabel}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={progress >= 100 ? "success" : "secondary"}>{progress}%</Badge>
            <button onClick={handleDelete} disabled={deleting} className="text-muted-foreground hover:text-destructive transition-colors">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={Math.min(progress, 100)} />
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <span className="text-muted-foreground">ปัจจุบัน</span>
          <span className="text-right font-medium">{formatCurrency(Number(goal.currentAmount))}</span>
          <span className="text-muted-foreground">เป้าหมาย</span>
          <span className="text-right font-medium">{formatCurrency(Number(goal.targetAmount))}</span>
          <span className="text-muted-foreground">ออมต่อเดือน</span>
          <span className="text-right font-medium">{formatCurrency(Number(goal.monthlyContribution))}</span>
          <span className="text-muted-foreground">ผลตอบแทน/ปี</span>
          <span className="text-right font-medium">{goal.annualReturnRate}%</span>
        </div>
        {goal.projection.projectedCompletionDate ? (
          <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg text-sm">
            <TrendingUp className="h-4 w-4 text-primary shrink-0" />
            <span>คาดว่าถึงเป้าหมาย: <strong>{goal.projection.projectedCompletionDate.slice(0, 7)}</strong>
              {goal.projection.monthsRemaining !== null && ` (${goal.projection.monthsRemaining} เดือน)`}
            </span>
          </div>
        ) : (
          <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950 p-2 rounded-lg">
            กรุณาเพิ่มจำนวนเงินออมหรืออัตราผลตอบแทนเพื่อฉายภาพ
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const loadGoals = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/goals");
    const data = await res.json();
    setGoals(data.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadGoals(); }, [loadGoals]);

  const updateForm = (field: string, val: string) => setForm(prev => ({ ...prev, [field]: val }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        goalType: form.goalType,
        targetAmount: parseFloat(form.targetAmount),
        currentAmount: parseFloat(form.currentAmount) || 0,
        monthlyContribution: parseFloat(form.monthlyContribution),
        annualReturnRate: parseFloat(form.annualReturnRate),
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setFormError(data.error ?? "เกิดข้อผิดพลาด"); return; }
    setForm(EMPTY_FORM);
    setShowForm(false);
    await loadGoals();
  };

  const handleDelete = (id: string) => setGoals(prev => prev.filter(g => g.id !== id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-emerald-500" />
            เป้าหมายการเงิน
          </h1>
          <p className="text-muted-foreground text-sm">วางแผนและติดตามเป้าหมายทางการเงินของคุณ</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" />
          เพิ่มเป้าหมาย
        </Button>
      </div>

      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">เพิ่มเป้าหมายใหม่</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>ชื่อเป้าหมาย *</Label>
                <Input placeholder="เช่น เกษียณอายุ 60 ปี" value={form.name} onChange={e => updateForm("name", e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>ประเภท</Label>
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm" value={form.goalType} onChange={e => updateForm("goalType", e.target.value)}>
                  {GOAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label>จำนวนเงินเป้าหมาย (บาท) *</Label>
                <Input type="number" placeholder="15000000" value={form.targetAmount} onChange={e => updateForm("targetAmount", e.target.value)} required min={1} />
              </div>
              <div className="space-y-1">
                <Label>ออมต่อเดือน (บาท) *</Label>
                <Input type="number" placeholder="15000" value={form.monthlyContribution} onChange={e => updateForm("monthlyContribution", e.target.value)} required min={0} />
              </div>
              <div className="space-y-1">
                <Label>มีอยู่แล้ว (บาท)</Label>
                <Input type="number" placeholder="0" value={form.currentAmount} onChange={e => updateForm("currentAmount", e.target.value)} min={0} />
              </div>
              <div className="space-y-1">
                <Label>ผลตอบแทนคาดหวัง (% / ปี)</Label>
                <Input type="number" placeholder="7" value={form.annualReturnRate} onChange={e => updateForm("annualReturnRate", e.target.value)} min={0} max={100} step={0.1} />
              </div>
              {formError && <p className="md:col-span-2 text-sm text-destructive">{formError}</p>}
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={saving}>{saving ? "กำลังบันทึก..." : "บันทึกเป้าหมาย"}</Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setFormError(""); }}>ยกเลิก</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : goals.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-4">
          {goals.map(g => <GoalCard key={g.id} goal={g} onDelete={handleDelete} />)}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <Target className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">ยังไม่มีเป้าหมายการเงิน<br />กด "เพิ่มเป้าหมาย" เพื่อเริ่มต้น</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
