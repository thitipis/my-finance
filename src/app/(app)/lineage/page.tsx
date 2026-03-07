"use client";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Plus, X, RefreshCw, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────
const PX_PER_YEAR = 36;

// ─── Avatar Options ───────────────────────────────────────────────────────────
const AVATARS = [
  { id: "human",     emoji: "🧑",  label: "Human" },
  { id: "panda",     emoji: "🐼",  label: "Panda" },
  { id: "fox",       emoji: "🦊",  label: "Fox" },
  { id: "cat",       emoji: "🐱",  label: "Cat" },
  { id: "robot",     emoji: "🤖",  label: "Robot" },
  { id: "astronaut", emoji: "🧑‍🚀", label: "Astronaut" },
];

// ─── Types ───────────────────────────────────────────────────────────────────
interface LifeStage {
  id: string; ageFrom: number; ageTo: number;
  titleTh: string; descriptionTh: string; icon: string;
  allocEquity: number; allocBond: number; allocCash: number; colorHex: string;
}
interface TlEvent {
  id: string; age: number; eventType: string; impact: string;
  title: string; description?: string | null; isAuto: boolean; isAI: boolean;
}
interface YrProj {
  age: number; year: number; netWorth: number; annualIncome: number;
  annualSavings: number; happiness: number; lifeStage: LifeStage | null;
  isRetired: boolean; isBroke: boolean;
}
interface LineageData {
  profile: Record<string, string | number | null>;
  plan: Record<string, string | number | null> | null;
  goals: Array<{ id: string; name: string; targetAmount: number; targetDate: string | null; goalType: string }>;
  lifeStages: LifeStage[];
  savedEvents: TlEvent[];
  riskLevel: string;
}
type AwarenessItem = { text: string; type: "warn" | "good" | "info" };

