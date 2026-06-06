"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, ChevronRight } from "lucide-react";
import Image from "next/image";

/* ─── Types ──────────────────────────────────────────────────────────────── */
type Message = { id: number; from: "bot" | "user"; text: string };
type QA      = { question: string; answer: string };

/* ─── FAQ — expanded Q&A ─────────────────────────────────────────────────── */
const FAQ: QA[] = [
  {
    question: "What is PriceBasket?",
    answer: "PriceBasket is your smart shopping buddy! 🛒 We compare real-time prices of groceries and daily essentials across Blinkit, Zepto, BigBasket, Swiggy Instamart, and 10+ more platforms — all in one place, so you never overpay again!",
  },
  {
    question: "Which apps does PriceBasket compare?",
    answer: "We compare prices across 10+ platforms:\n🟡 Blinkit\n🟣 Zepto\n🟠 Swiggy Instamart\n🟢 BigBasket\n🔵 JioMart\n📦 Amazon\n🛍️ Flipkart\n🚚 Dunzo\nAnd more are added regularly!",
  },
  {
    question: "How do I save money here?",
    answer: "It's super easy! 💰\n1. Search for any product (like milk, atta, chips)\n2. See prices from all platforms side by side\n3. Add to cart and tap 'Cart Optimizer'\n4. We show you the cheapest way to buy — save up to 30% every month!",
  },
  {
    question: "Is PriceBasket free?",
    answer: "100% FREE! 🎉 We never charge you anything. We just help you find the best price, and you buy directly from the platform of your choice. Simple!",
  },
  {
    question: "What is Cart Optimizer?",
    answer: "Cart Optimizer is our superpower! ⚡\nAdd all your items to cart, then tap 'Optimize'. We calculate 4 smart strategies:\n🥇 Cheapest Single Platform\n⚡ Fastest Delivery\n🧩 Smart Split (mix platforms)\n🏆 Best Overall Value\nYou pick what suits you!",
  },
  {
    question: "What are Price Alerts?",
    answer: "Price Alerts are like having a spy watching prices for you! 🕵️\nSet your target price for any product. When it drops to that price on ANY platform, we notify you instantly. Sign in → go to Alerts to set it up!",
  },
  {
    question: "Do I need to sign up?",
    answer: "Nope! You can browse and compare prices without signing up. 😊\nBut if you sign up (it's free!), you get:\n✅ Price Alerts\n✅ Cart saved across devices\n✅ Personalized deals\n✅ Order history",
  },
  {
    question: "How fresh are the prices?",
    answer: "Very fresh! 🌿 Prices are updated every 5–15 minutes from each platform. You can see the 'last updated' timestamp on every product card so you always know how recent the price is.",
  },
  {
    question: "Can I track my order?",
    answer: "PriceBasket finds the best price and sends you to the platform to buy. Once you order on Blinkit/Zepto/BigBasket etc., track your order directly in their app — they handle delivery. We're the price finder, they're the delivery heroes! 🏍️",
  },
  {
    question: "How does location work?",
    answer: "Tap the 📍 location button in the header and enter your pincode or allow GPS. This helps us show delivery availability and accurate local prices for your area — because prices can vary city to city!",
  },
  {
    question: "How do I search for a product?",
    answer: "Just type in the search bar at the top! 🔍 Try 'Amul milk', 'Lay's chips', 'atta 10kg' — we'll show you prices from all platforms instantly. You can also filter by price or delivery speed.",
  },
  {
    question: "Why is the price different on my Zepto app?",
    answer: "Prices on quick commerce apps change frequently based on your location, time of day, and offers. Our prices refresh every 5–15 minutes, so small differences can happen. We always show you the best available price we last fetched! ⏱️",
  },
  {
    question: "How do I add items to cart?",
    answer: "Easy! Tap the '+ Add' button on any product card in search results. You can choose which platform to buy from, or let our Cart Optimizer decide the best one for you later. 🛒",
  },
  {
    question: "I found a bug or have feedback",
    answer: "We love feedback! 💌 Please email us at founder@pricebasket.in or use the contact form. We read every message and fix bugs fast. Thank you for helping us improve! 🙏",
  },
  {
    question: "Which city is PriceBasket available in?",
    answer: "PriceBasket works in all cities where Blinkit, Zepto, BigBasket, and Swiggy Instamart are available — which means most major Indian cities! 🇮🇳 Set your location and we'll show what's available near you.",
  },
];

