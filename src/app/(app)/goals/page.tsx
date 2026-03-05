"use client";
import { useState, useEffect, useCallback } from "react";
import { Target, Plus, TrendingUp, Trash2, Loader2, CheckCircle2, Clock, AlertCircle, Pencil, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const thb = (n: number) =>
  n >= 1_000_000 ? `\u0e3f${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `\u0e3f${(n / 1_000).toFixed(0)}K`
  : `\u0e3f${n.toLocaleString("th-TH")}`;

type Projection = { projectedCompletionDate: string | null; onTrack: boolean; progressPercent: number; monthsRemaining: number | null };
type Goal = { id: string; name: string; goalType: string; targetAmount: string; currentAmount: string; monthlyContribution: string; annualReturnRate: string; projection: Projection };
const EMPTY_FORM = { name: "", goalType: "retirement", targetAmount: "", currentAmount: "0", monthlyContribution: "", annualReturnRate: "7" };

const GOAL_TYPES: { value: string; label: string; color: string; icon: string }[] = [
  { value: "retirement",     label: "เกษียณอายุ",    color: "#6366f1", icon: "🏖️" },
  { value: "emergency_fund", label: "กองทุนฉุกเฉิน", color: "#f59e0b", icon: "🛡️" },
  { value: "investment",     label: "การลงทุน",      color: "#10b981", icon: "📈" },
  { value: "home_car",       label: "บ้าน / รถ",     color: "#3b82f6", icon: "🏠" },
  { value: "education",      label: "ค่าการศึกษา",  color: "#8b5cf6", icon: "🎓" },
  { value: "custom",         label: "อื่น ๆ",        color: "#64748b", icon: "⭐" },
];

function ProgressRing({ pct, color, size = 64 }: { pct: number; color: string; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * Math.min(pct, 100) / 100;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={6}
        stroke="currentColor" className="text-muted/20" fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={6}
        stroke={pct >= 100 ? "#10b981" : color} fill="none"
        strokeDasharray={`${dash.toFixed(1)} ${circ.toFixed(1)}`}
        strokeLinecap="round" />
    </svg>
  );
}

function GoalCard({ goal, onDelete, onUpdate }: { goal: Goal; onDelete: (id: string) => void; onUpdate: (g: Goal) => void }) {
  const pct  = goal.projection.progressPercent;
  const type = GOAL_TYPES.find(t => t.value === goal.goalType) ?? GOAL_TYPES[GOAL_TYPES.length - 1];
  const [del, setDel] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: goal.name,
    targetAmount: goal.targetAmount,
    currentAmount: goal.currentAmount,
    monthlyContribution: goal.monthlyContribution,
    annualReturnRate: goal.annualReturnRate,
  });
  const [saving, setSaving] = useState(false);

  const handleDelete = async () => {
    if (!confirm("ลบเป้าหมายนี้?")) return;
    setDel(true);
    await fetch(`/api/goals/${goal.id}`, { method: "DELETE" });
    onDelete(goal.id);
  };

  const handleEditSave = async () => {
    setSaving(true);
    const res = await fetch(`/api/goals/${goal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editForm.name,
        targetAmount: parseFloat(editForm.targetAmount),
        currentAmount: parseFloat(editForm.currentAmount) || 0,
        monthlyContribution: parseFloat(editForm.monthlyContribution),
        annualReturnRate: parseFloat(editForm.annualReturnRate),
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok && data.data) { onUpdate(data.data); setEditing(false); }
  };

  const current = Number(goal.currentAmount);
  const target  = Number(goal.targetAmount);
  const monthly = Number(goal.monthlyContribution);
  const left    = Math.max(0, target - current);

  if (editing) {
    return (
      <Card className="overflow-hidden border-primary/40">
        <div className="h-1 w-full" style={{ background: type.color }} />
        <CardContent className="pt-4 pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm">{type.icon} แก้ไขเป้าหมาย</p>
            <button onClick={() => setEditing(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">ชื่อเป้าหมาย</Label>
              <Input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">เป้าหมาย (บาท)</Label>
              <Input type="number" value={editForm.targetAmount} onChange={e => setEditForm(p => ({ ...p, targetAmount: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">มีอยู่แล้ว (บาท)</Label>
              <Input type="number" value={editForm.currentAmount} onChange={e => setEditForm(p => ({ ...p, currentAmount: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ออม/เดือน (บาท)</Label>
              <Input type="number" value={editForm.monthlyContribution} onChange={e => setEditForm(p => ({ ...p, monthlyContribution: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">ผลตอบแทน (% / ปี)</Label>
              <Input type="number" value={editForm.annualReturnRate} onChange={e => setEditForm(p => ({ ...p, annualReturnRate: e.target.value }))} min={0} max={100} step={0.1} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleEditSave} disabled={saving}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              บันทึก
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>ยกเลิก</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="h-1 w-full" style={{ background: type.color }} />
      <CardContent className="pt-4 pb-4 space-y-3">
        <div className="flex items-start gap-3">
          <ProgressRing pct={pct} color={type.color} size={60} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-sm leading-tight">{goal.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{type.icon} {type.label}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => setEditing(true)}
                  className="text-muted-foreground hover:text-primary transition-colors mt-0.5">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={handleDelete} disabled={del}
                  className="text-muted-foreground hover:text-destructive transition-colors mt-0.5">
                  {del ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-xl font-bold" style={{ color: pct >= 100 ? "#10b981" : type.color }}>{pct}%</span>
              <span className="text-xs text-muted-foreground">ของเป้าหมาย</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: "มีอยู่แล้ว", value: thb(current) },
            { label: "เป้าหมาย",   value: thb(target) },
            { label: "ขาดอีก",     value: left === 0 ? "✓" : thb(left), green: left === 0 },
          ].map(({ label, value, green }) => (
            <div key={label} className="bg-muted/40 rounded-lg py-1.5 px-2">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={cn("text-sm font-semibold", green && "text-emerald-600")}>{value}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">ออม {thb(monthly)}/เดือน · {goal.annualReturnRate}%/ปี</span>
          {pct >= 100 ? (
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />ถึงเป้าหมายแล้ว!
            </span>
          ) : goal.projection.projectedCompletionDate ? (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {goal.projection.projectedCompletionDate.slice(0, 7)}
              {goal.projection.monthsRemaining !== null && ` (${goal.projection.monthsRemaining} เดือน)`}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-600">
              <AlertCircle className="h-3.5 w-3.5" />ยังไม่สามารถฉายภาพ
            </span>
          )}
        </div>
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

  const totalTarget  = goals.reduce((s, g) => s + Number(g.targetAmount), 0);
  const totalCurrent = goals.reduce((s, g) => s + Number(g.currentAmount), 0);
  const overallPct   = totalTarget > 0 ? Math.round(totalCurrent / totalTarget * 100) : 0;
  const doneCount    = goals.filter(g => g.projection.progressPercent >= 100).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            เป้าหมายการเงิน
          </h1>
          <p className="text-muted-foreground text-sm">วางแผนและติดตามเป้าหมายทางการเงินของคุณ</p>
        </div>
        <Button onClick={() => setShowForm(v => !v)}>
          <Plus className="h-4 w-4 mr-1" />เพิ่มเป้าหมาย
        </Button>
      </div>

      {goals.length > 0 && !loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "เป้าหมายทั้งหมด", value: `${goals.length} รายการ`,  icon: <Target className="h-4 w-4 text-primary" /> },
            { label: "สำเร็จแล้ว",      value: `${doneCount} รายการ`,  icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" /> },
            { label: "รวมออมแล้ว",      value: thb(totalCurrent),          icon: <TrendingUp className="h-4 w-4 text-blue-500" /> },
            { label: "ความคืบหน้ารวม", value: `${overallPct}%`,           icon: <Clock className="h-4 w-4 text-amber-500" /> },
          ].map(({ label, value, icon }) => (
            <Card key={label}>
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center gap-2 mb-1">{icon}<p className="text-xs text-muted-foreground">{label}</p></div>
                <p className="font-bold text-lg">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">เพิ่มเป้าหมายใหม่</CardTitle>
            <CardDescription>กรอกข้อมูลเป้าหมายที่คุณต้องการบรรลุ</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>ชื่อเป้าหมาย *</Label>
                <Input placeholder="เช่น เกษียณอายุ 60 ปี" value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div className="space-y-1">
                <Label>ประเภท</Label>
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={form.goalType} onChange={e => setForm(p => ({ ...p, goalType: e.target.value }))}>
                  {GOAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label>จำนวนเงินเป้าหมาย (บาท) *</Label>
                <Input type="number" placeholder="15,000,000" value={form.targetAmount}
                  onChange={e => setForm(p => ({ ...p, targetAmount: e.target.value }))} required min={1} />
              </div>
              <div className="space-y-1">
                <Label>ออมต่อเดือน (บาท) *</Label>
                <Input type="number" placeholder="15,000" value={form.monthlyContribution}
                  onChange={e => setForm(p => ({ ...p, monthlyContribution: e.target.value }))} required min={0} />
              </div>
              <div className="space-y-1">
                <Label>มีอยู่แล้ว (บาท)</Label>
                <Input type="number" placeholder="0" value={form.currentAmount}
                  onChange={e => setForm(p => ({ ...p, currentAmount: e.target.value }))} min={0} />
              </div>
              <div className="space-y-1">
                <Label>ผลตอบแทนคาดหวัง (% / ปี)</Label>
                <Input type="number" placeholder="7" value={form.annualReturnRate}
                  onChange={e => setForm(p => ({ ...p, annualReturnRate: e.target.value }))} min={0} max={100} step={0.1} />
              </div>
              {formError && <p className="md:col-span-2 text-sm text-destructive">{formError}</p>}
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />กำลังบันทึก…</> : "บันทึกเป้าหมาย"}
                </Button>
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
          {goals.map(g => <GoalCard key={g.id} goal={g} onDelete={handleDelete} onUpdate={updated => setGoals(prev => prev.map(x => x.id === updated.id ? updated : x))} />)}
        </div>
      ) : !showForm ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <Target className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">ยังไม่มีเป้าหมายการเงิน<br />เริ่มตั้งเป้าหมายแรกของคุณเลย!</p>
            <Button variant="outline" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-1" />เพิ่มเป้าหมายแรก
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
