"use client";
import { useEffect, useState } from "react";
import { Flag, Save, RefreshCw } from "lucide-react";

type FeatureFlag = {
  id: string;
  key: string;
  description: string | null;
  freeEnabled: boolean;
  premiumEnabled: boolean;
  updatedAt: string;
};

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const adminKey = () => sessionStorage.getItem("admin_key") ?? "";

  const load = () => {
    setLoading(true);
    fetch("/api/admin/feature-flags", { headers: { "x-admin-key": adminKey() } })
      .then(r => r.json())
      .then(d => setFlags(d.data ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id: string, field: "freeEnabled" | "premiumEnabled") => {
    setFlags(prev => prev.map(f => f.id === id ? { ...f, [field]: !f[field] } : f));
  };

  const save = async (flag: FeatureFlag) => {
    setSaving(flag.id);
    await fetch("/api/admin/feature-flags", {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-admin-key": adminKey() },
      body: JSON.stringify({ key: flag.key, freeEnabled: flag.freeEnabled, premiumEnabled: flag.premiumEnabled, description: flag.description ?? undefined }),
    });
    setSaving(null);
    setSaved(flag.id);
    setTimeout(() => setSaved(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Flag className="h-6 w-6 text-primary" />
            Feature Flags
          </h1>
          <p className="text-sm text-muted-foreground">Control which features are available per tier</p>
        </div>
        <button onClick={load} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Flag Key</th>
                <th className="px-5 py-3 text-left font-medium text-muted-foreground">Description</th>
                <th className="px-5 py-3 text-center font-medium text-muted-foreground">Free</th>
                <th className="px-5 py-3 text-center font-medium text-muted-foreground">Premium</th>
                <th className="px-5 py-3 text-center font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {flags.map(flag => (
                <tr key={flag.id} className="hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                  <td className="px-5 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">{flag.key}</td>
                  <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{flag.description ?? "—"}</td>
                  <td className="px-5 py-3 text-center">
                    <button
                      onClick={() => toggle(flag.id, "freeEnabled")}
                      className={`h-6 w-11 rounded-full transition-colors relative ${flag.freeEnabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full shadow transition-transform ${flag.freeEnabled ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <button
                      onClick={() => toggle(flag.id, "premiumEnabled")}
                      className={`h-6 w-11 rounded-full transition-colors relative ${flag.premiumEnabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full shadow transition-transform ${flag.premiumEnabled ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <button
                      onClick={() => save(flag)}
                      disabled={saving === flag.id}
                      className="inline-flex items-center gap-1 text-xs bg-primary text-white px-3 py-1 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {saved === flag.id ? "✓ Saved" : saving === flag.id ? "Saving..." : <><Save className="h-3 w-3" /> Save</>}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
