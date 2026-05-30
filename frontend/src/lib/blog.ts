/**
 * Blog content layer.
 *
 * Two sources feed the blog:
 *   1. Static curated posts defined here (evergreen guides & comparisons).
 *   2. Auto-generated "price-drop / deals" posts produced by the backend
 *      Celery task and fetched via getGeneratedPosts() (see server-api).
 *
 * Both share the BlogPost shape so the listing, the [slug] route, and the
 * sitemap can treat them uniformly.
 */

export interface BlogSection {
  heading?: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface BlogPost {
  slug: string;
  category: string;
  date: string; // human-readable, e.g. "May 20, 2025"
  isoDate: string; // ISO for <time> + structured data
  title: string;
  excerpt: string;
  readTime: string;
  emoji: string;
  content: BlogSection[];
  /** true for backend auto-generated deal posts */
  generated?: boolean;
}

export const STATIC_POSTS: BlogPost[] = [
  {
    slug: "how-to-save-on-groceries",
    category: "Saving Tips",
    date: "May 20, 2025",
    isoDate: "2025-05-20",
    title: "10 Proven Ways to Save on Your Monthly Grocery Bill",
    excerpt:
      "From timing your orders to stacking platform offers, here are the strategies that consistently cut grocery spend by 20–35% every month.",
    readTime: "5 min read",
    emoji: "💡",
    content: [
      {
        paragraphs: [
          "Grocery prices in India's quick-commerce apps swing far more than most shoppers realise. The same product can differ by 20–40% between Blinkit, Zepto, BigBasket and JioMart on any given day. With a few habits — and PriceBasket doing the comparison for you — you can cut a typical monthly bill by a third without changing what you buy.",
        ],
      },
      {
        heading: "1. Compare before every order, not just big ones",
        paragraphs: [
          "The biggest leak is buying on autopilot from one app. Before you check out, run your cart through PriceBasket — we show the cheapest platform per item and the best single-platform total in seconds.",
        ],
      },
      {
        heading: "2. Set price alerts on staples you buy repeatedly",
        paragraphs: [
          "Atta, oil, dal, milk and detergent are bought monthly and discounted in cycles. Set a target price once and let PriceBasket email you the moment any platform drops below it — then stock up.",
        ],
      },
      {
        heading: "3. Split your cart when the savings beat delivery fees",
        paragraphs: [
          "Sometimes two platforms split saves more than one, even after a second delivery fee. PriceBasket's cart optimizer does this maths for you and only suggests a split when it actually wins.",
        ],
      },
      {
        heading: "More quick wins",
        bullets: [
          "Order non-perishables in the platform's free-delivery threshold to skip fees.",
          "Watch for first-order and weekend coupons — they stack on already-low prices.",
          "Buy seasonal produce; off-season fruit carries a steep quick-commerce premium.",
          "Prefer larger pack sizes for staples — per-unit cost almost always drops.",
        ],
      },
    ],
  },
  {
    slug: "blinkit-vs-zepto-vs-instamart",
    category: "Platform Comparison",
    date: "May 15, 2025",
    isoDate: "2025-05-15",
    title: "Blinkit vs Zepto vs Swiggy Instamart: Which is Cheapest in 2025?",
    excerpt:
      "We compared 200 common grocery items across the three biggest quick-commerce players. The results might surprise you.",
    readTime: "7 min read",
    emoji: "⚖️",
    content: [
      {
        paragraphs: [
          "Blinkit, Zepto and Swiggy Instamart dominate 10-minute grocery delivery in India's metros. We tracked 200 everyday SKUs across all three for a month. No single app is cheapest on everything — the winner shifts by category and by day.",
        ],
      },
      {
        heading: "Packaged foods & snacks",
        paragraphs: [
          "Blinkit and Instamart trade the lead here, usually within ₹2–5 of each other. Zepto wins more often on its own private-label and bundle SKUs.",
        ],
      },
      {
        heading: "Dairy & fresh",
        paragraphs: [
          "Instamart and Zepto tend to edge out Blinkit on milk and bread, but availability flips frequently — which is exactly why comparing per-order matters more than picking one app for good.",
        ],
      },
      {
        heading: "The honest verdict",
        paragraphs: [
          "There is no permanent winner. Over a month, comparing each order rather than committing to one platform saved our test cart 22% on average. That is the case for using PriceBasket instead of memorising which app is 'cheapest'.",
        ],
      },
    ],
  },
  {
    slug: "price-alerts-guide",
    category: "Feature Guide",
    date: "May 10, 2025",
    isoDate: "2025-05-10",
    title: "How to Use Price Alerts to Never Overpay Again",
    excerpt:
      "Set a target price once and let PriceBasket notify you the moment any platform drops below it. Here's the complete walkthrough.",
    readTime: "3 min read",
    emoji: "🔔",
    content: [
      {
        paragraphs: [
          "Price alerts turn PriceBasket from a tool you open into one that works for you in the background. Here is how to set them up and use them well.",
        ],
      },
      {
        heading: "Setting an alert",
        bullets: [
          "Open any product page and find the 'Set a price alert' card.",
          "Enter your target price — we pre-fill 10% below the current best as a starting point.",
          "Confirm. We watch every platform and email you the instant one drops below your target.",
        ],
      },
      {
        heading: "Getting the most from alerts",
        paragraphs: [
          "Set alerts on the staples you rebuy monthly and price a little below the current best. You will catch the natural discount cycles and stock up at the bottom instead of paying whatever today's price happens to be.",
        ],
      },
    ],
  },
  {
    slug: "quick-commerce-india-2025",
    category: "Industry Insights",
    date: "May 5, 2025",
    isoDate: "2025-05-05",
    title: "Quick Commerce in India: The State of Grocery Delivery in 2025",
    excerpt:
      "10-minute delivery is now the norm in 50+ Indian cities. We break down the landscape, pricing wars, and what it means for consumers.",
    readTime: "8 min read",
    emoji: "📦",
    content: [
      {
        paragraphs: [
          "Quick commerce has gone from a metro novelty to an everyday habit across 50+ Indian cities. Blinkit, Zepto, Instamart, BigBasket, Flipkart Minutes, Amazon and JioMart are competing hard — and that competition is pushing prices in directions shoppers can exploit.",
        ],
      },
      {
        heading: "The pricing war is real — and volatile",
        paragraphs: [
          "Dark-store density and aggressive discounting mean prices on the same SKU move daily. For consumers, volatility is opportunity: the spread between the cheapest and most expensive platform is where savings live.",
        ],
      },
      {
        heading: "What it means for you",
        paragraphs: [
          "Loyalty to one app is the most expensive habit in quick commerce. Comparing per order — or letting alerts watch prices for you — consistently beats sticking with a single platform.",
        ],
      },
    ],
  },
  {
    slug: "bigbasket-vs-amazon-fresh",
    category: "Platform Comparison",
    date: "April 28, 2025",
    isoDate: "2025-04-28",
    title: "BigBasket vs Amazon Fresh: Which Delivers Better Value?",
    excerpt:
      "Scheduled delivery vs express — we put both platforms head-to-head on price, variety, freshness, and reliability.",
    readTime: "6 min read",
    emoji: "🛒",
    content: [
      {
        paragraphs: [
          "BigBasket and Amazon Fresh play a different game from 10-minute apps: scheduled, larger baskets, often better per-unit pricing on staples. We compared them on price, range, freshness and reliability.",
        ],
      },
      {
        heading: "Price & range",
        paragraphs: [
          "BigBasket's private labels and bulk packs frequently undercut on staples, while Amazon Fresh leans on subscription perks and coupon stacking. Neither wins outright — it depends on your basket.",
        ],
      },
      {
        heading: "Bottom line",
        paragraphs: [
          "For planned weekly shops, compare both before committing — the cheaper platform changes with what is in your cart. PriceBasket surfaces that difference instantly.",
        ],
      },
    ],
  },
  {
    slug: "kitchen-staples-price-watch",
    category: "Price Watch",
    date: "April 20, 2025",
    isoDate: "2025-04-20",
    title: "April Price Watch: Staples That Got Cheaper This Month",
    excerpt:
      "Atta, dal, oils, and rice — we tracked 50 kitchen staples over April and report which platforms slashed prices and by how much.",
    readTime: "4 min read",
    emoji: "📊",
    content: [
      {
        paragraphs: [
          "Each month we track 50 kitchen staples across every major platform and report where prices moved. Here is April's snapshot.",
        ],
      },
      {
        heading: "Biggest movers",
        bullets: [
          "Edible oils softened 6–9% across most platforms as wholesale rates eased.",
          "Atta saw the sharpest single-platform cuts, with brand-led promotions.",
          "Dal prices held firm — set an alert and wait for the next dip.",
        ],
      },
      {
        heading: "How to act on this",
        paragraphs: [
          "Price Watch tells you what already happened. Price alerts catch the next move automatically — combine both to time your staple restocks well.",
        ],
      },
    ],
  },
];

export const BLOG_CATEGORIES = [
  "All",
  "Saving Tips",
  "Platform Comparison",
  "Feature Guide",
  "Industry Insights",
  "Price Watch",
  "Deals",
];

/** Lookup a static post by slug. */
export function getStaticPost(slug: string): BlogPost | undefined {
  return STATIC_POSTS.find((p) => p.slug === slug);
}
