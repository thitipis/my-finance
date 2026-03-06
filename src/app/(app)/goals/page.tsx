"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Target, Plus, Trash2, Loader2, CheckCircle2, Clock, AlertCircle,
  Pencil, X, ChevronRight, Zap, TrendingUp, Wallet, Shield,
  GraduationCap, Star, Home, Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Utils ────────────────────────────────────────────────────────────────────

const thb = (n: number) =>
  n >= 1_000_000 ? `฿${(n / 1_000_000).toFixed(2)}M`
  : n >= 1_000   ? `฿${(n / 1_000).toFixed(0)}K`
  : `฿${Math.round(n).toLocaleString("th-TH")}`;

// FV formula — months to reach target
function calcMonths(target: number, current: number, monthly: number, rateAnnual: number): number | null {
  if (current >= target) return 0;
  if (monthly <= 0 && rateAnnual <= 0) return null;
  const r = rateAnnual / 100 / 12;
  if (r <= 0) {
    if (monthly <= 0) return null;
    return Math.ceil((target - current) / monthly);
  }
  let lo = 0, hi = 12 * 80;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const fv = current * Math.pow(1 + r, mid) + monthly * ((Math.pow(1 + r, mid) - 1) / r);
    if (fv >= target) hi = mid; else lo = mid + 1;
  }
  return lo >= 12 * 80 ? null : lo;
}

function fmtDate(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString("th-TH", { year: "numeric", month: "short" });
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Projection = { projectedCompletionDate: string | null; onTrack: boolean; progressPercent: number; monthsRemaining: number | null };
type Goal = { id: string; name: string; goalType: string; targetAmount: string; currentAmount: string; monthlyContribution: string; annualReturnRate: string; projection: Projection };
type Profile = { annualSalary: number; monthlyExpenses: number; emergencyFundAmount: number; totalDebt: number; monthlyDebtPayment: number };

// ─── Goal type config ─────────────────────────────────────────────────────────

const GOAL_TYPES = [
  { value: "retirement",     label: "เกษียณอายุ",    Icon: TrendingUp, color: "#6366f1", bg: "from-indigo-500/10 to-violet-500/5",  border: "border-indigo-200" },
  { value: "emergency_fund", label: "กองทุนฉุกเฉิน", Icon: Shield,     color: "#f59e0b", bg: "from-amber-500/10 to-amber-500/5",   border: "border-amber-200" },
  { value: "home_car",       label: "บ้าน / รถ",     Icon: Home,       color: "#3b82f6", bg: "from-blue-500/10 to-blue-500/5",    border: "border-blue-200" },
  { value: "education",      label: "การศึกษา",      Icon: GraduationCap, color: "#8b5cf6", bg: "from-purple-500/10 to-purple-500/5", border: "border-purple-200" },
  { value: "investment",     label: "การลงทุน",      Icon: Zap,        color: "#10b981", bg: "from-emerald-500/10 to-emerald-500/5", border: "border-emerald-200" },
  { value: "custom",         label: "อื่น ๆ",        Icon: Star,       color: "#64748b", bg: "from-slate-500/10 to-slate-500/5",  border: "border-slate-200" },
];
function getType(v: string) { return GOAL_TYPES.find(t => t.value === v) ?? GOAL_TYPES[GOAL_TYPES.length - 1]; }

// ─── Ring SVG ─────────────────────────────────────────────────────────────────

function Ring({ pct, color, size = 72 }: { pct: number; color: string; size?: number }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * Math.min(pct, 100) / 100;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={7} stroke="currentColor" className="text-muted/20" fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={7} stroke={pct >= 100 ? "#10b981" : color} fill="none"
        strokeDasharray={`${dash.toFixed(1)} ${c.toFixed(1)}`} strokeLinecap="round" />
    </svg>
  );
}

// ─── Live Calculator panel (shown inside Add or Edit form) ────────────────────