const GREETING: Message = {
  id: 0,
  from: "bot",
  text: "Heyy! I'm Basco, PriceBasket's assistant! 🛒✨\nI can help you understand how to save money, compare prices, and use all our features.\n\nTap a question below or type anything!",
};

let _id = 1;
const nextId = () => _id++;

const STOP_WORDS = new Set(["what", "how", "why", "is", "are", "do", "does", "can", "a", "an", "the", "i", "my", "me", "to", "in", "on", "of", "for", "it", "this", "that"]);

function matchFaq(input: string): QA | undefined {
  const lower = input.toLowerCase().trim();
  // Exact or full-substring match first
  const exact = FAQ.find((q) => q.question.toLowerCase() === lower || lower.includes(q.question.toLowerCase()));
  if (exact) return exact;
  // Keyword overlap scoring — skip short stop words for better signal
  const inputTokens = lower.split(/\s+/).filter((w) => w.length > 2 && !STOP_WORDS.has(w));
  if (inputTokens.length === 0) return undefined;
  let best: QA | undefined;
  let bestScore = 0;
  for (const qa of FAQ) {
    const qTokens = qa.question.toLowerCase().split(/\s+/);
    const score = inputTokens.filter((t) => qTokens.some((qw) => qw.startsWith(t) || t.startsWith(qw))).length;
    if (score > bestScore) { bestScore = score; best = qa; }
  }
  return bestScore >= 2 ? best : undefined;
}

