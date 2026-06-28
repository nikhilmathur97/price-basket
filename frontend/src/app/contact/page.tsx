"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { api, extractApiError } from "@/services/api";
import toast from "react-hot-toast";

const SUBJECTS = [
  "General Question",
  "Bug Report",
  "Feature Request",
  "Partnership / Business",
  "Press / Media",
  "Account / Billing",
  "Other",
];

const FAQS = [
  {
    q: "A product price looks wrong — what should I do?",
    a: "Prices are scraped in real time but can occasionally lag by a few minutes. Always verify the final price on the platform before checking out. If you consistently see wrong prices, contact us and we will investigate.",
  },
  {
    q: "How do I delete my account?",
    a: "Use the form below with subject 'Account / Billing' or email us at founder@pricebasket.in. We will process the request within 48 hours.",
  },
  {
    q: "I set a price alert but did not receive a notification.",
    a: "Check your spam folder first. If the email is not there, make sure your registered email address is correct in your Profile. Still not working? Contact us and we will look into it.",
  },
  {
    q: "Can I suggest a product or platform to add?",
    a: "Absolutely! We love suggestions. Use 'Feature Request' in the form below with the product name or platform URL and we will add it to our roadmap.",
  },
];

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
    subject: SUBJECTS[0],
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email.trim() && !form.mobile.trim()) {
      toast.error("Please provide either an email or mobile number so we can reply.");
      return;
    }
    setSubmitting(true);
    try {
      await api.submitContactQuery({
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        mobile: form.mobile.trim() || undefined,
        subject: form.subject,
        message: form.message.trim(),
      });
      setDone(true);
    } catch (err) {
      toast.error(extractApiError(err, "Failed to send. Please email us directly."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">

      {/* Header */}
      <div className="mb-10">
        <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-2">Get in Touch</p>
        <h1 className="text-3xl font-bold text-surface-900 mb-2">Contact Us</h1>
        <p className="text-surface-500">
          We&apos;re a small, founder-led team and we read every message. Typical response time: under 24 hours.
        </p>
      </div>

      {/* Contact cards */}
      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        <a
          href="mailto:founder@pricebasket.in"
          className="bg-white rounded-2xl border border-surface-100 shadow-sm p-5 hover:shadow-md hover:border-brand-200 transition-all text-center"
        >
          <div className="text-3xl mb-3">✉️</div>
          <p className="font-bold text-surface-900 text-sm mb-1">Email</p>
          <p className="text-brand-600 text-xs font-medium">founder@pricebasket.in</p>
          <p className="text-surface-400 text-[11px] mt-1">General enquiries & support</p>
        </a>

        <a
          href="https://wa.me/918005828390"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white rounded-2xl border border-surface-100 shadow-sm p-5 hover:shadow-md hover:border-green-200 transition-all text-center"
        >
          <div className="text-3xl mb-3">💬</div>
          <p className="font-bold text-surface-900 text-sm mb-1">WhatsApp</p>
          <p className="text-green-600 text-xs font-medium">+91 80058 28390</p>
          <p className="text-surface-400 text-[11px] mt-1">Quick questions & feedback</p>
        </a>

        <a
          href="https://www.instagram.com/pricebasketindia/"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white rounded-2xl border border-surface-100 shadow-sm p-5 hover:shadow-md hover:border-pink-200 transition-all text-center"
        >
          <div className="text-3xl mb-3">📸</div>
          <p className="font-bold text-surface-900 text-sm mb-1">Instagram</p>
          <p className="text-pink-600 text-xs font-medium">@pricebasketindia</p>
          <p className="text-surface-400 text-[11px] mt-1">DMs open for feedback</p>
        </a>
      </div>

      {/* Contact form */}
      <div className="bg-white rounded-2xl border border-surface-100 shadow-sm p-6 mb-10">
        <h2 className="text-lg font-bold text-surface-900 mb-1">Write to Us</h2>
        <p className="text-surface-500 text-sm mb-5">
          For support, feature requests, bug reports, or anything else — fill in the form below or email us directly at{" "}
          <a href="mailto:founder@pricebasket.in" className="text-brand-600 hover:underline">
            founder@pricebasket.in
          </a>.
        </p>

        {done ? (
          <div className="flex flex-col items-center py-8 text-center gap-3">
            <CheckCircle className="w-12 h-12 text-green-500" />
            <p className="text-lg font-bold text-surface-900">Message received!</p>
            <p className="text-sm text-surface-500">We&apos;ll get back to you within 24 hours.</p>
            <button
              onClick={() => { setDone(false); setForm({ name: "", email: "", mobile: "", subject: SUBJECTS[0], message: "" }); }}
              className="mt-2 text-sm text-brand-600 hover:underline"
            >
              Send another message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Your name"
                  className="w-full px-3 py-2.5 rounded-xl border border-surface-200 text-sm text-surface-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2.5 rounded-xl border border-surface-200 text-sm text-surface-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">
                Mobile Number <span className="text-surface-400">(if no email)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-surface-500 font-medium select-none">+91</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={form.mobile}
                  onChange={(e) => set("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="9876543210"
                  className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-surface-200 text-sm text-surface-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">Subject *</label>
              <select
                required
                value={form.subject}
                onChange={(e) => set("subject", e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-surface-200 text-sm text-surface-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition bg-white"
              >
                {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">Message *</label>
              <textarea
                required
                minLength={10}
                value={form.message}
                onChange={(e) => set("message", e.target.value)}
                rows={5}
                placeholder="Tell us how we can help…"
                className="w-full px-3 py-2.5 rounded-xl border border-surface-200 text-sm text-surface-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-6 py-2.5 bg-brand-600 hover:bg-brand-700 active:scale-[0.97] text-white text-sm font-bold rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "Sending…" : "Send Message"}
            </button>
          </form>
        )}
      </div>

      {/* FAQ */}
      <div className="mb-10">
        <h2 className="text-lg font-bold text-surface-900 mb-4">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <div key={i} className="bg-white rounded-xl border border-surface-100 shadow-sm p-4">
              <p className="font-semibold text-surface-900 text-sm mb-1.5">{faq.q}</p>
              <p className="text-surface-500 text-sm leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer note */}
      <div className="text-sm text-surface-400 text-center space-y-1">
        <p>PriceBasket · India</p>
        <p>
          Email:{" "}
          <a href="mailto:founder@pricebasket.in" className="text-brand-600 hover:underline">
            founder@pricebasket.in
          </a>{" "}
          · Phone:{" "}
          <a href="tel:+918005828390" className="text-brand-600 hover:underline">
            +91 80058 28390
          </a>
        </p>
        <div className="flex items-center justify-center gap-4 mt-3">
          <Link href="/privacy" className="text-brand-600 hover:underline">Privacy Policy</Link>
          <Link href="/terms" className="text-brand-600 hover:underline">Terms of Use</Link>
          <Link href="/security" className="text-brand-600 hover:underline">Security</Link>
        </div>
      </div>
    </div>
  );
}
