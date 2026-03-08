"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Sparkles, Send, Square, Lock, Loader2, Settings2, Save,
  Eye, EyeOff, X, SquarePen, MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type Message = {
  role: "user" | "assistant";
  content: string;          // full text sent to AI
  displayContent?: string;  // optional clean card shown in the bubble
  topicIcon?: string;
  topicLabel?: string;
};

// ─── Provider / model catalogue ───────────────────────────────────────────────
type Provider = "gemini" | "openai" | "ollama";

const PROVIDERS: { value: Provider; label: string; logo: string }[] = [
  { value: "gemini", label: "Google Gemini",  logo: "✦" },
  { value: "openai", label: "OpenAI",         logo: "⬡" },
  { value: "ollama", label: "Ollama (Local)",  logo: "🦙" },
];

const MODELS: Record<Provider, { value: string; label: string }[]> = {
  gemini: [
    { value: "gemini-2.0-flash",      label: "Gemini 2.0 Flash"       },
    { value: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite"  },
    { value: "gemini-1.5-flash",      label: "Gemini 1.5 Flash"       },
    { value: "gemini-1.5-pro",        label: "Gemini 1.5 Pro"         },
  ],
  openai: [
    { value: "gpt-4o",        label: "GPT-4o"        },
    { value: "gpt-4o-mini",   label: "GPT-4o Mini"   },
    { value: "gpt-4-turbo",   label: "GPT-4 Turbo"   },
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
  ],
  ollama: [
    { value: "llama3",      label: "Llama 3"      },
    { value: "llama3.1",    label: "Llama 3.1"    },
    { value: "llama3.2",    label: "Llama 3.2"    },
    { value: "mistral",     label: "Mistral"      },
    { value: "phi3",        label: "Phi-3"        },
    { value: "gemma2",      label: "Gemma 2"      },
    { value: "deepseek-r1", label: "DeepSeek R1"  },
    { value: "qwen2.5",     label: "Qwen 2.5"     },
  ],
};

type StarterTopic = "tax" | "ssf_rmf" | "portfolio" | "insurance";

const STARTER_TOPICS: { icon: string; label: string; topic: StarterTopic }[] = [
  { icon: "💰", label: "วางแผนภาษี",     topic: "tax"       },
  { icon: "📈", label: "SSF & RMF",      topic: "ssf_rmf"   },
  { icon: "📊", label: "วิเคราะห์พอร์ต", topic: "portfolio" },
  { icon: "🛡️", label: "ประกันของฉัน",  topic: "insurance" },
];

// Short human-readable summary shown in the user bubble (not the full prompt)
const TOPIC_DISPLAY: Record<StarterTopic, string> = {
  tax:       "ขอให้วิเคราะห์และวางแผนภาษีปีนี้ตามข้อมูลการเงินของฉัน — ประมาณการภาษี, วงเงินลดหย่อนที่ยังใช้ได้, และลำดับความสำคัญของแต่ละช่องลดหย่อน",
  ssf_rmf:   "ขอให้วิเคราะห์ SSF และ RMF สำหรับฉัน — วงเงินที่ยังลงทุนได้, ควรเลือกตัวไหนก่อน, ประหยัดภาษีได้เท่าไหร่, และกลยุทธ์ระยะยาว",
  portfolio: "ขอให้วิเคราะห์พอร์ตการลงทุนของฉัน — สัดส่วนเหมาะกับความเสี่ยงไหม, ควร Rebalance อย่างไร, และควรลงทุนเพิ่มในสินทรัพย์ไหน",
  insurance: "ขอให้วิเคราะห์ความคุ้มครองประกันที่มีอยู่ — เพียงพอไหม, ช่องว่างที่สำคัญคืออะไร, และควรปรับปรุงอะไรก่อน",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildContextualPrompt(topic: StarterTopic, fp: any, risk: any, plan: any): string {
  const fmt = (n: unknown) => Number(n ?? 0).toLocaleString("th-TH");
  const riskLabel: Record<string, string> = {
    conservative: "อนุรักษ์นิยม", moderate: "ปานกลาง", aggressive: "เน้นผลตอบแทนสูง",
  };
  const filingLabel: Record<string, string> = {
    single: "โสด", married_no_income: "สมรส (คู่ไม่มีรายได้)",
    married_separate: "สมรส (แยกยื่น)", married_joint: "สมรส (ยื่นรวม)",
  };
  const income = Number(fp?.annualSalary ?? 0);
  const bonus  = Number(fp?.bonus ?? 0);

  const profileBlock = fp ? `📋 ข้อมูลทางการเงินของฉัน:
• รายได้: ${fmt(income)} บาท/ปี + โบนัส ${fmt(bonus)} บาท (รวม ${fmt(income + bonus)} บาท)
• สถานภาพ: ${filingLabel[fp.filingStatus] ?? fp.filingStatus} | บุตร ${fp.numChildren ?? 0} คน | ดูแลพ่อแม่ ${fp.numParents ?? 0} คน
• ประกันสังคม: ${fmt(fp.socialSecurity)} บาท/ปี | กองทุนสำรองฯ: ${fmt(fp.providentFundAmount)} บาท/ปี
• RMF: ${fmt(fp.rmfAmount)} บาท | SSF: ${fmt(fp.ssfAmount)} บาท | Thai ESG: ${fmt(fp.thaiEsgAmount)} บาท
• ประกันชีวิต: ${fmt(fp.lifeInsurancePremium)} บาท/ปี | ประกันสุขภาพ: ${fmt(fp.healthInsurancePremium)} บาท/ปี
• ประกันสุขภาพพ่อแม่: ${fmt(fp.parentHealthInsurancePremium)} บาท/ปี | ประกันบำนาญ: ${fmt(fp.annuityInsurancePremium)} บาท/ปี
• หุ้นไทย: ${fmt(fp.thaiStockAmount)} | หุ้นต่างประเทศ: ${fmt(fp.foreignStockAmount)} | ETF: ${fmt(fp.etfAmount)} | ทอง: ${fmt(fp.goldAmount)} | คริปโต: ${fmt(fp.cryptoAmount)} บาท\n\n` : "";

  const riskLine = risk ? `• ระดับความเสี่ยงที่รับได้: ${riskLabel[risk.riskLevel] ?? risk.riskLevel} (คะแนน ${risk.score}/100)\n` : "";
  const planLine = plan ? `• อายุ ${plan.currentAge ?? "?"} ปี → เกษียณอายุ ${plan.retirementAge ?? 60} ปี | ลงทุนเพิ่มได้ ${fmt(plan.monthlyInvestable)} บาท/เดือน | เงินออม ${fmt(plan.currentSavings)} บาท\n` : "";

  switch (topic) {
    case "tax":
      return `${profileBlock}ขอให้ช่วยวิเคราะห์และวางแผนภาษีปีนี้:
1. ประมาณการภาษีที่ต้องจ่าย (หรือได้คืน) ตามข้อมูลข้างต้น
2. วงเงินลดหย่อนที่ยังใช้ได้อีกในแต่ละประเภท (RMF, SSF, Thai ESG, ประกัน ฯลฯ) — แสดงเป็นตัวเลขที่ขาดอยู่
3. ลำดับความสำคัญในการนำเงินไปใส่ช่องลดหย่อนเพื่อประหยัดภาษีสูงสุด
4. ถ้าใช้สิทธิครบทุกช่องที่แนะนำ จะประหยัดภาษีได้เพิ่มรวมเท่าไหร่?`;

    case "ssf_rmf":
      return `${profileBlock}ขอให้ช่วยวิเคราะห์ SSF และ RMF:
1. คำนวณวงเงิน SSF และ RMF ที่ยังลงทุนได้อีกปีนี้ (ตามเพดานที่กฎหมายกำหนด)
2. ระหว่าง SSF กับ RMF ควรเลือกอะไรก่อน? เพราะอะไร? (พิจารณาทั้ง tax benefit และ flexibility)
3. คำนวณว่าถ้าลงทุนเพิ่มแต่ละตัว จะประหยัดภาษีได้เพิ่มเท่าไหร่?
4. กลยุทธ์ระยะยาวที่เหมาะกับฉัน รวมถึงควรเลือก RMF ประเภทไหน (equity, balanced, fixed income)?`;

    case "portfolio":
      return `${profileBlock}${riskLine}${planLine}ขอให้ช่วยวิเคราะห์พอร์ตการลงทุน:
1. สัดส่วน Asset Allocation ปัจจุบันเหมาะกับระดับความเสี่ยง "${riskLabel[risk?.riskLevel] ?? "ปานกลาง"}" ของฉันไหม?
2. ควร Rebalance อย่างไร? บอก % เป้าหมายของแต่ละสินทรัพย์
3. สินทรัพย์ที่ควรเพิ่ม/ลด พร้อมเหตุผล
4. ถ้าลงทุนเพิ่ม ${fmt(plan?.monthlyInvestable ?? 0)} บาท/เดือน ควรแบ่งไปแต่ละสินทรัพย์เท่าไหร่?`;

    case "insurance":
      return `${profileBlock}ขอให้ช่วยวิเคราะห์ความคุ้มครองประกัน:
1. ประกันชีวิตที่ควรมีตามรายได้และภาระของฉัน (คำนวณจาก income replacement method หรือ DIME)
2. ประกันสุขภาพที่มีอยู่ ${fmt(fp?.healthInsurancePremium)} บาท/ปี เพียงพอไหม? ควรซื้อเพิ่มไหม?
3. ประกันบำนาญ (annuity) ${fmt(fp?.annuityInsurancePremium)} บาท/ปี ช่วยแผนเกษียณได้แค่ไหน?
4. ช่องว่างความคุ้มครองที่สำคัญที่สุดของฉัน คืออะไร? ควรเริ่มแก้อย่างไรก่อน?`;
  }
}

const TONE_LABELS: Record<number, string> = {
  1: "อ่อนโยน / ให้กำลังใจ",
  2: "เป็นมิตร / สุภาพ",
  3: "มืออาชีพ (ค่าเริ่มต้น)",
  4: "ตรงไปตรงมา / กระชับ",
  5: "ตรงมาก / ไม่อ้อมค้อม",
};

// ─── Chat Session Management ──────────────────────────────────────────────────
type ChatSession = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
};

const MAX_SESSIONS = 40;
const sessionsKey = (uid: string) => `myfinance-sessions-${uid}`;

function loadSessionsFromStorage(uid: string): ChatSession[] {
  try { return JSON.parse(localStorage.getItem(sessionsKey(uid)) ?? "[]"); } catch { return []; }
}
function saveSessionsToStorage(uid: string, sessions: ChatSession[]) {
  localStorage.setItem(sessionsKey(uid), JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
}
function makeTitleFromMsg(msg: Message): string {
  if (msg.topicLabel) return `${msg.topicIcon ?? ""} ${msg.topicLabel}`.trim();
  const clean = msg.content.replace(/📋[\s\S]*?\n\n/, "").trim();
  return clean.length > 48 ? clean.slice(0, 48) + "…" : clean || "บทสนทนาใหม่";
}
function relativeDate(ts: number): string {
  const diff = Date.now() - ts;
  const d = 86400000;
  if (diff < d)       return "วันนี้";
  if (diff < 2 * d)   return "เมื่อวาน";
  if (diff < 7 * d)   return `${Math.floor(diff / d)} วันที่แล้ว`;
  return new Date(ts).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

function ThinkingIndicator({ model, startedAt }: { model: string; startedAt?: number }) {
  const steps = [
    "กำลังคิด...",
    "กำลังวิเคราะห์ข้อมูล...",
    "กำลังคำนวณ...",
    "กำลังเตรียมคำตอบ...",
    "กำลังตรวจสอบตัวเลข...",
  ];
  const [step, setStep] = useState(0);
  const initialElapsed = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
  const [elapsed, setElapsed] = useState(initialElapsed);
  useEffect(() => {
    const t1 = setInterval(() => setStep(s => (s + 1) % steps.length), 2500);
    const t2 = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => { clearInterval(t1); clearInterval(t2); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="space-y-1.5 pt-1">
      <div className="flex gap-1 items-center">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:0ms]" />
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:150ms]" />
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:300ms]" />
      </div>
      <p className="text-xs text-muted-foreground">{steps[step]}</p>
      {elapsed >= 4 && (
        <p className="text-xs text-muted-foreground/50">{elapsed}s · {model}</p>
      )}
    </div>
  );
}

// ─── Module-level stream state (survives page transitions / component unmounts) ────────────────
interface GStreamState {
  abort: AbortController;
  sessionId: string;
  accumulated: string;
  done: boolean;
  startedAt: number;
  listener: ((chunk: string, isDone: boolean) => void) | null;
}
let gStream: GStreamState | null = null;
let gLastCompleted: { sessionId: string; accumulated: string } | null = null;

function runStream(body: object, sessionId: string): GStreamState {
  const abort = new AbortController();
  const g: GStreamState = { abort, sessionId, accumulated: "", done: false, startedAt: Date.now(), listener: null };
  gStream = g;
  void (async () => {
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body), signal: abort.signal,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        g.accumulated = err.error ?? "เกิดข้อผิดพลาด";
        g.listener?.("" , true); return;
      }
      g.listener?.("__START__", false);
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = dec.decode(value, { stream: true });
        g.accumulated += chunk;
        g.listener?.(chunk, false);
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError" && !g.accumulated) {
        g.accumulated = "ขออภัย ไม่สามารถเชื่อมต่อได้ในขณะนี้";
      }
    } finally {
      g.done = true;
      if (gStream === g) gStream = null;
      // Cache the result so it can be recovered if the component remounts after completion
      if (g.accumulated) gLastCompleted = { sessionId: g.sessionId, accumulated: g.accumulated };
      g.listener?.("" , true);
    }
  })();
  return g;
}

