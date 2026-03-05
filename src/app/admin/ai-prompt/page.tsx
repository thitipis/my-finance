"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Save, CheckCircle2, MessageSquare } from "lucide-react";

const DEFAULT_PROMPT = `คุณคือ MyFinance AI ที่ปรึกษาการเงินส่วนตัวสัญชาติไทย ผู้เชี่ยวชาญด้านการวางแผนการเงิน ภาษีเงินได้บุคคลธรรมดา ประกันภัย และการลงทุน

หลักการตอบ:
- ตอบเป็นภาษาไทยเป็นหลัก เว้นแต่ผู้ใช้จะพิมพ์เป็นภาษาอังกฤษ
- อ้างอิงข้อมูลโปรไฟล์การเงินของผู้ใช้ที่ให้มาเสมอ
- เสนอทางเลือกหลายทาง โดยไฮไลต์ตัวเลือกที่เหมาะกับระดับความเสี่ยงของผู้ใช้
- ให้ข้อมูลที่ถูกต้องตามกฎหมายภาษีไทยปัจจุบัน
- ห้ามรับประกันผลตอบแทนการลงทุน
- แจ้งผู้ใช้ให้ปรึกษาผู้เชี่ยวชาญด้านภาษีหรือการเงินก่อนตัดสินใจสำคัญ

ขอบเขต: ภาษีเงินได้บุคคลธรรมดาไทย | การออม | กองทุน (SSF/RMF/Thai ESG) | ประกันชีวิต/สุขภาพ | เป้าหมายการเงิน`;

export default function AdminPromptPage() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    const key = sessionStorage.getItem("admin_key") ?? "";
    fetch("/api/admin/prompt", { headers: { "x-admin-key": key } })
      .then(r => r.json())
      .then(({ data }) => {
        if (data) {
          setContent(data.content);
          setUpdatedAt(data.updatedAt);
        } else {
          setContent(DEFAULT_PROMPT);
        }
      })
      .catch(() => setContent(DEFAULT_PROMPT))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    const key = sessionStorage.getItem("admin_key") ?? "";
    try {
      const res = await fetch("/api/admin/prompt", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-admin-key": key },
        body: JSON.stringify({ content }),
      });
      const { data } = await res.json();
      if (data) setUpdatedAt(data.updatedAt);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    if (confirm("รีเซ็ตกลับเป็น system prompt ต้นฉบับ?")) setContent(DEFAULT_PROMPT);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="h-6 w-6" />
          AI System Prompt
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Prompt นี้จะถูกส่งให้ Gemini ทุกครั้งที่ผู้ใช้คุยกับ AI Advisor เนื้อหาที่ผู้ใช้เพิ่มเองและโปรไฟล์การเงินจะถูก append ต่อท้ายอัตโนมัติ
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Main System Prompt</CardTitle>
          <CardDescription>
            ตัวแปรที่ระบบ append ให้อัตโนมัติ: <code className="text-xs bg-muted px-1 rounded">[TONE]</code> <code className="text-xs bg-muted px-1 rounded">[RISK_LEVEL]</code> <code className="text-xs bg-muted px-1 rounded">[FINANCIAL_PROFILE]</code> <code className="text-xs bg-muted px-1 rounded">[USER_CUSTOM]</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label className="text-sm">เนื้อหา Prompt</Label>
          <textarea
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm resize-y focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono"
            rows={18}
            value={content}
            onChange={e => setContent(e.target.value)}
          />
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button onClick={save} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {saving ? "กำลังบันทึก..." : "บันทึก Prompt"}
              </Button>
              <Button variant="outline" onClick={reset}>รีเซ็ต</Button>
            </div>
            <div className="text-right">
              {saved && (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle2 className="h-4 w-4" /> บันทึกแล้ว
                </span>
              )}
              {updatedAt && !saved && (
                <p className="text-xs text-muted-foreground">
                  แก้ไขล่าสุด: {new Date(updatedAt).toLocaleString("th-TH")}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-4 pb-3">
          <p className="text-sm text-amber-800">
            <strong>หมายเหตุ:</strong> การเปลี่ยน prompt จะมีผลทันทีกับการสนทนาใหม่ทั้งหมด ระวังอย่าลบข้อমูลสำคัญเกี่ยวกับขอบเขตและข้อจำกัดของ AI
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
