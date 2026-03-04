"use client";
import { useEffect, useState } from "react";
import { Users, TrendingUp, Calculator, Bot } from "lucide-react";

type Stats = {
  totalUsers: number;
  premiumUsers: number;
  freeUsers: number;
  newUsers30d: number;
  taxCalcEvents: number;
  aiChatEvents: number;
  usageByType: { type: string; count: number }[];
};

function StatCard({ label, value, icon: Icon, sub }: { label: string; value: number | string; icon: React.ElementType; sub?: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <p className="text-2xl font-bold">{value.toLocaleString()}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const adminKey = sessionStorage.getItem("admin_key") ?? "";
    fetch("/api/admin/analytics", { headers: { "x-admin-key": adminKey } })
      .then(r => r.json())
      .then(d => setStats(d.data))
      .catch(() => setError("ไม่สามารถโหลดข้อมูลได้"));
  }, []);

  if (error) return <p className="text-red-500">{error}</p>;
  if (!stats) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">MyFinance platform overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users"    value={stats.totalUsers}   icon={Users}      sub={`+${stats.newUsers30d} in last 30 days`} />
        <StatCard label="Premium Users"  value={stats.premiumUsers} icon={TrendingUp} sub={`${stats.freeUsers} free`} />
        <StatCard label="Tax Calcs"      value={stats.taxCalcEvents} icon={Calculator} sub="all time" />
        <StatCard label="AI Chat Calls"  value={stats.aiChatEvents} icon={Bot}        sub="premium only" />
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700">
        <h2 className="font-semibold mb-4">Usage Events Breakdown</h2>
        <div className="space-y-2">
          {stats.usageByType.map(e => (
            <div key={e.type} className="flex items-center justify-between text-sm">
              <span className="font-mono text-muted-foreground">{e.type}</span>
              <span className="font-semibold">{e.count.toLocaleString()}</span>
            </div>
          ))}
          {stats.usageByType.length === 0 && <p className="text-sm text-muted-foreground">No events yet</p>}
        </div>
      </div>
    </div>
  );
}
