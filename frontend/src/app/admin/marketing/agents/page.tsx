"use client";

import Link from "next/link";

const AGENTS = [
  {
    id: "seo",
    label: "SEO Content Agent",
    emoji: "🔍",
    color: "#4285f4",
    bg: "bg-blue-50",
    border: "border-blue-200",
    channel: "Google Search / Blog",
    desc: "Full blog article + meta tags + FAQ schema + internal links. Ranks on Google.",
    outputs: ["Blog article (H1+H2)", "Meta title & description", "FAQ JSON-LD schema", "Internal link suggestions"],
  },
  {
    id: "reddit",
    label: "Reddit Community Agent",
    emoji: "🤖",
    color: "#ff4500",
    bg: "bg-orange-50",
    border: "border-orange-200",
    channel: "Reddit organic",
    desc: "Organic story posts + 3 comment variants. Sounds like a genuine user, never an ad.",
    outputs: ["Post title + body (story format)", "3 follow-up comments (Day 2/4/7)", "Subreddit targeting list", "Spam safety rules"],
  },
  {
    id: "instagram",
    label: "Instagram Content Agent",
    emoji: "📸",
    color: "#e1306c",
    bg: "bg-pink-50",
    border: "border-pink-200",
    channel: "Instagram organic",
    desc: "Hinglish captions + 30 hashtags + Reel script + Carousel slides + visual brief.",
    outputs: ["Caption A (Hinglish) + Caption B (English)", "30 tiered hashtags", "15s Reel script", "6-slide carousel copy"],
  },
  {
    id: "twitter",
    label: "Twitter/X Thread Agent",
    emoji: "𝕏",
    color: "#1d9bf0",
    bg: "bg-sky-50",
    border: "border-sky-200",
    channel: "Twitter/X organic",
    desc: "Viral numbered threads with pattern-interrupt hooks and data-driven content.",
    outputs: ["Full numbered thread (5-10 tweets)", "Standalone quote-tweet", "5 hashtags", "2 reply templates"],
  },
  {
    id: "whatsapp",
    label: "WhatsApp Marketing Agent",
    emoji: "💬",
    color: "#25d366",
    bg: "bg-green-50",
    border: "border-green-200",
    channel: "WhatsApp Groups & Broadcasts",
    desc: "Personal-tone messages that feel like a friend sharing a tip, not a brand broadcast.",
    outputs: ["Main message ≤200 words", "Day 3 + Day 7 follow-ups", "Group intro script", "Engagement poll"],
  },
  {
    id: "youtube",
    label: "YouTube Shorts Agent",
    emoji: "▶",
    color: "#ff0000",
    bg: "bg-red-50",
    border: "border-red-200",
    channel: "YouTube Shorts organic",
    desc: "Timestamped scripts with VOICEOVER / ON-SCREEN / B-ROLL labels for max retention.",
    outputs: ["Full timestamped script", "Thumbnail concept", "3 title options", "15 tags + CapCut editing notes"],
  },
  {
    id: "quora",
    label: "Quora Authority Agent",
    emoji: "❓",
    color: "#b92b27",
    bg: "bg-red-50",
    border: "border-red-200",
    channel: "Quora + Google (Quora ranks on Google)",
    desc: "3 expert answers that rank on Google for years. Builds authority, drives organic traffic.",
    outputs: ["3 complete answers (300/250/200 words)", "10-question targeting list", "Author bio", "Upvote-bait opening lines"],
  },
  {
    id: "email",
    label: "Email Newsletter Agent",
    emoji: "✉",
    color: "#6366f1",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    channel: "Email (Substack / Mailchimp free)",
    desc: "Complete newsletter package with A/B/C subject lines, welcome email, and drip sequence.",
    outputs: ["Full newsletter (3 subject variants)", "Welcome email", "3-email re-engagement drip", "Substack setup checklist"],
  },
  {
    id: "linkedin",
    label: "LinkedIn B2B Agent",
    emoji: "💼",
    color: "#0077b5",
    bg: "bg-blue-50",
    border: "border-blue-200",
    channel: "LinkedIn organic (consumer + B2B)",
    desc: "Founder personal posts + B2B cold DM for FMCG brand manager outreach (pricing intelligence).",
    outputs: ["Founder story post (200 words)", "Company page post", "B2B cold DM template", "Connection request + 3 engagement comments"],
  },
  {
    id: "campaign",
    label: "Full Campaign Planner",
    emoji: "🚀",
    color: "#ea580c",
    bg: "bg-orange-50",
    border: "border-orange-200",
    channel: "All channels orchestrated",
    desc: "30-day cross-channel campaign plan with week-by-week breakdown and daily action checklist.",
    outputs: ["Creative concept + brief", "Week-by-week execution plan", "Content repurposing map", "KPI targets + free tools stack"],
  },
];

export default function AgentsPage() {
  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h3 className="font-bold text-surface-900 mb-1">10 Free Channel AI Agents</h3>
        <p className="text-sm text-surface-500">Each agent generates platform-native content, streams in real-time, and auto-saves to your library.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {AGENTS.map((agent) => (
          <Link
            key={agent.id}
            href={`/admin/marketing/agents/${agent.id}`}
            className={`card p-4 hover:shadow-hover transition-shadow border ${agent.border} group`}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: agent.color + "20" }}>
                {agent.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-bold text-surface-900 text-sm group-hover:text-brand-600 transition-colors">{agent.label}</h4>
                </div>
                <p className="text-xs text-surface-400 mb-2">{agent.channel}</p>
                <p className="text-xs text-surface-600 mb-3">{agent.desc}</p>
                <div className="flex flex-wrap gap-1">
                  {agent.outputs.map((o, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 bg-surface-100 text-surface-600 rounded-full">{o}</span>
                  ))}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
