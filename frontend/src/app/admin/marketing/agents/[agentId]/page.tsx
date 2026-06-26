"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { apiClient } from "@/services/api";
import { useAgentStream } from "@/hooks/marketing/useAgentStream";
import {
  ArrowLeft, Play, Square, RefreshCw, Copy, Check, CalendarDays,
  Library, Loader2, AlertCircle, CheckCircle2, Eye, Send, X, ExternalLink,
} from "lucide-react";

// ── Agent definitions ──────────────────────────────────────────────────────

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
  desc: string; inputs: InputDef[]; canPost?: boolean;
}> = {
  seo: {
    label: "SEO Content Agent", emoji: "🔍", color: "#4285f4",
    channel: "Google Search · Blog · Medium · Hashnode",
    desc: "Generates a complete SEO content package: full blog article, meta tags, FAQ JSON-LD schema, and internal link suggestions.",
    canPost: true,
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
    canPost: true,
    inputs: [
      { name: "subreddit", label: "Target Subreddit", type: "select", options: ["r/india", "r/delhi", "r/bangalore", "r/mumbai", "r/IndiaInvestments", "r/frugal_jerk_india", "r/personalfinanceindia"] },
      { name: "angle", label: "Post Angle", type: "select", options: ["story", "question", "tip", "comparison"] },
    ],
  },
  instagram: {
    label: "Instagram Content Agent", emoji: "📸", color: "#e1306c",
    channel: "Instagram · Creator Account (free)",
    desc: "Hinglish captions, 30 hashtags, Reel scripts, and 6-slide carousel copy for urban Indian millennials.",
    canPost: false,
    inputs: [
      { name: "post_type", label: "Post Type", type: "select", options: ["carousel", "single", "reel"] },
      { name: "theme", label: "Theme", type: "select", options: ["savings", "comparison", "hack", "festival"] },
    ],
  },
  twitter: {
    label: "Twitter/X Thread Agent", emoji: "𝕏", color: "#1d9bf0",
    channel: "Twitter/X · Buffer free tier",
    desc: "Viral numbered threads with pattern-interrupt hooks. Each tweet ≤280 chars. Best times included.",
    canPost: true,
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
    canPost: true,
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
    canPost: false,
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
    canPost: false,
    inputs: [
      { name: "theme", label: "Question Theme", type: "select", options: ["app-comparison", "savings-tips", "platform-review", "grocery-hacks"] },
      { name: "style", label: "Answer Style", type: "select", options: ["data-driven", "personal-story", "expert-list"] },
    ],
  },
  email: {
    label: "Email Newsletter Agent", emoji: "✉", color: "#6366f1",
    channel: "Substack (free) · Mailchimp free tier",
    desc: "Full newsletter with 3 subject line variants, welcome email, and 3-email re-engagement drip sequence.",
    canPost: true,
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
    canPost: true,
    inputs: [
      { name: "content_type", label: "Content Type", type: "select", options: ["founder-story", "b2b-pitch", "product-launch", "thought-leadership"] },
      { name: "target", label: "Target Audience", type: "select", options: ["consumer-awareness", "b2b-fmcg-brands", "d2c-founders", "investors"] },
    ],
  },
  campaign: {
    label: "Full Campaign Planner", emoji: "🚀", color: "#ea580c",
    channel: "All 10 channels · 100% free",
    desc: "Complete 30-day cross-channel campaign with week-by-week plan, repurposing map, KPI targets, and day-by-day action checklist.",
    canPost: false,
    inputs: [
      { name: "theme", label: "Campaign Theme / Name", type: "text", placeholder: "e.g. Compare Before You Cart", required: true },
      { name: "duration", label: "Campaign Duration", type: "select", options: ["2-weeks", "30-days", "60-days"] },
      { name: "goal", label: "Primary Goal", type: "select", options: ["awareness", "installs", "b2b-leads", "email-subs"] },
    ],
  },
};

// ── Platform Preview Mockup ────────────────────────────────────────────────

