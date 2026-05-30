import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FAQs — PriceBasket Grocery Price Comparison",
  description:
    "Answers to common questions about PriceBasket — how to compare Blinkit, Zepto, BigBasket & Instamart prices, savings, price alerts, and which cities we cover.",
  alternates: { canonical: "https://pricebasket.in/faqs" },
};

const FAQ_CATEGORIES = [
  {
    category: "About PriceBasket",
    faqs: [
      {
        q: "What is PriceBasket?",
        a: "PriceBasket is India's free grocery price comparison platform. It lets you search for any grocery product and instantly compare prices across Blinkit, Zepto, Swiggy Instamart, BigBasket, Amazon Fresh, Flipkart Minutes, JioMart and DMart Ready — all on one screen. No app download required.",
      },
      {
        q: "Is PriceBasket free to use?",
        a: "Yes, 100% free. PriceBasket earns a small affiliate commission when you click through to buy from a platform, but this never affects the prices you see — we always show the real, current price.",
      },
      {
        q: "How does PriceBasket make money?",
        a: "When you click 'Buy' on a product and purchase it on a platform like Blinkit or Zepto, we may receive a small referral fee from that platform. This is standard affiliate marketing and does not change the price you pay.",
      },
      {
        q: "Do I need to create an account?",
        a: "No account needed to compare prices. You only need to sign up if you want to use features like price alerts (get notified when prices drop) or save items across sessions.",
      },
    ],
  },
  {
    category: "Price Comparison",
    faqs: [
      {
        q: "Which grocery app is cheapest in India — Blinkit, Zepto or BigBasket?",
        a: "It depends on the product. JioMart and BigBasket tend to be cheapest for staples like atta, rice and cooking oil. Blinkit and Zepto are often competitive on fresh produce and dairy. Prices change daily, so use PriceBasket to check who is cheapest right now for your specific product.",
      },
      {
        q: "How do I compare Blinkit vs Zepto prices?",
        a: "Search for any product on PriceBasket (e.g. 'Amul Butter 500g' or 'onions 1kg'). You instantly see prices from Blinkit, Zepto, Swiggy Instamart, BigBasket, JioMart and more — all on one screen. Click any price to go straight to that platform and buy.",
      },
      {
        q: "How often are grocery prices updated?",
        a: "Prices are refreshed every 15–30 minutes using automated data collection. You always see near-real-time prices. If a price looks outdated on a product page, use the 'Refresh' button to force an update.",
      },
      {
        q: "Why does the price on PriceBasket sometimes differ from what I see on the app?",
        a: "Prices can change between our refresh cycles (every 15–30 min). Platform apps may also show personalised prices, location-based pricing, or limited-time offers. Always confirm the final price on the platform before completing your purchase.",
      },
      {
        q: "Does PriceBasket compare prices for all products?",
        a: "We cover thousands of products across all major categories — fruits & vegetables, dairy, packaged foods, staples, household, personal care, snacks, baby care and more. If a product you need is missing, use the search bar and let us know via the Contact page.",
      },
    ],
  },
  {
    category: "Savings & Features",
    faqs: [
      {
        q: "How much can I save using PriceBasket?",
        a: "Users save an average of ₹340 per order and ₹500–₹2,000 per month. For a family spending ₹5,000/month on groceries, switching to the cheapest platform for each item typically saves 10–15% on the total bill.",
      },
      {
        q: "What are price alerts?",
        a: "Price alerts notify you by email when a product falls below a price you set. Create a free account, search for a product, and click 'Set Alert'. We monitor prices every 30 minutes and send you an email the moment the price drops.",
      },
      {
        q: "What is the Cart Optimizer?",
        a: "The Cart Optimizer lets you add multiple products to a cart and then calculates the cheapest combination of platforms to buy everything from. For example, it might suggest buying milk and eggs from Zepto and atta from JioMart to maximise your total savings.",
      },
    ],
  },
  {
    category: "Coverage & Cities",
    faqs: [
      {
        q: "Which cities does PriceBasket cover?",
        a: "PriceBasket covers all cities where Blinkit, Zepto, BigBasket and other platforms deliver — including Mumbai, Delhi, Bangalore, Hyderabad, Chennai, Pune, Kolkata, Ahmedabad and more. Prices shown are based on your selected delivery location.",
      },
      {
        q: "Which platforms does PriceBasket compare?",
        a: "We compare Blinkit, Zepto, Swiggy Instamart, BigBasket, Amazon Fresh, Flipkart Minutes, JioMart and DMart Ready — 8 platforms in one place.",
      },
      {
        q: "Does PriceBasket sell or deliver groceries itself?",
        a: "No. PriceBasket is a price comparison tool only. We show you who is cheapest and link you directly to that platform to complete your purchase. All ordering, delivery and customer support is handled by the respective platform.",
      },
    ],
  },
];

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_CATEGORIES.flatMap((cat) =>
    cat.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    }))
  ),
};

export default function FAQsPage() {
  return (
    <div className="bg-[#f5f5f5] min-h-screen pb-20 md:pb-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
      />

      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-semibold text-brand-600 uppercase tracking-wider mb-1">
            Help Centre
          </p>
          <h1 className="text-2xl font-black text-surface-900 mb-2">
            Frequently Asked Questions
          </h1>
          <p className="text-sm text-surface-500">
            Everything you need to know about comparing grocery prices with PriceBasket.
            Can&apos;t find your answer?{" "}
            <Link href="/contact" className="text-brand-600 hover:underline font-medium">
              Contact us
            </Link>
            .
          </p>
        </div>

        {/* FAQ categories */}
        <div className="space-y-8">
          {FAQ_CATEGORIES.map((cat) => (
            <section key={cat.category}>
              <h2 className="text-xs font-bold text-surface-500 uppercase tracking-wider mb-3 px-1">
                {cat.category}
              </h2>
              <div className="space-y-2">
                {cat.faqs.map(({ q, a }) => (
                  <details
                    key={q}
                    className="group bg-white border border-surface-100 rounded-2xl overflow-hidden"
                  >
                    <summary className="flex items-center justify-between px-5 py-4
                                        cursor-pointer text-sm font-semibold text-surface-800
                                        select-none hover:bg-orange-50 transition-colors list-none">
                      {q}
                      <span className="ml-4 flex-shrink-0 text-brand-500 text-lg
                                       group-open:rotate-180 transition-transform duration-200">
                        ▾
                      </span>
                    </summary>
                    <p className="px-5 pb-5 pt-2 text-sm text-surface-600 leading-relaxed
                                  border-t border-surface-100">
                      {a}
                    </p>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-10 bg-white rounded-3xl border border-surface-100 p-6 text-center">
          <p className="text-sm font-semibold text-surface-800 mb-1">Still have questions?</p>
          <p className="text-sm text-surface-500 mb-4">
            Our team usually replies within a few hours.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700
                       text-white text-sm font-bold px-6 py-3 rounded-2xl transition-colors"
          >
            Contact Us →
          </Link>
        </div>

      </div>
    </div>
  );
}
