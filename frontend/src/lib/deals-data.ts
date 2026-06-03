/**
 * Data layer for /deals/[platform] programmatic pages.
 * Targets the highest-volume deal keyword cluster:
 *   "grocery deals today" 28K/mo · "blinkit offers today" 18K/mo ·
 *   "zepto discount today" 16K/mo · "bigbasket sale today" 14K/mo
 * Every platform has unique, hand-written content — not filler.
 */

export interface DealPlatform {
  slug: string;
  name: string;
  emoji: string;
  color: string;          // hero gradient start
  colorEnd: string;       // hero gradient end
  /** one-line positioning */
  blurb: string;
  /** typical kinds of offers this platform runs */
  dealTypes: Array<{ title: string; detail: string }>;
  /** categories that see the deepest discounts here */
  bestCategories: string[];
  /** when this platform's deals are typically best */
  bestTiming: string;
  /** one tactical tip specific to this platform */
  proTip: string;
  /** realistic monthly saving range using this platform's deals */
  savingRange: string;
  faq: Array<{ q: string; a: string }>;
}

export const DEAL_PLATFORMS: Record<string, DealPlatform> = {
  blinkit: {
    slug: "blinkit",
    name: "Blinkit",
    emoji: "🟡",
    color: "#f8cb46",
    colorEnd: "#e0a800",
    blurb:
      "Blinkit runs frequent flash sales on snacks, beverages, and household essentials, plus bank-card instant discounts at checkout.",
    dealTypes: [
      { title: "Flash sales", detail: "Time-limited price drops on snacks, cold drinks, and ice cream — usually evenings and weekends." },
      { title: "Bank card offers", detail: "Instant 10% discounts with select credit/debit cards on orders above a threshold." },
      { title: "Free delivery thresholds", detail: "Delivery fee waived above ₹199–₹299 depending on your city." },
      { title: "Combo packs", detail: "Bundled snacks and beverage multipacks priced below buying singles." },
    ],
    bestCategories: ["Snacks & namkeen", "Cold drinks & juices", "Ice cream", "Household cleaning", "Personal care"],
    bestTiming: "Friday evening to Sunday — Blinkit pushes its biggest flash discounts over the weekend.",
    proTip:
      "Blinkit's headline 'deal' price is not always the lowest across apps. Branded staples like atta and oil are usually cheaper on JioMart even during a Blinkit sale — compare before assuming the offer is the best price.",
    savingRange: "₹200–₹600/month",
    faq: [
      { q: "What are the best Blinkit offers today?", a: "Blinkit's live offers change through the day — flash sales on snacks and beverages, bank-card instant discounts, and free-delivery thresholds. PriceBasket shows Blinkit's current prices next to Zepto, BigBasket and JioMart so you can confirm a deal is actually the cheapest before ordering." },
      { q: "When does Blinkit have the biggest sales?", a: "Blinkit's deepest flash discounts typically run Friday evening through Sunday, and during festival sale events. Weekday prices are steadier." },
      { q: "Are Blinkit deals cheaper than other apps?", a: "Not always. Blinkit is strong on snacks, beverages and fresh produce, but branded staples are often cheaper on JioMart or BigBasket private label even during a Blinkit sale. Always compare." },
    ],
  },
  zepto: {
    slug: "zepto",
    name: "Zepto",
    emoji: "🟣",
    color: "#7c3aed",
    colorEnd: "#5b21b6",
    blurb:
      "Zepto is the most promotion-heavy quick-commerce app — aggressive weekend discounts, Zepto Pass member pricing, and deep cuts on its private label.",
    dealTypes: [
      { title: "Zepto Pass pricing", detail: "Members get lower prices and free delivery on most orders — often pays for itself in a few orders." },
      { title: "Weekend mega deals", detail: "Aggressive Saturday–Sunday discounts across snacks, beverages, and staples." },
      { title: "Zepto Basics offers", detail: "Private-label atta, rice, and pulses priced well below national brands." },
      { title: "Bank & wallet offers", detail: "Instant discounts with select cards and UPI/wallet promotions." },
    ],
    bestCategories: ["Zepto Basics staples", "Snacks & beverages", "Fresh produce", "Dairy", "Personal care"],
    bestTiming: "Weekends and the start of the month — Zepto front-loads promotions to win monthly shoppers.",
    proTip:
      "Zepto Pass typically pays for itself within 3–4 orders through free delivery and member prices. If you order weekly, the math almost always favours the pass.",
    savingRange: "₹250–₹700/month",
    faq: [
      { q: "What are the best Zepto discounts today?", a: "Zepto runs member pricing via Zepto Pass, weekend mega deals, and Zepto Basics private-label offers that beat most national brands. PriceBasket compares Zepto's live prices against Blinkit, BigBasket and JioMart so you know which app wins for your cart." },
      { q: "Is Zepto Pass worth it?", a: "If you order at least weekly, yes — the free delivery and member prices typically cover the pass cost within 3–4 orders. For occasional orders it's less clear-cut." },
      { q: "When are Zepto's biggest sales?", a: "Weekends and the first week of the month see Zepto's most aggressive discounting, alongside festival sale events." },
    ],
  },
  bigbasket: {
    slug: "bigbasket",
    name: "BigBasket",
    emoji: "🟢",
    color: "#84c225",
    colorEnd: "#5a8a16",
    blurb:
      "BigBasket's deals favour large planned shops — BB Royal private-label savings, bulk-pack pricing, and scheduled-slot delivery offers.",
    dealTypes: [
      { title: "BB Royal private label", detail: "House-brand atta, rice, dal and spices priced 15–25% below national brands — the standout everyday saving." },
      { title: "Bulk & multipack offers", detail: "Larger packs priced lower per unit — best value for monthly stock-ups." },
      { title: "Smart Basket / SuperSaver", detail: "Recurring-order and membership discounts for regular shoppers." },
      { title: "Category sale events", detail: "Periodic deep discounts on staples, beverages, and household categories." },
    ],
    bestCategories: ["BB Royal staples", "Bulk staples (atta/rice/dal)", "Household supplies", "Beverages", "BB Fresho dairy"],
    bestTiming: "Month-start stock-up and scheduled BigBasket sale events — plan a large order to maximise per-unit savings.",
    proTip:
      "BigBasket's biggest saving isn't a flashy 'sale' — it's switching from national brands to BB Royal private label, which is consistently 15–25% cheaper with comparable quality for everyday cooking.",
    savingRange: "₹400–₹1,200/month",
    faq: [
      { q: "What are the best BigBasket offers today?", a: "BigBasket's strongest value comes from BB Royal private-label staples (15–25% below national brands), bulk multipacks, and SuperSaver membership pricing. PriceBasket shows BigBasket's live prices alongside Blinkit, Zepto and JioMart so you can confirm the cheapest source." },
      { q: "When does BigBasket have sales?", a: "BigBasket runs periodic category sale events and is best value for month-start stock-up orders where bulk pricing kicks in. Private-label savings apply every day." },
      { q: "Is BigBasket cheaper than Blinkit and Zepto?", a: "For large planned orders and private-label staples, usually yes. For small urgent orders and fresh produce, quick-commerce apps like Blinkit and Zepto can be more convenient. Compare before each order." },
    ],
  },
  instamart: {
    slug: "instamart",
    name: "Swiggy Instamart",
    emoji: "🟠",
    color: "#f97316",
    colorEnd: "#c2410c",
    blurb:
      "Swiggy Instamart leans on combo deals, Swiggy One member perks, and frequent coupon drops across snacks and ready-to-eat categories.",
    dealTypes: [
      { title: "Combo & bundle deals", detail: "Snack, beverage and meal-kit bundles priced below buying items separately — Instamart's signature offer." },
      { title: "Swiggy One perks", detail: "Free delivery and member discounts for existing Swiggy One subscribers." },
      { title: "Coupon drops", detail: "Frequent percentage-off and flat-off coupons applied at checkout." },
      { title: "Bank offers", detail: "Instant card discounts on orders above a threshold." },
    ],
    bestCategories: ["Snack & beverage combos", "Ready-to-eat & instant", "Ice cream & desserts", "Personal care", "Fresh range"],
    bestTiming: "Weekends and whenever you already hold Swiggy One — stack the membership with active coupons.",
    proTip:
      "If you already pay for Swiggy One for food delivery, Instamart's free delivery and member prices make it a strong default for snacks and combos — you're not paying extra for the perk.",
    savingRange: "₹200–₹550/month",
    faq: [
      { q: "What are the best Swiggy Instamart offers today?", a: "Instamart's best value is in combo/bundle deals, Swiggy One member perks, and frequent checkout coupons — especially on snacks, beverages and ready-to-eat items. PriceBasket compares Instamart's live prices with Blinkit, Zepto and BigBasket." },
      { q: "Does Swiggy One give Instamart discounts?", a: "Yes — Swiggy One members get free delivery and member pricing on Instamart, so the membership perk extends across both food and grocery." },
      { q: "Is Instamart cheaper than Blinkit or Zepto?", a: "On combos and bundles, often yes. On individual branded items, prices are similar to Blinkit and Zepto. Comparing at order time is the only way to be sure." },
    ],
  },
  jiomart: {
    slug: "jiomart",
    name: "JioMart",
    emoji: "🔵",
    color: "#0a73ba",
    colorEnd: "#075488",
    blurb:
      "JioMart's deals centre on rock-bottom branded staple prices, large bulk packs, and free-delivery promotions — built for value monthly shopping.",
    dealTypes: [
      { title: "Lowest branded staple prices", detail: "Aashirvaad, Fortune, Tata and other national brands consistently priced below quick-commerce apps." },
      { title: "Bulk pack discounts", detail: "Large atta, rice, oil and detergent packs at low per-unit prices." },
      { title: "Free delivery promos", detail: "Frequent free-delivery offers on orders above a modest threshold." },
      { title: "Festival & sale events", detail: "Deep category discounts during Reliance sale events." },
    ],
    bestCategories: ["Branded staples (atta/rice/dal/oil)", "Bulk packs", "Packaged groceries", "Household essentials", "Beverages"],
    bestTiming: "Monthly stock-up orders and Reliance sale events — JioMart rewards larger branded-staple baskets.",
    proTip:
      "JioMart is the quiet winner for branded staples — the same Aashirvaad or Fortune pack is often ₹40–₹50 cheaper than on Blinkit or Zepto even when those apps are 'on sale'. Use it for your monthly staples shop.",
    savingRange: "₹300–₹900/month",
    faq: [
      { q: "What are the best JioMart deals today?", a: "JioMart's standout deals are its consistently low branded-staple prices, bulk-pack discounts, and free-delivery promotions. For Aashirvaad atta, Fortune oil, Tata salt and similar, JioMart is frequently the cheapest app in India. PriceBasket confirms this against Blinkit, Zepto and BigBasket live." },
      { q: "Why is JioMart cheaper on staples?", a: "JioMart sources through Reliance Retail's large physical supply chain with direct brand relationships, lowering intermediary costs. It also uses staples as loss-leaders to attract shoppers — which works in your favour." },
      { q: "Does JioMart deliver in 10 minutes?", a: "Usually no — JioMart delivers same-day or next-day in most cities. For urgent orders use Blinkit or Zepto; for the lowest staple prices on a planned shop, use JioMart." },
    ],
  },
  amazon: {
    slug: "amazon",
    name: "Amazon Fresh",
    emoji: "🟧",
    color: "#ff9900",
    colorEnd: "#cc7a00",
    blurb:
      "Amazon Fresh deals revolve around Prime perks — Subscribe & Save discounts, coupon stacking, and no delivery fee for Prime members.",
    dealTypes: [
      { title: "Subscribe & Save", detail: "Recurring-order discounts of 5–15% on household staples and personal care." },
      { title: "Coupon stacking", detail: "Clip-on coupons that stack with existing offers at checkout." },
      { title: "Prime free delivery", detail: "No delivery fee and no minimum for Prime members on Amazon Fresh." },
      { title: "Lightning & sale-event deals", detail: "Deep discounts during Great Indian Festival and Prime Day events." },
    ],
    bestCategories: ["Branded packaged goods", "Personal care", "Household supplies", "Beverages", "Baby & pet"],
    bestTiming: "If you hold Prime, any time — stack Subscribe & Save with coupons. Otherwise wait for Prime Day / festival sales.",
    proTip:
      "Amazon Fresh's real edge is Subscribe & Save on items you rebuy monthly — stacking it with clip coupons can beat quick-commerce pricing on branded packaged goods, with zero delivery fee on Prime.",
    savingRange: "₹300–₹1,000/month (Prime members)",
    faq: [
      { q: "What are the best Amazon Fresh offers today?", a: "Amazon Fresh's best value comes from Subscribe & Save (5–15% off recurring orders), stackable coupons, and free delivery for Prime members. PriceBasket compares Amazon Fresh's live prices with Blinkit, Zepto, BigBasket and JioMart." },
      { q: "Is Amazon Fresh worth it without Prime?", a: "Less so — much of the value is in Prime's free delivery and member pricing. Without Prime, quick-commerce apps or JioMart are often better value except during big sale events." },
      { q: "When are Amazon Fresh's biggest grocery sales?", a: "Prime Day and the Great Indian Festival bring the deepest grocery discounts, but Subscribe & Save offers steady everyday savings for Prime members." },
    ],
  },
};

export const DEAL_PLATFORM_SLUGS = Object.keys(DEAL_PLATFORMS);

export function getDealPlatform(slug: string): DealPlatform | undefined {
  return DEAL_PLATFORMS[slug];
}
