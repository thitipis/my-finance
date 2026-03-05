"use client";
import { useState, useEffect, useCallback } from "react";
import { Settings, User, Globe, Bell, LogOut, Loader2 } from "lucide-react";
import { signOut } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type Profile = { id: string; email: string; name: string | null; tier: string; language: string };

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [language, setLanguage] = useState<"th" | "en">("th");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/user/profile");
    const data = await res.json();
    if (data.data) {
      setProfile(data.data);
      setName(data.data.name ?? "");
      setLanguage(data.data.language === "en" ? "en" : "th");
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const saveProfile = async () => {
    setSaving(true);
    setSaved(false);
    await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const setLang = async (lang: "th" | "en") => {
    setLanguage(lang);
    await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: lang }),
    });
  };

  const avatarLetter = (profile?.name ?? profile?.email ?? "U")[0].toUpperCase();

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6 text-emerald-500" />
          ตั้งค่า
        </h1>
        <p className="text-muted-foreground text-sm">จัดการบัญชีและการตั้งค่าส่วนตัว</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            โปรไฟล์
          </CardTitle>
          <CardDescription>ข้อมูลบัญชีของคุณ</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลด...
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg shrink-0">
                  {avatarLetter}
                </div>
                <div>
                  <p className="font-medium">{profile?.name ?? "(ไม่มีชื่อ)"}</p>
                  <p className="text-sm text-muted-foreground">{profile?.email}</p>
                </div>
                <Badge variant={profile?.tier === "premium" ? "default" : "secondary"} className="ml-auto capitalize">
                  {profile?.tier ?? "free"}
                </Badge>
              </div>
              <div className="space-y-1">
                <Label>ชื่อที่แสดง</Label>
                <Input
                  placeholder="ชื่อของคุณ"
                  value={name}
                  onChange={e => { setName(e.target.value); setSaved(false); }}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={saveProfile} disabled={saving}>
                  {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                  บันทึก
                </Button>
                {saved && <span className="text-sm text-emerald-600">✓ บันทึกแล้ว</span>}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Language */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" />
            ภาษา / Language
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button variant={language === "th" ? "default" : "outline"} size="sm" onClick={() => setLang("th")}>
            🇹🇭 ภาษาไทย
          </Button>
          <Button variant={language === "en" ? "default" : "outline"} size="sm" onClick={() => setLang("en")}>
            🇬🇧 English
          </Button>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            การแจ้งเตือน
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: "แจ้งเตือนก่อนสิ้นปีภาษี",         sublabel: "เตือนช่วงเดือนธันวาคม" },
            { label: "แจ้งเตือนเมื่อใกล้ถึงเป้าหมาย",   sublabel: "เมื่อ progress ถึง 80%" },
            { label: "สรุปรายงานภาษีรายเดือน",           sublabel: "ส่งทางอีเมล" },
          ].map(n => (
            <label key={n.label} className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-medium">{n.label}</p>
                <p className="text-xs text-muted-foreground">{n.sublabel}</p>
              </div>
              <input type="checkbox" className="rounded" defaultChecked />
            </label>
          ))}
        </CardContent>
      </Card>

      {/* Upgrade banner (free users only) */}
      {profile?.tier !== "premium" && (
        <Card className="border-primary/40 bg-gradient-to-r from-primary/5 to-violet-500/5">
          <CardContent className="pt-4 pb-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold">✨ อัปเกรดเป็น Premium</p>
              <p className="text-sm text-muted-foreground">ปลดล็อก AI Advisor และรายงานเชิงลึก</p>
              <p className="text-xs text-muted-foreground mt-0.5">เริ่มต้นเพียง ฿99 / เดือน</p>
            </div>
            <Button className="shrink-0">ดูแผน</Button>
          </CardContent>
        </Card>
      )}

      {/* Sign out */}
      <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => signOut({ callbackUrl: "/login" })}>
        <LogOut className="h-4 w-4 mr-2" />
        ออกจากระบบ
      </Button>
    </div>
  );
}
