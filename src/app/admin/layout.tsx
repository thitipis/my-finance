"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Flag, FileText, Settings, TrendingUp, LogOut, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin",               label: "Dashboard",     icon: LayoutDashboard },
  { href: "/admin/feature-flags", label: "Feature Flags", icon: Flag },
  { href: "/admin/tax-config",    label: "Tax Config",    icon: FileText },
  { href: "/admin/settings",      label: "Settings",      icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [key, setKey] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // Check if already stored in session
    const stored = sessionStorage.getItem("admin_key");
    if (stored) setAuthed(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    // Verify by hitting analytics endpoint
    const res = await fetch("/api/admin/analytics", { headers: { "x-admin-key": key } });
    if (res.ok) {
      sessionStorage.setItem("admin_key", key);
      setAuthed(true);
    } else {
      setError("รหัสผ่านไม่ถูกต้อง");
    }
  };

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <form onSubmit={handleLogin} className="bg-white rounded-xl p-8 w-full max-w-sm space-y-4 shadow-2xl">
          <div className="flex items-center gap-2 text-xl font-bold text-primary">
            <Shield className="h-6 w-6" />
            Admin Access
          </div>
          <p className="text-sm text-muted-foreground">Enter your admin secret key to continue</p>
          <input
            type="password"
            value={key}
            onChange={e => setKey(e.target.value)}
            placeholder="Admin secret key"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            autoFocus
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" className="w-full h-9 bg-primary text-white rounded-md text-sm font-medium">
            เข้าสู่ระบบ Admin
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Sidebar */}
      <aside className="w-56 bg-slate-900 text-slate-100 flex flex-col py-6 px-3 shrink-0">
        <div className="flex items-center gap-2 px-3 mb-6 text-emerald-400 font-bold">
          <TrendingUp className="h-5 w-5" />
          MyFinance Admin
        </div>
        <nav className="flex-1 space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                pathname === href
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <button
          onClick={() => { sessionStorage.removeItem("admin_key"); router.push("/admin"); setAuthed(false); }}
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
