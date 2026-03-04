"use client";
import { useState } from "react";
import { Settings, Key, RefreshCw, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminSettingsPage() {
  const [geminiKey, setGeminiKey] = useState("");
  const [adminKey, setAdminKey] = useState(
    typeof window !== "undefined" ? sessionStorage.getItem("admin_key") ?? "" : ""
  );
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (adminKey) sessionStorage.setItem("admin_key", adminKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClearCache = async () => {
    await fetch("/api/admin/feature-flags", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": sessionStorage.getItem("admin_key") ?? "" },
      body: JSON.stringify({ action: "invalidate_cache" }),
    });
    alert("Feature flag cache cleared");
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Admin Settings
        </h1>
        <p className="text-sm text-muted-foreground">Platform-level configuration</p>
      </div>

      {/* Admin Key */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="h-4 w-4" />
            Admin Secret Key
          </CardTitle>
          <CardDescription>Used to authenticate admin API calls. Set via ADMIN_SECRET_KEY env var on server.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Current session key</Label>
            <Input
              type="password"
              value={adminKey}
              onChange={e => setAdminKey(e.target.value)}
              placeholder="Enter admin key"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSave}>
              Save to session
            </Button>
            {saved && (
              <span className="text-sm text-emerald-600 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> Saved
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* External API Keys (env only) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="h-4 w-4" />
            Google Gemini API Key
          </CardTitle>
          <CardDescription>
            Must be set as <code className="bg-muted px-1 rounded text-xs">GEMINI_API_KEY</code> environment variable.
            Cannot be changed from the UI for security reasons.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>API Key (masked)</Label>
            <Input
              type="password"
              value={geminiKey}
              onChange={e => setGeminiKey(e.target.value)}
              placeholder="Set in .env — shown for reference only"
              disabled
            />
          </div>
          <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950 p-2 rounded">
            ⚠️ API keys must be set in server environment variables (.env file or Vercel dashboard). Never expose them in the UI.
          </p>
        </CardContent>
      </Card>

      {/* Cache */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Cache Management
          </CardTitle>
          <CardDescription>Feature flag values are cached for 1 minute in memory.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" onClick={handleClearCache}>
            <RefreshCw className="h-3 w-3 mr-2" />
            Invalidate Feature Flag Cache
          </Button>
        </CardContent>
      </Card>

      {/* Environment Checklist */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Environment Checklist</CardTitle>
          <CardDescription>Required environment variables for full functionality</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm font-mono">
            {[
              "DATABASE_URL",
              "NEXTAUTH_SECRET",
              "NEXTAUTH_URL",
              "GEMINI_API_KEY",
              "ADMIN_SECRET_KEY",
            ].map(key => (
              <div key={key} className="flex items-center gap-2 text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                {key}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