// ─── Helpers ─────────────────────────────────────────────────────────────────
function compact(n: number): string {
  if (n >= 1e9) return `฿${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `฿${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `฿${(n / 1e3).toFixed(0)}K`;
  return `฿${Math.round(n).toLocaleString()}`;
}

// ─── Projection Engine ───────────────────────────────────────────────────────
function computeProjections(data: LineageData, lifeExpectancy: number): YrProj[] {
  const p    = data.profile ?? {};
  const plan = data.plan;
  const ls   = data.lifeStages ?? [];
  const currentAge    = Number(plan?.currentAge ?? 30);
  const retirementAge = Number(plan?.retirementAge ?? 60);
  const currentYear   = new Date().getFullYear();
  const annualSalary    = Number(p.annualSalary ?? 0);
  const monthlyExpenses = Number(p.monthlyExpenses ?? 0);
  const monthlyDebtPmt  = Number(p.monthlyDebtPayment ?? 0);
  const debtRate        = Number(p.debtInterestRate ?? 7) / 100;
  const ef              = Number(p.emergencyFundAmount ?? 0);
  const currentInvest = [p.goldAmount, p.cryptoAmount, p.etfAmount, p.thaiStockAmount, p.foreignStockAmount, p.otherInvestAmount, p.emergencyFundAmount]
    .reduce<number>((s, v) => s + Number(v ?? 0), 0);
  const startWealth      = Math.max(currentInvest, Number(plan?.currentSavings ?? 0));
  const initialDebt      = Number(p.totalDebt ?? 0);
  const riskReturn       = data.riskLevel === "aggressive" ? 0.08 : data.riskLevel === "conservative" ? 0.04 : 0.06;
  const inflationRate    = Number(plan?.inflationRate ?? 3) / 100;
  const retirementAnnual = Number(plan?.monthlyRetirementNeeds ?? 0) * 12 || monthlyExpenses * 12;
  let netWorth = startWealth - initialDebt;
  let remDebt  = initialDebt;
  let curDebt  = monthlyDebtPmt;
  const out: YrProj[] = [];
  for (let age = currentAge; age <= lifeExpectancy; age++) {
    const yi        = age - currentAge;
    const isRetired = age >= retirementAge;
    const lifeStage = ls.find(s => age >= s.ageFrom && age <= s.ageTo) ?? null;
    let annualIncome = 0, annualSavings = 0;
    if (!isRetired) {
      annualIncome = annualSalary * Math.pow(1.03, yi);
      const annualExp = monthlyExpenses * 12 * Math.pow(1 + inflationRate, yi);
      if (remDebt > 0) {
        const interest = remDebt * debtRate;
        remDebt = Math.max(0, remDebt + interest - curDebt * 12);
        if (remDebt <= 0) { remDebt = 0; curDebt = 0; }
      }
      annualSavings = Math.max(0, annualIncome - annualExp - curDebt * 12);
      netWorth = (netWorth + annualSavings) * (1 + riskReturn);
    } else {
      netWorth = netWorth * 1.04 - retirementAnnual * Math.pow(1 + inflationRate, age - retirementAge);
    }
    let h = 55;
    if (ef >= monthlyExpenses * 3) h += 8;
    if (ef >= monthlyExpenses * 6) h += 5;
    if (remDebt === 0 && initialDebt > 0) h += 8;
    if (netWorth > annualSalary * 5) h += 10;
    if (netWorth < 0) h -= 20;
    out.push({ age, year: currentYear + yi, netWorth: Math.max(0, netWorth), annualIncome, annualSavings,
      happiness: Math.max(10, Math.min(98, h)), lifeStage, isRetired, isBroke: netWorth <= 0 && isRetired });
  }
  return out;
}

// ─── Auto Events ─────────────────────────────────────────────────────────────
function genAutoEvents(data: LineageData, projections: YrProj[]): TlEvent[] {
  const evs: TlEvent[] = [];
  const plan = data.plan;
  const p    = data.profile ?? {};
  const currentAge    = Number(plan?.currentAge ?? 30);
  const retirementAge = Number(plan?.retirementAge ?? 60);
  const now = new Date().getFullYear();
  data.goals.forEach(g => {
    if (g.targetDate) {
      const age = currentAge + (new Date(g.targetDate).getFullYear() - now);
      if (age > currentAge && age <= 100)
        evs.push({ id: `g_${g.id}`, age, eventType: "goal", impact: "positive",
          title: `🏆 ${g.name}`, description: `฿${Number(g.targetAmount).toLocaleString()}`, isAuto: true, isAI: false });
    }
  });
  evs.push({ id: "retirement", age: retirementAge, eventType: "life_stage", impact: "positive",
    title: "🌅 เกษียณ", description: "เริ่มบทใหม่", isAuto: true, isAI: false });
  const totalDebt = Number(p.totalDebt ?? 0), mDebt = Number(p.monthlyDebtPayment ?? 0);
  if (totalDebt > 0 && mDebt > 0) {
    const dfAge = currentAge + Math.ceil(totalDebt / (mDebt * 12));
    if (dfAge < retirementAge && dfAge > currentAge)
      evs.push({ id: "debt_free", age: dfAge, eventType: "happy", impact: "positive",
        title: "🎉 ปลอดหนี้!", description: `฿${totalDebt.toLocaleString()}`, isAuto: true, isAI: false });
  }
  const ef = Number(p.emergencyFundAmount ?? 0), me = Number(p.monthlyExpenses ?? 0);
  if (me > 0 && ef < me * 3)
    evs.push({ id: "ef_gap", age: currentAge, eventType: "crisis", impact: "negative",
      title: "⚠️ เงินสำรองน้อย", description: "ควรมี 3 เดือน", isAuto: true, isAI: false });
  const brokeP = projections.find(pr => pr.isBroke);
  if (brokeP)
    evs.push({ id: "broke", age: brokeP.age, eventType: "crisis", impact: "negative",
      title: "🚨 เงินอาจหมด", description: "ปรับแผนออมเพิ่ม", isAuto: true, isAI: false });
  return evs;
}

// ─── Awareness Items ─────────────────────────────────────────────────────────
function genAwarenessItems(age: number, proj: YrProj, data: LineageData, projections: YrProj[]): AwarenessItem[] {
  const items: AwarenessItem[] = [];
  const p    = data.profile ?? {};
  const plan = data.plan;
  const retirementAge = Number(plan?.retirementAge ?? 60);
  const currentAge    = Number(plan?.currentAge ?? 30);
  if (proj.isBroke)
    items.push({ text: "เงินออมอาจหมดในช่วงอายุนี้ — ต้องปรับแผนเร่งด่วน", type: "warn" });
  if (!proj.isRetired && age >= retirementAge - 5)
    items.push({ text: `เหลืออีก ${retirementAge - age} ปีก่อนเกษียณ — เพิ่มการออมให้สูงสุดและลดความเสี่ยงพอร์ต`, type: "warn" });
  if (age === retirementAge)
    items.push({ text: "ปีเกษียณ — ปรับพอร์ตเป็น Conservative เพื่อรักษาเงินต้น วางแผนรายได้", type: "info" });
  if (proj.isRetired && age > retirementAge) {
    const futureBroke = projections.filter(pr => pr.age > age && pr.isBroke);
    if (futureBroke.length === 0)
      items.push({ text: "แผนเกษียณแข็งแกร่ง — ทรัพย์สินเพียงพอตลอดช่วงชีวิตที่เหลือ", type: "good" });
    else
      items.push({ text: `คาดว่าเงินออมจะหมดที่อายุ ${futureBroke[0].age} ปี — พิจารณาลดรายจ่ายหรือหารายได้เสริม`, type: "warn" });
  }
  if (age <= currentAge + 1) {
    const ef = Number(p.emergencyFundAmount ?? 0), me = Number(p.monthlyExpenses ?? 0);
    if (me > 0 && ef < me * 3)
      items.push({ text: `เงินฉุกเฉินไม่เพียงพอ — มี ${compact(ef)} ควรมีอย่างน้อย ${compact(me * 3)}`, type: "warn" });
    const totalDebt = Number(p.totalDebt ?? 0), annSal = Number(p.annualSalary ?? 0);
    if (annSal > 0 && totalDebt > annSal * 3)
      items.push({ text: `หนี้สูงเกินไป (${compact(totalDebt)}) — ควรเร่งชำระก่อนลงทุน`, type: "warn" });
  }
  if (age % 10 === 0)
    items.push({ text: `วัย ${age} — ทบทวนประกันชีวิต แผนมรดก และเป้าหมายการเงินทั้งหมด`, type: "info" });
  const prevNW = projections.find(pr => pr.age === age - 1)?.netWorth ?? 0;
  if (proj.netWorth >= 10_000_000 && prevNW < 10_000_000)
    items.push({ text: "Net Worth ผ่าน 10 ล้านบาท — ถึงเวลาวางแผนภาษีขั้นสูงและมรดก", type: "good" });
  if (!proj.isRetired && proj.annualSavings > 0 && proj.happiness >= 75)
    items.push({ text: "การออมอยู่ในเกณฑ์ดี — พิจารณาเพิ่มสินทรัพย์ที่ให้ผลตอบแทนสูงขึ้น", type: "good" });
  return items;
}

// ─── Add Event Modal ─────────────────────────────────────────────────────────
function AddEventModal({ currentAge, lifeExpectancy, defaultAge, onSave, onClose }: {
  currentAge: number; lifeExpectancy: number; defaultAge: number;
  onSave: (ev: TlEvent) => void; onClose: () => void;
}) {
  const [age,       setAge]       = useState(String(defaultAge));
  const [eventType, setEventType] = useState("custom");
  const [impact,    setImpact]    = useState("positive");
  const [title,     setTitle]     = useState("");
  const [desc,      setDesc]      = useState("");
  const [saving,    setSaving]    = useState(false);

  async function handleSave() {
    if (!title.trim() || !age) return;
    setSaving(true);
    try {
      const ageNum  = Number(age);
      const yearNum = new Date().getFullYear() + (ageNum - currentAge);
      const res     = await fetch("/api/lineage/events", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ age: ageNum, eventYear: yearNum, eventType, impact, title: title.trim(), description: desc.trim() || null }),
      });
      const data = await res.json();
      if (data.data) {
        onSave({ id: data.data.id, age: ageNum, eventType, impact, title: title.trim(), description: desc.trim() || null, isAuto: false, isAI: false });
        onClose();
      }
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-slate-800 text-lg">เพิ่มเหตุการณ์ชีวิต</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">ชื่อเหตุการณ์</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="เช่น ซื้อบ้านหลังแรก, ลูกเกิด" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">อายุ (ปี)</label>
              <input type="number" min={currentAge} max={lifeExpectancy} value={age} onChange={e => setAge(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">ประเภท</label>
              <select value={eventType} onChange={e => setEventType(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400">
                <option value="happy">😊 ความสุข</option>
                <option value="goal">🏆 เป้าหมาย</option>
                <option value="crisis">⚠️ ความท้าทาย</option>
                <option value="allocation">📊 ปรับพอร์ต</option>
                <option value="custom">📌 อื่นๆ</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">ผลกระทบ</label>
            <div className="grid grid-cols-3 gap-2">
              {(["positive", "neutral", "negative"] as const).map(v => (
                <button key={v} onClick={() => setImpact(v)} className={cn("rounded-xl py-2 text-xs font-semibold border transition-all", impact === v ? "bg-violet-600 text-white border-violet-600" : "border-slate-200 text-slate-600 hover:border-violet-400")}>
                  {v === "positive" ? "😊 บวก" : v === "neutral" ? "😐 กลาง" : "😟 ลบ"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">รายละเอียด</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} placeholder="เพิ่มเติม..." className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none" />
          </div>
          <button onClick={handleSave} disabled={saving || !title.trim()} className="w-full bg-violet-600 text-white font-bold py-3 rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-all text-sm">
            {saving ? "กำลังบันทึก..." : "บันทึกเหตุการณ์"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function LineagePage() {
  const [rawData,        setRawData]        = useState<LineageData | null>(null);
  const [lifeExpectancy, setLifeExpectancy] = useState(85);
  const [selectedAge,    setSelectedAge]    = useState(30);
  const [avatarId,       setAvatarId]       = useState("human");
  const [manualEvents,   setManualEvents]   = useState<TlEvent[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [showAddModal,   setShowAddModal]   = useState(false);
  const [showSettings,   setShowSettings]   = useState(false);
  const [isDragging,     setIsDragging]     = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/lineage")
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => { setRawData(d); setSelectedAge(Number(d.plan?.currentAge ?? 30)); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const projections = useMemo(() => rawData ? computeProjections(rawData, lifeExpectancy) : [], [rawData, lifeExpectancy]);
  const events = useMemo(() => {
    if (!rawData) return [];
    return [...rawData.savedEvents, ...manualEvents, ...genAutoEvents(rawData, projections)];
  }, [rawData, projections, manualEvents]);

  const startAge     = projections[0]?.age ?? 18;
  const endAge       = projections[projections.length - 1]?.age ?? lifeExpectancy;
  const selectedProj = projections.find(pr => pr.age === selectedAge) ?? projections[0];
  const eventsAtAge  = events.filter(e => e.age === selectedAge);
  const awarenessItems = useMemo(
    () => rawData && selectedProj ? genAwarenessItems(selectedAge, selectedProj, rawData, projections) : [],
    [selectedAge, selectedProj, rawData, projections]
  );
  const avatar = AVATARS.find(a => a.id === avatarId) ?? AVATARS[0];

  const getAgeFromY = useCallback((clientY: number): number => {
    if (!timelineRef.current) return selectedAge;
    const rect = timelineRef.current.getBoundingClientRect();
    const y    = clientY - rect.top + timelineRef.current.scrollTop;
    return Math.max(startAge, Math.min(endAge, Math.round(y / PX_PER_YEAR) + startAge));
  }, [startAge, endAge, selectedAge]);

  const handleTimelineMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setSelectedAge(getAgeFromY(e.clientY));
  }, [getAgeFromY]);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => setSelectedAge(getAgeFromY(e.clientY));
    const onUp   = () => setIsDragging(false);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup",   onUp);
    return () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
  }, [isDragging, getAgeFromY]);

  useEffect(() => {
    if (!timelineRef.current || isDragging) return;
    const col = timelineRef.current;
    const y   = (selectedAge - startAge) * PX_PER_YEAR;
    if (y < col.scrollTop + 48 || y > col.scrollTop + col.clientHeight - 48)
      col.scrollTo({ top: y - col.clientHeight / 2, behavior: "smooth" });
  }, [selectedAge, startAge, isDragging]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
      <RefreshCw className="h-5 w-5 animate-spin mr-2" /> กำลังโหลด...
    </div>
  );
  if (!rawData) return <div className="p-8 text-muted-foreground">ไม่สามารถโหลดข้อมูลได้</div>;

  const plan          = rawData.plan;
  const currentAge_   = Number(plan?.currentAge ?? 30);
  const retirementAge = Number(plan?.retirementAge ?? 60);
  const timelineH     = (endAge - startAge + 1) * PX_PER_YEAR;
  const currentProj   = projections.find(pr => pr.age === currentAge_);

  return (
    <div className="flex flex-col bg-slate-50"
      style={{
        position: "fixed",
        top: 0,
        left: "15rem",   /* sidebar w-60 = 15rem */
        right: 0,
        bottom: 0,
        overflow: "hidden",
        zIndex: 10,
      }}
    >

      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-slate-100 px-5 py-3 flex items-center gap-3">
        <div className="flex-1">
          <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">Lineage</h1>
          <p className="text-xs text-slate-400 mt-0.5">เส้นทางชีวิตการเงิน · อายุ {currentAge_}–{lifeExpectancy} ปี</p>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 bg-violet-600 text-white text-xs font-semibold px-3 py-2 rounded-xl hover:bg-violet-700 transition-all shadow-sm">
          <Plus className="h-3.5 w-3.5" /> เหตุการณ์
        </button>
        <button onClick={() => setShowSettings(s => !s)} title="ตั้งค่า"
          className={cn("w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all",
            showSettings && "bg-slate-100 text-slate-700"
          )}>
          <Settings className="h-4 w-4" />
        </button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="flex-shrink-0 bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center gap-5 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Avatar</span>
            <div className="flex items-center gap-1">
              {AVATARS.map(av => (
                <button key={av.id} onClick={() => setAvatarId(av.id)} title={av.label}
                  className={cn("w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all",
                    avatarId === av.id ? "bg-white ring-2 ring-violet-400 shadow-sm" : "hover:bg-white/70 text-slate-600"
                  )}>
                  {av.emoji}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">อายุขัย</span>
            <input type="range" min={70} max={100} value={lifeExpectancy}
              onChange={e => setLifeExpectancy(Number(e.target.value))}
              className="w-24 accent-violet-500" />
            <span className="text-xs font-bold text-violet-600 w-6 text-right">{lifeExpectancy}</span>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="flex-shrink-0 bg-white border-b border-slate-100 px-5 py-2 flex items-center gap-6 overflow-x-auto">
        {[
          { label: "Net Worth ตอนนี้",          value: compact(currentProj?.netWorth ?? 0),    color: "text-emerald-600" },
          { label: `เกษียณ (${retirementAge} ปี)`, value: compact(projections.find(p => p.age === retirementAge)?.netWorth ?? 0), color: "text-violet-600" },
          { label: "รายได้/ปี",   value: compact(currentProj?.annualIncome ?? 0), color: "text-sky-600" },
          { label: "ออมได้/ปี",   value: compact(currentProj?.annualSavings ?? 0), color: "text-amber-600" },
        ].map(s => (
          <div key={s.label} className="flex-shrink-0">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">{s.label}</p>
            <p className={cn("text-base font-black leading-none mt-0.5", s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Vertical Timeline */}
        <div
          ref={timelineRef}
          onMouseDown={handleTimelineMouseDown}
          className="w-48 flex-shrink-0 border-r border-slate-200 bg-white overflow-y-auto overflow-x-hidden"
          style={{ cursor: isDragging ? "grabbing" : "pointer", userSelect: "none" }}
        >
          <div style={{ height: timelineH, position: "relative" }}>
            {rawData.lifeStages.map(stage => {
              const top = (Math.max(stage.ageFrom, startAge) - startAge) * PX_PER_YEAR;
              const h   = (Math.min(stage.ageTo, endAge) - Math.max(stage.ageFrom, startAge) + 1) * PX_PER_YEAR;
              if (h <= 0) return null;
              return (
                <div key={stage.id} style={{ position: "absolute", left: 0, right: 0, top, height: h, background: `${stage.colorHex}10`, borderTop: `1.5px solid ${stage.colorHex}30` }}>
                  <span style={{ color: stage.colorHex }} className="text-[9px] font-bold absolute left-11 top-1 select-none whitespace-nowrap">
                    {stage.icon} {stage.titleTh}
                  </span>
                </div>
              );
            })}
            <div style={{ position: "absolute", left: 36, top: 0, bottom: 0, width: 2, background: "#e2e8f0" }} />
            {projections.map(pr => {
              const top        = (pr.age - startAge) * PX_PER_YEAR;
              const isSelected = pr.age === selectedAge;
              const isCurrent  = pr.age === currentAge_;
              const isRetire   = pr.age === retirementAge;
              const show       = pr.age % 5 === 0 || isCurrent || isRetire || isSelected;
              const rowEvents  = events.filter(e => e.age === pr.age);
              return (
                <div key={pr.age} style={{
                  position: "absolute", left: 0, right: 0, top, height: PX_PER_YEAR,
                  display: "flex", alignItems: "center",
                  background: isSelected ? "#f5f3ff" : "transparent",
                  transition: "background 0.1s",
                }}>
                  <div style={{ width: 30, textAlign: "right", paddingRight: 4, flexShrink: 0 }}>
                    {show && (
                      <span style={{ fontSize: 10, fontFamily: "monospace",
                        fontWeight: isSelected || isCurrent || isRetire ? 800 : 500,
                        color: isCurrent ? "#d97706" : isRetire ? "#7c3aed" : isSelected ? "#7c3aed" : "#94a3b8" }}>
                        {pr.age}
                      </span>
                    )}
                  </div>
                  <div style={{ width: 8, flexShrink: 0, position: "relative", height: "100%" }}>
                    {(show || rowEvents.length > 0) && (
                      <div style={{
                        position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
                        width: isSelected ? 12 : isCurrent || isRetire ? 10 : 6,
                        height: isSelected ? 12 : isCurrent || isRetire ? 10 : 6,
                        borderRadius: "50%",
                        background: isSelected ? "#7c3aed" : isCurrent ? "#f59e0b" : isRetire ? "#8b5cf6" : "#cbd5e1",
                        border: isSelected ? "2px solid white" : "none",
                        boxShadow: isSelected ? "0 0 0 3px #7c3aed30" : "none", zIndex: 2,
                      }} />
                    )}
                  </div>
                  {isSelected && (
                    <div style={{ position: "absolute", left: 24, top: "50%", transform: "translateY(-50%)", zIndex: 10 }}
                      onMouseDown={e => { e.stopPropagation(); setIsDragging(true); }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: "50%", background: "white",
                        border: "2px solid #7c3aed", fontSize: 18,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 2px 12px #7c3aed40",
                        cursor: isDragging ? "grabbing" : "grab",
                        transform: isDragging ? "scale(1.15)" : "scale(1)",
                        transition: "transform 0.1s",
                      }}>
                        {avatar.emoji}
                      </div>
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 2, marginLeft: 6, overflow: "hidden" }}>
                    {rowEvents.slice(0, 5).map(ev => (
                      <div key={ev.id} style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                        background: ev.impact === "positive" ? "#34d399" : ev.impact === "negative" ? "#f87171" : "#94a3b8" }} />
                    ))}
                    {rowEvents.length > 5 && <span style={{ fontSize: 8, color: "#94a3b8" }}>+{rowEvents.length - 5}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Awareness Card */}
        <div className="flex-1 overflow-y-auto p-5 bg-slate-50">
          {selectedProj ? (
            <div className="max-w-xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-3xl flex-shrink-0">
                  {selectedProj.lifeStage?.icon ?? "📅"}
                </div>
                <div>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-4xl font-black text-slate-900 leading-none">{selectedProj.age}</span>
                    <span className="text-sm text-slate-400">ปี · {selectedProj.year}</span>
                    {selectedProj.isRetired && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700">เกษียณแล้ว</span>}
                  </div>
                  {selectedProj.lifeStage && (
                    <div className="mt-0.5">
                      <span className="text-sm font-bold" style={{ color: selectedProj.lifeStage.colorHex }}>{selectedProj.lifeStage.titleTh}</span>
                      <span className="text-xs text-slate-400 ml-2">{selectedProj.lifeStage.descriptionTh}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">สินทรัพย์สุทธิ์</p>
                  <p className={cn("text-xl font-black leading-tight", selectedProj.netWorth > 0 ? "text-emerald-600" : "text-red-500")}>
                    {compact(selectedProj.netWorth)}
                  </p>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">รายได้/ปี</p>
                  <p className="text-xl font-black text-slate-800 leading-tight">{compact(selectedProj.annualIncome)}</p>
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">ออมได้/ปี</p>
                  <p className="text-xl font-black text-sky-600 leading-tight">{compact(selectedProj.annualSavings)}</p>
                </div>
              </div>

              {eventsAtAge.length > 0 && (
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-3">เหตุการณ์ในวัยนี้</p>
                  <div className="flex flex-wrap gap-2">
                    {eventsAtAge.map(ev => (
                      <div key={ev.id} className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border",
                        ev.impact === "positive" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        ev.impact === "negative" ? "bg-red-50 text-red-700 border-red-200" :
                        "bg-slate-50 text-slate-700 border-slate-200"
                      )}>
                        {ev.title}
                        {ev.description && <span className="text-xs opacity-60">· {ev.description}</span>}
                        {!ev.isAuto && (
                          <button onClick={async () => {
                            await fetch(`/api/lineage/events?id=${ev.id}`, { method: "DELETE" });
                            setManualEvents(prev => prev.filter(me => me.id !== ev.id));
                          }} className="ml-0.5 opacity-40 hover:opacity-80"><X className="h-3 w-3" /></button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Awareness / นิติ card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-50">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">สิ่งที่ควรรู้ในวัยนี้</p>
                </div>
                <div className="p-3 space-y-2">
                  {awarenessItems.length > 0 ? awarenessItems.map((item, i) => (
                    <div key={i} className={cn(
                      "flex items-start gap-2.5 px-3.5 py-3 rounded-xl text-sm leading-snug",
                      item.type === "warn" ? "bg-amber-50 text-amber-800" :
                      item.type === "good" ? "bg-emerald-50 text-emerald-800" :
                      "bg-blue-50 text-blue-800"
                    )}>
                      <span className="flex-shrink-0 text-base leading-none mt-0.5">
                        {item.type === "warn" ? "⚠️" : item.type === "good" ? "✅" : "💡"}
                      </span>
                      <span>{item.text}</span>
                    </div>
                  )) : (
                    <div className="flex items-center gap-2 px-3.5 py-3 text-sm text-slate-400">
                      <span>✨</span> ไม่มีรายการเตือน — การเงินอยู่ในเส้นทางที่ดี
                    </div>
                  )}
                </div>
              </div>

              {selectedProj.lifeStage && (
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-4">พอร์ตเป้าหมาย · {selectedProj.lifeStage.titleTh}</p>
                  <div className="space-y-3">
                    {[
                      { label: "หุ้น · Equity",    pct: selectedProj.lifeStage.allocEquity, color: "#7c3aed" },
                      { label: "ตราสารหนี้ · Bond", pct: selectedProj.lifeStage.allocBond,   color: "#0ea5e9" },
                      { label: "เงินสด · Cash",   pct: selectedProj.lifeStage.allocCash,   color: "#10b981" },
                    ].map(item => (
                      <div key={item.label}>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-slate-600 font-medium">{item.label}</span>
                          <span className="font-black" style={{ color: item.color }}>{item.pct}%</span>
                        </div>
                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div style={{ width: `${item.pct}%`, background: item.color, height: "100%", borderRadius: 9999, transition: "width 0.4s ease" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">
              คลิกหรือลากบน Timeline เพื่อดูข้อมูลแต่ละวัย
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <AddEventModal
          currentAge={currentAge_}
          lifeExpectancy={lifeExpectancy}
          defaultAge={selectedAge}
          onSave={ev => setManualEvents(prev => [...prev, ev])}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
