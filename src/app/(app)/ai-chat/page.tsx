"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Sparkles, Send, Lock, User, Bot, Loader2, Settings2, ChevronDown, ChevronUp, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

type Message = { role: "user" | "assistant"; content: string };

const STARTER_PROMPTS = [
  "ฉันควรลงทุนใน SSF หรือ RMF มากกว่ากัน?",
  "ช่วยวางแผนภาษีให้หน่อยได้ไหม?",
  "RMF กับ SSF ต่างกันอย่างไร?",
  "ประกันแบบไหนเหมาะกับฉัน?",
];

const TONE_LABELS: Record<number, string> = {
  1: "อ่อนโยน / ให้กำลังใจ",
  2: "เป็นมิตร / สุภาพ",
  3: "มืออาชีพ (ค่าเริ่มต้น)",
  4: "ตรงไปตรงมา / กระชับ",
  5: "ตรงมาก / ไม่อ้อมค้อม",
};

function LockedOverlay() {
  return (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-lg gap-4 text-center p-8">
      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
        <Lock className="h-8 w-8 text-primary" />
      </div>
      <h2 className="text-xl font-bold">ฟีเจอร์ Premium</h2>
      <p className="text-muted-foreground text-sm max-w-xs">
        AI Advisor ที่ขับเคลื่อนด้วย Google Gemini ให้คำแนะนำด้านภาษีและการเงินส่วนตัว เฉพาะสมาชิก Premium เท่านั้น
      </p>
      <Button>อัปเกรดเป็น Premium</Button>
      <p className="text-xs text-muted-foreground">เริ่มต้นเพียง ฿99 / เดือน</p>
    </div>
  );
}

export default function AiChatPage() {
  const { data: session, status } = useSession();
  const isPremium = (session?.user as { tier?: string })?.tier === "premium";

  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "สวัสดีครับ! ผมคือ AI Advisor ของ MyFinance ยินดีให้คำแนะนำด้านภาษีและการวางแผนการเงินส่วนตัวครับ 😊\n\nผมรับทราบข้อมูลการเงินของคุณจากหน้า \"ข้อมูลของฉัน\" และจะให้คำแนะนำตามระดับความเสี่ยงที่คุณประเมินไว้ครับ" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // AI Settings
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toneLevel, setToneLevel] = useState(3);
  const [customPrompt, setCustomPrompt] = useState("");
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  useEffect(() => {
    fetch("/api/user/ai-settings").then(r => r.json()).then(({ data }) => {
      if (data) {
        setToneLevel(data.toneLevel ?? 3);
        setCustomPrompt(data.customPrompt ?? "");
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const saveSettings = useCallback(async () => {
    setSettingsSaving(true);
    try {
      await fetch("/api/user/ai-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toneLevel, customPrompt: customPrompt || null }),
      });
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
    } finally {
      setSettingsSaving(false);
    }
  }, [toneLevel, customPrompt]);

  const send = async (text: string) => {
    if (!text.trim() || !isPremium) return;
    const userMsg: Message = { role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.reply ?? "ขออภัย เกิดข้อผิดพลาด" }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "ขออภัย ไม่สามารถเชื่อมต่อได้ในขณะนี้" }]);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-emerald-500" />
          AI Advisor
        </h1>
        <Badge variant="secondary">Premium</Badge>
      </div>

      {/* AI Settings Panel */}
      <Card className="border-dashed">
        <button
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setSettingsOpen(o => !o)}
        >
          <span className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            ปรับแต่ง AI — น้ำเสียง & บริบทส่วนตัว
          </span>
          {settingsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {settingsOpen && (
          <CardContent className="pt-0 pb-4 border-t space-y-4">
            {/* Tone Slider */}
            <div className="space-y-2">
              <Label className="text-sm">น้ำเสียงการตอบ: <span className="font-semibold text-foreground">{TONE_LABELS[toneLevel]}</span></Label>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-16">อ่อนโยน</span>
                <input
                  type="range" min={1} max={5} step={1} value={toneLevel}
                  onChange={e => setToneLevel(Number(e.target.value))}
                  className="flex-1 h-2 accent-primary cursor-pointer"
                />
                <span className="text-xs text-muted-foreground w-16 text-right">ตรงมาก</span>
              </div>
              <div className="flex justify-between px-16 text-xs text-muted-foreground">
                {[1,2,3,4,5].map(n => <span key={n} className={toneLevel === n ? "text-primary font-bold" : ""}>{n}</span>)}
              </div>
            </div>

            {/* Custom context */}
            <div className="space-y-1">
              <Label className="text-sm">บริบทเพิ่มเติม <span className="text-muted-foreground font-normal">(AI จะรับทราบเพิ่มเติมนอกเหนือจากโปรไฟล์)</span></Label>
              <textarea
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                rows={3}
                placeholder="เช่น ฉันกำลังวางแผนซื้อบ้านในอีก 3 ปี, ฉันมีโรคประจำตัว..."
                value={customPrompt}
                onChange={e => setCustomPrompt(e.target.value)}
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground text-right">{customPrompt.length}/1000</p>
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" onClick={saveSettings} disabled={settingsSaving}>
                {settingsSaving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                บันทึก
              </Button>
              {settingsSaved && <span className="text-xs text-green-600">บันทึกแล้ว ✓</span>}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Chat Area */}
      <div className="relative flex-1">
        {!isPremium && <LockedOverlay />}
        <Card className="h-[55vh] flex flex-col">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              MyFinance AI — Powered by Google Gemini
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${m.role === "assistant" ? "bg-primary/10" : "bg-secondary"}`}>
                  {m.role === "assistant" ? <Bot className="h-4 w-4 text-primary" /> : <User className="h-4 w-4" />}
                </div>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${m.role === "assistant" ? "bg-muted" : "bg-primary text-white"}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg px-3 py-2 text-sm text-muted-foreground animate-pulse">
                  กำลังคิด...
                </div>
              </div>
            )}
            <div ref={endRef} />
          </CardContent>
          {/* Input */}
          <div className="p-3 border-t flex gap-2">
            <Input
              placeholder={isPremium ? "พิมพ์ข้อความ..." : "อัปเกรดเพื่อใช้งาน"}
              value={input}
              disabled={!isPremium || loading}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send(input)}
            />
            <Button size="icon" disabled={!isPremium || loading || !input.trim()} onClick={() => send(input)}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>

      {/* Starter prompts */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">ลองถามเกี่ยวกับ...</p>
        <div className="flex flex-wrap gap-2">
          {STARTER_PROMPTS.map(p => (
            <button
              key={p}
              disabled={!isPremium}
              onClick={() => send(p)}
              className="text-xs border rounded-full px-3 py-1 hover:bg-primary/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

