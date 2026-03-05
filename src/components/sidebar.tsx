"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Database,
  ChevronDown,
  ChevronRight,
  Calculator,
  Target,
  Shield,
  MessageSquareText,
  Settings,
  TrendingUp,
  LogOut,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

const financeToolPaths = ["/tax", "/insurance", "/goals"];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;
  const displayName = user?.name ?? user?.email ?? "";
  const avatar = displayName[0]?.toUpperCase() ?? "U";

  const isFinanceTool = financeToolPaths.some((p) => pathname.startsWith(p));
  const [toolsOpen, setToolsOpen] = useState(isFinanceTool);

  return (
    <aside className="hidden md:flex flex-col w-60 min-h-screen border-r bg-card px-4 py-6">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2 px-2 mb-6">
        <TrendingUp className="h-6 w-6 text-primary" />
        <span className="text-xl font-bold text-primary">MyFinance</span>
      </Link>

      {/* Nav */}
      <nav className="flex flex-col gap-1 flex-1">
        {/* Dashboard */}
        <NavItem href="/dashboard" label="แดชบอร์ด" icon={LayoutDashboard} active={pathname === "/dashboard"} />

        {/* My Data */}
        <NavItem href="/my-data" label="ข้อมูลของฉัน" icon={Database} active={pathname.startsWith("/my-data")} />

        {/* Finance Tools (collapsible) */}
        <button
          onClick={() => setToolsOpen((o) => !o)}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium w-full transition-colors",
            isFinanceTool
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <Wrench className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">เครื่องมือการเงิน</span>
          {toolsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>

        {toolsOpen && (
          <div className="ml-4 flex flex-col gap-1 border-l pl-3">
            <NavItem href="/tax"       label="คำนวณภาษี"       icon={Calculator}  active={pathname.startsWith("/tax")} />
            <NavItem href="/insurance" label="วิเคราะห์ประกัน" icon={Shield}      active={pathname.startsWith("/insurance")} />
            <NavItem href="/goals"     label="เป้าหมายการเงิน" icon={Target}      active={pathname.startsWith("/goals")} />
          </div>
        )}

        {/* AI Advisor */}
        <NavItem href="/ai-chat" label="AI ที่ปรึกษา" icon={MessageSquareText} active={pathname.startsWith("/ai-chat")} />

        {/* Settings */}
        <NavItem href="/settings" label="ตั้งค่าบัญชี" icon={Settings} active={pathname.startsWith("/settings")} />
      </nav>

      {/* User section */}
      {user && (
        <div className="border-t pt-4 mt-4">
          <div className="flex items-center gap-2 px-2 mb-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
              {avatar}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user.name ?? "ผู้ใช้งาน"}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-2 px-3 py-2 w-full rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-destructive transition-colors"
          >
            <LogOut className="h-4 w-4" />
            ออกจากระบบ
          </button>
        </div>
      )}
    </aside>
  );
}

function NavItem({
  href, label, icon: Icon, active,
}: {
  href: string; label: string; icon: React.ElementType; active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );
}
