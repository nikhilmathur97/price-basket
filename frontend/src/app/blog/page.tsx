import type { Metadata } from "next";
import Link from "next/link";

import { BLOG_CATEGORIES } from "@/lib/blog";
import { getAllPosts } from "@/lib/server-api";

export const metadata: Metadata = {
  title: "Blog – PriceBasket",
  description:
    "Tips, guides, and insights on saving money on groceries across Blinkit, Zepto, Swiggy Instamart, BigBasket and more.",
};

// Revalidate so newly auto-generated deal posts appear without a rebuild.
export const revalidate = 3600;

export default async function BlogPage() {
  const posts = await getAllPosts();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      {/* Header */}
      <div className="mb-10">
        <p className="text-xs font-bold text-brand-600 uppercase tracking-widest mb-2">
          PriceBasket Blog
        </p>
        <h1 className="text-3xl font-black text-surface-900 mb-3">
          Shop Smarter. Save More.
        </h1>
        <p className="text-surface-500 text-base max-w-xl">
          Tips, platform comparisons, and insights to help you get the best
          value on every grocery order.
        </p>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2 mb-8">
        {BLOG_CATEGORIES.map((cat) => (
          <span
            key={cat}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer
              ${
                cat === "All"
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
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="bg-white rounded-2xl border border-surface-100 shadow-sm overflow-hidden
                       hover:shadow-md hover:border-brand-200 transition-all duration-200 flex flex-col group"
          >
            {/* Coloured top band */}
            <div className="bg-gradient-to-r from-brand-50 to-orange-50 px-5 py-6 flex items-center gap-3">
              <span className="text-3xl">{post.emoji}</span>
              <span className="text-[11px] font-bold text-brand-600 bg-brand-100 px-2 py-0.5 rounded-full">
                {post.category}
              </span>
            </div>

            <div className="p-5 flex flex-col flex-1">
              <h2 className="text-[15px] font-bold text-surface-900 leading-snug mb-2 group-hover:text-brand-600 transition-colors">
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
                <span className="text-[12px] font-semibold text-brand-600 group-hover:text-brand-700">
                  Read →
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Newsletter CTA */}
      <div className="bg-gradient-to-r from-brand-600 to-orange-500 rounded-2xl p-8 text-center text-white">
        <h2 className="text-xl font-black mb-2">Get Weekly Saving Tips</h2>
        <p className="text-orange-100 text-sm mb-5 max-w-md mx-auto">
          Join 10,000+ smart shoppers who get our best money-saving tips,
          platform deals, and price insights every week.
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
        <p className="text-orange-200 text-[11px] mt-3">
          No spam, ever. Unsubscribe anytime.
        </p>
      </div>

      {/* Back link */}
      <div className="mt-8 text-center">
        <Link href="/" className="text-sm text-brand-600 hover:underline">
          ← Back to PriceBasket
        </Link>
      </div>
    </div>
  );
}