/* ─── Animated Mascot SVG (Shinchan-style cartoon boy) ──────────────────── */
function MascotCharacter({ isOpen, hasUnread, small }: { isOpen: boolean; hasUnread: boolean; small?: boolean }) {
  const W = small ? 44 : 64;
  const H = small ? 50 : 72;
  return (
    <div className="relative flex items-end justify-center" style={{ width: W, height: H }}>
      <style>{`
        @keyframes wave {
          0%, 100% { transform: rotate(0deg); transform-origin: bottom right; }
          20%       { transform: rotate(-30deg) translateY(-2px); transform-origin: bottom right; }
          40%       { transform: rotate(10deg); transform-origin: bottom right; }
          60%       { transform: rotate(-25deg) translateY(-2px); transform-origin: bottom right; }
          80%       { transform: rotate(5deg); transform-origin: bottom right; }
        }
        @keyframes bodyBob {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-3px); }
        }
        @keyframes eyeBlink {
          0%, 90%, 100% { transform: scaleY(1); }
          95%            { transform: scaleY(0.1); }
        }
        @keyframes bubblePop {
          0%   { transform: scale(0) translateY(4px); opacity: 0; }
          60%  { transform: scale(1.1) translateY(-2px); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes bubbleFade {
          0%, 70% { opacity: 1; }
          100%    { opacity: 0; }
        }
        .mascot-body   { animation: bodyBob 1.4s ease-in-out infinite; }
        .mascot-wave   { animation: wave 1.2s ease-in-out infinite; }
        .mascot-eyes   { animation: eyeBlink 3.5s ease-in-out infinite; }
        .mascot-bubble { animation: bubblePop 0.35s cubic-bezier(.17,.67,.41,1.4) forwards; }
      `}</style>

      {/* Speech bubble "Hi! 👋" — shows when closed & has unread OR on first load */}
      {!isOpen && (
        <div
          className="mascot-bubble absolute -top-1 -right-7 bg-white border-2 border-brand-500
                     text-brand-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-md
                     whitespace-nowrap pointer-events-none z-10"
          style={{ borderRadius: "999px 999px 999px 4px" }}
        >
          {hasUnread ? "New! 💬" : "Hi! 👋"}
        </div>
      )}

      {/* Full mascot SVG */}
      <svg
        viewBox="0 0 64 72"
        width={W}
        height={H}
        xmlns="http://www.w3.org/2000/svg"
        className="mascot-body drop-shadow-lg"
        style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.18))" }}
      >
        {/* ── Body (orange shirt) ── */}
        <g className="mascot-body">
          {/* Torso */}
          <rect x="18" y="42" width="28" height="20" rx="6" fill="#ea580c" />
          {/* Collar white */}
          <ellipse cx="32" cy="42" rx="6" ry="3" fill="white" opacity="0.4" />

          {/* Left arm (static) */}
          <rect x="8" y="43" width="10" height="6" rx="3" fill="#FBBF9C" />
          <circle cx="8" cy="46" r="3.5" fill="#FBBF9C" />

          {/* Right arm (waving) */}
          <g className="mascot-wave" style={{ transformOrigin: "54px 46px" }}>
            <rect x="46" y="40" width="10" height="6" rx="3" fill="#FBBF9C" />
            <circle cx="56" cy="43" r="3.5" fill="#FBBF9C" />
            {/* Little waving fingers */}
            <circle cx="58" cy="40" r="1.5" fill="#FBBF9C" />
            <circle cx="60" cy="42" r="1.5" fill="#FBBF9C" />
            <circle cx="59" cy="45" r="1.5" fill="#FBBF9C" />
          </g>

          {/* Legs */}
          <rect x="20" y="60" width="10" height="10" rx="4" fill="#1e40af" />
          <rect x="34" y="60" width="10" height="10" rx="4" fill="#1e40af" />
          {/* Shoes */}
          <ellipse cx="25" cy="70" rx="7" ry="3" fill="#111827" />
          <ellipse cx="39" cy="70" rx="7" ry="3" fill="#111827" />
        </g>

        {/* ── Head ── */}
        <g className="mascot-body">
          {/* Head base */}
          <circle cx="32" cy="26" r="20" fill="#FBBF9C" />

          {/* Hair — black top + fringe */}
          <path d="M13 22 Q14 4 32 5 Q50 4 51 22 Q44 10 32 11 Q20 10 13 22Z" fill="#1a1a1a" />
          {/* Side fringe left */}
          <ellipse cx="14" cy="24" rx="4" ry="6" fill="#1a1a1a" />
          {/* Side fringe right */}
          <ellipse cx="50" cy="24" rx="4" ry="6" fill="#1a1a1a" />

          {/* Ears */}
          <circle cx="12" cy="27" r="5" fill="#FBBF9C" />
          <circle cx="52" cy="27" r="5" fill="#FBBF9C" />
          <circle cx="12" cy="27" r="3" fill="#F9A8A8" opacity="0.5" />
          <circle cx="52" cy="27" r="3" fill="#F9A8A8" opacity="0.5" />

          {/* Eyebrows */}
          <path d="M22 19 Q26 16 28 19" stroke="#1a1a1a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M36 19 Q38 16 42 19" stroke="#1a1a1a" strokeWidth="1.5" fill="none" strokeLinecap="round" />

          {/* Eyes */}
          <g className="mascot-eyes" style={{ transformOrigin: "32px 25px" }}>
            {/* Left eye */}
            <circle cx="25" cy="26" r="4.5" fill="white" />
            <circle cx="25" cy="26" r="3" fill="#1a1a1a" />
            <circle cx="26.2" cy="24.8" r="1" fill="white" />
            {/* Right eye */}
            <circle cx="39" cy="26" r="4.5" fill="white" />
            <circle cx="39" cy="26" r="3" fill="#1a1a1a" />
            <circle cx="40.2" cy="24.8" r="1" fill="white" />
          </g>

          {/* Rosy cheeks */}
          <circle cx="18" cy="31" r="4" fill="#F9A8A8" opacity="0.55" />
          <circle cx="46" cy="31" r="4" fill="#F9A8A8" opacity="0.55" />

          {/* Nose */}
          <ellipse cx="32" cy="31" rx="2" ry="1.2" fill="#F59E8A" />

          {/* Big open smile */}
          <path d="M23 36 Q32 44 41 36" stroke="#1a1a1a" strokeWidth="1.8" fill="#FF8FA3" strokeLinecap="round" />
          {/* Teeth */}
          <path d="M26 37 Q32 42 38 37" fill="white" />

          {/* Tongue */}
          <ellipse cx="32" cy="40" rx="3.5" ry="2" fill="#F87171" opacity="0.8" />
        </g>
      </svg>
    </div>
  );
}

