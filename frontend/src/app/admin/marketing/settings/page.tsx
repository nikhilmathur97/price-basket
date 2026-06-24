"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { apiClient } from "@/services/api";
import { Save, Eye, EyeOff, Loader2, Info } from "lucide-react";

// Settings are stored locally (localStorage) since most are config + API keys.
// ANTHROPIC_API_KEY is managed server-side via env var.

const STORAGE_KEY = "pb_marketing_settings";

function loadSettings() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveSettings(data: Record<string, string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

interface SectionProps { title: string; children: React.ReactNode }
function Section({ title, children }: SectionProps) {
  return (
    <div className="card p-4 space-y-3">
      <h3 className="font-bold text-surface-900 text-sm border-b border-surface-100 pb-2">{title}</h3>
      {children}
    </div>
  );
}

interface FieldProps { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; hint?: string }
function Field({ label, value, onChange, placeholder, type = "text", hint }: FieldProps) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <div>
      <label className="block text-xs font-medium text-surface-700 mb-1">{label}</label>
      <div className="relative">
        <input
          type={isPassword && !show ? "password" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full text-sm border border-surface-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 pr-8"
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(!show)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600">
            {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
      {hint && <p className="text-xs text-surface-400 mt-1">{hint}</p>}
    </div>
  );
}

export default function SettingsPage() {
  const stored = loadSettings();
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<"untested" | "ok" | "fail">("untested");

  // Brand config
  const [brandName, setBrandName] = useState(stored.brandName ?? "PriceBasket");
  const [brandTagline, setBrandTagline] = useState(stored.brandTagline ?? "COMPARE • SAVE • SMART");
  const [brandUrl, setBrandUrl] = useState(stored.brandUrl ?? "https://pricebasket.in");
  const [brandVoice, setBrandVoice] = useState(stored.brandVoice ?? "Smart, witty, savings-obsessed, authentic Hinglish where natural. Tier 2 India angle as authentic USP.");
  const [defaultCTA, setDefaultCTA] = useState(stored.defaultCTA ?? "Compare prices at pricebasket.in");
  const [competitorsAvoid, setCompetitorsAvoid] = useState(stored.competitorsAvoid ?? "");

  // API config
  const [gaId, setGaId] = useState(stored.gaId ?? "");
  const [notifEmail, setNotifEmail] = useState(stored.notifEmail ?? "");

  // Agent defaults
  const [defaultTone, setDefaultTone] = useState(stored.defaultTone ?? "hinglish");
  const [defaultCity, setDefaultCity] = useState(stored.defaultCity ?? "Jodhpur");
  const [defaultLang, setDefaultLang] = useState(stored.defaultLang ?? "hinglish");

  // Content rules (custom rules prepended to every agent prompt)
  const [contentRules, setContentRules] = useState(
    stored.contentRules ?? "Never mention competitor apps by name.\nAlways end with a CTA to pricebasket.in.\nUse ₹ symbol for Indian Rupees."
  );

  const handleSave = async () => {
    setSaving(true);
    const data = {
      brandName, brandTagline, brandUrl, brandVoice, defaultCTA, competitorsAvoid,
      gaId, notifEmail, defaultTone, defaultCity, defaultLang, contentRules,
    };
    saveSettings(data);
    await new Promise((r) => setTimeout(r, 300));
    setSaving(false);
    toast.success("Settings saved locally.");
  };

  const testAnthropicKey = async () => {
    setTesting(true);
    try {
      // Test by calling the dashboard stats — if it fails with 503 "ANTHROPIC_API_KEY not configured", key is missing
      await apiClient.get("/marketing/dashboard/stats");
      setApiKeyStatus("ok");
      toast.success("Backend is reachable. Run an agent to verify the API key.");
    } catch {
      setApiKeyStatus("fail");
      toast.error("Backend unreachable. Check your connection.");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Brand Configuration */}
        <Section title="Brand Configuration">
          <Field label="Brand Name" value={brandName} onChange={setBrandName} placeholder="PriceBasket" />
          <Field label="Tagline" value={brandTagline} onChange={setBrandTagline} placeholder="COMPARE • SAVE • SMART" />
          <Field label="Website URL" value={brandUrl} onChange={setBrandUrl} placeholder="https://pricebasket.in" />
          <div>
            <label className="block text-xs font-medium text-surface-700 mb-1">Brand Voice Description</label>
            <textarea value={brandVoice} onChange={(e) => setBrandVoice(e.target.value)} rows={3}
              className="w-full text-sm border border-surface-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none" />
          </div>
          <Field label="Default CTA Text" value={defaultCTA} onChange={setDefaultCTA} placeholder="Compare prices at pricebasket.in" />
          <Field label="Competitor Names to Avoid" value={competitorsAvoid} onChange={setCompetitorsAvoid}
            placeholder="Blinkit, Zepto (leave blank = none)"
            hint="Agents won't mention these directly in public-facing content." />
        </Section>

        <div className="space-y-4">
          {/* API Configuration */}
          <Section title="API Configuration">
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-blue-800">
                <p className="font-semibold">ANTHROPIC_API_KEY</p>
                <p className="mt-0.5">Set this as an environment variable on your backend (Render/Railway), not here. Adding it here would expose it in the browser.</p>
                <p className="mt-1 font-mono text-xs">ANTHROPIC_API_KEY=sk-ant-xxxx</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={testAnthropicKey} disabled={testing}
                className="btn-secondary text-sm flex items-center gap-2">
                {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Test Backend Connection
              </button>
              {apiKeyStatus === "ok" && <span className="text-xs text-green-600 font-medium">✓ Connected</span>}
              {apiKeyStatus === "fail" && <span className="text-xs text-red-600 font-medium">✗ Unreachable</span>}
            </div>
            <Field label="Google Analytics Measurement ID (optional)" value={gaId} onChange={setGaId} placeholder="G-XXXXXXXXXX"
              hint="Used to pull organic session data into the analytics dashboard." />
            <Field label="Notification Email (for scheduler reminders)" value={notifEmail} onChange={setNotifEmail}
              placeholder="nikhil@pricebasket.in" />
          </Section>

          {/* Agent Defaults */}
          <Section title="Agent Defaults">
            <div>
              <label className="block text-xs font-medium text-surface-700 mb-1">Default Tone</label>
              <select value={defaultTone} onChange={(e) => setDefaultTone(e.target.value)}
                className="w-full text-sm border border-surface-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400">
                <option value="hinglish">Hinglish (natural mix)</option>
                <option value="english">English only</option>
                <option value="urgent">Urgent / FOMO</option>
                <option value="witty">Witty / humorous</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-700 mb-1">Default City Focus</label>
              <select value={defaultCity} onChange={(e) => setDefaultCity(e.target.value)}
                className="w-full text-sm border border-surface-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400">
                {["Jodhpur", "Delhi", "Mumbai", "Bangalore", "Jaipur", "Hyderabad", "All India"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </Section>
        </div>
      </div>

      {/* Content Rules */}
      <Section title="Global Content Rules (prepended to every agent prompt)">
        <p className="text-xs text-surface-400">These rules are included in every agent call. Use them to enforce brand-specific restrictions.</p>
        <textarea value={contentRules} onChange={(e) => setContentRules(e.target.value)} rows={6}
          className="w-full text-sm border border-surface-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 font-mono resize-none" />
        <p className="text-xs text-surface-400">One rule per line. Example: &quot;Never compare prices with specific competitor data.&quot;</p>
      </Section>

      {/* Save button */}
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Settings
        </button>
      </div>
    </div>
  );
}
