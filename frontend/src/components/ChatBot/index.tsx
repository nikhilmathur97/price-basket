"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, ChevronRight } from "lucide-react";
import Image from "next/image";

type Message = {
  id: number;
  from: "bot" | "user";
  text: string;
};

type QA = {
  question: string;
  answer: string;
};

const FAQ: QA[] = [
  {
    question: "What is PriceBasket?",
    answer:
      "PriceBasket is a smart price comparison platform for quick commerce in India. We show you real-time prices of groceries and daily essentials across Blinkit, Zepto, BigBasket, Swiggy Instamart, and more — all in one place.",
  },
  {
    question: "Which platforms does PriceBasket compare?",
    answer:
      "We compare prices across 10+ platforms: Blinkit, Zepto, Swiggy Instamart, BigBasket, JioMart, Amazon, Flipkart, Dunzo, Myntra, and Nykaa. New platforms are added regularly.",
  },
  {
    question: "How do I save money using PriceBasket?",
    answer:
      "Search for any product, then compare prices across all platforms instantly. Add items to your cart and use our Cart Optimizer to find the cheapest single platform or the smartest split across platforms — saving you up to 30% on your monthly groceries.",
  },
  {
    question: "Is PriceBasket free to use?",
    answer:
      "Yes, PriceBasket is 100% free. We don't charge users anything. When you click 'Buy' you are redirected to the platform of your choice — we simply help you find the best deal first.",
  },
  {
    question: "How does the Cart Optimizer work?",
    answer:
      "Add products to your cart from any search result. Then open the Cart Optimizer. It will calculate 4 strategies for you: Cheapest Single Platform, Fastest Delivery, Smart Split (lowest total across platforms), and Best Value overall — so you pick what suits you best.",
  },
  {
    question: "How do Price Alerts work?",
    answer:
      "Set a target price for any product. When the price drops to or below your target on any platform, PriceBasket notifies you. Go to 'Alerts' in the menu after signing in to manage your alerts.",
  },
  {
    question: "Do I need to create an account?",
    answer:
      "No account is needed to compare prices or search products. Sign up for free to unlock Price Alerts, save your cart across devices, and get personalized recommendations.",
  },
  {
    question: "How often are prices updated?",
    answer:
      "Prices are refreshed every 5–15 minutes from each platform. The timestamp on each product card shows when that price was last verified.",
  },
  {
    question: "Can I track my order on PriceBasket?",
    answer:
      "PriceBasket helps you find the best price and redirects you to the platform to complete your order. Order tracking happens on the platform you ordered from (Blinkit, Zepto, etc.) since they handle delivery.",
  },
  {
    question: "How do I use the location feature?",
    answer:
      "Tap the location button in the header. PriceBasket uses your pincode or GPS location to show delivery availability and accurate prices for your area, since prices can vary by location.",
  },
];

const GREETING: Message = {
  id: 0,
  from: "bot",
  text: "Hi! I'm the PriceBasket assistant 👋\nAsk me anything about how to use PriceBasket, or tap a question below to get started.",
};

let _id = 1;
function nextId() {
  return _id++;
}

export function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState("");
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [open, messages]);

  function sendMessage(text: string) {
    const userMsg: Message = { id: nextId(), from: "user", text };
    const matched = FAQ.find((q) =>
      q.question.toLowerCase() === text.toLowerCase()
    );
    const botReply: Message = {
      id: nextId(),
      from: "bot",
      text: matched
        ? matched.answer
        : "Great question! For more details, feel free to explore the app or reach us at support@pricebasket.in. You can also pick a question below.",
    };
    setMessages((m) => [...m, userMsg, botReply]);
    if (!open) setUnread((n) => n + 1);
  }

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed) return;
    sendMessage(trimmed);
    setInput("");
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // Show a subset of FAQ chips — rotate based on conversation length to keep it fresh
  const visibleFAQs = FAQ.slice(0, 5);

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open chat assistant"
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-[9000]
                   w-14 h-14 rounded-full bg-brand-600 text-white shadow-lg
                   flex items-center justify-center hover:bg-brand-700 transition-colors"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500
                           text-white text-xs flex items-center justify-center font-bold">
            {unread}
          </span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-36 right-4 md:bottom-24 md:right-6 z-[8999]
                     w-[calc(100vw-2rem)] max-w-sm bg-white rounded-2xl shadow-2xl
                     border border-surface-200 flex flex-col overflow-hidden"
          style={{ maxHeight: "70vh", minHeight: "420px" }}
        >
          {/* Header */}
          <div className="bg-brand-600 px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0 overflow-hidden">
              <Image
                src="/pricebasket-logo.png"
                alt="PriceBasket"
                width={28}
                height={28}
                className="object-contain"
                style={{ mixBlendMode: "multiply" }}
              />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">PriceBasket Assistant</p>
              <p className="text-brand-100 text-xs">Always here to help</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="ml-auto text-white/70 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-surface-50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap
                    ${msg.from === "user"
                      ? "bg-brand-600 text-white rounded-br-sm"
                      : "bg-white text-surface-800 border border-surface-200 rounded-bl-sm shadow-sm"
                    }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Quick question chips */}
          <div className="px-3 py-2 border-t border-surface-100 bg-white">
            <p className="text-xs text-surface-400 mb-1.5">Quick questions</p>
            <div className="flex flex-col gap-1 max-h-28 overflow-y-auto">
              {visibleFAQs.map((faq) => (
                <button
                  key={faq.question}
                  onClick={() => sendMessage(faq.question)}
                  className="flex items-center gap-1 text-left text-xs text-brand-700 hover:text-brand-900
                             bg-brand-50 hover:bg-brand-100 rounded-lg px-2 py-1.5 transition-colors"
                >
                  <ChevronRight className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{faq.question}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="px-3 py-2 border-t border-surface-100 bg-white flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type a message…"
              className="flex-1 border border-surface-200 rounded-xl px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center
                         hover:bg-brand-700 disabled:opacity-40 transition-colors flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
