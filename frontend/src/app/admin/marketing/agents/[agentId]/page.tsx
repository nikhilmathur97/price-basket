"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { apiClient } from "@/services/api";
import { useAgentStream } from "@/hooks/marketing/useAgentStream";
import {
  ArrowLeft, Play, Square, RefreshCw, Copy, Check, CalendarDays,
  Library, Loader2, AlertCircle, CheckCircle2,
} from "lucide-react";

// ── Agent definitions (inputs + metadata) ─────────────────────────────────

interface InputDef {
  name: string;
  label: string;
  type: "text" | "select" | "textarea";
  options?: string[];
  placeholder?: string;
  required?: boolean;
}

const AGENTS: Record<string, {
  label: string; emoji: string; color: string; channel: string;
  desc: string; inputs: InputDef[];
}> = {
  seo: {
    label: "SEO Content Agent", emoji: "🔍", color: "#4285f4",
    channel: "Google Search · Blog · Medium · Hashnode",
    desc: "Generates a complete SEO content package: full blog article, meta tags, FAQ JSON-LD schema, and internal link suggestions.",
    inputs: [
      { name: "keyword", label: "Target Keyword", type: "text", placeholder: "e.g. grocery price comparison app India", required: true },
      { name: "topic", label: "Article Topic", type: "text", placeholder: "e.g. How to save ₹500/month on quick commerce", required: true },
      { name: "word_count", label: "Word Count", type: "select", options: ["600", "800", "1000"] },
    ],
  },
  reddit: {
    label: "Reddit Community Agent", emoji: "🤖", color: "#ff4500",
    channel: "Reddit · r/india · r/delhi · r/bangalore",
    desc: "Organic Reddit posts that feel 100% human. Zero sales language. Story-driven content that naturally leads to PriceBasket.",
    inputs: [
      { name: "subreddit", label: "Target Subreddit", type: "select", options: ["r/india", "r/delhi", "r/bangalore", "r/mumbai", "r/IndiaInvestments", "r/frugal_jerk_india", "r/personalfinanceindia"] },
      { name: "angle", label: "Post Angle", type: "select", options: ["story", "question", "tip", "comparison"] },
    ],
  },
  instagram: {
    label: "Instagram Content Agent", emoji: "📸", color: "#e1306c",
    channel: "Instagram · Creator Account (free)",
    desc: "Hinglish captions, 30 hashtags, Reel scripts, and 6-slide carousel copy for urban Indian millennials.",
    inputs: [
      { name: "post_type", label: "Post Type", type: "select", options: ["carousel", "single", "reel"] },
      { name: "theme", label: "Theme", type: "select", options: ["savings", "comparison", "hack", "festival"] },
    ],
  },
  twitter: {
    label: "Twitter/X Thread Agent", emoji: "𝕏", color: "#1d9bf0",
    channel: "Twitter/X · Buffer free tier",
    desc: "Viral numbered threads with pattern-interrupt hooks. Each tweet ≤280 chars. Best times included.",
    inputs: [
      { name: "topic", label: "Thread Topic", type: "text", placeholder: "e.g. How I save ₹300/month on grocery orders", required: true },
      { name: "hook_style", label: "Hook Style", type: "select", options: ["shocking stat", "question", "story", "controversial take"] },
      { name: "tweet_count", label: "Number of Tweets", type: "select", options: ["5", "8", "10"] },
    ],
  },
  whatsapp: {
    label: "WhatsApp Marketing Agent", emoji: "💬", color: "#25d366",
    channel: "WhatsApp Business (free tier)",
    desc: "Personal-tone messages that feel like a friend sharing a tip. Max 3 emojis. Includes Day 3 + Day 7 follow-ups.",
    inputs: [
      { name: "message_type", label: "Message Type", type: "select", options: ["broadcast", "group-intro", "follow-up", "poll"] },
      { name: "group_type", label: "Group Type", type: "select", options: ["housing-society", "family", "friends", "local-community"] },
      { name: "urgency", label: "Urgency Level", type: "select", options: ["low", "medium", "high"] },
    ],
  },
  youtube: {
    label: "YouTube Shorts Agent", emoji: "▶", color: "#ff0000",
    channel: "YouTube Shorts · CapCut (free edit)",
    desc: "Timestamped scripts labeled VOICEOVER / ON-SCREEN / B-ROLL. Designed for muted viewing and 3-second hook.",
    inputs: [
      { name: "concept", label: "Video Concept", type: "text", placeholder: "e.g. Price comparison reveal between 3 apps", required: true },
      { name: "duration", label: "Duration", type: "select", options: ["30s", "45s", "60s"] },
      { name: "style", label: "Style", type: "select", options: ["talking-head", "screen-recording", "text-animation"] },
    ],
  },
  quora: {
    label: "Quora Authority Agent", emoji: "❓", color: "#b92b27",
    channel: "Quora · Google Search (Quora ranks for years)",
    desc: "3 expert answers that rank on Google. PriceBasket appears as natural recommendation, never the first sentence.",
    inputs: [
      { name: "theme", label: "Question Theme", type: "select", options: ["app-comparison", "savings-tips", "platform-review", "grocery-hacks"] },
      { name: "style", label: "Answer Style", type: "select", options: ["data-driven", "personal-story", "expert-list"] },
    ],
  },
  email: {
    label: "Email Newsletter Agent", emoji: "✉", color: "#6366f1",
    channel: "Substack (free) · Mailchimp free tier",
    desc: "Full newsletter with 3 subject line variants, welcome email, and 3-email re-engagement drip sequence.",
    inputs: [
      { name: "newsletter_type", label: "Newsletter Type", type: "select", options: ["weekly-digest", "product-update", "savings-alert", "festival-special"] },
      { name: "price_drops", label: "This Week's Top Price Drops", type: "textarea", placeholder: "e.g. Amul Butter ₹8 cheaper on Zepto, Tata Salt ₹5 cheaper on Blinkit" },
      { name: "segment", label: "Subscriber Segment", type: "select", options: ["new", "active", "inactive"] },
    ],
  },
  linkedin: {
    label: "LinkedIn B2B Agent", emoji: "💼", color: "#0077b5",
    channel: "LinkedIn · Personal + Company page (free)",
    desc: "Founder story posts, company posts, B2B cold DMs for FMCG brand managers, and engagement comment templates.",
    inputs: [
      { name: "content_type", label: "Content Type", type: "select", options: ["founder-story", "b2b-pitch", "product-launch", "thought-leadership"] },
      { name: "target", label: "Target Audience", type: "select", options: ["consumer-awareness", "b2b-fmcg-brands", "d2c-founders", "investors"] },
    ],
  },
  campaign: {
    label: "Full Campaign Planner", emoji: "🚀", color: "#ea580c",
    channel: "All 10 channels · 100% free",
    desc: "Complete 30-day cross-channel campaign with week-by-week plan, repurposing map, KPI targets, and day-by-day action checklist.",
    inputs: [
      { name: "theme", label: "Campaign Theme / Name", type: "text", placeholder: "e.g. Compare Before You Cart", required: true },
      { name: "duration", label: "Campaign Duration", type: "select", options: ["2-weeks", "30-days", "60-days"] },
      { name: "goal", label: "Primary Goal", type: "select", options: ["awareness", "installs", "b2b-leads", "email-subs"] },
    ],
  },
};

