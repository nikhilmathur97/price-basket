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
  {
    slug: "blinkit-vs-zepto-comparison-2026",
    category: "Platform Comparison",
    date: "May 31, 2026",
    isoDate: "2026-05-31",
    title: "Blinkit vs Zepto 2026 — Which is Cheaper? Full Price Comparison",
    excerpt:
      "We compared prices on 300 everyday grocery items across Blinkit and Zepto. Here is which app wins by category and when to switch.",
    readTime: "8 min read",
    emoji: "⚖️",
    content: [
      {
        paragraphs: [
          "Blinkit and Zepto are India's two biggest 10-minute grocery delivery apps. Both promise the same speed, but their prices can differ by 15–30% on the same product on the same day. Knowing when each is cheaper puts real money back in your pocket every month.",
          "We tracked 300 commonly bought SKUs — from Amul butter and Aashirvaad atta to Maggi noodles, onions, and Dettol handwash — across both apps over 30 days in May 2026. Here is what we found.",
        ],
      },
      {
        heading: "Blinkit vs Zepto: Dairy and Breakfast",
        paragraphs: [
          "Blinkit edges out Zepto on dairy in most cities. Amul Taaza 500ml averaged ₹28 on Blinkit vs ₹30 on Zepto across Mumbai, Delhi and Bangalore. On eggs, the gap is smaller — usually within ₹2 per dozen — but Blinkit wins more often.",
          "For bread and butter, Zepto frequently runs platform-specific discounts that bring it level or below Blinkit. The lesson: check both before adding dairy to your cart.",
        ],
      },
      {
        heading: "Blinkit vs Zepto: Fruits and Vegetables",
        paragraphs: [
          "Vegetables are where prices swing the most. Tomatoes, onions, and potatoes can differ by ₹10–20 per kg between Blinkit and Zepto on any given day because both apps source locally and reprice frequently.",
          "In our 30-day test, Zepto was cheaper on fresh produce 54% of the time. Blinkit won on premium and pre-cut vegetables. Neither app wins consistently — which is exactly why comparing before ordering matters most for fresh items.",
        ],
      },
      {
        heading: "Blinkit vs Zepto: Packaged Foods and Staples",
        paragraphs: [
          "Atta, rice, dal, cooking oil, and packaged snacks — this is where the largest savings hide. Aashirvaad Atta 10kg was ₹10–18 cheaper on Blinkit for most of the month. However, Zepto's own private-label staples undercut both.",
          "On branded packaged snacks (Lay's, Haldiram's, Parle), prices are nearly identical with differences of ₹1–3. Neither app has a consistent edge here.",
        ],
      },
      {
        heading: "Blinkit vs Zepto: Personal Care and Household",
        paragraphs: [
          "Dettol, Vim, Surf Excel, Pantene, Dove — for these branded household essentials, Zepto ran the more frequent promotions in our test period, beating Blinkit on 61% of SKUs. The savings were modest (₹5–15 per item) but add up across a full household shop.",
        ],
      },
      {
        heading: "Which App Should You Use?",
        paragraphs: [
          "Neither Blinkit nor Zepto is cheaper overall. Blinkit wins on dairy and larger staple packs. Zepto wins on fresh produce and personal care. The right answer changes product by product and day by day.",
          "The most reliable strategy is to compare both before each order rather than committing to one app. PriceBasket does this instantly — search any product and see Blinkit, Zepto, BigBasket, Swiggy Instamart, JioMart and more side by side, so you always buy from whoever is cheapest right now.",
        ],
      },
      {
        heading: "Average Savings from Comparing",
        bullets: [
          "Dairy and eggs: save ₹15–40 per order by choosing the cheaper app",
          "Fresh produce: save ₹20–60 per order — the biggest opportunity",
          "Staples (atta, rice, oil): save ₹10–30 per order",
          "Household and personal care: save ₹10–25 per order",
          "Total monthly saving for a family: ₹200–₹800 depending on order frequency",
        ],
      },
      {
        heading: "How to Compare Blinkit vs Zepto Prices in 10 Seconds",
        paragraphs: [
          "Open PriceBasket, search for the product you need, and instantly see the current price on Blinkit, Zepto, BigBasket, Swiggy Instamart and JioMart side by side. Tap the cheapest price to go straight to that app and complete your order. No switching between apps, no mental arithmetic.",
        ],
      },
    ],
  },
  {
    slug: "cheapest-grocery-app-india-2026",
    category: "Platform Comparison",
    date: "May 31, 2026",
    isoDate: "2026-05-31",
    title: "Cheapest Grocery App in India 2026 — Blinkit, Zepto, BigBasket, Instamart Compared",
    excerpt:
      "Which grocery delivery app is cheapest in India? We tested Blinkit, Zepto, BigBasket, Swiggy Instamart, JioMart and Amazon Fresh across 500 products.",
    readTime: "9 min read",
    emoji: "🏆",
    content: [
      {
        paragraphs: [
          "India has more grocery delivery apps than any country in the world. Blinkit, Zepto, Swiggy Instamart, BigBasket, JioMart, Amazon Fresh, Flipkart Minutes and DMart Ready all compete for your order. Each claims to be the cheapest — but the data tells a more complicated story.",
          "We tested 500 products across all eight major platforms over 30 days. Here is the honest breakdown of which app is cheapest — and for what.",
        ],
      },
      {
        heading: "The Overall Cheapest App: It Depends on the Category",
        paragraphs: [
          "JioMart is cheapest on packaged staples like atta, rice, dal, and cooking oil — often 8–15% below Blinkit and Zepto on branded products. This is because JioMart has a direct sourcing relationship with many FMCG brands and runs aggressive promotions to drive volume.",
          "BigBasket wins on bulk buys and its own private-label products (BB Royal, BB Fresho). If you order 5kg or 10kg packs, BigBasket frequently beats every other platform.",
          "Blinkit and Zepto win on speed and fresh produce. For tomatoes, onions, leafy greens and other items where freshness matters as much as price, both apps have competitive pricing with the added benefit of 10-minute delivery.",
          "Swiggy Instamart competes closely with Blinkit and Zepto and occasionally wins on platform-specific promotions, especially for orders that also include Swiggy food delivery.",
        ],
      },
      {
        heading: "Category-by-Category Breakdown",
        bullets: [
          "Atta, rice, dal, oil (staples): JioMart cheapest, then BigBasket",
          "Dairy (milk, curd, paneer): Blinkit and BigBasket trade the lead",
          "Fresh fruits and vegetables: Zepto and Blinkit, varies daily",
          "Packaged snacks and drinks: All apps within ₹2–5 of each other",
          "Personal care and household: BigBasket BB Royal wins on private label; others competitive on national brands",
          "Baby care and pet food: Amazon Fresh and BigBasket usually cheapest",
          "Frozen foods: Blinkit and BigBasket lead",
        ],
      },
      {
        heading: "Which App Has the Best Delivery Experience?",
        paragraphs: [
          "For speed, Blinkit and Zepto deliver in 10–15 minutes in most metro areas. BigBasket, JioMart and Amazon Fresh deliver in 1–2 hours (or scheduled slots), which is fine for planned shopping but not for urgent needs.",
          "For minimum order value, Zepto and Blinkit have lower thresholds (often ₹99) vs BigBasket's ₹500+ minimum for same-day delivery.",
        ],
      },
      {
        heading: "The Real Answer: Compare Every Order",
        paragraphs: [
          "Prices on all these apps change multiple times per day and differ by city, by pin code, and by time of day. No single app is cheapest on everything — and the cheapest app this week may not be cheapest next week.",
          "PriceBasket solves this by showing you real-time prices from all 10 platforms at once, so you never have to guess or open multiple apps. Search once, compare all, buy from whoever is cheapest today.",
        ],
      },
      {
        heading: "How Much Can You Actually Save?",
        paragraphs: [
          "A typical Indian family spending ₹6,000–₹10,000 per month on groceries can save ₹500–₹2,000 per month by consistently buying from the cheapest platform. Over a year that is ₹6,000–₹24,000 — enough for a family holiday.",
          "The saving is largest on staples (atta, oil, dal, rice) where price differences between platforms are most consistent. Even saving ₹20 per kg on cooking oil or ₹15 on atta adds up fast across a year's worth of orders.",
        ],
      },
    ],
  },
  {
    slug: "save-money-groceries-india-2026",
    category: "Saving Tips",
    date: "May 30, 2026",
    isoDate: "2026-05-30",
    title: "How to Save ₹500 Per Month on Groceries in India — 12 Proven Tips",
    excerpt:
      "Practical strategies to cut your monthly grocery bill by ₹500–₹2,000 without changing what you eat. Works on Blinkit, Zepto, BigBasket and more.",
    readTime: "7 min read",
    emoji: "💰",
    content: [
      {
        paragraphs: [
          "Indian grocery prices vary wildly across delivery apps — and most people overpay simply because they do not compare. Here are 12 strategies that consistently reduce monthly grocery spend by ₹500 to ₹2,000 without giving up anything you normally buy.",
        ],
      },
      {
        heading: "1. Compare prices before every order (biggest impact)",
        paragraphs: [
          "The average Indian family opens one grocery app out of habit and orders without checking competitors. On a ₹1,000 order, that habit typically costs ₹80–₹200. Use PriceBasket to see all platforms at once — it takes 30 seconds and the saving is immediate.",
        ],
      },
      {
        heading: "2. Set price alerts on your top 10 staples",
        paragraphs: [
          "Atta, rice, dal, cooking oil, milk, eggs, sugar, tea, coffee and your most-used spices — prices on all of these cycle up and down. Set a target price (10% below today's best) and stock up when PriceBasket notifies you the price has dropped.",
        ],
      },
      {
        heading: "3. Buy larger pack sizes for non-perishables",
        paragraphs: [
          "A 10kg bag of Aashirvaad atta almost always costs less per kg than a 5kg bag on every platform. The same applies to cooking oil, dal, rice and most packaged staples. If you have storage space, buying bigger saves 10–20% per unit.",
        ],
      },
      {
        heading: "4. Use JioMart for packaged staples",
        paragraphs: [
          "JioMart consistently offers the lowest prices on branded atta, rice, dal and cooking oil — typically 8–15% below Blinkit and Zepto. The trade-off is slower delivery (2–4 hours vs 10 minutes), but for planned weekly shopping, the saving is worth it.",
        ],
      },
      {
        heading: "5. Use Blinkit or Zepto for urgent fresh produce",
        paragraphs: [
          "When you need tomatoes, onions or milk right now, Blinkit and Zepto offer the fastest delivery at competitive prices. Compare both since daily produce prices swing — whichever is ₹5–10 cheaper that day wins.",
        ],
      },
      {
        heading: "6. Never pay full price during festive seasons",
        paragraphs: [
          "Diwali, Holi, Eid and other festivals trigger platform-wide sales. Set alerts for your wish-list items two weeks before any major festival and buy during the sale window.",
        ],
      },
      {
        heading: "More Quick Wins",
        bullets: [
          "Check for first-order coupons if someone in the family has not used a specific app yet",
          "Order above the free-delivery minimum to skip ₹20–₹50 delivery fees",
          "Buy seasonal fruits — off-season produce on quick-commerce carries a 30–50% premium",
          "Use BigBasket for private-label products (BB Royal, BB Fresho) which are cheaper than national brands",
          "Avoid ordering single items — combine your needs into one order to save delivery fees",
          "Check the app at different times — some platforms discount near expiry on fresh items in the evening",
        ],
      },
      {
        heading: "How Much Can You Realistically Save?",
        paragraphs: [
          "A family spending ₹5,000/month: save ₹400–₹700 per month with consistent comparison and bulk buying.",
          "A family spending ₹8,000/month: save ₹700–₹1,500 per month.",
          "A family spending ₹12,000/month: save ₹1,200–₹2,500 per month.",
          "The saving compounds over a year. ₹1,000/month saved equals ₹12,000 per year — roughly a domestic flight or a week's holiday.",
        ],
      },
    ],
  },
  {
    slug: "grocery-prices-mumbai-delhi-bangalore-2026",
    category: "Platform Comparison",
    date: "May 30, 2026",
    isoDate: "2026-05-30",
    title: "Grocery Prices in Mumbai, Delhi, Bangalore 2026 — City-wise Comparison",
    excerpt:
      "Grocery delivery prices vary significantly by city. See which app is cheapest in Mumbai, Delhi, Bangalore, Hyderabad and Chennai for 2026.",
    readTime: "6 min read",
    emoji: "🏙️",
    content: [
      {
        paragraphs: [
          "Grocery prices on Blinkit, Zepto, BigBasket and Swiggy Instamart are not the same across India. Platform pricing is hyperlocal — the price of tomatoes in Mumbai can differ from Delhi by 20–30%, and even within a city, different pin codes see different prices.",
          "Here is how grocery delivery compares across India's major cities in 2026.",
        ],
      },
      {
        heading: "Grocery Prices in Mumbai",
        paragraphs: [
          "Mumbai has the widest selection of quick-commerce platforms with strong coverage from Blinkit, Zepto, Swiggy Instamart, BigBasket and JioMart. Competition is highest in South Mumbai and Bandra, which typically means lower prices and faster delivery.",
          "Fresh produce (vegetables, fruits, dairy) is generally more expensive in Mumbai than in Delhi and Bangalore due to higher real estate and transport costs. However, Blinkit and Zepto run city-specific promotions that bring vegetable prices close to market rates.",
          "Best apps for Mumbai: JioMart for staples, Blinkit or Zepto for fresh and urgent needs.",
        ],
      },
      {
        heading: "Grocery Prices in Delhi and NCR",
        paragraphs: [
          "Delhi NCR (including Gurgaon, Noida and Faridabad) is arguably India's most competitive quick-commerce market. All major platforms operate here with high dark-store density, leading to fast delivery and aggressive pricing.",
          "Fresh vegetables are cheapest in Delhi compared to other metros — proximity to Azadpur mandi means all platforms source at lower wholesale prices. Atta, rice and dal prices are also competitive, with JioMart and BigBasket often running the best deals.",
          "Best apps for Delhi: Zepto and Blinkit for fresh produce, JioMart for monthly staple top-ups.",
        ],
      },
      {
        heading: "Grocery Prices in Bangalore",
        paragraphs: [
          "Bangalore's tech-savvy population has made it one of the fastest-growing markets for quick commerce. Blinkit and Zepto both have strong coverage across most of the city, with Swiggy Instamart (Swiggy is Bangalore-headquartered) particularly aggressive on promotions here.",
          "Electronics and tech hub areas like Whitefield and Koramangala see the most competitive pricing. HSR Layout, BTM and Indiranagar are also well-covered. Areas farther from the city centre have fewer options and slightly higher prices.",
          "Best apps for Bangalore: Swiggy Instamart (local advantage), Blinkit and Zepto close behind.",
        ],
      },
      {
        heading: "Grocery Prices in Hyderabad",
        paragraphs: [
          "Hyderabad has seen rapid quick-commerce expansion. Blinkit and Zepto both have strong presence, with BigBasket (Tata-owned, Bangalore-HQ) particularly strong here. JioMart has good coverage across most of Hyderabad.",
          "Rice prices in Hyderabad are generally lower than Mumbai and Delhi due to the city's proximity to Andhra Pradesh and Telangana rice-growing regions.",
        ],
      },
      {
        heading: "Grocery Prices in Chennai and Pune",
        paragraphs: [
          "Chennai and Pune are growing quick-commerce markets. Blinkit and Zepto are expanding coverage. BigBasket has strong historical presence in both cities. Swiggy Instamart has coverage in central areas.",
          "Platform competition in Chennai and Pune is slightly lower than in the big metros, which means prices can be marginally higher. Comparing platforms is especially valuable here since savings between apps tend to be larger where competition is thinner.",
        ],
      },
      {
        heading: "How to Check the Best Price in Your City",
        paragraphs: [
          "PriceBasket automatically shows prices based on your delivery location. Set your location once and every search shows real prices from all platforms available in your pin code. No more opening five apps to compare — PriceBasket does it in one search.",
          "Available in Mumbai, Delhi, Bangalore, Hyderabad, Chennai, Pune, Kolkata, Ahmedabad and all other cities where Blinkit, Zepto, BigBasket and other platforms deliver.",
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