export default function AiChatPage() {
  const { data: session, status } = useSession();
  const isPremium = (session?.user as { tier?: string })?.tier === "premium";

  const [messages, setMessages]           = useState<Message[]>([]);
  const [input, setInput]                 = useState("");
  const [loading, setLoading]             = useState(false);
  const [settingsOpen, setSettingsOpen]   = useState(false);

  // Tone & context
  const [toneLevel, setToneLevel]         = useState(3);
  const [customPrompt, setCustomPrompt]   = useState("");

  // Model / provider
  const [provider, setProvider]           = useState<Provider>("gemini");
  const [model, setModel]                 = useState("gemini-2.0-flash");
  const [apiToken, setApiToken]           = useState("");
  const [tokenMasked, setTokenMasked]     = useState<string | null>(null);
  const [hasToken, setHasToken]           = useState(false);
  const [showToken, setShowToken]         = useState(false);
  const [ollamaUrl, setOllamaUrl]         = useState("http://ollama:11434");
  const [customModel, setCustomModel]     = useState("");

  const [settingsSaved, setSettingsSaved]   = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [saveError, setSaveError]           = useState("");
  const [loadingTopic, setLoadingTopic]     = useState<StarterTopic | null>(null);
  const [isStreaming, setIsStreaming]        = useState(false);
  const [sessions, setSessions]             = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen]       = useState(true);

  const endRef           = useRef<HTMLDivElement>(null);
  const textareaRef       = useRef<HTMLTextAreaElement>(null);
  const sessionIdRef      = useRef<string | null>(null);
  const reconnectedRef    = useRef(false);
  const hasMessages       = messages.length > 0;

  // ── Load settings ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/user/ai-settings")
      .then(r => r.json())
      .then(({ data }) => {
        if (!data) return;
        setToneLevel(data.toneLevel ?? 3);
        setCustomPrompt(data.customPrompt ?? "");
        const p: Provider = (data.aiProvider as Provider) ?? "gemini";
        setProvider(p);
        setModel(data.aiModel ?? MODELS[p][0].value);
        setHasToken(data.hasToken ?? false);
        setTokenMasked(data.apiTokenMasked ?? null);
        setOllamaUrl(data.ollamaBaseUrl ?? "http://ollama:11434");
      })
      .catch(() => {});
  }, []);

  // Load sessions on login and restore the most recent one
  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;
    const loaded = loadSessionsFromStorage(session.user.id);
    setSessions(loaded);
    if (loaded[0]) {
      setCurrentSessionId(loaded[0].id);
      sessionIdRef.current = loaded[0].id;
      setMessages(loaded[0].messages);
    }
    // Restore history panel preference
    const pref = localStorage.getItem(`myfinance-history-open-${session.user.id}`);
    if (pref !== null) setHistoryOpen(pref === "1");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  // Reconnect to an in-progress stream when the user navigates back to this page
  useEffect(() => {
    if (!currentSessionId || reconnectedRef.current) return;
    reconnectedRef.current = true;
    const g = gStream;

    // ── Case 1: Stream still running ─────────────────────────────────────────
    if (g && !g.done && g.sessionId === currentSessionId) {
      // Ensure there is an assistant bubble to write into (it may have been
      // added while the component was unmounted, so setState was a no-op).
      setMessages(prev => {
        const msgs = [...prev];
        if (msgs[msgs.length - 1]?.role !== "assistant") {
          msgs.push({ role: "assistant", content: g.accumulated });
        } else {
          msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: g.accumulated };
        }
        return msgs;
      });
      // Show loading spinner if content hasn't started yet, otherwise stream cursor.
      // __START__ already fired (before component unmounted) so we must NOT rely on it again.
      let reconLoading = !g.accumulated;
      if (reconLoading) {
        setLoading(true);
      } else {
        setIsStreaming(true);
      }
      g.listener = (chunk, done) => {
        // __START__ won't fire again — handle defensively only
        if (chunk === "__START__") {
          reconLoading = false;
          setLoading(false);
          setIsStreaming(true);
          return;
        }
        if (done) {
          setMessages(prev => {
            const msgs = [...prev];
            if (msgs[msgs.length - 1]?.role === "assistant") {
              msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: g.accumulated };
            } else if (g.accumulated) {
              msgs.push({ role: "assistant", content: g.accumulated });
            }
            return msgs;
          });
          setLoading(false);
          setIsStreaming(false);
          return;
        }
        // First content chunk while still in loading phase → transition to streaming
        if (reconLoading) {
          reconLoading = false;
          setLoading(false);
          setIsStreaming(true);
        }
        setMessages(prev => {
          const msgs = [...prev];
          if (msgs[msgs.length - 1]?.role === "assistant") {
            msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: g.accumulated };
          }
          return msgs;
        });
      };
      return;
    }

    // ── Case 2: Stream finished while away — recover cached response ──────────
    const last = gLastCompleted;
    if (last && last.sessionId === currentSessionId && last.accumulated) {
      gLastCompleted = null;
      setMessages(prev => {
        const msgs = [...prev];
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg?.role !== "assistant") {
          // No assistant bubble yet (user navigated away before __START__ fired)
          msgs.push({ role: "assistant", content: last.accumulated });
        } else {
          // Always overwrite — localStorage may have partial content from when the
          // component unmounted mid-stream, so use the full accumulated text instead.
          msgs[msgs.length - 1] = { ...lastMsg, content: last.accumulated };
        }
        return msgs;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSessionId]);

  // Persist current session whenever messages change
  useEffect(() => {
    if (!session?.user?.id || messages.length === 0) return;
    const sessId = sessionIdRef.current;
    if (!sessId) return;
    setSessions(prev => {
      const existing = prev.find(s => s.id === sessId);
      const firstUser = messages.find(m => m.role === "user");
      const title = existing?.title ?? (firstUser ? makeTitleFromMsg(firstUser) : "บทสนทนาใหม่");
      const updated: ChatSession = {
        id: sessId, title, messages,
        createdAt: existing?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
      };
      const next = [updated, ...prev.filter(s => s.id !== sessId)];
      saveSessionsToStorage(session.user.id!, next);
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 180) + "px"; }
  }, [input]);

  // Pre-fill input when arriving from Goals page with ?intent=create-goal
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("intent") === "create-goal") {
      setInput("ฉันต้องการวางแผนเป้าหมายการเงินใหม่ ช่วยแนะนำขั้นตอนการตั้งเป้าหมายและช่วยคำนวณว่าต้องออมเดือนละเท่าไหร่ด้วยนะ");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleProviderChange = (p: Provider) => {
    setProvider(p);
    setModel(MODELS[p][0].value);
    setCustomModel("");
  };

  const effectiveModel = (provider === "ollama" && customModel.trim()) ? customModel.trim() : model;

  // ── Save settings ──────────────────────────────────────────────────────────
  const saveSettings = useCallback(async () => {
    setSettingsSaving(true);
    setSaveError("");
    try {
      const body: Record<string, unknown> = {
        toneLevel,
        customPrompt: customPrompt || null,
        aiProvider: provider,
        aiModel: effectiveModel,
        ollamaBaseUrl: ollamaUrl || null,
      };
      if (apiToken.trim()) body.apiToken = apiToken.trim();

      const res = await fetch("/api/user/ai-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const { data, error } = await res.json();
      if (!res.ok) { setSaveError(error ?? "บันทึกไม่สำเร็จ"); return; }
      setHasToken(data.hasToken);
      setTokenMasked(data.apiTokenMasked);
      setApiToken("");
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2500);
    } catch {
      setSaveError("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSettingsSaving(false);
    }
  }, [toneLevel, customPrompt, provider, effectiveModel, ollamaUrl, apiToken]);

  // ── Session management ─────────────────────────────────────────────────────
  const newChat = () => {
    const id = crypto.randomUUID();
    setCurrentSessionId(id);
    sessionIdRef.current = id;
    setMessages([]);
  };

  const loadSession = (sess: ChatSession) => {
    setCurrentSessionId(sess.id);
    sessionIdRef.current = sess.id;
    setMessages(sess.messages);
  };

  const deleteSession = (id: string) => {
    if (!session?.user?.id) return;
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id);
      saveSessionsToStorage(session.user.id!, next);
      return next;
    });
    if (id === currentSessionId) {
      setCurrentSessionId(null);
      sessionIdRef.current = null;
      setMessages([]);
    }
  };

  // ── Send message ───────────────────────────────────────────────────────────
  const send = async (
    text: string,
    opts?: { displayContent?: string; topicIcon?: string; topicLabel?: string },
  ) => {
    if (!text.trim() || !isPremium || loading || isStreaming) return;
    // Auto-create session on first message
    if (!sessionIdRef.current) {
      const id = crypto.randomUUID();
      setCurrentSessionId(id);
      sessionIdRef.current = id;
    }
    const userMsg: Message = { role: "user", content: text, ...opts };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setLoading(true);

    const sessId = sessionIdRef.current!;
    const g = runStream({ messages: history }, sessId);

    g.listener = (chunk, done) => {
      if (chunk === "__START__") {
        setLoading(false);
        setIsStreaming(true);
        setMessages(prev => [...prev, { role: "assistant", content: "" }]);
        return;
      }
      if (done) {
        setMessages(prev => {
          const msgs = [...prev];
          const last = msgs[msgs.length - 1];
          if (last?.role === "assistant") {
            if (!last.content && g.accumulated) msgs[msgs.length - 1] = { ...last, content: g.accumulated };
          } else if (g.accumulated) {
            msgs.push({ role: "assistant", content: g.accumulated });
          }
          return msgs;
        });
        setLoading(false);
        setIsStreaming(false);
        return;
      }
      setMessages(prev => {
        const msgs = [...prev];
        if (msgs[msgs.length - 1]?.role === "assistant") {
          msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: g.accumulated };
        }
        return msgs;
      });
    };
  };

  // Stop AI generation
  const stopGeneration = () => {
    gStream?.abort.abort();
    setLoading(false);
    setIsStreaming(false);
  };

  // ── Smart starter prompts — fetch real data then build rich prompt ─────────
  const sendSmartPrompt = async (topic: StarterTopic) => {
    if (!isPremium || loading || loadingTopic) return;
    setLoadingTopic(topic);
    try {
      const [fpRes, riskRes, planRes] = await Promise.all([
        fetch("/api/user/financial-profile").then(r => r.json()),
        fetch("/api/user/risk-assessment").then(r => r.json()),
        fetch("/api/user/financial-plan").then(r => r.json()),
      ]);
      const prompt = buildContextualPrompt(
        topic,
        fpRes.data ?? null,
        riskRes.data ?? null,
        planRes.data ?? null,
      );
      const topicMeta = STARTER_TOPICS.find(t => t.topic === topic)!;
      const displayContent = TOPIC_DISPLAY[topic];
      setLoadingTopic(null);
      await send(prompt, { displayContent, topicIcon: topicMeta.icon, topicLabel: topicMeta.label });
    } catch {
      setLoadingTopic(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  if (status === "loading") return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  const activeProviderLabel = PROVIDERS.find(p => p.value === provider)?.label ?? provider;
  const needsToken = provider === "gemini" || provider === "openai";

  return (
    <div className="flex h-[calc(100dvh-8.5rem)] md:h-[calc(100dvh-4.5rem)]">

      {/* ── History Sidebar ── */}
      {historyOpen ? (
        /* — Expanded panel — */
        <div className="shrink-0 w-60 border-r flex flex-col bg-background">
          <div className="shrink-0 flex items-center gap-2 px-3 pt-3 pb-2.5 border-b">
            <span className="text-sm font-semibold flex-1 text-foreground">ประวัติแชท</span>
            <button
              onClick={newChat}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="แชทใหม่"
            >
              <SquarePen className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setHistoryOpen(false);
                if (session?.user?.id) localStorage.setItem(`myfinance-history-open-${session.user.id}`, "0");
              }}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="ปิด"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
            {sessions.length === 0 ? (
              <div className="px-3 py-10 text-center">
                <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/20 mb-2" />
                <p className="text-xs text-muted-foreground">ยังไม่มีประวัติ</p>
              </div>
            ) : sessions.map(sess => (
              <div
                key={sess.id}
                onClick={() => loadSession(sess)}
                className={`group relative flex items-start px-3 py-2.5 cursor-pointer rounded-lg transition-colors ${
                  sess.id === currentSessionId
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-accent/60"
                }`}
              >
                <div className="flex-1 min-w-0 pr-6">
                  <p className={`text-xs truncate leading-snug ${
                    sess.id === currentSessionId ? "font-semibold text-primary" : "font-medium"
                  }`}>{sess.title}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">{relativeDate(sess.updatedAt)}</p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); deleteSession(sess.id); }}
                  className="absolute right-2 top-2.5 opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-destructive transition-all p-0.5 rounded"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* — Collapsed tab — */
        <button
          onClick={() => {
            setHistoryOpen(true);
            if (session?.user?.id) localStorage.setItem(`myfinance-history-open-${session.user.id}`, "1");
          }}
          className="shrink-0 w-8 border-r bg-muted/40 hover:bg-muted/70 flex items-center justify-center transition-colors group"
          title="เปิดประวัติแชท"
        >
          <span className="[writing-mode:vertical-rl] rotate-180 text-[11px] font-medium text-muted-foreground group-hover:text-foreground tracking-wide transition-colors select-none">
            ประวัติ
          </span>
        </button>
      )}

      {/* ── Main chat ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

      {/* ── Header ── */}
      <div className="shrink-0 flex items-center gap-2 px-4 pb-3 border-b">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-sm shrink-0">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="font-semibold text-sm leading-tight">MyFinance AI</h1>
              {isPremium && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Premium</Badge>}
            </div>
            <p className="text-xs text-muted-foreground/70 truncate">{effectiveModel} · {activeProviderLabel}</p>
          </div>
        </div>

        <button
          onClick={() => setSettingsOpen(o => !o)}
          className={`p-2 rounded-lg transition-colors hover:bg-accent ${
            settingsOpen ? "text-primary bg-primary/5" : "text-muted-foreground"
          }`}
          title="ตั้งค่า AI"
        >
          <Settings2 className="h-4 w-4" />
        </button>
      </div>

      {/* ── Settings Panel (slide-in) ── */}
      {settingsOpen && (
        <div className="shrink-0 border-b bg-muted/20 overflow-y-auto max-h-[65vh]">
          <div className="px-4 py-4 space-y-5 max-w-2xl">

          {/* Panel header */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">ตั้งค่า AI</p>
            <button
              onClick={() => setSettingsOpen(false)}
              className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Provider / Model */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI Provider & Model</Label>

            {/* Provider tabs */}
            <div className="flex gap-2 flex-wrap">
              {PROVIDERS.map(p => (
                <button
                  key={p.value}
                  onClick={() => handleProviderChange(p.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-all ${
                    provider === p.value
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-background hover:bg-accent border-input"
                  }`}
                >
                  <span>{p.logo}</span>{p.label}
                </button>
              ))}
            </div>

            {/* Model dropdown */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Model</Label>
              <select
                value={model}
                onChange={e => setModel(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {MODELS[provider].map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Custom model name (Ollama) */}
            {provider === "ollama" && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  ชื่อ Model ที่ custom <span className="text-muted-foreground/60">(เว้นว่างเพื่อใช้จากรายการ)</span>
                </Label>
                <Input
                  placeholder="เช่น llama3:8b-instruct-q5_K_M"
                  value={customModel}
                  onChange={e => setCustomModel(e.target.value)}
                />
              </div>
            )}

            {/* Ollama base URL */}
            {provider === "ollama" && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Ollama Host URL</Label>
                <Input
                  placeholder="http://ollama:11434"
                  value={ollamaUrl}
                  onChange={e => setOllamaUrl(e.target.value)}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Docker:{" "}
                  <span className="font-mono bg-muted px-1 rounded">http://ollama:11434</span>
                  {" "}· Local:{" "}
                  <span className="font-mono bg-muted px-1 rounded">http://localhost:11434</span>
                </p>
              </div>
            )}

            {/* API Token */}
            {needsToken && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {provider === "openai" ? "OpenAI API Key" : "Gemini API Key (AI Studio)"}
                  {hasToken && tokenMasked && (
                    <span className="ml-2 text-emerald-600 font-mono font-medium">✓ {tokenMasked}</span>
                  )}
                </Label>
                <div className="relative">
                  <Input
                    type={showToken ? "text" : "password"}
                    placeholder={hasToken ? "ใส่ key ใหม่เพื่อเปลี่ยน..." : provider === "openai" ? "sk-..." : "AIza..."}
                    value={apiToken}
                    onChange={e => setApiToken(e.target.value)}
                    className="pr-10 font-mono text-xs"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {provider === "gemini"
                    ? "รับ key ได้ที่ aistudio.google.com — ถ้าไม่ใส่จะใช้ server key (ถ้ามี)"
                    : "รับ key ได้ที่ platform.openai.com/api-keys"}
                </p>
              </div>
            )}
          </div>

          {/* Tone slider */}
          <div className="space-y-2">
            <Label className="text-sm">
              น้ำเสียงการตอบ:{" "}
              <span className="font-semibold text-foreground">{TONE_LABELS[toneLevel]}</span>
            </Label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-14">อ่อนโยน</span>
              <input
                type="range" min={1} max={5} step={1} value={toneLevel}
                onChange={e => setToneLevel(Number(e.target.value))}
                className="flex-1 h-2 accent-emerald-500 cursor-pointer"
              />
              <span className="text-xs text-muted-foreground w-14 text-right">ตรงมาก</span>
            </div>
          </div>

          {/* Custom context */}
          <div className="space-y-1">
            <Label className="text-sm">บริบทเพิ่มเติม</Label>
            <textarea
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              rows={2}
              placeholder="เช่น ฉันกำลังวางแผนซื้อบ้านในอีก 3 ปี..."
              value={customPrompt}
              onChange={e => setCustomPrompt(e.target.value)}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">{customPrompt.length}/1000</p>
          </div>

          {/* Save */}
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={saveSettings} disabled={settingsSaving}>
              {settingsSaving
                ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
                : <Save className="h-3 w-3 mr-1" />}
              บันทึกการตั้งค่า
            </Button>
            {settingsSaved && <span className="text-xs text-emerald-600 font-medium">บันทึกแล้ว ✓</span>}
            {saveError   && <span className="text-xs text-red-500">{saveError}</span>}
          </div>

          </div>
        </div>
      )}

      {/* ── Welcome screen ── */}
      {!hasMessages ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-4 overflow-y-auto">
          {!isPremium ? (
            <div className="text-center space-y-5 max-w-sm w-full">
              <div className="h-16 w-16 mx-auto rounded-2xl bg-muted flex items-center justify-center">
                <Lock className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-lg font-bold mb-1">สำหรับ Premium เท่านั้น</h2>
                <p className="text-sm text-muted-foreground">อัปเกรดเพื่อเข้าถึง AI ที่ปรึกษาการเงินส่วนตัว</p>
              </div>
              <Button size="lg" className="w-full">อัปเกรดเป็น Premium — ฿99/เดือน</Button>
            </div>
          ) : (
            <div className="w-full max-w-md space-y-7">
              {/* Hero */}
              <div className="text-center space-y-3">
                <div className="relative inline-flex">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg">
                    <Sparkles className="h-8 w-8 text-white" />
                  </div>
                  <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-emerald-400 rounded-full border-2 border-background" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">MyFinance AI</h2>
                  <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                    ที่ปรึกษาการเงินส่วนตัว วิเคราะห์จากข้อมูลจริงของคุณ
                  </p>
                </div>
              </div>

              {/* Topic cards */}
              <div className="grid grid-cols-2 gap-3">
                {STARTER_TOPICS.map(t => (
                  <button
                    key={t.topic}
                    onClick={() => sendSmartPrompt(t.topic)}
                    disabled={loadingTopic !== null}
                    className="text-left p-4 rounded-2xl border bg-card hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
                  >
                    <div className="text-2xl mb-2.5">
                      {loadingTopic === t.topic
                        ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        : t.icon}
                    </div>
                    <p className="text-sm font-semibold leading-tight">{t.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {loadingTopic === t.topic ? "กำลังโหลดข้อมูล..." : "วิเคราะห์จากข้อมูลของคุณ"}
                    </p>
                  </button>
                ))}
              </div>

              <p className="text-center text-xs text-muted-foreground/50">หรือพิมพ์คำถามใดก็ได้ด้านล่าง</p>
            </div>
          )}
        </div>
      ) : (
        /* ── Chat messages ── */
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-3xl mx-auto space-y-5 px-6 py-6">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                {m.role === "user" ? (
                  m.topicIcon ? (
                    /* Smart-prompt card bubble */
                    <div className="max-w-[80%] rounded-2xl rounded-tr-sm overflow-hidden shadow-sm border border-primary/20">
                      <div className="bg-primary px-4 py-2 flex items-center gap-2">
                        <span className="text-base">{m.topicIcon}</span>
                        <span className="text-sm font-semibold text-primary-foreground">{m.topicLabel}</span>
                      </div>
                      <div className="bg-primary/10 px-4 py-2.5 text-xs text-foreground/70 leading-relaxed">
                        {m.displayContent ?? m.content}
                      </div>
                    </div>
                  ) : (
                    /* Plain user bubble */
                    <div className="max-w-[78%] bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed shadow-sm">
                      {m.content}
                    </div>
                  )
                ) : (
                  /* AI reply row */
                  <>
                    <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0 bg-muted/50 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {m.content}
                      {isStreaming && i === messages.length - 1 && (
                        <span className="inline-block w-0.5 h-4 bg-emerald-500 animate-pulse ml-0.5 align-text-bottom" />
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shrink-0 shadow-sm">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div className="bg-muted/50 rounded-2xl rounded-tl-sm px-4 py-3">
                  <ThinkingIndicator model={effectiveModel} startedAt={gStream?.startedAt} />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        </div>
      )}

      {/* ── Input Area ── */}
      <div className="shrink-0 pt-2 px-4 pb-2">
        {/* Quick-topic pills — only when chatting */}
        {hasMessages && (
          <div className="flex flex-wrap gap-1.5 mb-2.5 justify-center">
            {STARTER_TOPICS.map(p => (
              <button
                key={p.topic}
                disabled={!isPremium || loading || isStreaming || loadingTopic !== null}
                onClick={() => sendSmartPrompt(p.topic)}
                className="text-xs border rounded-full px-3 py-1.5 bg-background hover:bg-muted hover:border-primary/30 hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 font-medium"
              >
                {loadingTopic === p.topic
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <span>{p.icon}</span>}
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* Text box */}
        <div className="flex items-end gap-2.5 border border-border rounded-2xl px-3.5 py-2.5 bg-background shadow-md focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/50 transition-all">
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder={
              isPremium
                ? "พิมพ์ข้อความของคุณ..."
                : "อัปเกรดเป็น Premium เพื่อใช้งาน"
            }
            value={input}
            disabled={!isPremium || loading || isStreaming}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent resize-none text-sm outline-none placeholder:text-muted-foreground/60 disabled:cursor-not-allowed leading-relaxed py-0.5"
            style={{ maxHeight: 160 }}
          />
          {(loading || isStreaming) ? (
            <button
              onClick={stopGeneration}
              className="shrink-0 h-8 w-8 rounded-xl bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors"
              title="หยุดสร้างคำตอบ"
            >
              <Square className="h-3 w-3 fill-current" />
            </button>
          ) : (
            <button
              disabled={!isPremium || !input.trim()}
              onClick={() => send(input)}
              className="shrink-0 h-8 w-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="ส่ง"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Footer: disclaimer */}
        <div className="flex items-center justify-end mt-2 px-0.5">
          <p className="text-xs text-muted-foreground/40">
            ตรวจสอบกับผู้เชี่ยวชาญก่อนตัดสินใจ
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}

