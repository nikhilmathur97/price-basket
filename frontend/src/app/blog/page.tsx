import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog – PriceBasket",
  description: "Tips, guides, and insights on saving money on groceries across Blinkit, Zepto, Swiggy Instamart, BigBasket and more.",
};

const POSTS = [
  {
    slug: "how-to-save-on-groceries",
    category: "Saving Tips",
    date: "May 20, 2025",
    title: "10 Proven Ways to Save on Your Monthly Grocery Bill",
    excerpt:
      "From timing your orders to stacking platform offers, here are the strategies that consistently cut grocery spend by 20–35% every month.",
    readTime: "5 min read",
    emoji: "💡",
  },
  {
    slug: "blinkit-vs-zepto-vs-instamart",
    category: "Platform Comparison",
    date: "May 15, 2025",
    title: "Blinkit vs Zepto vs Swiggy Instamart: Which is Cheapest in 2025?",
    excerpt:
      "We compared 200 common grocery items across the three biggest quick-commerce players. The results might surprise you.",
    readTime: "7 min read",
    emoji: "⚖️",
  },
  {
    slug: "price-alerts-guide",
    category: "Feature Guide",
    date: "May 10, 2025",
    title: "How to Use Price Alerts to Never Overpay Again",
    excerpt:
      "Set a target price once and let PriceBasket notify you the moment any platform drops below it. Here's the complete walkthrough.",
    readTime: "3 min read",
    emoji: "🔔",
  },
  {
    slug: "quick-commerce-india-2025",
    category: "Industry Insights",
    date: "May 5, 2025",
    title: "Quick Commerce in India: The State of Grocery Delivery in 2025",
    excerpt:
      "10-minute delivery is now the norm in 50+ Indian cities. We break down the landscape, pricing wars, and what it means for consumers.",
    readTime: "8 min read",
    emoji: "📦",
  },
  {
    slug: "bigbasket-vs-amazon-fresh",
    category: "Platform Comparison",
    date: "April 28, 2025",
    title: "BigBasket vs Amazon Fresh: Which Delivers Better Value?",
    excerpt:
      "Scheduled delivery vs express — we put both platforms head-to-head on price, variety, freshness, and reliability.",
    readTime: "6 min read",
    emoji: "🛒",
  },
  {
    slug: "kitchen-staples-price-watch",
    category: "Price Watch",
    date: "April 20, 2025",
    title: "April Price Watch: Staples That Got Cheaper This Month",
    excerpt:
      "Atta, dal, oils, and rice — we tracked 50 kitchen staples over April and report which platforms slashed prices and by how much.",
    readTime: "4 min read",
    emoji: "📊",
  },
];

const CATEGORIES = ["All", "Saving Tips", "Platform Comparison", "Feature Guide", "Industry Insights", "Price Watch"];

export default function BlogPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">

      {/* Header */}
      <div className="mb-10">
        <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-2">PriceBasket Blog</p>
        <h1 className="text-3xl font-black text-surface-900 mb-3">
          Shop Smarter. Save More.
        </h1>
        <p className="text-surface-500 text-base max-w-xl">
          Tips, platform comparisons, and insights to help you get the best value on every grocery order.
        </p>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2 mb-8">
        {CATEGORIES.map((cat) => (
          <span
            key={cat}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer
              ${cat === "All"
                ? "bg-brand-600 text-white border-brand-600"
                : "bg-white text-surface-600 border-surface-200 hover:border-brand-400 hover:text-brand-600"
              }`}
          >
            {cat}
          </span>
        ))}
      </div>

      {/* Posts grid */}
      <div className="grid sm:grid-cols-2 gap-6 mb-12">
        {POSTS.map((post) => (
          <article
            key={post.slug}
            className="bg-white rounded-2xl border border-surface-100 shadow-sm overflow-hidden
                       hover:shadow-md hover:border-brand-200 transition-all duration-200 flex flex-col"
          >
            {/* Coloured top band */}
            <div className="bg-gradient-to-r from-brand-50 to-orange-50 px-5 py-6 flex items-center gap-3">
              <span className="text-3xl">{post.emoji}</span>
              <span className="text-[11px] font-bold text-brand-600 bg-brand-100 px-2 py-0.5 rounded-full">
                {post.category}
              </span>
            </div>

            <div className="p-5 flex flex-col flex-1">
              <h2 className="text-[15px] font-bold text-surface-900 leading-snug mb-2">
                {post.title}
              </h2>
              <p className="text-[13px] text-surface-500 leading-relaxed mb-4 flex-1">
                {post.excerpt}
              </p>
              <div className="flex items-center justify-between mt-auto pt-3 border-t border-surface-100">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-surface-400">{post.date}</span>
                  <span className="text-surface-300">·</span>
                  <span className="text-[11px] text-surface-400">{post.readTime}</span>
                </div>
                <span className="text-[12px] font-semibold text-brand-600 hover:text-brand-700 cursor-pointer">
                  Read →
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Newsletter CTA */}
      <div className="bg-gradient-to-r from-brand-600 to-orange-500 rounded-2xl p-8 text-center text-white">
        <h2 className="text-xl font-black mb-2">Get Weekly Saving Tips</h2>
        <p className="text-orange-100 text-sm mb-5 max-w-md mx-auto">
          Join 10,000+ smart shoppers who get our best money-saving tips, platform deals, and price insights every week.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto">
          <input
            type="email"
            placeholder="your@email.com"
            className="flex-1 px-4 py-2.5 rounded-xl text-surface-900 text-sm outline-none border-2 border-transparent focus:border-white/50"
          />
          <button className="bg-white text-brand-600 font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-orange-50 transition-colors">
            Subscribe
          </button>
        </div>
        <p className="text-orange-200 text-[11px] mt-3">No spam, ever. Unsubscribe anytime.</p>
      </div>

      {/* Back link */}
      <div className="mt-8 text-center">
        <Link href="/" className="text-sm text-brand-600 hover:underline">← Back to PriceBasket</Link>
      </div>
    </div>
  );
}
