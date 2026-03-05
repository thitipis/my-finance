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
  MapPin,
  ClipboardList,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const financeToolPaths = ["/tax", "/insurance", "/goals", "/tools"];

function NavContent({ onNavClick }: { onNavClick?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;
  const displayName = user?.name ?? user?.email ?? "";
  const avatar = displayName[0]?.toUpperCase() ?? "U";

  const isFinanceTool = financeToolPaths.some((p) => pathname.startsWith(p));
  const [toolsOpen, setToolsOpen] = useState(isFinanceTool);

  return (
    <>
      {/* Logo */}
      <Link href="/dashboard" onClick={onNavClick} className="flex items-center gap-2 px-2 mb-6">
        <TrendingUp className="h-6 w-6 text-primary" />
        <span className="text-xl font-bold text-primary">MyFinance</span>
      </Link>

      {/* Nav */}
      <nav className="flex flex-col gap-1 flex-1">
        <NavItem href="/dashboard" label="แดชบอร์ด" icon={LayoutDashboard} active={pathname === "/dashboard"} onClick={onNavClick} />
        <NavItem href="/my-data" label="ข้อมูลของฉัน" icon={Database} active={pathname.startsWith("/my-data")} onClick={onNavClick} />
        <NavItem href="/financial-plan" label="แผนการเงิน" icon={MapPin} active={pathname.startsWith("/financial-plan")} onClick={onNavClick} />

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
          <span className="flex-1 text-left">เครื่องมือ</span>
          {toolsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>

        {toolsOpen && (
          <div className="ml-4 flex flex-col gap-1 border-l pl-3">
            <NavItem href="/tax"        label="คำนวณภาษี"        icon={Calculator}    active={pathname.startsWith("/tax")}        onClick={onNavClick} />
            <NavItem href="/insurance"  label="วิเคราะห์ประกัน"  icon={Shield}        active={pathname.startsWith("/insurance")}  onClick={onNavClick} />
            <NavItem href="/goals"      label="เป้าหมายการเงิน"  icon={Target}        active={pathname.startsWith("/goals")}      onClick={onNavClick} />
            <NavItem href="/tools/risk" label="ประเมินความเสี่ยง" icon={ClipboardList} active={pathname.startsWith("/tools/risk")} onClick={onNavClick} />
          </div>
        )}

        <NavItem href="/ai-chat"  label="AI ที่ปรึกษา" icon={MessageSquareText} active={pathname.startsWith("/ai-chat")}  onClick={onNavClick} />
        <NavItem href="/settings" label="ตั้งค่าบัญชี" icon={Settings}         active={pathname.startsWith("/settings")} onClick={onNavClick} />
      </nav>

      {/* User section */}
      {user && (
        <div className="border-t pt-4 mt-4">
          <div className="flex items-center gap-2 px-2 mb-2">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold shrink-0">
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
    </>
  );
}

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 min-h-screen border-r bg-card px-4 py-6">
        <NavContent />
      </aside>

      {/* Mobile: sticky top bar */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center gap-3 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 px-4 h-14 md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-1.5 hover:bg-accent transition-colors"
          aria-label="เปิดเมนู"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/dashboard" className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <span className="font-bold text-primary">MyFinance</span>
        </Link>
      </div>

      {/* Mobile: backdrop overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile: slide-out drawer */}
      <div
        className={cn(
          "fixed top-0 left-0 bottom-0 z-50 flex flex-col w-72 bg-card border-r px-4 py-6 transition-transform duration-300 ease-in-out md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 rounded-lg p-1.5 hover:bg-accent transition-colors"
          aria-label="ปิดเมนู"
        >
          <X className="h-5 w-5" />
        </button>
        <NavContent onNavClick={() => setMobileOpen(false)} />
      </div>
    </>
  );
}

function NavItem({
  href, label, icon: Icon, active, onClick,
}: {
  href: string; label: string; icon: React.ElementType; active: boolean; onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
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