/* ─── Main ChatBot Component ─────────────────────────────────────────────── */
export function ChatBot() {
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput]     = useState("");
  const [unread, setUnread]   = useState(0);
  const [page, setPage]       = useState(0);           // FAQ pagination
  const bottomRef             = useRef<HTMLDivElement>(null);

  const PAGE_SIZE = 5;
  const totalPages = Math.ceil(FAQ.length / PAGE_SIZE);
  const visibleFAQs = FAQ.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
    }
  }, [open, messages]);

  function sendMessage(text: string) {
    const userMsg: Message = { id: nextId(), from: "user", text };

    const matched = matchFaq(text);

    const botReply: Message = {
      id: nextId(),
      from: "bot",
      text: matched
        ? matched.answer
        : "Hmm, I didn't quite catch that! 🤔\nTry tapping one of the quick questions below, or email us at founder@pricebasket.in — we'll reply fast! 💌",
    };

    setMessages((m) => [...m, userMsg, botReply]);
    if (!open) setUnread((n) => n + 1);
  }

  function handleSend() {
    const t = input.trim();
    if (!t) return;
    sendMessage(t);
    setInput("");
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  return (
    <>
      {/* ── Floating mascot button ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open chat assistant"
        className="fixed bottom-20 right-2 md:bottom-6 md:right-5 z-[9000]
                   flex flex-col items-center justify-end
                   focus:outline-none group"
        style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
      >
        {open ? (
          /* Close state — small pill button */
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-brand-600 shadow-xl flex items-center justify-center
                          hover:bg-brand-700 transition-colors">
            <X className="w-4 h-4 md:w-5 md:h-5 text-white" />
          </div>
        ) : (
          <>
            <span className="md:hidden"><MascotCharacter isOpen={false} hasUnread={unread > 0} small /></span>
            <span className="hidden md:block"><MascotCharacter isOpen={false} hasUnread={unread > 0} /></span>
          </>
        )}

        {/* Unread badge */}
        {!open && unread > 0 && (
          <span className="absolute top-0 right-0 w-4 h-4 md:w-5 md:h-5 rounded-full bg-red-500
                           text-white text-[9px] md:text-[10px] flex items-center justify-center font-bold shadow">
            {unread}
          </span>
        )}
      </button>

      {/* ── Chat panel ── */}
      {open && (
        <div
          className="fixed bottom-32 right-2 md:bottom-24 md:right-5 z-[8999]
                     w-[min(calc(100vw-1rem),320px)] md:w-80 md:max-w-sm bg-white rounded-2xl shadow-2xl
                     border border-surface-200 flex flex-col overflow-hidden"
          style={{ maxHeight: "60vh", minHeight: "300px" }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-brand-600 to-orange-500 px-3 py-2.5 flex items-center gap-2">
            {/* Mini mascot head in header */}
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
              <svg viewBox="8 6 48 42" width="28" height="28" xmlns="http://www.w3.org/2000/svg">
                <circle cx="32" cy="26" r="20" fill="#FBBF9C" />
                <path d="M13 22 Q14 4 32 5 Q50 4 51 22 Q44 10 32 11 Q20 10 13 22Z" fill="#1a1a1a" />
                <circle cx="25" cy="26" r="4" fill="white" /><circle cx="25" cy="26" r="2.5" fill="#1a1a1a" />
                <circle cx="39" cy="26" r="4" fill="white" /><circle cx="39" cy="26" r="2.5" fill="#1a1a1a" />
                <circle cx="18" cy="31" r="3.5" fill="#F9A8A8" opacity="0.6" />
                <circle cx="46" cy="31" r="3.5" fill="#F9A8A8" opacity="0.6" />
                <path d="M23 36 Q32 43 41 36" stroke="#1a1a1a" strokeWidth="1.8" fill="#FF8FA3" strokeLinecap="round" />
                <path d="M26 37 Q32 41 38 37" fill="white" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-xs leading-tight">Basco — PriceBasket Bot</p>
              <p className="text-orange-100 text-[10px]">Here to help you save! 💰</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white transition-colors flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-2 bg-orange-50/30">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-1.5 ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
                {msg.from === "bot" && (
                  <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg viewBox="8 6 48 42" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="32" cy="26" r="20" fill="#FBBF9C" />
                      <path d="M13 22 Q14 4 32 5 Q50 4 51 22 Q44 10 32 11 Q20 10 13 22Z" fill="#1a1a1a" />
                      <circle cx="25" cy="26" r="4" fill="white" /><circle cx="25" cy="26" r="2.5" fill="#1a1a1a" />
                      <circle cx="39" cy="26" r="4" fill="white" /><circle cx="39" cy="26" r="2.5" fill="#1a1a1a" />
                      <path d="M23 36 Q32 43 41 36" stroke="#1a1a1a" strokeWidth="2" fill="#FF8FA3" strokeLinecap="round" />
                    </svg>
                  </div>
                )}
                <div
                  className={`max-w-[85%] px-2.5 py-1.5 rounded-2xl text-xs whitespace-pre-wrap leading-relaxed
                    ${msg.from === "user"
                      ? "bg-brand-600 text-white rounded-br-sm"
                      : "bg-white text-surface-800 border border-surface-100 rounded-bl-sm shadow-sm"
                    }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Quick question chips */}
          <div className="px-2.5 pt-1.5 pb-1 border-t border-surface-100 bg-white">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-semibold text-surface-500">Quick questions</p>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="w-4 h-4 rounded flex items-center justify-center text-surface-400
                             hover:text-brand-600 disabled:opacity-30 text-xs"
                >‹</button>
                <span className="text-[9px] text-surface-400">{page + 1}/{totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page === totalPages - 1}
                  className="w-4 h-4 rounded flex items-center justify-center text-surface-400
                             hover:text-brand-600 disabled:opacity-30 text-xs"
                >›</button>
              </div>
            </div>
            <div className="flex flex-col gap-0.5">
              {visibleFAQs.map((faq) => (
                <button
                  key={faq.question}
                  onClick={() => sendMessage(faq.question)}
                  className="flex items-center gap-1 text-left text-[11px] text-brand-700
                             hover:text-brand-900 bg-brand-50 hover:bg-brand-100
                             rounded-lg px-2 py-1 transition-colors"
                >
                  <ChevronRight className="w-2.5 h-2.5 flex-shrink-0" />
                  <span className="truncate">{faq.question}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="px-2.5 py-1.5 border-t border-surface-100 bg-white flex gap-1.5">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask Basco anything…"
              className="flex-1 border border-surface-200 rounded-xl px-2.5 py-1.5 text-xs
                         focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="w-8 h-8 rounded-xl bg-brand-600 text-white flex items-center justify-center
                         hover:bg-brand-700 disabled:opacity-40 transition-colors flex-shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
