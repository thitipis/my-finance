"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calculator,
  LayoutDashboard,
  Target,
  Shield,
  MessageSquareText,
  Settings,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard",  label: "แดชบอร์ด",       labelEn: "Dashboard",   icon: LayoutDashboard },
  { href: "/tax",        label: "คำนวณภาษี",       labelEn: "Tax",         icon: Calculator },
  { href: "/goals",      label: "เป้าหมายการเงิน", labelEn: "Goals",       icon: Target },
  { href: "/insurance",  label: "ประกัน",           labelEn: "Insurance",   icon: Shield },
  { href: "/ai-chat",    label: "AI ที่ปรึกษา",    labelEn: "AI Advisor",  icon: MessageSquareText },
  { href: "/settings",   label: "ตั้งค่า",          labelEn: "Settings",    icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex flex-col w-60 min-h-screen border-r bg-card px-4 py-6 gap-2">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2 px-2 mb-6">
        <TrendingUp className="h-6 w-6 text-primary" />
        <span className="text-xl font-bold text-primary">MyFinance</span>
      </Link>

      {/* Nav items */}
      <nav className="flex flex-col gap-1">
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
    </aside>
  );
}
