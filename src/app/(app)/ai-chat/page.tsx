"use client";
import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Sparkles, Send, Lock, User, Bot, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type Message = { role: "user" | "assistant"; content: string };

const STARTER_PROMPTS = [
  "ฉันควรลงทุนใน SSF หรือ RMF มากกว่ากัน?",
  "ช่วยวางแผนภาษีให้หน่อยได้ไหม?",
  "RMF กับ SSF ต่างกันอย่างไร?",
  "ตอนนี้ฉันใช้สิทธิ์ลดหย่อนไปเท่าไหร่แล้ว?",
];

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
    { role: "assistant", content: "สวัสดีครับ! ผมคือ AI Advisor ของ MyFinance ยินดีให้คำแนะนำด้านภาษีและการวางแผนการเงินส่วนตัวครับ 😊" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

      {/* Chat Area */}
      <div className="relative flex-1">
        {!isPremium && <LockedOverlay />}
        <Card className="h-[60vh] flex flex-col">
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
                <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.role === "assistant" ? "bg-muted" : "bg-primary text-white"}`}>
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
        <p className="text-xs text-muted-foreground mb-2">คำถามที่พบบ่อย</p>
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