function PlatformPreview({ agentId, svg }: { agentId: string; svg: string }) {
  if (!svg) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="text-4xl mb-3 opacity-30">🖼</div>
        <p className="text-sm text-surface-400">Creative poster will appear here after generation</p>
        <p className="text-xs text-surface-300 mt-1">Runs automatically when agent completes</p>
      </div>
    );
  }

  if (agentId === "instagram") {
    return (
      <div className="flex justify-center">
        <div className="w-72 bg-white rounded-2xl shadow-xl overflow-hidden border border-surface-200">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-surface-100">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center text-white text-xs font-bold">P</div>
            <div>
              <p className="text-xs font-semibold text-surface-900">pricebasket.in</p>
              <p className="text-[10px] text-surface-400">Sponsored</p>
            </div>
            <div className="ml-auto text-surface-400 text-sm">···</div>
          </div>
          <div className="w-full aspect-square" dangerouslySetInnerHTML={{ __html: svg }} style={{ lineHeight: 0 }} />
          <div className="px-3 py-2">
            <div className="flex gap-3 mb-1.5 text-surface-700 text-lg">
              <span>🤍</span><span>💬</span><span>↗</span>
              <span className="ml-auto">🔖</span>
            </div>
            <p className="text-[11px] font-semibold text-surface-900">1,247 likes</p>
            <p className="text-[11px] text-surface-600 mt-0.5">
              <span className="font-semibold">pricebasket.in</span> Save big on every grocery order 🛒
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (agentId === "twitter") {
    return (
      <div className="flex justify-center">
        <div className="w-80 bg-white rounded-2xl shadow-xl overflow-hidden border border-surface-200 p-4">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white font-bold text-sm flex-shrink-0">P</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-sm font-bold text-surface-900">PriceBasket</span>
                <span className="text-blue-500 text-xs">✓</span>
                <span className="text-xs text-surface-400 ml-1">@pricebasketin</span>
              </div>
              <p className="text-sm text-surface-800 mb-2 leading-relaxed">
                🧵 Thread: How to save ₹500/month on groceries without switching apps...
              </p>
              <div className="w-full rounded-xl overflow-hidden border border-surface-200" dangerouslySetInnerHTML={{ __html: svg }} style={{ lineHeight: 0 }} />
              <div className="flex gap-5 mt-2 text-surface-400 text-xs">
                <span>💬 42</span><span>🔁 128</span><span>🤍 891</span><span>📊 12.4K</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (agentId === "whatsapp") {
    return (
      <div className="flex justify-center">
        <div className="w-72 bg-[#e5ddd5] rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-[#075e54] px-3 py-2 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-300 flex items-center justify-center text-green-900 font-bold text-sm">P</div>
            <div>
              <p className="text-white text-sm font-semibold">PriceBasket</p>
              <p className="text-green-200 text-[10px]">online</p>
            </div>
          </div>
          <div className="p-3">
            <div className="flex justify-end">
              <div className="bg-[#dcf8c6] rounded-xl rounded-tr-sm px-3 py-2 max-w-[90%] shadow-sm">
                <div className="w-full rounded-lg overflow-hidden mb-1" dangerouslySetInnerHTML={{ __html: svg }} style={{ lineHeight: 0 }} />
                <p className="text-[11px] text-surface-700 leading-relaxed">
                  🛒 Bhai, dekh ye app! Grocery prices compare karta hai automatically!
                </p>
                <p className="text-[9px] text-surface-400 text-right mt-1">10:42 AM ✓✓</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (agentId === "linkedin") {
    return (
      <div className="flex justify-center">
        <div className="w-80 bg-white rounded-2xl shadow-xl overflow-hidden border border-surface-200">
          <div className="p-3 flex items-start gap-2">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">P</div>
            <div>
              <p className="text-sm font-semibold text-surface-900">PriceBasket India</p>
              <p className="text-[11px] text-surface-400">Consumer Technology · 2,847 followers</p>
              <p className="text-[10px] text-surface-400">3h · 🌐</p>
            </div>
          </div>
          <p className="px-3 pb-2 text-sm text-surface-700 leading-relaxed">
            Excited to share how we&apos;re helping 50,000+ Indian families save on groceries every month 🧵
          </p>
          <div className="w-full" dangerouslySetInnerHTML={{ __html: svg }} style={{ lineHeight: 0 }} />
          <div className="px-3 py-2 border-t border-surface-100 flex gap-4 text-xs text-surface-500">
            <span>👍 234</span><span>💬 18 comments</span><span>↗ 45 reposts</span>
          </div>
        </div>
      </div>
    );
  }

  if (agentId === "reddit") {
    return (
      <div className="flex justify-center">
        <div className="w-80 bg-white rounded-2xl shadow-xl overflow-hidden border border-surface-200">
          <div className="bg-[#ff4500] px-3 py-1.5 flex items-center gap-2">
            <span className="text-white font-bold text-sm">reddit</span>
            <span className="text-orange-200 text-xs">r/india</span>
          </div>
          <div className="p-3">
            <div className="flex items-center gap-1 mb-1">
              <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center text-[10px]">👤</div>
              <span className="text-[11px] text-surface-500">u/savvy_shopper_india · 2h</span>
            </div>
            <p className="text-sm font-semibold text-surface-900 mb-2 leading-snug">
              Found this app that compares grocery prices — saved ₹400 this week
            </p>
            <div className="w-full rounded-lg overflow-hidden border border-surface-100 mb-2" dangerouslySetInnerHTML={{ __html: svg }} style={{ lineHeight: 0 }} />
            <div className="flex gap-3 text-xs text-surface-400">
              <span>⬆ 847</span><span>💬 134 comments</span><span>↗ Share</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (agentId === "email") {
    return (
      <div className="flex justify-center">
        <div className="w-80 bg-white rounded-2xl shadow-xl overflow-hidden border border-surface-200">
          <div className="bg-surface-50 px-3 py-2 border-b border-surface-200">
            <p className="text-[11px] text-surface-500">From: <span className="text-surface-800">hello@pricebasket.in</span></p>
            <p className="text-[11px] text-surface-500">Subject: <span className="text-surface-800 font-medium">💰 This week&apos;s top price drops</span></p>
          </div>
          <div className="w-full" dangerouslySetInnerHTML={{ __html: svg }} style={{ lineHeight: 0 }} />
          <div className="p-3">
            <p className="text-xs text-surface-600 leading-relaxed">
              Hi there! Here are this week&apos;s best deals across quick commerce platforms...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <div className="w-80 rounded-2xl shadow-xl overflow-hidden border border-surface-200">
        <div className="w-full" dangerouslySetInnerHTML={{ __html: svg }} style={{ lineHeight: 0 }} />
      </div>
    </div>
  );
}

// ── Publish Modal ──────────────────────────────────────────────────────────

interface PublishModalProps {
  agentId: string;
  contentId: string;
  content: string;
  onClose: () => void;
}

const PLATFORM_LABEL: Record<string, string> = {
  twitter: "Twitter/X", reddit: "Reddit", linkedin: "LinkedIn",
  whatsapp: "WhatsApp", email: "Email", seo: "Medium",
  instagram: "Instagram", youtube: "YouTube", quora: "Quora", campaign: "All Channels",
};

function PublishModal({ agentId, contentId, content, onClose }: PublishModalProps) {
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [publishResult, setPublishResult] = useState<{ url?: string; message?: string } | null>(null);
  const [redditTitle, setRedditTitle] = useState("");
  const [redditSubreddit, setRedditSubreddit] = useState("r/india");
  const [whatsappPhones, setWhatsappPhones] = useState("");
  const [emailSubject, setEmailSubject] = useState("💰 PriceBasket — This week's top savings");
  const [emailTo, setEmailTo] = useState("");
  const [linkedinCompany, setLinkedinCompany] = useState(false);
  const [mediumTags, setMediumTags] = useState("pricebasket,savings,india");

  const handlePublish = useCallback(async () => {
    setPublishing(true);
    try {
      const extra: Record<string, unknown> = {};
      if (agentId === "reddit") {
        extra.title = redditTitle || "Check this out";
        extra.subreddit = redditSubreddit.replace(/^r\//, "");
      } else if (agentId === "whatsapp") {
        extra.phone_numbers = whatsappPhones.split(",").map((p) => p.trim()).filter(Boolean);
      } else if (agentId === "email") {
        extra.subject = emailSubject;
        extra.to_list = emailTo.split(",").map((e) => e.trim()).filter(Boolean);
      } else if (agentId === "linkedin") {
        extra.is_company = linkedinCompany;
      } else if (agentId === "seo") {
        extra.tags = mediumTags.split(",").map((t) => t.trim()).filter(Boolean);
      }

      const res = await apiClient.post("/marketing/publish", {
        content_id: contentId,
        platform: agentId,
        content,
        extra,
      });

      setPublishResult(res.data);
      setPublished(true);
      toast.success(`Posted to ${PLATFORM_LABEL[agentId] ?? agentId}! 🎉`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Publish failed. Check your credentials in Settings.";
      toast.error(msg);
    } finally {
      setPublishing(false);
    }
  }, [agentId, contentId, content, redditTitle, redditSubreddit, whatsappPhones, emailSubject, emailTo, linkedinCompany, mediumTags]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-brand-600" />
            <h3 className="font-bold text-surface-900">Post to {PLATFORM_LABEL[agentId] ?? agentId}</h3>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {published ? (
            <div className="text-center py-6">
              <div className="text-5xl mb-3">🎉</div>
              <p className="font-bold text-surface-900 text-lg">Posted successfully!</p>
              {publishResult?.url && (
                <a href={publishResult.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-brand-600 underline mt-2">
                  View post <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              {publishResult?.message && (
                <p className="text-sm text-surface-500 mt-2">{publishResult.message}</p>
              )}
              <button onClick={onClose} className="btn-primary mt-4 text-sm">Done</button>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-surface-700 mb-1">Content Preview</label>
                <div className="bg-surface-50 rounded-xl p-3 max-h-28 overflow-y-auto">
                  <p className="text-xs text-surface-700 whitespace-pre-wrap leading-relaxed">
                    {content.slice(0, 400)}{content.length > 400 ? "…" : ""}
                  </p>
                </div>
              </div>

              {agentId === "reddit" && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-surface-700 mb-1">
                      Post Title <span className="text-red-500">*</span>
                    </label>
                    <input type="text" value={redditTitle} onChange={(e) => setRedditTitle(e.target.value)}
                      placeholder="e.g. Found an app that saves ₹400/month on groceries"
                      className="w-full text-sm border border-surface-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-700 mb-1">Subreddit</label>
                    <select value={redditSubreddit} onChange={(e) => setRedditSubreddit(e.target.value)}
                      className="w-full text-sm border border-surface-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400">
                      {["r/india", "r/delhi", "r/bangalore", "r/mumbai", "r/IndiaInvestments", "r/frugal_jerk_india", "r/personalfinanceindia"].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {agentId === "whatsapp" && (
                <div>
                  <label className="block text-xs font-medium text-surface-700 mb-1">
                    Phone Numbers (comma-separated, with country code)
                  </label>
                  <textarea value={whatsappPhones} onChange={(e) => setWhatsappPhones(e.target.value)}
                    placeholder="+919876543210, +919123456789" rows={2}
                    className="w-full text-sm border border-surface-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
              )}

              {agentId === "email" && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-surface-700 mb-1">Subject Line</label>
                    <input type="text" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full text-sm border border-surface-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-700 mb-1">
                      Recipients (comma-separated emails)
                    </label>
                    <textarea value={emailTo} onChange={(e) => setEmailTo(e.target.value)}
                      placeholder="user@example.com, another@example.com" rows={2}
                      className="w-full text-sm border border-surface-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-400" />
                  </div>
                </>
              )}

              {agentId === "linkedin" && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={linkedinCompany} onChange={(e) => setLinkedinCompany(e.target.checked)} className="rounded" />
                  <span className="text-sm text-surface-700">Post as Company Page (not personal profile)</span>
                </label>
              )}

              {agentId === "seo" && (
                <div>
                  <label className="block text-xs font-medium text-surface-700 mb-1">Medium Tags (comma-separated)</label>
                  <input type="text" value={mediumTags} onChange={(e) => setMediumTags(e.target.value)}
                    className="w-full text-sm border border-surface-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400" />
                </div>
              )}

              <button onClick={handlePublish} disabled={publishing}
                className="btn-primary w-full flex items-center justify-center gap-2 text-sm">
                {publishing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Publishing…</>
                ) : (
                  <><Send className="w-4 h-4" />Post Now to {PLATFORM_LABEL[agentId] ?? agentId}</>
                )}
              </button>

              <p className="text-[11px] text-surface-400 text-center">
                Make sure credentials are configured in{" "}
                <Link href="/admin/marketing/settings" className="underline text-brand-500">Settings</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page component ─────────────────────────────────────────────────────────

function loadDefaultSetting(key: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = JSON.parse(localStorage.getItem("pb_marketing_settings") ?? "{}");
    return stored[key] || fallback;
  } catch {
    return fallback;
  }
}

export default function AgentRunnerPage({ params }: { params: { agentId: string } }) {
  const { agentId } = params;
  const agent = AGENTS[agentId];

  const [tone, setTone] = useState(() => loadDefaultSetting("defaultTone", "hinglish"));
  const [city, setCity] = useState(() => loadDefaultSetting("defaultCity", "Jodhpur"));
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [creativeTheme, setCreativeTheme] = useState("orange");
  const [activeTab, setActiveTab] = useState<"output" | "preview">("output");
  const [copied, setCopied] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [showPublishModal, setShowPublishModal] = useState(false);

  const { content, svg, isStreaming, isDone, error, contentId, wordCount, provider, run, stop, reset } = useAgentStream();

  if (!agent) {
    return (
      <div className="card p-8 text-center">
        <p className="text-surface-500 mb-4">Unknown agent: <strong>{agentId}</strong></p>
        <Link href="/admin/marketing/agents" className="btn-primary text-sm">← Back to Agents</Link>
      </div>
    );
  }

  const handleRun = () => {
    setActiveTab("output");
    run(agentId, inputs, tone, city, "", true, creativeTheme);
  };

  // Auto-switch to preview tab when SVG arrives
  useEffect(() => {
    if (svg && activeTab === "output") {
      setActiveTab("preview");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svg]);

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
    } catch {
      toast.error("Schedule failed. Try again.");
    } finally {
      setScheduling(false);
    }
  };

  const tabCls = (tab: "output" | "preview") =>
    `px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
      activeTab === tab
        ? "bg-brand-600 text-white"
        : "text-surface-500 hover:text-surface-700 hover:bg-surface-100"
    }`;

  return (
    <>
      {showPublishModal && contentId && (
        <PublishModal
          agentId={agentId}
          contentId={contentId}
          content={content}
          onClose={() => setShowPublishModal(false)}
        />
      )}

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

                {/* Creative theme */}
                <div>
                  <label className="block text-xs font-medium text-surface-700 mb-1">Creative Theme</label>
                  <div className="flex gap-2">
                    {[
                      { id: "orange", label: "🟠 Orange", bg: "#ff6b35" },
                      { id: "dark", label: "⚫ Dark", bg: "#1a1a2e" },
                      { id: "minimal", label: "⬜ Minimal", bg: "#f8f9fa" },
                    ].map((t) => (
                      <button key={t.id} onClick={() => setCreativeTheme(t.id)}
                        className={`flex-1 text-xs py-1.5 px-2 rounded-lg border transition-all ${
                          creativeTheme === t.id
                            ? "border-brand-500 bg-brand-50 text-brand-700 font-semibold"
                            : "border-surface-200 text-surface-600 hover:border-surface-300"
                        }`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Agent-specific inputs */}
                {agent.inputs.map((inp) => (
                  <div key={inp.name}>
                    <label className="block text-xs font-medium text-surface-700 mb-1">
                      {inp.label} {inp.required && <span className="text-red-500">*</span>}
                    </label>
                    {inp.type === "select" ? (
                      <select value={inputs[inp.name] ?? ""}
                        onChange={(e) => setInputs((p) => ({ ...p, [inp.name]: e.target.value }))}
                        className="w-full text-sm border border-surface-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400">
                        {inp.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : inp.type === "textarea" ? (
                      <textarea value={inputs[inp.name] ?? ""}
                        onChange={(e) => setInputs((p) => ({ ...p, [inp.name]: e.target.value }))}
                        placeholder={inp.placeholder} rows={3}
                        className="w-full text-sm border border-surface-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none" />
                    ) : (
                      <input type="text" value={inputs[inp.name] ?? ""}
                        onChange={(e) => setInputs((p) => ({ ...p, [inp.name]: e.target.value }))}
                        placeholder={inp.placeholder}
                        className="w-full text-sm border border-surface-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400" />
                    )}
                  </div>
                ))}

                {/* Run / Stop buttons */}
                <div className="pt-1 flex gap-2">
                  {!isStreaming ? (
                    <button onClick={handleRun} disabled={isStreaming}
                      className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm">
                      <Play className="w-4 h-4" />
                      Run Agent
                    </button>
                  ) : (
                    <button onClick={stop}
                      className="flex-1 flex items-center justify-center gap-2 text-sm px-4 py-2.5 rounded-xl bg-red-100 text-red-700 font-semibold hover:bg-red-200 transition-colors">
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

            {/* Post Now + Preview buttons — shown after save */}
            {isDone && contentId && (
              <div className="card p-4 border border-green-200 bg-green-50 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <p className="text-sm font-semibold text-green-800">Saved to library</p>
                </div>

                {/* Preview + Post Now */}
                <div className="flex gap-2">
                  <button onClick={() => setActiveTab("preview")}
                    className="flex-1 flex items-center justify-center gap-1.5 text-sm px-3 py-2 rounded-xl border border-surface-300 bg-white text-surface-700 font-medium hover:bg-surface-50 transition-colors">
                    <Eye className="w-3.5 h-3.5" />
                    👁 Preview
                  </button>
                  {agent.canPost && (
                    <button onClick={() => setShowPublishModal(true)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-sm px-3 py-2 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 transition-colors">
                      <Send className="w-3.5 h-3.5" />
                      🚀 Post Now
                    </button>
                  )}
                </div>

                {/* Schedule */}
                <div className="space-y-2 pt-1 border-t border-green-200">
                  <p className="text-xs font-medium text-surface-700">Schedule for later</p>
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

          {/* Output + Preview panel */}
          <div className="lg:col-span-3">
            <div className="card overflow-hidden h-full min-h-[500px] flex flex-col">
              {/* Tab bar */}
              <div className="flex items-center justify-between p-3 border-b border-surface-100">
                <div className="flex items-center gap-1">
                  <button onClick={() => setActiveTab("output")} className={tabCls("output")}>
                    Output
                  </button>
                  <button onClick={() => setActiveTab("preview")} className={tabCls("preview")}>
                    {svg ? "👁 Preview" : "Preview"}
                    {svg && activeTab !== "preview" && (
                      <span className="ml-1 w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                    )}
                  </button>
                </div>
                <div className="flex items-center gap-2">
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
                  {wordCount > 0 && (
                    <span className="text-xs text-surface-400">{wordCount.toLocaleString()} words</span>
                  )}
                  {provider && isDone && (
                    <span className="text-xs text-surface-300 bg-surface-100 px-1.5 py-0.5 rounded">
                      {provider === "gemini" ? "✦ Gemini" : provider === "claude" ? "◆ Claude" : provider}
                    </span>
                  )}
                  {content && activeTab === "output" && (
                    <button onClick={handleCopy} className="btn-ghost px-2 py-1 text-xs flex items-center gap-1">
                      {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {/* ── OUTPUT TAB ── */}
                {activeTab === "output" && (
                  <>
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

                    {!content && !error && !isStreaming && (
                      <div className="flex flex-col items-center justify-center h-full text-center py-16">
                        <span className="text-5xl mb-3">{agent.emoji}</span>
                        <p className="text-sm text-surface-500">Configure the agent and click <strong>Run Agent</strong></p>
                        <p className="text-xs text-surface-400 mt-1">Content streams in real-time · Auto-saves on completion</p>
                      </div>
                    )}

                    {isStreaming && !content && (
                      <div className="space-y-2 animate-pulse">
                        {[...Array(6)].map((_, i) => (
                          <div key={i} className="h-4 bg-surface-100 rounded" style={{ width: `${70 + (i * 7) % 30}%` }} />
                        ))}
                      </div>
                    )}

                    {content && (
                      <pre className="text-sm text-surface-800 whitespace-pre-wrap font-mono leading-relaxed">
                        {content}
                        {isStreaming && <span className="inline-block w-2 h-4 bg-brand-600 animate-pulse ml-0.5 align-text-bottom" />}
                      </pre>
                    )}
                  </>
                )}

                {/* ── PREVIEW TAB ── */}
                {activeTab === "preview" && (
                  <div className="space-y-4">
                    <PlatformPreview agentId={agentId} svg={svg} />
                    {svg && isDone && agent.canPost && (
                      <div className="flex justify-center">
                        <button onClick={() => setShowPublishModal(true)}
                          className="flex items-center gap-2 text-sm px-5 py-2.5 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 transition-colors shadow-md">
                          <Send className="w-4 h-4" />
                          🚀 Post Now to {PLATFORM_LABEL[agentId] ?? agentId}
                        </button>
                      </div>
                    )}
                    {svg && (
                      <p className="text-center text-xs text-surface-400">
                        SVG creative · {agentId} format · {creativeTheme} theme
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