function LiveCalc({ target, current, monthly, rate }: { target: number; current: number; monthly: number; rate: number }) {
  const months = calcMonths(target, current, monthly, rate);
  const left = Math.max(0, target - current);
  const pct  = target > 0 ? Math.min(100, (current / target) * 100) : 0;

  const noMonthly = monthly <= 0 && rate <= 0;
  const done = current >= target;

  return (
    <div className="rounded-xl bg-muted/40 border p-4 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">ผลการคำนวณแบบ Real-time</p>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">ความคืบหน้า</span>
          <span className="font-semibold">{pct.toFixed(1)}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: done ? "#10b981" : "#6366f1" }} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-background rounded-lg py-2 px-1">
          <p className="text-[10px] text-muted-foreground">ขาดอีก</p>
          <p className="text-sm font-bold mt-0.5">{done ? "✓ ครบแล้ว" : thb(left)}</p>
        </div>
        <div className="bg-background rounded-lg py-2 px-1">
          <p className="text-[10px] text-muted-foreground">ถึงเป้าใน</p>
          <p className="text-sm font-bold mt-0.5">
            {done ? "ครบแล้ว" : noMonthly ? "—" : months === null ? ">60 ปี" : `${months} เดือน`}
          </p>
        </div>
        <div className="bg-background rounded-lg py-2 px-1">
          <p className="text-[10px] text-muted-foreground">วันที่คาด</p>
          <p className="text-sm font-bold mt-0.5">
            {done ? "แล้ว" : noMonthly || months === null ? "—" : fmtDate(months)}
          </p>
        </div>
      </div>

      {!done && !noMonthly && months !== null && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Flame className="h-3.5 w-3.5 text-orange-400" />
          ออม {thb(monthly)}/เดือน ด้วยผลตอบแทน {rate}%/ปี
        </p>
      )}
    </div>
  );
}

// ─── Suggestion chip — from profile ──────────────────────────────────────────

function SuggestChip({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="text-[11px] bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium hover:bg-primary/20 transition-colors flex items-center gap-1">
      <Zap className="h-3 w-3" />{label}: {value}
    </button>
  );
}

// ─── Add Goal Form ────────────────────────────────────────────────────────────

const EMPTY = { name: "", goalType: "custom", targetAmount: "", currentAmount: "0", monthlyContribution: "", annualReturnRate: "7" };

