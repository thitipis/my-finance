"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Calculator,
  LayoutDashboard,
  Target,
  Shield,
  MessageSquareText,
  Settings,
  TrendingUp,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard",  label: "แดชบอร์ด",       icon: LayoutDashboard },
  { href: "/tax",        label: "คำนวณภาษี",       icon: Calculator },
  { href: "/goals",      label: "เป้าหมายการเงิน", icon: Target },
  { href: "/insurance",  label: "ประกัน",           icon: Shield },
  { href: "/ai-chat",    label: "AI ที่ปรึกษา",    icon: MessageSquareText },
  { href: "/settings",   label: "ตั้งค่า",          icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;
  const displayName = user?.name ?? user?.email ?? "";
  const avatar = displayName[0]?.toUpperCase() ?? "U";

  return (
    <aside className="hidden md:flex flex-col w-60 min-h-screen border-r bg-card px-4 py-6">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2 px-2 mb-6">
        <TrendingUp className="h-6 w-6 text-primary" />
        <span className="text-xl font-bold text-primary">MyFinance</span>
      </Link>

      {/* Nav items */}
      <nav className="flex flex-col gap-1 flex-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname.startsWith(href)
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
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
