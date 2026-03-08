"use client";
import { useEffect, useState } from "react";
import {
  Target, TrendingUp, Plus, Loader2, CalendarDays,
  X, AlertCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type FullGoal = {
  id: string; name: string; goalType: string;
  targetAmount: string; currentAmount: string;
  monthlyContribution: string; annualReturnRate: string;
  projection: {
    progressPercent: number; projectedCompletionDate: string | null;
    onTrack: boolean; monthsRemaining: number | null;
  };
};

// ─── Constants ────────────────────────────────────────────────────────────────
const GOAL_TYPE: Record<string, { emoji: string; label: string }> = {
  retirement:     { emoji: "🏖️", label: "เกษียณ"         },
  emergency_fund: { emoji: "🛡️", label: "กองทุนฉุกเฉิน"  },
  home_car:       { emoji: "🏠", label: "บ้าน / รถ"      },
  education:      { emoji: "🎓", label: "การศึกษา"       },
  investment:     { emoji: "📈", label: "การลงทุน"       },
  custom:         { emoji: "🎯", label: "อื่น ๆ"         },
};
const GOAL_TYPES_LIST = Object.entries(GOAL_TYPE).map(([value, { label }]) => ({ value, label }));

// ─── Manual Create Modal ──────────────────────────────────────────────────────
function ManualGoalModal({
  onClose,
  onGoalCreated,
}: {
  onClose: () => void;
  onGoalCreated: (g: FullGoal) => void;
}) {
  const [form, setForm] = useState({
    name: "", goalType: "custom",
    targetAmount: "", currentAmount: "0",
    monthlyContribution: "", annualReturnRate: "5",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.name || !form.targetAmount || !form.monthlyContribution) {
      setError("กรุณากรอกข้อมูลที่จำเป็น"); return;
    }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name, goalType: form.goalType,
          targetAmount: Number(form.targetAmount),
          currentAmount: Number(form.currentAmount),
          monthlyContribution: Number(form.monthlyContribution),
          annualReturnRate: Number(form.annualReturnRate),
        }),
      });
      const { data, error: err } = await res.json();
      if (!res.ok) { setError(err ?? "บันทึกไม่สำเร็จ"); setSaving(false); return; }
      const fullRes = await fetch("/api/goals");
      const { data: all } = await fullRes.json();
      const created = (all as FullGoal[]).find((g: FullGoal) => g.id === data.id) ?? data;
      onGoalCreated(created);
      onClose();
    } catch { setError("เกิดข้อผิดพลาด"); } finally { setSaving(false); }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: "blur(2px)", backgroundColor: "rgba(0,0,0,0.35)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b">
          <Target className="h-5 w-5 text-violet-500" />
          <p className="font-semibold text-slate-800 flex-1">สร้างเป้าหมายเอง</p>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600">ชื่อเป้าหมาย *</label>
            <input value={form.name} onChange={e => set("name", e.target.value)}
              placeholder="เช่น ซื้อบ้าน, กองทุนฉุกเฉิน"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-400" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600">ประเภท</label>
            <select value={form.goalType} onChange={e => set("goalType", e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-400 bg-white">
              {GOAL_TYPES_LIST.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">เป้าหมาย (฿) *</label>
              <input type="number" min={0} value={form.targetAmount} onChange={e => set("targetAmount", e.target.value)}
                placeholder="500000"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-400" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">มีอยู่แล้ว (฿)</label>
              <input type="number" min={0} value={form.currentAmount} onChange={e => set("currentAmount", e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-400" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">ออมต่อเดือน (฿) *</label>
              <input type="number" min={0} value={form.monthlyContribution} onChange={e => set("monthlyContribution", e.target.value)}
                placeholder="5000"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-400" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">ผลตอบแทน (%/ปี)</label>
              <input type="number" min={0} max={100} step={0.5} value={form.annualReturnRate} onChange={e => set("annualReturnRate", e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-violet-400" />
            </div>
          </div>
          {error && (
            <p className="text-xs text-red-600 flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" /> {error}
            </p>
          )}
        </div>
        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
            ยกเลิก
          </button>
          <button onClick={submit} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            บันทึก
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function GoalsPage() {
  const [goals, setGoals]           = useState<FullGoal[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    fetch("/api/goals")
      .then(r => r.json())
      .then(d => { setGoals(d.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const addGoal = (g: FullGoal) => setGoals(prev => [g, ...prev.filter(x => x.id !== g.id)]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  const totalTarget = goals.reduce((s, g) => s + Number(g.targetAmount),  0);
  const totalSaved  = goals.reduce((s, g) => s + Number(g.currentAmount), 0);
  const overallPct  = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;

  return (
    <>
      <div className="max-w-2xl mx-auto space-y-6 py-6 px-4">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Target className="h-6 w-6 text-violet-500" /> เป้าหมายการเงิน
            </h1>
            <p className="text-sm text-muted-foreground mt-1">สร้างและติดตามเป้าหมายของคุณ</p>
          </div>
          <button onClick={() => setShowManual(true)}
            className="flex items-center gap-1.5 bg-violet-600 text-white text-sm font-semibold px-3.5 py-2 rounded-xl hover:bg-violet-700 transition-all shadow-sm shrink-0">
            <Plus className="h-4 w-4" /> สร้างเป้าหมาย
          </button>
        </div>

        {/* Summary banner */}
        {goals.length > 0 && (
          <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-violet-900">{goals.length} เป้าหมาย</span>
              <span className="font-bold text-violet-700">{overallPct}% โดยรวม</span>
            </div>
            <div className="w-full bg-white/60 rounded-full h-2 overflow-hidden">
              <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${overallPct}%` }} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white/70 rounded-xl p-2.5 text-center">
                <p className="text-slate-500">เป้าหมายรวม</p>
                <p className="font-bold text-slate-800">{totalTarget.toLocaleString("th-TH")} ฿</p>
              </div>
              <div className="bg-white/70 rounded-xl p-2.5 text-center">
                <p className="text-slate-500">สะสมแล้ว</p>
                <p className="font-bold text-emerald-700">{totalSaved.toLocaleString("th-TH")} ฿</p>
              </div>
            </div>
          </div>
        )}

        {/* Goal list / empty state */}
        {goals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="h-16 w-16 rounded-2xl bg-violet-100 flex items-center justify-center">
              <Target className="h-8 w-8 text-violet-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-700">ยังไม่มีเป้าหมายการเงิน</p>
              <p className="text-sm text-muted-foreground mt-1">กดปุ่มด้านบนเพื่อสร้างเป้าหมายแรกของคุณ</p>
            </div>
            <button onClick={() => setShowManual(true)}
              className="flex items-center gap-2 bg-violet-600 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-violet-700 transition-all shadow-sm">
              <Plus className="h-4 w-4" /> สร้างเป้าหมาย
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {goals.map(g => {
              const pct  = Math.min(100, Math.round(g.projection.progressPercent));
              const meta = GOAL_TYPE[g.goalType] ?? GOAL_TYPE.custom;
              return (
                <div key={g.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl leading-none mt-0.5">{meta.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{g.name}</p>
                      <p className="text-xs text-muted-foreground">
                        เป้า {Number(g.targetAmount).toLocaleString("th-TH")} ฿
                        {g.projection.monthsRemaining !== null && g.projection.monthsRemaining > 0 && (
                          <span className="ml-2 inline-flex items-center gap-0.5 text-slate-400">
                            <CalendarDays className="h-3 w-3" />
                            อีก {Math.round(g.projection.monthsRemaining)} เดือน
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        pct >= 100 ? "bg-green-100 text-green-700" :
                        pct >= 50  ? "bg-blue-100  text-blue-700"  :
                                     "bg-slate-100 text-slate-600"
                      }`}>{pct}%</span>
                      <p className={`text-[10px] mt-0.5 font-medium ${
                        g.projection.onTrack ? "text-green-600" : "text-amber-600"
                      }`}>{g.projection.onTrack ? "อยู่ในแผน ✓" : "ช้ากว่าแผน"}</p>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${
                      pct >= 100 ? "bg-green-500" : pct >= 50 ? "bg-blue-500" : "bg-violet-500"
                    }`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>สะสม {Number(g.currentAmount).toLocaleString("th-TH")} ฿</span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {Number(g.monthlyContribution).toLocaleString("th-TH")} ฿/เดือน
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Add more */}
            <button onClick={() => setShowManual(true)}
              className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 text-slate-400 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50/50 transition-all rounded-2xl py-4 text-sm font-medium">
              <Plus className="h-4 w-4" /> เพิ่มเป้าหมาย
            </button>
          </div>
        )}
      </div>

      {showManual && <ManualGoalModal onClose={() => setShowManual(false)}  onGoalCreated={addGoal} />}
    </>
  );
}
