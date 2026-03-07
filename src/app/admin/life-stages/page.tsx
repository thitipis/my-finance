"use client";
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Check, X, ToggleLeft, ToggleRight } from "lucide-react";

interface LifeStage {
  id: string;
  ageFrom: number;
  ageTo: number;
  titleTh: string;
  descriptionTh: string;
  icon: string;
  allocEquity: number;
  allocBond: number;
  allocCash: number;
  colorHex: string;
  isActive: boolean;
  sortOrder: number;
}

const EMPTY: Omit<LifeStage, "id" | "isActive" | "sortOrder"> = {
  ageFrom: 18, ageTo: 25, titleTh: "", descriptionTh: "", icon: "🌱",
  allocEquity: 70, allocBond: 20, allocCash: 10, colorHex: "#6366f1",
};

export default function AdminLifeStagesPage() {
  const [stages, setStages] = useState<LifeStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<Omit<LifeStage, "id" | "isActive" | "sortOrder">>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function adminHeaders() {
    const key = typeof window !== "undefined" ? sessionStorage.getItem("admin_key") ?? "" : "";
    return { "Content-Type": "application/json", "x-admin-key": key };
  }

  useEffect(() => {
    fetch("/api/admin/life-stages", { headers: adminHeaders() })
      .then(r => r.json())
      .then(d => { setStages(d.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function startEdit(stage: LifeStage) {
    setEditId(stage.id);
    setForm({
      ageFrom: stage.ageFrom, ageTo: stage.ageTo,
      titleTh: stage.titleTh, descriptionTh: stage.descriptionTh,
      icon: stage.icon, allocEquity: stage.allocEquity,
      allocBond: stage.allocBond, allocCash: stage.allocCash,
      colorHex: stage.colorHex,
    });
  }

  async function handleSave() {
    if (!form.titleTh.trim()) { setError("กรุณากรอกชื่อช่วงวัย"); return; }
    if (form.allocEquity + form.allocBond + form.allocCash !== 100) {
      setError("สัดส่วนพอร์ตต้องรวมกันได้ 100%"); return;
    }
    setSaving(true); setError("");
    try {
      if (editId === "new") {
        const r = await fetch("/api/admin/life-stages", {
          method: "POST",
          headers: adminHeaders(),
          body: JSON.stringify({ ...form, sortOrder: stages.length + 1 }),
        });
        const d = await r.json();
        if (d.data) setStages(prev => [...prev, d.data]);
      } else {
        const r = await fetch("/api/admin/life-stages", {
          method: "PATCH",
          headers: adminHeaders(),
          body: JSON.stringify({ id: editId, ...form }),
        });
        const d = await r.json();
        if (d.data) setStages(prev => prev.map(s => s.id === editId ? d.data : s));
      }
      setEditId(null);
    } catch {
      setError("บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(stage: LifeStage) {
    setStages(prev => prev.map(s => s.id === stage.id ? { ...s, isActive: !s.isActive } : s));
    await fetch("/api/admin/life-stages", {
      method: "PATCH", headers: adminHeaders(),
      body: JSON.stringify({ id: stage.id, isActive: !stage.isActive }),
    });
  }

  async function handleDelete(stage: LifeStage) {
    if (!window.confirm(`ลบช่วงวัย "${stage.titleTh}" ใช่หรือไม่?`)) return;
    setStages(prev => prev.filter(s => s.id !== stage.id));
    await fetch(`/api/admin/life-stages?id=${stage.id}`, { method: "DELETE", headers: adminHeaders() });
  }

  const EditForm = () => (
    <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 mb-4">
      <h3 className="font-bold text-slate-800 mb-4">{editId === "new" ? "เพิ่มช่วงวัยใหม่" : "แก้ไขช่วงวัย"}</h3>
      {error && <p className="text-red-600 text-sm mb-3 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">ไอคอน</label>
          <input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm text-center text-2xl" maxLength={2} />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">อายุเริ่ม</label>
          <input type="number" value={form.ageFrom} onChange={e => setForm(f => ({ ...f, ageFrom: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">อายุสิ้นสุด</label>
          <input type="number" value={form.ageTo} onChange={e => setForm(f => ({ ...f, ageTo: Number(e.target.value) }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">สี (#hex)</label>
          <div className="flex gap-1">
            <input type="color" value={form.colorHex} onChange={e => setForm(f => ({ ...f, colorHex: e.target.value }))} className="w-10 h-9 border rounded-lg p-0.5 cursor-pointer" />
            <input value={form.colorHex} onChange={e => setForm(f => ({ ...f, colorHex: e.target.value }))} className="flex-1 border rounded-lg px-2 py-2 text-xs font-mono" />
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">ชื่อช่วงวัย (ภาษาไทย)</label>
          <input value={form.titleTh} onChange={e => setForm(f => ({ ...f, titleTh: e.target.value }))} placeholder="เช่น วัยเริ่มต้น" className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(["allocEquity", "allocBond", "allocCash"] as const).map((k, i) => (
            <div key={k}>
              <label className="text-xs font-medium text-slate-600 block mb-1">{["หุ้น %", "ตราสาร %", "เงินสด %"][i]}</label>
              <input type="number" min={0} max={100} value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: Number(e.target.value) }))} className="w-full border rounded-lg px-2 py-2 text-sm" />
            </div>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label className="text-xs font-medium text-slate-600 block mb-1">คำอธิบาย</label>
        <textarea value={form.descriptionTh} onChange={e => setForm(f => ({ ...f, descriptionTh: e.target.value }))} rows={2} placeholder="อธิบายลักษณะและคำแนะนำของช่วงวัยนี้..." className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
      </div>

      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
          <Check className="h-4 w-4" />{saving ? "กำลังบันทึก..." : "บันทึก"}
        </button>
        <button onClick={() => { setEditId(null); setError(""); }} className="flex items-center gap-1.5 border border-slate-300 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
          <X className="h-4 w-4" />ยกเลิก
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Life Stage Templates</h1>
          <p className="text-sm text-muted-foreground mt-1">กำหนดช่วงอายุ คำอธิบาย และสัดส่วนการลงทุนแนะนำสำหรับ Lineage</p>
        </div>
        <button
          onClick={() => { setEditId("new"); setForm(EMPTY); setError(""); }}
          disabled={editId !== null}
          className="flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />เพิ่มช่วงวัย
        </button>
      </div>

      {editId === "new" && <EditForm />}

      {loading ? (
        <p className="text-muted-foreground">กำลังโหลด...</p>
      ) : (
        <div className="space-y-3">
          {stages.map(stage => (
            <div key={stage.id}>
              {editId === stage.id && <EditForm />}
              {editId !== stage.id && (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-start gap-4">
                  <div
                    className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl text-2xl"
                    style={{ background: `${stage.colorHex}20` }}
                  >
                    {stage.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-800">{stage.titleTh}</span>
                      <span className="text-xs text-slate-400">{stage.ageFrom}–{stage.ageTo} ปี</span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full text-white" style={{ background: stage.colorHex }}>
                        Eq {stage.allocEquity}% / Bd {stage.allocBond}% / Ca {stage.allocCash}%
                      </span>
                      {!stage.isActive && <span className="text-[10px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">ปิดการใช้งาน</span>}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{stage.descriptionTh}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => handleToggle(stage)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" title="toggle">
                      {stage.isActive ? <ToggleRight className="h-5 w-5 text-emerald-500" /> : <ToggleLeft className="h-5 w-5 text-slate-400" />}
                    </button>
                    <button onClick={() => startEdit(stage)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(stage)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {stages.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <p>ยังไม่มี Life Stage Template</p>
              <p className="text-sm mt-1">คลิก "เพิ่มช่วงวัย" เพื่อเริ่มต้น</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