// ── Page component ─────────────────────────────────────────────────────────

export default function AgentRunnerPage({ params }: { params: { agentId: string } }) {
  const { agentId } = params;
  const router = useRouter();
  const agent = AGENTS[agentId];

  const [tone, setTone] = useState("hinglish");
  const [city, setCity] = useState("Jodhpur");
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("09:00");

  const { content, isStreaming, isDone, error, contentId, wordCount, run, stop, reset } = useAgentStream();

  if (!agent) {
    return (
      <div className="card p-8 text-center">
        <p className="text-surface-500 mb-4">Unknown agent: <strong>{agentId}</strong></p>
        <Link href="/admin/marketing/agents" className="btn-primary text-sm">← Back to Agents</Link>
      </div>
    );
  }

  const handleRun = () => {
    run(agentId, inputs, tone, city);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSchedule = async () => {
    if (!contentId || !scheduleDate) return;
    setScheduling(true);
    try {
      await apiClient.post("/marketing/schedule", {
        content_id: contentId,
        platform: agent.channel.split("·")[0].trim(),
        scheduled_for: `${scheduleDate}T${scheduleTime}:00Z`,
      });
      toast.success("Scheduled! Check the Scheduler tab.");
      setScheduling(false);
    } catch {
      toast.error("Schedule failed. Try again.");
      setScheduling(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="card p-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/marketing/agents" className="btn-ghost px-2 py-1">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ backgroundColor: agent.color + "20" }}>
            {agent.emoji}
          </div>
          <div>
            <h3 className="font-bold text-surface-900">{agent.label}</h3>
            <p className="text-xs text-surface-400">{agent.channel}</p>
          </div>
        </div>
        <p className="text-sm text-surface-600 mt-3 ml-14">{agent.desc}</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        {/* Config panel */}
        <div className="lg:col-span-2 space-y-3">
          <div className="card p-4">
            <h4 className="font-semibold text-surface-900 text-sm mb-3">Configuration</h4>
            <div className="space-y-3">
              {/* Tone */}
              <div>
                <label className="block text-xs font-medium text-surface-700 mb-1">Tone</label>
                <select value={tone} onChange={(e) => setTone(e.target.value)}
                  className="w-full text-sm border border-surface-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400">
                  <option value="hinglish">Hinglish (natural mix)</option>
                  <option value="english">English only</option>
                  <option value="hindi">Hindi dominant</option>
                  <option value="urgent">Urgent / FOMO</option>
                  <option value="witty">Witty / humorous</option>
                </select>
              </div>

              {/* City */}
              <div>
                <label className="block text-xs font-medium text-surface-700 mb-1">City Focus</label>
                <select value={city} onChange={(e) => setCity(e.target.value)}
                  className="w-full text-sm border border-surface-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400">
                  {["Jodhpur", "Delhi", "Mumbai", "Bangalore", "Jaipur", "Hyderabad", "Pune", "Chennai", "Indore", "All India"].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Agent-specific inputs */}
              {agent.inputs.map((inp) => (
                <div key={inp.name}>
                  <label className="block text-xs font-medium text-surface-700 mb-1">
                    {inp.label} {inp.required && <span className="text-red-500">*</span>}
                  </label>
                  {inp.type === "select" ? (
                    <select
                      value={inputs[inp.name] ?? ""}
                      onChange={(e) => setInputs((p) => ({ ...p, [inp.name]: e.target.value }))}
                      className="w-full text-sm border border-surface-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400"
                    >
                      {inp.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : inp.type === "textarea" ? (
                    <textarea
                      value={inputs[inp.name] ?? ""}
                      onChange={(e) => setInputs((p) => ({ ...p, [inp.name]: e.target.value }))}
                      placeholder={inp.placeholder}
                      rows={3}
                      className="w-full text-sm border border-surface-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
                    />
                  ) : (
                    <input
                      type="text"
                      value={inputs[inp.name] ?? ""}
                      onChange={(e) => setInputs((p) => ({ ...p, [inp.name]: e.target.value }))}
                      placeholder={inp.placeholder}
                      className="w-full text-sm border border-surface-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  )}
                </div>
              ))}

              {/* Run button */}
              <div className="pt-1 flex gap-2">
                {!isStreaming ? (
                  <button
                    onClick={handleRun}
                    disabled={isStreaming}
                    className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm"
                  >
                    <Play className="w-4 h-4" />
                    Run Agent
                  </button>
                ) : (
                  <button onClick={stop} className="flex-1 flex items-center justify-center gap-2 text-sm px-4 py-2.5 rounded-xl bg-red-100 text-red-700 font-semibold hover:bg-red-200 transition-colors">
                    <Square className="w-4 h-4" />
                    Stop
                  </button>
                )}
                {(isDone || error) && (
                  <button onClick={reset} className="btn-secondary flex items-center gap-1 text-sm px-3">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Schedule panel — shows after save */}
          {isDone && contentId && (
            <div className="card p-4 border border-green-200 bg-green-50">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <p className="text-sm font-semibold text-green-800">Saved to library</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-surface-700">Schedule for publishing</p>
                <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full text-sm border border-surface-200 rounded-xl px-3 py-2 bg-white" />
                <input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full text-sm border border-surface-200 rounded-xl px-3 py-2 bg-white" />
                <button onClick={handleSchedule} disabled={scheduling || !scheduleDate}
                  className="btn-primary w-full text-sm flex items-center justify-center gap-2">
                  {scheduling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CalendarDays className="w-3.5 h-3.5" />}
                  Schedule
                </button>
                <Link href="/admin/marketing/library" className="btn-secondary w-full text-sm text-center block">
                  <Library className="w-3.5 h-3.5 inline mr-1" />
                  View in Library
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Output panel */}
        <div className="lg:col-span-3">
          <div className="card overflow-hidden h-full min-h-[500px] flex flex-col">
            <div className="flex items-center justify-between p-3 border-b border-surface-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-surface-500 uppercase tracking-wide">Output</span>
                {isStreaming && (
                  <span className="inline-flex items-center gap-1 text-xs text-brand-600 font-medium">
                    <Loader2 className="w-3 h-3 animate-spin" /> Agent working…
                  </span>
                )}
                {isDone && (
                  <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                    <CheckCircle2 className="w-3 h-3" /> Done
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {wordCount > 0 && (
                  <span className="text-xs text-surface-400">{wordCount.toLocaleString()} words</span>
                )}
                {content && (
                  <button onClick={handleCopy} className="btn-ghost px-2 py-1 text-xs flex items-center gap-1">
                    {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {/* Error state */}
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Agent failed</p>
                    <p className="text-xs text-red-600 mt-0.5">{error}</p>
                    <button onClick={handleRun} className="text-xs text-red-700 underline mt-1">Retry</button>
                  </div>
                </div>
              )}

              {/* Empty / waiting state */}
              {!content && !error && !isStreaming && (
                <div className="flex flex-col items-center justify-center h-full text-center py-16">
                  <span className="text-5xl mb-3">{agent.emoji}</span>
                  <p className="text-sm text-surface-500">Configure the agent and click <strong>Run Agent</strong></p>
                  <p className="text-xs text-surface-400 mt-1">Content streams in real-time · Auto-saves on completion</p>
                </div>
              )}

              {/* Streaming skeleton */}
              {isStreaming && !content && (
                <div className="space-y-2 animate-pulse">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-4 bg-surface-100 rounded" style={{ width: `${70 + Math.random() * 30}%` }} />
                  ))}
                </div>
              )}

              {/* Generated content */}
              {content && (
                <pre className="text-sm text-surface-800 whitespace-pre-wrap font-mono leading-relaxed">
                  {content}
                  {isStreaming && <span className="inline-block w-2 h-4 bg-brand-600 animate-pulse ml-0.5 align-text-bottom" />}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
