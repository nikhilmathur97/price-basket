import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact Us – PriceBasket",
  description: "Get in touch with the PriceBasket team for support, feedback, partnerships, or press enquiries.",
};

const FAQS = [
  {
    q: "A product price looks wrong — what should I do?",
    a: "Prices are scraped in real time but can occasionally lag by a few minutes. Always verify the final price on the platform before checking out. If you consistently see wrong prices, email us and we will investigate.",
  },
  {
    q: "How do I delete my account?",
    a: "Email us at founder@pricebasket.in with the subject 'Delete my account' from your registered email address. We will process the request within 48 hours.",
  },
  {
    q: "I set a price alert but did not receive a notification.",
    a: "Check your spam folder first. If the email is not there, make sure your registered email address is correct in your Profile. Still not working? Email us and we will look into it.",
  },
  {
    q: "Can I suggest a product or platform to add?",
    a: "Absolutely! We love suggestions. Drop us an email with the product name or platform URL and we will add it to our roadmap.",
  },
];

export default function ContactPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">

      {/* Header */}
      <div className="mb-10">
        <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-2">Get in Touch</p>
        <h1 className="text-3xl font-bold text-surface-900 mb-2">Contact Us</h1>
        <p className="text-surface-500">
          We're a small, founder-led team and we read every message. Typical response time: under 24 hours.
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

      {/* Write to us */}
      <div className="bg-white rounded-2xl border border-surface-100 shadow-sm p-6 mb-10">
        <h2 className="text-lg font-bold text-surface-900 mb-1">Write to Us</h2>
        <p className="text-surface-500 text-sm mb-5">
          For support, feature requests, bug reports, or anything else — fill in the form below or email us directly at{" "}
          <a href="mailto:founder@pricebasket.in" className="text-brand-600 hover:underline">
            founder@pricebasket.in
          </a>.
        </p>

        <form
          action={`mailto:founder@pricebasket.in`}
          method="post"
          encType="text/plain"
          className="space-y-4"
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">Name</label>
              <input
                type="text"
                name="name"
                placeholder="Your name"
                className="w-full px-3 py-2.5 rounded-xl border border-surface-200 text-sm text-surface-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">Email</label>
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                className="w-full px-3 py-2.5 rounded-xl border border-surface-200 text-sm text-surface-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-surface-700 mb-1">Subject</label>
            <select className="w-full px-3 py-2.5 rounded-xl border border-surface-200 text-sm text-surface-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition bg-white">
              <option>General Question</option>
              <option>Bug Report</option>
              <option>Feature Request</option>
              <option>Partnership / Business</option>
              <option>Press / Media</option>
              <option>Account / Billing</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-surface-700 mb-1">Message</label>
            <textarea
              name="message"
              rows={5}
              placeholder="Tell us how we can help…"
              className="w-full px-3 py-2.5 rounded-xl border border-surface-200 text-sm text-surface-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition resize-none"
            />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-2.5 bg-brand-600 hover:bg-brand-700 active:scale-[0.97] text-white text-sm font-bold rounded-xl transition-all"
          >
            Send Message
          </button>
        </form>
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

      {/* Address note */}
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
