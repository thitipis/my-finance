"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (field: string, val: string) => setForm(prev => ({ ...prev, [field]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) {
      setError("รหัสผ่านไม่ตรงกัน");
      return;
    }
    if (form.password.length < 8) {
      setError("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      setLoading(false);
      return;
    }
    // Auto-login after registration
    await signIn("credentials", { email: form.email, password: form.password, redirect: false });
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950 dark:to-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 text-2xl font-bold text-emerald-600">
            <TrendingUp className="h-7 w-7" />
            MyFinance
          </div>
          <p className="text-muted-foreground text-sm">ที่ปรึกษาการเงินส่วนตัวเพื่อคนไทย</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>สมัครสมาชิก</CardTitle>
            <CardDescription>สร้างบัญชีเพื่อเริ่มวางแผนการเงินของคุณ</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="name">ชื่อ (ไม่บังคับ)</Label>
                <Input id="name" placeholder="ชื่อของคุณ" value={form.name} onChange={e => update("name", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">อีเมล</Label>
                <Input id="email" type="email" placeholder="you@example.com" value={form.email} onChange={e => update("email", e.target.value)} required autoComplete="email" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="password">รหัสผ่าน</Label>
                <Input id="password" type="password" placeholder="อย่างน้อย 8 ตัวอักษร" value={form.password} onChange={e => update("password", e.target.value)} required autoComplete="new-password" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="confirm">ยืนยันรหัสผ่าน</Label>
                <Input id="confirm" type="password" placeholder="••••••••" value={form.confirm} onChange={e => update("confirm", e.target.value)} required autoComplete="new-password" />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "กำลังสมัคร..." : "สมัครสมาชิกฟรี"}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                โดยการสมัคร คุณยอมรับ <a href="#" className="underline">นโยบายความเป็นส่วนตัว</a>
              </p>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          มีบัญชีแล้ว?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            เข้าสู่ระบบ
          </Link>
        </p>
      </div>
    </div>
  );
}
