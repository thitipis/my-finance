"use client";
import { useEffect, useState, useCallback } from "react";
import { Search, Plus, RefreshCw, Loader2, X, ChevronLeft, ChevronRight, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";

type Instrument = {
  id: string; assetType: string; ticker: string;
  nameTh?: string; nameEn?: string; exchange?: string; provider?: string; sector?: string;
  isActive: boolean; lastSyncedAt?: string;
};

const ASSET_TYPES = [
  { code: "",              label: "ทั้งหมด" },
  { code: "thai_stock",   label: "🇹🇭 หุ้นไทย" },
  { code: "thai_reit",    label: "🏢 REIT ไทย" },
  { code: "thai_fund",    label: "🏦 กองทุนไทย" },
  { code: "us_etf",       label: "📊 US ETF" },
  { code: "us_stock",     label: "🇺🇸 US Stock" },
  { code: "crypto",       label: "₿ Crypto" },
  { code: "gold",         label: "🥇 ทองคำ" },
];

export default function InstrumentsAdminPage() {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [total, setTotal]   = useState(0);
  const [pages, setPages]   = useState(1);
  const [page, setPage]     = useState(1);
  const [typeFilter, setTypeFilter] = useState("");
  const [q, setQ]           = useState("");
  const [loading, setLoading]   = useState(false);
  const [syncing, setSyncing]   = useState(false);
  const [syncResult, setSyncResult] = useState("");
  const [showAdd, setShowAdd]   = useState(false);
  const [addForm, setAddForm]   = useState({ assetType: "thai_stock", ticker: "", nameTh: "", nameEn: "", exchange: "", provider: "", sector: "" });
  const [addSaving, setAddSaving] = useState(false);

  const adminKey = typeof window !== "undefined" ? sessionStorage.getItem("admin_key") ?? "" : "";

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), ...(typeFilter ? { type: typeFilter } : {}), ...(q ? { q } : {}) });
    const res = await fetch(`/api/admin/instruments?${params}`, { headers: { "x-admin-key": adminKey } });
    const data = await res.json();
    setInstruments(data.data ?? []);
    setTotal(data.total ?? 0);
    setPages(data.pages ?? 1);
    setLoading(false);
  }, [adminKey, page, typeFilter, q]);

  useEffect(() => { load(); }, [load]);

  const handleSync = async (source: string) => {
    setSyncing(true);
    setSyncResult("");
    const res = await fetch("/api/admin/instruments/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
      body: JSON.stringify({ source }),
    });
    const data = await res.json();
    setSyncing(false);
    setSyncResult(res.ok ? `✅ Synced ${data.upserted} ${source} instruments` : `❌ ${data.error}`);
    if (res.ok) load();
  };

  const handleToggle = async (inst: Instrument) => {
    setInstruments(prev => prev.map(i => i.id === inst.id ? { ...i, isActive: !i.isActive } : i));
    await fetch("/api/admin/instruments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
      body: JSON.stringify({ id: inst.id, isActive: !inst.isActive }),
    });
  };

  const handleDelete = async (inst: Instrument) => {
    if (!confirm(`Delete ${inst.ticker}?`)) return;
    setInstruments(prev => prev.filter(i => i.id !== inst.id));
    setTotal(t => t - 1);
    await fetch(`/api/admin/instruments?id=${inst.id}`, {
      method: "DELETE",
      headers: { "x-admin-key": adminKey },
    });
  };

  const handleAdd = async () => {
    if (!addForm.ticker.trim()) return;
    setAddSaving(true);
    const res = await fetch("/api/admin/instruments", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
      body: JSON.stringify(addForm),
    });
    setAddSaving(false);
    if (res.ok) {
      setShowAdd(false);
      setAddForm({ assetType: "thai_stock", ticker: "", nameTh: "", nameEn: "", exchange: "", provider: "", sector: "" });
      load();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Instrument Catalog</h1>
          <p className="text-sm text-muted-foreground">{total} instruments · source of truth for portfolio autocomplete</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => handleSync("coingecko")}
            disabled={syncing}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Sync Crypto (CoinGecko)
          </button>
          <button
            onClick={() => setShowAdd(v => !v)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {showAdd ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {showAdd ? "Cancel" : "Add Instrument"}
          </button>
        </div>
      </div>

      {syncResult && (
        <div className="rounded-lg border px-4 py-2 text-sm font-medium">{syncResult}</div>
      )}

      {/* Add Form */}
      {showAdd && (
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="font-semibold text-sm">Add / Upsert Instrument</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">Asset Type *</label>
              <select value={addForm.assetType} onChange={e => setAddForm(f => ({ ...f, assetType: e.target.value }))}
                className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm">
                {ASSET_TYPES.filter(t => t.code).map(t => (
                  <option key={t.code} value={t.code}>{t.label}</option>
                ))}
              </select>
            </div>
            {[
              { key: "ticker", label: "Ticker *", placeholder: "e.g. PTT, BTC, VTI" },
              { key: "nameTh", label: "ชื่อภาษาไทย",  placeholder: "ปตท." },
              { key: "nameEn", label: "Name (EN)",    placeholder: "PTT Public Company" },
              { key: "exchange", label: "Exchange",   placeholder: "SET, NASDAQ, Crypto" },
              { key: "provider", label: "Provider",   placeholder: "Kasikorn, SCB..." },
              { key: "sector",   label: "Sector",     placeholder: "Energy, Banking..." },
            ].map(({ key, label, placeholder }) => (
              <div key={key} className="space-y-1">
                <label className="text-xs font-medium">{label}</label>
                <input value={(addForm as Record<string, string>)[key]}
                  onChange={e => setAddForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm" />
              </div>
            ))}
          </div>
          <button onClick={handleAdd} disabled={addSaving || !addForm.ticker.trim()}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            {addSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Save
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input value={q} onChange={e => { setQ(e.target.value); setPage(1); }}
            placeholder="Search ticker / name..."
            className="flex h-8 w-full rounded-md border border-input bg-transparent pl-8 pr-3 text-sm" />
        </div>
        <div className="flex flex-wrap gap-1">
          {ASSET_TYPES.map(t => (
            <button key={t.code}
              onClick={() => { setTypeFilter(t.code); setPage(1); }}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${typeFilter === t.code ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr className="text-xs text-muted-foreground">
              <th className="text-left px-3 py-2.5 font-medium">Ticker</th>
              <th className="text-left px-3 py-2.5 font-medium">Type</th>
              <th className="text-left px-3 py-2.5 font-medium">ชื่อภาษาไทย</th>
              <th className="text-left px-3 py-2.5 font-medium hidden md:table-cell">Name EN</th>
              <th className="text-left px-3 py-2.5 font-medium hidden lg:table-cell">Exchange/Provider</th>
              <th className="text-left px-3 py-2.5 font-medium hidden lg:table-cell">Sector</th>
              <th className="text-left px-3 py-2.5 font-medium">Status</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></td></tr>
            ) : instruments.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-muted-foreground text-sm">No instruments found</td></tr>
            ) : instruments.map(inst => (
              <tr key={inst.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-3 py-2.5 font-mono font-semibold">{inst.ticker}</td>
                <td className="px-3 py-2.5">
                  <span className="px-2 py-0.5 rounded-full bg-muted text-xs font-medium">{inst.assetType}</span>
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">{inst.nameTh ?? "—"}</td>
                <td className="px-3 py-2.5 hidden md:table-cell text-muted-foreground">{inst.nameEn ?? "—"}</td>
                <td className="px-3 py-2.5 hidden lg:table-cell text-muted-foreground">{inst.exchange ?? inst.provider ?? "—"}</td>
                <td className="px-3 py-2.5 hidden lg:table-cell text-muted-foreground">{inst.sector ?? "—"}</td>
                <td className="px-3 py-2.5">
                  <button onClick={() => handleToggle(inst)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    {inst.isActive
                      ? <ToggleRight className="h-5 w-5 text-emerald-500" />
                      : <ToggleLeft className="h-5 w-5" />}
                    <span className={inst.isActive ? "text-emerald-600 font-medium" : ""}>
                      {inst.isActive ? "Active" : "Off"}
                    </span>
                  </button>
                </td>
                <td className="px-3 py-2.5">
                  <button onClick={() => handleDelete(inst)} className="text-muted-foreground hover:text-red-500 transition-colors p-1 rounded">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="p-1.5 rounded-md border hover:bg-muted disabled:opacity-40 transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-muted-foreground">Page {page} / {pages}</span>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
            className="p-1.5 rounded-md border hover:bg-muted disabled:opacity-40 transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