function AddGoalPanel({ profile, onSaved, onCancel }: { profile: Profile | null; onSaved: (g: Goal) => void; onCancel: () => void }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const type  = getType(form.goalType);
  const tNum  = parseFloat(form.targetAmount) || 0;
  const cNum  = parseFloat(form.currentAmount) || 0;
  const mNum  = parseFloat(form.monthlyContribution) || 0;
  const rNum  = parseFloat(form.annualReturnRate) || 0;

  // Suggestions from profile
  const monthlyIncome = profile ? Math.round(profile.annualSalary / 12) : 0;
  const savableGuess  = profile ? Math.max(0, monthlyIncome - profile.monthlyExpenses - profile.monthlyDebtPayment) : 0;

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!form.name.trim() || tNum <= 0 || mNum < 0) { setErr("กรุณากรอกข้อมูลให้ครบ"); return; }
    setSaving(true);
    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, goalType: form.goalType, targetAmount: tNum, currentAmount: cNum, monthlyContribution: mNum, annualReturnRate: rNum }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setErr(data.error ?? "เกิดข้อผิดพลาด"); return; }
    onSaved(data.data);
    setForm(EMPTY);
  };

  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
      <div className={`h-1 w-full bg-gradient-to-r`} style={{ background: type.color }} />
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-bold text-base flex items-center gap-2">
            <type.Icon className="h-4 w-4" style={{ color: type.color }} />
            เพิ่มเป้าหมายใหม่
          </p>
          <button onClick={onCancel}><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {/* Type tabs */}
          <div className="flex flex-wrap gap-2">
            {GOAL_TYPES.map(t => (
              <button key={t.value} type="button"
                onClick={() => setForm(p => ({ ...p, goalType: t.value }))}
                className={cn(
                  "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium transition-all",
                  form.goalType === t.value ? "text-white border-transparent" : "text-muted-foreground hover:border-foreground/30"
                )}
                style={form.goalType === t.value ? { background: t.color, borderColor: t.color } : {}}
              >
                <t.Icon className="h-3.5 w-3.5" />{t.label}
              </button>
            ))}
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">ชื่อเป้าหมาย</label>
            <input required value={form.name} onChange={set("name")} placeholder="เช่น กองทุนฉุกเฉิน 6 เดือน"
              className="w-full h-10 rounded-xl border px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Target */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">เป้าหมาย (บาท)</label>
              <input required type="number" min={1} value={form.targetAmount} onChange={set("targetAmount")}
                placeholder="1,000,000"
                className="w-full h-10 rounded-xl border px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
              {/* Quick target suggestions */}
              {profile && form.goalType === "emergency_fund" && profile.monthlyExpenses > 0 && (
                <div className="flex gap-1.5 flex-wrap mt-1">
                  {[3,6].map(m => (
                    <SuggestChip key={m} label={`${m} เดือน`} value={thb(profile.monthlyExpenses * m)}
                      onClick={() => setForm(p => ({ ...p, targetAmount: String(Math.round(profile.monthlyExpenses * m)) }))} />
                  ))}
                </div>
              )}
            </div>

            {/* Current */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">มีอยู่แล้ว (บาท)</label>
              <input type="number" min={0} value={form.currentAmount} onChange={set("currentAmount")}
                placeholder="0"
                className="w-full h-10 rounded-xl border px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
              {profile && profile.emergencyFundAmount > 0 && form.goalType === "emergency_fund" && (
                <SuggestChip label="กองทุนฉุกเฉินปัจจุบัน" value={thb(profile.emergencyFundAmount)}
                  onClick={() => setForm(p => ({ ...p, currentAmount: String(profile.emergencyFundAmount) }))} />
              )}
            </div>

            {/* Monthly */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">ออม/เดือน (บาท)</label>
              <input required type="number" min={0} value={form.monthlyContribution} onChange={set("monthlyContribution")}
                placeholder={savableGuess > 0 ? savableGuess.toString() : "10,000"}
                className="w-full h-10 rounded-xl border px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
              {savableGuess > 0 && (
                <SuggestChip label="เงินออมได้ต่อเดือน" value={thb(savableGuess)}
                  onClick={() => setForm(p => ({ ...p, monthlyContribution: String(savableGuess) }))} />
              )}
            </div>

            {/* Rate */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">ผลตอบแทน (%/ปี)</label>
              <input type="number" min={0} max={100} step={0.5} value={form.annualReturnRate} onChange={set("annualReturnRate")}
                className="w-full h-10 rounded-xl border px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <div className="flex gap-1.5 mt-1">
                {[0, 3, 5, 7].map(r => (
                  <button key={r} type="button"
                    onClick={() => setForm(p => ({ ...p, annualReturnRate: String(r) }))}
                    className={cn("text-[11px] px-2 py-0.5 rounded-full border font-medium transition-colors",
                      form.annualReturnRate === String(r) ? "bg-primary text-white border-primary" : "hover:bg-muted"
                    )}>
                    {r}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live calc */}
          {tNum > 0 && <LiveCalc target={tNum} current={cNum} monthly={mNum} rate={rNum} />}

          {err && <p className="text-xs text-destructive">{err}</p>}

          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="flex-1 h-10 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 flex items-center justify-center gap-2 disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              บันทึกเป้าหมาย
            </button>
            <button type="button" onClick={onCancel}
              className="h-10 px-4 rounded-xl border text-sm font-semibold hover:bg-muted">
              ยกเลิก
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Goal Card ─────────────────────────────────────────────────────────────────

function GoalCard({ goal, onDelete, onUpdate }: { goal: Goal; onDelete: (id: string) => void; onUpdate: (g: Goal) => void }) {
  const type = getType(goal.goalType);
  const pct     = goal.projection.progressPercent;
  const current = Number(goal.currentAmount);
  const target  = Number(goal.targetAmount);
  const monthly = Number(goal.monthlyContribution);
  const rate    = Number(goal.annualReturnRate);
  const left    = Math.max(0, target - current);
  const done    = pct >= 100;

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: goal.name, targetAmount: goal.targetAmount, currentAmount: goal.currentAmount, monthlyContribution: goal.monthlyContribution, annualReturnRate: goal.annualReturnRate });
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const eTgt = parseFloat(editForm.targetAmount) || 0;
  const eCur = parseFloat(editForm.currentAmount) || 0;
  const eMon = parseFloat(editForm.monthlyContribution) || 0;
  const eRate = parseFloat(editForm.annualReturnRate) || 0;

  const setE = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setEditForm(p => ({ ...p, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch(`/api/goals/${goal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editForm.name, targetAmount: eTgt, currentAmount: eCur, monthlyContribution: eMon, annualReturnRate: eRate }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok && data.data) { onUpdate(data.data); setEditing(false); }
  };

  const handleDelete = async () => {
    if (!confirm("ลบเป้าหมายนี้?")) return;
    setDeleting(true);
    await fetch(`/api/goals/${goal.id}`, { method: "DELETE" });
    onDelete(goal.id);
  };

  return (
    <div className={cn("rounded-2xl border overflow-hidden bg-gradient-to-br", type.bg, type.border)}>
      {/* Color bar */}
      <div className="h-1" style={{ background: type.color }} />

      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Ring pct={pct} color={type.color} size={68} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-sm leading-tight">{goal.name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <type.Icon className="h-3 w-3" style={{ color: type.color }} />
                  {type.label}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => { setEditing(e => !e); setEditForm({ name: goal.name, targetAmount: goal.targetAmount, currentAmount: goal.currentAmount, monthlyContribution: goal.monthlyContribution, annualReturnRate: goal.annualReturnRate }); }}
                  className="p-1.5 rounded-lg hover:bg-black/5 text-muted-foreground hover:text-foreground transition-colors">
                  {editing ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                </button>
                <button onClick={handleDelete} disabled={deleting}
                  className="p-1.5 rounded-lg hover:bg-black/5 text-muted-foreground hover:text-destructive transition-colors">
                  {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {/* Big percentage */}
            <div className="mt-1.5">
              <span className="text-2xl font-black tabular-nums" style={{ color: done ? "#10b981" : type.color }}>
                {pct.toFixed(0)}%
              </span>
              <span className="text-xs text-muted-foreground ml-1">ของเป้าหมาย</span>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-1.5 text-center">
          {([
            { l: "ออมแล้ว", v: thb(current) },
            { l: "เป้าหมาย", v: thb(target) },
            { l: "ขาดอีก", v: done ? "✓" : thb(left), green: done },
          ] as { l: string; v: string; green?: boolean }[]).map(({ l, v, green }) => (
            <div key={l} className="bg-background/60 rounded-xl py-2">
              <p className="text-[10px] text-muted-foreground">{l}</p>
              <p className={cn("text-xs font-bold mt-0.5", green && "text-emerald-600")}>{v}</p>
            </div>
          ))}
        </div>

        {/* Timeline */}
        <div className="flex items-center justify-between text-xs border-t border-black/5 pt-2">
          <span className="text-muted-foreground">ออม {thb(monthly)}/เดือน · {rate}%/ปี</span>
          {done ? (
            <span className="flex items-center gap-1 text-emerald-600 font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" />ถึงเป้าแล้ว!
            </span>
          ) : goal.projection.projectedCompletionDate ? (
            <span className="flex items-center gap-1 font-medium" style={{ color: type.color }}>
              <Clock className="h-3.5 w-3.5" />
              {goal.projection.projectedCompletionDate.slice(0, 7)}
              {goal.projection.monthsRemaining !== null && ` · ${goal.projection.monthsRemaining} เดือน`}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-600">
              <AlertCircle className="h-3.5 w-3.5" />ยังประมาณไม่ได้
            </span>
          )}
        </div>

        {/* Inline edit */}
        {editing && (
          <div className="border-t pt-3 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground">แก้ไขเป้าหมาย</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <input value={editForm.name} onChange={setE("name")} placeholder="ชื่อเป้าหมาย"
                  className="w-full h-9 rounded-lg border px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              {[
                { k: "targetAmount",      p: "เป้าหมาย (บาท)" },
                { k: "currentAmount",     p: "มีอยู่แล้ว (บาท)" },
                { k: "monthlyContribution", p: "ออม/เดือน (บาท)" },
                { k: "annualReturnRate",  p: "ผลตอบแทน (%/ปี)" },
              ].map(({ k, p }) => (
                <input key={k} type="number" min={0} placeholder={p}
                  value={(editForm as Record<string, string>)[k]}
                  onChange={setE(k)}
                  className="h-9 rounded-lg border px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
              ))}
            </div>
            {/* Live calc in edit mode */}
            {eTgt > 0 && <LiveCalc target={eTgt} current={eCur} monthly={eMon} rate={eRate} />}
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving}
                className="h-8 px-4 rounded-lg bg-primary text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-60">
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                บันทึก
              </button>
              <button onClick={() => setEditing(false)}
                className="h-8 px-3 rounded-lg border text-xs font-semibold hover:bg-muted">ยกเลิก</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Summary bar ──────────────────────────────────────────────────────────────

function SummaryBar({ goals }: { goals: Goal[] }) {
  if (goals.length === 0) return null;
  const totalTarget  = goals.reduce((s, g) => s + Number(g.targetAmount), 0);
  const totalCurrent = goals.reduce((s, g) => s + Number(g.currentAmount), 0);
  const totalMonthly = goals.reduce((s, g) => s + Number(g.monthlyContribution), 0);
  const overallPct   = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;
  const doneCount    = goals.filter(g => g.projection.progressPercent >= 100).length;

  return (
    <div className="rounded-2xl border bg-gradient-to-br from-primary/5 to-primary/0 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold">ภาพรวมเป้าหมายทั้งหมด</p>
        <span className="text-xs text-muted-foreground">{doneCount}/{goals.length} ถึงเป้าแล้ว</span>
      </div>
      <div className="h-2.5 bg-muted rounded-full overflow-hidden mb-3">
        <div className="h-full rounded-full bg-primary transition-all duration-700"
          style={{ width: `${overallPct}%` }} />
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        {([
          { l: "ออมรวมแล้ว",       v: thb(totalCurrent) },
          { l: "เป้าหมายรวม",       v: thb(totalTarget) },
          { l: "ออมต่อเดือนรวม",    v: thb(totalMonthly) },
        ] as { l: string; v: string }[]).map(({ l, v }) => (
          <div key={l}>
            <p className="text-[10px] text-muted-foreground">{l}</p>
            <p className="text-sm font-bold mt-0.5">{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GoalsPage() {
  const [goals, setGoals]     = useState<Goal[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const loadGoals = useCallback(async () => {
    setLoading(true);
    const res  = await fetch("/api/goals");
    const data = await res.json();
    setGoals(data.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadGoals();
    // Load financial profile for smart suggestions
    fetch("/api/user/financial-profile").then(r => r.json()).then(d => {
      if (d.data) {
        const p = d.data;
        setProfile({
          annualSalary:       Number(p.annualSalary ?? 0),
          monthlyExpenses:    Number(p.monthlyExpenses ?? 0),
          emergencyFundAmount: Number(p.emergencyFundAmount ?? 0),
          totalDebt:          Number(p.totalDebt ?? 0),
          monthlyDebtPayment: Number(p.monthlyDebtPayment ?? 0),
        });
      }
    }).catch(() => {});
  }, [loadGoals]);

  const handleSaved = (g: Goal) => {
    setGoals(prev => [g, ...prev]);
    setShowAdd(false);
  };

  const handleDelete = (id: string) => setGoals(prev => prev.filter(g => g.id !== id));
  const handleUpdate = (updated: Goal) => setGoals(prev => prev.map(g => g.id === updated.id ? updated : g));

  // Monthly capacity hint from profile
  const monthlyIncome  = profile ? Math.round(profile.annualSalary / 12) : 0;
  const savableGuess   = profile ? Math.max(0, monthlyIncome - profile.monthlyExpenses - profile.monthlyDebtPayment) : 0;
  const totalMonthlyCommitted = goals.reduce((s, g) => s + Number(g.monthlyContribution), 0);
  const remaining = savableGuess > 0 ? savableGuess - totalMonthlyCommitted : null;

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            เป้าหมายการเงิน
          </h1>
          {profile && savableGuess > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              ออมได้ประมาณ <span className="font-semibold text-primary">{thb(savableGuess)}</span>/เดือน จากข้อมูลของคุณ
              {remaining !== null && remaining >= 0 && totalMonthlyCommitted > 0 && (
                <> · เหลือ <span className="font-semibold text-emerald-600">{thb(remaining)}</span></>
              )}
              {remaining !== null && remaining < 0 && (
                <> · <span className="text-amber-600 font-semibold">เกินงบ {thb(Math.abs(remaining))}</span></>
              )}
            </p>
          )}
        </div>
        <button
          onClick={() => setShowAdd(v => !v)}
          className={cn(
            "flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition-all",
            showAdd ? "bg-muted border" : "bg-primary text-white hover:bg-primary/90"
          )}
        >
          {showAdd ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showAdd ? "ยกเลิก" : "เพิ่มเป้าหมาย"}
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <AddGoalPanel profile={profile} onSaved={handleSaved} onCancel={() => setShowAdd(false)} />
      )}

      {/* Summary */}
      <SummaryBar goals={goals} />

      {/* Goal list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : goals.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {goals.map(g => (
            <GoalCard key={g.id} goal={g} onDelete={handleDelete} onUpdate={handleUpdate} />
          ))}
        </div>
      ) : !showAdd ? (
        <div className="rounded-2xl border border-dashed flex flex-col items-center justify-center py-16 text-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Target className="h-8 w-8 text-primary/60" />
          </div>
          <div>
            <p className="font-semibold text-muted-foreground">ยังไม่มีเป้าหมายการเงิน</p>
            <p className="text-xs text-muted-foreground mt-1">เริ่มสร้างเป้าหมายแรกของคุณเลย!</p>
          </div>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl bg-primary text-white hover:bg-primary/90">
            <Plus className="h-4 w-4" />เพิ่มเป้าหมายแรก
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
