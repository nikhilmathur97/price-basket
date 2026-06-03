/**
 * Data layer for /price/[city]/[product] programmatic pages.
 * 40 combinations (8 cities × 5 products) — each pre-rendered at build time.
 * Every combination has unique, city+product-specific content — not filler.
 */

export interface CityData {
  name: string;
  nameFull: string;
  emoji: string;
  color: string;          // hero gradient start
  colorEnd: string;       // hero gradient end
  topApps: string[];      // apps with strongest coverage in this city
  localNote: string;      // city-specific pricing insight
  areas: string[];        // neighbourhoods/areas — local SEO signals
  cityPageSlug: string;
}

export interface ProductData {
  name: string;
  emoji: string;
  searchAlias: string[];  // alternative names people search
  topBrands: Array<{ brand: string; note: string }>;
  cheapestApp: string;    // app most often cheapest on this product
  avgPriceRange: string;  // e.g. "₹55–₹68 per litre"
  buyTip: string;         // one buying tip specific to this product
  pageSlug: string;       // existing /cheapest-[product]-online slug
  searchQuery: string;    // what users search in the app: ?q=
}

export interface CityProductInsight {
  headline: string;        // unique first sentence — no boilerplate
  platformVerdict: string; // which platform wins in this city for this product
  savingAmount: string;    // realistic saving, e.g. "₹30–₹55 per 5kg"
  faq: Array<{ q: string; a: string }>;
}

// ── City data ──────────────────────────────────────────────────────────────────

export const CITIES: Record<string, CityData> = {
  bangalore: {
    name: "Bangalore",
    nameFull: "Bangalore",
    emoji: "🏙️",
    color: "#7c3aed",
    colorEnd: "#4f46e5",
    topApps: ["Zepto", "Blinkit", "Swiggy Instamart", "BigBasket"],
    localNote: "Bangalore has India's densest quick-commerce dark-store network per sq km, driving intense price competition — especially in tech corridors.",
    areas: ["Koramangala", "Indiranagar", "HSR Layout", "Whitefield", "Electronic City", "BTM Layout", "Marathahalli", "Jayanagar"],
    cityPageSlug: "grocery-prices-bangalore",
  },
  mumbai: {
    name: "Mumbai",
    nameFull: "Mumbai",
    emoji: "🌆",
    color: "#0ea5e9",
    colorEnd: "#0284c7",
    topApps: ["Blinkit", "Zepto", "JioMart", "BigBasket"],
    localNote: "Mumbai's high real-estate costs push fresh produce prices above the national average, but JioMart's direct sourcing keeps branded staples competitive.",
    areas: ["Andheri", "Bandra", "Powai", "Thane", "Navi Mumbai", "Borivali", "Dadar", "Malad"],
    cityPageSlug: "grocery-prices-mumbai",
  },
  delhi: {
    name: "Delhi",
    nameFull: "Delhi / NCR",
    emoji: "🏛️",
    color: "#dc2626",
    colorEnd: "#b91c1c",
    topApps: ["Blinkit", "Zepto", "JioMart", "BigBasket"],
    localNote: "Delhi NCR is India's most competitive quick-commerce market. Proximity to Azadpur mandi keeps fresh produce prices 10–20% lower than Mumbai and Bangalore.",
    areas: ["Gurgaon", "Noida", "South Delhi", "Dwarka", "Rohini", "Faridabad", "Ghaziabad", "Connaught Place"],
    cityPageSlug: "grocery-prices-delhi",
  },
  hyderabad: {
    name: "Hyderabad",
    nameFull: "Hyderabad",
    emoji: "🕌",
    color: "#d97706",
    colorEnd: "#b45309",
    topApps: ["Blinkit", "Zepto", "BigBasket", "JioMart"],
    localNote: "Hyderabad's proximity to Andhra Pradesh and Telangana rice-growing regions means rice and dal prices are consistently 8–12% below national app averages.",
    areas: ["Hitech City", "Gachibowli", "Banjara Hills", "Jubilee Hills", "Madhapur", "Secunderabad", "Kondapur", "Kukatpally"],
    cityPageSlug: "grocery-prices-hyderabad",
  },
  pune: {
    name: "Pune",
    nameFull: "Pune",
    emoji: "🏫",
    color: "#059669",
    colorEnd: "#047857",
    topApps: ["Zepto", "Blinkit", "BigBasket", "JioMart"],
    localNote: "Pune's quick-commerce market is growing fast. Platform competition is slightly lower than Mumbai/Bangalore — comparing apps saves more per order here than in metros.",
    areas: ["Shivajinagar", "Koregaon Park", "Hinjewadi", "Wakad", "Kothrud", "Viman Nagar", "Hadapsar", "Baner"],
    cityPageSlug: "grocery-prices-pune",
  },
  chennai: {
    name: "Chennai",
    nameFull: "Chennai",
    emoji: "🌊",
    color: "#0891b2",
    colorEnd: "#0e7490",
    topApps: ["BigBasket", "Zepto", "Blinkit", "Swiggy Instamart"],
    localNote: "Chennai has strong BigBasket penetration (historical presence) and growing Zepto coverage. Rice prices in Chennai are among the lowest in metro India.",
    areas: ["Anna Nagar", "T. Nagar", "Adyar", "Velachery", "OMR", "Porur", "Chromepet", "Tambaram"],
    cityPageSlug: "grocery-prices-chennai",
  },
  kolkata: {
    name: "Kolkata",
    nameFull: "Kolkata",
    emoji: "🎨",
    color: "#be123c",
    colorEnd: "#9f1239",
    topApps: ["Blinkit", "Zepto", "BigBasket", "Swiggy Instamart"],
    localNote: "Kolkata's quick-commerce market is expanding. Fresh fish and vegetables from local markets keep quick-commerce fresh prices competitive with offline.",
    areas: ["Salt Lake", "New Town", "Park Street", "Jadavpur", "Behala", "Tollygunge", "Dum Dum", "Howrah"],
    cityPageSlug: "grocery-prices-kolkata",
  },
  ahmedabad: {
    name: "Ahmedabad",
    nameFull: "Ahmedabad",
    emoji: "🦁",
    color: "#9333ea",
    colorEnd: "#7e22ce",
    topApps: ["Zepto", "Blinkit", "JioMart", "BigBasket"],
    localNote: "Ahmedabad's vegetarian-majority households drive high demand for dairy, pulses and oils. JioMart and DMart Ready have strong local presence with competitive staple prices.",
    areas: ["Satellite", "Vastrapur", "Bopal", "Prahlad Nagar", "Navrangpura", "Maninagar", "Gota", "Motera"],
    cityPageSlug: "grocery-prices-ahmedabad",
  },
};

// ── Product data ───────────────────────────────────────────────────────────────

export const PRODUCTS: Record<string, ProductData> = {
  atta: {
    name: "Atta",
    emoji: "🌾",
    searchAlias: ["wheat flour", "chakki atta", "gehu ka atta"],
    topBrands: [
      { brand: "Aashirvaad Atta 5kg",  note: "Most popular, ₹189–₹240 across apps" },
      { brand: "Pillsbury Atta 5kg",   note: "Good for soft rotis, ₹195–₹245" },
      { brand: "BB Royal Chakki Atta", note: "BigBasket private label — 25% cheaper" },
      { brand: "Fortune Atta 5kg",     note: "Popular in South India, competitive price" },
    ],
    cheapestApp: "JioMart",
    avgPriceRange: "₹189–₹242 for 5kg",
    buyTip: "Buy 10kg packs — 12–15% cheaper per kg vs 5kg on every platform.",
    pageSlug: "cheapest-atta-online",
    searchQuery: "atta",
  },
  milk: {
    name: "Milk",
    emoji: "🥛",
    searchAlias: ["doodh", "amul milk", "mother dairy milk", "full cream milk"],
    topBrands: [
      { brand: "Amul Taaza 1L",         note: "Most popular, ₹58–₹68 across apps" },
      { brand: "Mother Dairy Full Cream",note: "Strong in North India, ₹62–₹70" },
      { brand: "Amul Gold 1L",          note: "Full cream, ₹66–₹75" },
      { brand: "BigBasket Fresho Milk", note: "Private label, competitive pricing" },
    ],
    cheapestApp: "BigBasket",
    avgPriceRange: "₹58–₹72 per litre",
    buyTip: "Buy Amul milk — price is nearly identical across apps but BigBasket and Blinkit occasionally run dairy promotions.",
    pageSlug: "cheapest-milk-online",
    searchQuery: "milk",
  },
  oil: {
    name: "Cooking Oil",
    emoji: "🫙",
    searchAlias: ["tel", "sunflower oil", "mustard oil", "refined oil", "sarson ka tel"],
    topBrands: [
      { brand: "Fortune Sunflower Oil 1L", note: "₹129–₹148, JioMart usually cheapest" },
      { brand: "Saffola Gold 1L",          note: "Premium, ₹148–₹168 across apps" },
      { brand: "Dhara Refined Oil 1L",     note: "Value pick, ₹115–₹132" },
      { brand: "Patanjali Mustard Oil 1L", note: "₹112–₹135, strong in North India" },
    ],
    cheapestApp: "JioMart",
    avgPriceRange: "₹115–₹168 per litre",
    buyTip: "Oil prices softened in June 2026 — good time to stock up. 5L packs are 10–18% cheaper per litre than 1L.",
    pageSlug: "cheapest-oil-online",
    searchQuery: "cooking+oil",
  },
  rice: {
    name: "Rice",
    emoji: "🍚",
    searchAlias: ["chawal", "basmati rice", "sona masoori rice", "raw rice"],
    topBrands: [
      { brand: "India Gate Basmati 5kg", note: "Premium, ₹285–₹335 across apps" },
      { brand: "Daawat Basmati 5kg",     note: "Good value premium, ₹265–₹310" },
      { brand: "BB Royal Sona Masoori",  note: "South India staple, competitive on BigBasket" },
      { brand: "Fortune Sona Masoori 5kg",note: "₹195–₹240, popular in AP/Telangana" },
    ],
    cheapestApp: "BigBasket",
    avgPriceRange: "₹195–₹340 for 5kg depending on variety",
    buyTip: "For basmati, BigBasket's BB Royal and JioMart offer the best prices. For Sona Masoori, check BigBasket first.",
    pageSlug: "cheapest-rice-online",
    searchQuery: "rice",
  },
  dal: {
    name: "Dal",
    emoji: "🫘",
    searchAlias: ["lentils", "toor dal", "moong dal", "masoor dal", "chana dal", "arhar dal"],
    topBrands: [
      { brand: "Tata Sampann Toor Dal 1kg", note: "Premium, ₹155–₹172 across apps" },
      { brand: "BB Royal Toor Dal 1kg",     note: "BigBasket private label, competitive" },
      { brand: "Moong Dal 1kg",             note: "₹128–₹148, varies by app" },
      { brand: "Masoor Dal 1kg",            note: "₹105–₹125, cheapest dal variety" },
    ],
    cheapestApp: "JioMart",
    avgPriceRange: "₹105–₹175 per kg depending on variety",
    buyTip: "Masoor dal is 25–30% cheaper than toor dal and a nutritional equivalent for most dishes. Set a price alert — dal prices dip unpredictably.",
    pageSlug: "cheapest-dal-online",
    searchQuery: "dal",
  },
};

// ── City × product specific insights ──────────────────────────────────────────
// Key: `${citySlug}-${productSlug}`

export const CITY_PRODUCT_INSIGHTS: Record<string, CityProductInsight> = {
  "bangalore-atta": {
    headline: "Atta prices in Bangalore are highly competitive — BigBasket (headquartered here) and JioMart both push hard on this category, keeping prices 5–8% lower than in Mumbai.",
    platformVerdict: "JioMart for branded Aashirvaad (₹189/5kg). BigBasket BB Royal for value (₹155/5kg). Blinkit/Zepto for urgent needs.",
    savingAmount: "₹51–₹85 per 5kg pack vs buying on Blinkit",
    faq: [
      { q: "Which app has cheapest atta price in Bangalore?", a: "JioMart offers Aashirvaad Atta 5kg at ₹189 — cheapest among all major apps in Bangalore. BigBasket's BB Royal Chakki Atta at ₹155 is the best value if you're open to private label." },
      { q: "Does Zepto deliver atta in Whitefield and Electronic City?", a: "Yes, Zepto has good coverage across Bangalore tech corridors including Whitefield, Electronic City, Koramangala and HSR Layout. Atta prices on Zepto are typically ₹225–₹235 for Aashirvaad 5kg." },
      { q: "Is BigBasket atta cheaper in Bangalore than other cities?", a: "BigBasket's atta prices are broadly consistent across cities, but Bangalore orders sometimes see extra platform promotions due to BigBasket's headquarters presence. Check PriceBasket for today's price." },
    ],
  },
  "bangalore-milk": {
    headline: "Bangalore's milk market is fiercely competitive — Zepto, Blinkit and BigBasket all stock Amul, Nandini (Karnataka co-op), and private labels, keeping prices in check.",
    platformVerdict: "Nandini milk (Karnataka co-op) is Bangalore's local favourite and available on BigBasket and Swiggy Instamart. Amul is on all platforms at ₹60–₹68/litre.",
    savingAmount: "₹8–₹14 per litre vs the most expensive option",
    faq: [
      { q: "Is Nandini milk available on quick-commerce apps in Bangalore?", a: "Yes, Nandini milk (Karnataka Milk Federation) is available on BigBasket and Swiggy Instamart in Bangalore. It's often ₹2–₹4 cheaper than Amul Taaza per litre." },
      { q: "Which app has cheapest milk price in Bangalore?", a: "BigBasket typically has the lowest milk prices in Bangalore — Amul Taaza 1L at ₹60–₹62 and Nandini at ₹58–₹60. Blinkit and Zepto are slightly higher at ₹64–₹68." },
      { q: "Can I get milk delivered in 10 minutes in HSR Layout?", a: "Yes, Blinkit, Zepto and Swiggy Instamart all operate in HSR Layout. Milk delivery in 10 minutes is standard in this area." },
    ],
  },
  "bangalore-oil": {
    headline: "Cooking oil prices in Bangalore are at a 3-month low in June 2026 — a good time to stock up, especially on 5L packs from JioMart.",
    platformVerdict: "JioMart is cheapest on Fortune and Saffola oils. BigBasket wins on bulk 5L packs. Zepto and Blinkit are 10–15% more expensive on oil.",
    savingAmount: "₹40–₹80 on a 5L oil pack vs Blinkit/Zepto",
    faq: [
      { q: "Which app has cheapest cooking oil price in Bangalore?", a: "JioMart has the lowest cooking oil prices in Bangalore — Fortune Sunflower Oil 1L at ₹129 vs ₹142 on Blinkit/Zepto. For 5L packs, BigBasket often beats JioMart." },
      { q: "Is mustard oil available in Bangalore quick-commerce?", a: "Yes, Patanjali and Emami mustard oils are available on Blinkit, Zepto and BigBasket in Bangalore. Prices range from ₹112–₹135/litre depending on brand and platform." },
    ],
  },
  "bangalore-rice": {
    headline: "Bangalore consumes both Sona Masoori (South Indian staple) and Basmati — and BigBasket has a clear edge on both, especially on its BB Royal private label.",
    platformVerdict: "BigBasket wins on rice in Bangalore — BB Royal Sona Masoori at competitive prices. JioMart for basmati value packs.",
    savingAmount: "₹40–₹65 on a 5kg rice pack vs Blinkit",
    faq: [
      { q: "Which app has cheapest Sona Masoori rice price in Bangalore?", a: "BigBasket has the best Sona Masoori rice prices in Bangalore, especially BB Royal brand. Sona Masoori 5kg ranges from ₹195–₹240 across apps — BigBasket is typically at the lower end." },
      { q: "Where can I buy basmati rice cheapest in Bangalore?", a: "JioMart and BigBasket offer the best basmati rice prices in Bangalore. India Gate Basmati 5kg is ₹285–₹295 on these platforms vs ₹315–₹335 on Blinkit and Zepto." },
    ],
  },
  "bangalore-dal": {
    headline: "Dal prices in Bangalore are stable in June 2026 — JioMart consistently undercuts quick-commerce apps by ₹15–₹25 per kg on toor, moong and masoor.",
    platformVerdict: "JioMart is cheapest on branded toor dal. BigBasket BB Royal for value. Set a price alert — Bangalore occasionally sees flash sales on dal.",
    savingAmount: "₹15–₹25 per kg vs Zepto/Blinkit",
    faq: [
      { q: "Which app has cheapest dal price in Bangalore?", a: "JioMart has the lowest toor dal prices in Bangalore — Tata Sampann Toor Dal 1kg at ₹142 vs ₹155–₹162 on Zepto and Blinkit. BigBasket BB Royal is also competitive." },
      { q: "Is moong dal cheaper than toor dal in Bangalore?", a: "Moong dal is generally ₹10–₹20 per kg cheaper than toor dal in Bangalore. Moong dal 1kg ranges from ₹128–₹148 vs toor dal's ₹142–₹162." },
    ],
  },
  "mumbai-atta": {
    headline: "Mumbai atta prices are slightly higher than Delhi but comparable to Bangalore — JioMart's direct sourcing keeps Aashirvaad at ₹189 even in high-cost Mumbai.",
    platformVerdict: "JioMart at ₹189/5kg is the consistent winner. Blinkit and Zepto are ₹235–₹242. BigBasket BB Royal is the value choice at ₹155.",
    savingAmount: "₹46–₹53 per 5kg vs quick-commerce apps",
    faq: [
      { q: "Which app has cheapest atta price in Mumbai?", a: "JioMart has the lowest Aashirvaad atta price in Mumbai at ₹189 for 5kg. BigBasket's BB Royal Chakki Atta at ₹155–₹165 is the best value if you're open to private label." },
      { q: "Does JioMart deliver atta in Andheri and Bandra?", a: "Yes, JioMart covers most of Mumbai including Andheri, Bandra, Powai and Thane with 2–4 hour delivery. For 10-minute delivery, use Blinkit or Zepto at ₹235–₹242." },
    ],
  },
  "mumbai-milk": {
    headline: "Mumbai milk prices are the highest in metro India — higher living costs and transport push Amul Taaza to ₹65–₹72/litre on most quick-commerce apps.",
    platformVerdict: "Blinkit and BigBasket are most competitive on milk in Mumbai. Zepto is typically ₹2–₹4 more expensive. JioMart's selection is more limited.",
    savingAmount: "₹7–₹14 per litre vs the most expensive option",
    faq: [
      { q: "Which app has cheapest milk price in Mumbai?", a: "BigBasket and Blinkit typically have the lowest milk prices in Mumbai. Amul Taaza 1L at ₹62–₹66 on these platforms vs ₹68–₹72 on Zepto and Instamart." },
      { q: "Is Amul milk available for 10-minute delivery in Thane?", a: "Yes, Blinkit and Zepto both deliver in Thane with good milk availability. Prices in Thane are typically ₹1–₹2 lower than in central Mumbai." },
    ],
  },
  "mumbai-oil": {
    headline: "Mumbai cooking oil prices track national rates — JioMart is consistently cheapest, with Fortune Sunflower Oil 1L at ₹129 vs ₹142–₹148 on quick-commerce apps.",
    platformVerdict: "JioMart wins on oil in Mumbai. BigBasket for 5L packs. Blinkit/Zepto for urgent single-litre needs.",
    savingAmount: "₹45–₹90 on a 5L pack vs Blinkit/Zepto",
    faq: [
      { q: "Cheapest cooking oil price in Mumbai?", a: "JioMart has the lowest cooking oil prices in Mumbai — Fortune Sunflower Oil 1L at ₹129, vs ₹142–₹148 on Blinkit and Zepto. 5L packs on JioMart and BigBasket offer even better per-litre value." },
    ],
  },
  "mumbai-rice": {
    headline: "Mumbai's rice market is split — Basmati for north Indian households, Kolam/Sona Masoori for western and south Indian residents. BigBasket leads on range and price.",
    platformVerdict: "BigBasket has the best rice selection and prices in Mumbai. JioMart for bulk basmati. Blinkit/Zepto for quick needs.",
    savingAmount: "₹35–₹60 on a 5kg pack vs convenience apps",
    faq: [
      { q: "Cheapest basmati rice price in Mumbai?", a: "JioMart and BigBasket offer the best basmati rice prices in Mumbai. India Gate Basmati 5kg at ₹285–₹295 vs ₹320–₹335 on Blinkit/Zepto." },
      { q: "Is Kolam rice available on Zepto in Mumbai?", a: "Yes, Kolam rice is available on Zepto, Blinkit and BigBasket in Mumbai. BigBasket typically has the best selection and competitive pricing on local rice varieties." },
    ],
  },
  "mumbai-dal": {
    headline: "Dal prices in Mumbai are stable. JioMart undercuts quick-commerce apps by ₹18–₹28/kg — meaningful savings if you buy 2–5kg packs regularly.",
    platformVerdict: "JioMart for branded dal. BigBasket BB Royal for value private label. Blinkit/Zepto for urgent needs only.",
    savingAmount: "₹18–₹28 per kg vs Blinkit/Zepto",
    faq: [
      { q: "Cheapest toor dal price in Mumbai?", a: "JioMart has the lowest toor dal prices in Mumbai. Tata Sampann Toor Dal 1kg at ₹142 vs ₹158–₹165 on Blinkit and Zepto." },
    ],
  },
  "delhi-atta": {
    headline: "Delhi NCR has the most competitive atta prices in India — multiple platforms fight hard for this market, and JioMart and DMart Ready often go below ₹185 for Aashirvaad 5kg.",
    platformVerdict: "Delhi's most competitive market. JioMart and DMart Ready trade the lead. Check PriceBasket — prices shift daily.",
    savingAmount: "₹50–₹60 per 5kg vs Blinkit or Zepto",
    faq: [
      { q: "Cheapest atta price in Delhi?", a: "Delhi NCR has India's most competitive atta prices. JioMart and DMart Ready both frequently offer Aashirvaad 5kg below ₹190. BigBasket BB Royal at ₹155 is the best value pick." },
      { q: "Does Blinkit deliver atta in Gurgaon and Noida?", a: "Yes, Blinkit has strong coverage across Gurgaon, Noida, and all Delhi NCR areas. Atta delivery in 10–15 minutes is standard. Prices on Blinkit for Aashirvaad 5kg run ₹235–₹242." },
    ],
  },
  "delhi-milk": {
    headline: "Delhi NCR's milk market is dominated by Mother Dairy (Delhi-based co-op) and Amul — both are priced competitively. Mother Dairy is often 3–5% cheaper than Amul on most platforms.",
    platformVerdict: "Mother Dairy is Delhi's value pick — available on BigBasket, Blinkit and JioMart at ₹60–₹65/litre. Amul is slightly pricier at ₹62–₹68.",
    savingAmount: "₹5–₹10 per litre by choosing Mother Dairy over premium brands",
    faq: [
      { q: "Is Mother Dairy milk available on Blinkit in Delhi?", a: "Yes, Mother Dairy is available on Blinkit, Zepto and BigBasket across most Delhi NCR pin codes. It's typically ₹2–₹5 cheaper per litre than Amul Taaza." },
      { q: "Cheapest milk price in Delhi?", a: "Mother Dairy on BigBasket or Blinkit is typically the cheapest milk option in Delhi at ₹58–₹63/litre. Amul Taaza runs ₹62–₹68 across apps." },
    ],
  },
  "delhi-oil": {
    headline: "Delhi has India's most diverse cooking oil market — mustard oil (North Indian staple), sunflower, and refined oil all compete. JioMart wins on both mustard and sunflower.",
    platformVerdict: "JioMart for sunflower and mustard oil. DMart Ready for bulk 5L packs. Blinkit/Zepto for urgent needs at a premium.",
    savingAmount: "₹35–₹75 on a 5L pack vs quick-commerce",
    faq: [
      { q: "Cheapest mustard oil price in Delhi?", a: "Patanjali and Dhara mustard oil are cheapest on JioMart and DMart Ready in Delhi — ₹108–₹125/litre vs ₹130–₹148 on Blinkit/Zepto." },
      { q: "Cheapest sunflower oil price in Delhi?", a: "Fortune Sunflower Oil 1L is ₹129 on JioMart in Delhi vs ₹140–₹148 on Zepto and Blinkit." },
    ],
  },
  "delhi-rice": {
    headline: "Delhi's proximity to Punjab and Haryana — India's rice bowl — keeps Basmati prices among the lowest in metro India, especially on JioMart and BigBasket.",
    platformVerdict: "JioMart and BigBasket for Basmati value. Blinkit for premium aged Basmati. DMart Ready for bulk buys.",
    savingAmount: "₹40–₹70 on a 5kg Basmati pack vs quick-commerce apps",
    faq: [
      { q: "Cheapest basmati rice price in Delhi?", a: "Delhi has the best basmati rice prices in India due to proximity to production areas. India Gate Basmati 5kg at ₹265–₹280 on JioMart vs ₹310–₹335 on Blinkit/Zepto." },
    ],
  },
  "delhi-dal": {
    headline: "Dal prices in Delhi are the most competitive in metro India — JioMart and DMart Ready both push aggressively on toor, moong and chana dal.",
    platformVerdict: "JioMart and DMart Ready for all dal varieties. BigBasket for private-label value.",
    savingAmount: "₹20–₹30 per kg vs Blinkit/Zepto",
    faq: [
      { q: "Cheapest toor dal price in Delhi?", a: "JioMart and DMart Ready offer the lowest toor dal prices in Delhi — Tata Sampann 1kg at ₹138–₹144 vs ₹155–₹165 on Zepto and Blinkit." },
    ],
  },
  "hyderabad-atta": {
    headline: "Hyderabad's wheat flour market is dominated by both North Indian brands (Aashirvaad) and local Andhra brands. JioMart leads on price; BigBasket on variety.",
    platformVerdict: "JioMart at ₹189 for Aashirvaad 5kg. BigBasket for local Andhra wheat flour brands.",
    savingAmount: "₹46–₹55 per 5kg vs quick-commerce apps",
    faq: [
      { q: "Cheapest atta price in Hyderabad?", a: "JioMart has the lowest atta prices in Hyderabad. Aashirvaad 5kg at ₹189 vs ₹230–₹242 on Zepto and Blinkit. BigBasket BB Royal is also a strong value choice." },
    ],
  },
  "hyderabad-milk": {
    headline: "Hyderabad's milk market includes strong local brands — Vijaya Dairy (Andhra Pradesh co-op) alongside Amul. Vijaya is often 5–8% cheaper per litre.",
    platformVerdict: "BigBasket has the best milk prices and selection in Hyderabad, including Vijaya Dairy. Blinkit and Zepto stock Amul.",
    savingAmount: "₹5–₹12 per litre by choosing Vijaya over Amul",
    faq: [
      { q: "Is Vijaya Dairy milk available on quick-commerce in Hyderabad?", a: "Yes, Vijaya Dairy milk is available on BigBasket in Hyderabad. It's typically ₹3–₹6 cheaper per litre than Amul Taaza." },
      { q: "Cheapest milk price in Hyderabad?", a: "BigBasket has the lowest milk prices in Hyderabad — Vijaya Dairy at ₹56–₹60/litre. Amul Taaza runs ₹62–₹68 across apps in Hyderabad." },
    ],
  },
  "hyderabad-oil": {
    headline: "Hyderabad is a major consumer of groundnut (peanut) oil alongside sunflower oil. JioMart wins on sunflower; local brands compete on groundnut oil.",
    platformVerdict: "JioMart for sunflower oil. BigBasket for groundnut oil and regional brands.",
    savingAmount: "₹30–₹65 on a 5L pack vs convenience apps",
    faq: [
      { q: "Cheapest cooking oil price in Hyderabad?", a: "JioMart has the lowest sunflower oil prices in Hyderabad — Fortune 1L at ₹129 vs ₹140–₹148 on Zepto/Blinkit. For groundnut oil, check BigBasket for local Andhra brands." },
    ],
  },
  "hyderabad-rice": {
    headline: "Hyderabad's rice market is dominated by Sona Masoori and Samba varieties — locally sourced, keeping prices 10–15% below the national app average for rice.",
    platformVerdict: "BigBasket leads on Sona Masoori and Samba varieties. JioMart for Basmati value packs.",
    savingAmount: "₹20–₹50 on a 5kg pack vs convenience apps",
    faq: [
      { q: "Cheapest Sona Masoori rice price in Hyderabad?", a: "BigBasket has the best Sona Masoori prices in Hyderabad — sourced from nearby Andhra Pradesh. 5kg packs typically ₹175–₹205 vs ₹210–₹240 on Blinkit/Zepto." },
    ],
  },
  "hyderabad-dal": {
    headline: "Dal prices in Hyderabad are among the lowest in metro India — proximity to Andhra Pradesh lentil-growing regions keeps toor and moong dal competitive.",
    platformVerdict: "JioMart for branded dal. BigBasket for local varieties and private label.",
    savingAmount: "₹15–₹25 per kg vs Blinkit/Zepto",
    faq: [
      { q: "Cheapest dal price in Hyderabad?", a: "JioMart has the lowest dal prices in Hyderabad — toor dal at ₹138–₹145/kg vs ₹155–₹162 on quick-commerce apps. BigBasket BB Royal is also competitive." },
    ],
  },
  "pune-atta": {
    headline: "Pune's quick-commerce market is growing fast — platform competition is slightly lower than Mumbai, meaning comparing apps saves more per order here.",
    platformVerdict: "JioMart wins on atta in Pune. Zepto and Blinkit expanding coverage in Hinjewadi, Baner and Wakad.",
    savingAmount: "₹46–₹55 per 5kg pack",
    faq: [
      { q: "Cheapest atta price in Pune?", a: "JioMart has the lowest Aashirvaad atta prices in Pune at ₹189/5kg. Blinkit and Zepto charge ₹232–₹242 in Pune." },
    ],
  },
  "pune-milk": {
    headline: "Pune's milk market has strong Amul and Katraj Dairy (Maharashtra co-op) presence. Katraj is often the cheapest option in Pune for buyers open to local brands.",
    platformVerdict: "BigBasket for Katraj and Amul options. Blinkit and Zepto for 10-minute Amul delivery.",
    savingAmount: "₹5–₹10 per litre by choosing Katraj over Amul",
    faq: [
      { q: "Cheapest milk price in Pune?", a: "Katraj Dairy milk on BigBasket is typically the cheapest in Pune at ₹56–₹60/litre. Amul Taaza runs ₹62–₹68 across apps in Pune." },
    ],
  },
  "pune-oil": {
    headline: "Cooking oil prices in Pune track national rates. JioMart leads on sunflower oil; BigBasket has better groundnut oil selection for Pune's western-Indian households.",
    platformVerdict: "JioMart for sunflower oil. BigBasket for groundnut and sesame oil.",
    savingAmount: "₹35–₹70 on a 5L pack vs convenience apps",
    faq: [
      { q: "Cheapest cooking oil in Pune?", a: "JioMart has the lowest sunflower oil prices in Pune — Fortune 1L at ₹129 vs ₹140–₹148 on Zepto/Blinkit." },
    ],
  },
  "pune-rice": {
    headline: "Pune consumes both Basmati and Kolam rice varieties. BigBasket has the strongest rice selection in Pune, including local Maharashtra varieties.",
    platformVerdict: "BigBasket leads on rice variety and price in Pune. JioMart for bulk Basmati.",
    savingAmount: "₹30–₹60 on a 5kg pack vs convenience apps",
    faq: [
      { q: "Cheapest rice price in Pune?", a: "BigBasket has the best rice prices in Pune — Kolam rice 5kg at ₹185–₹210 and Basmati at ₹275–₹295 vs ₹310–₹330 on Blinkit/Zepto." },
    ],
  },
  "pune-dal": {
    headline: "Dal is a staple in Pune's Maharashtrian households. JioMart and BigBasket both offer competitive prices — compare before each order since promotions shift.",
    platformVerdict: "JioMart for branded toor and moong dal. BigBasket for bulk and private label.",
    savingAmount: "₹15–₹25 per kg vs quick-commerce apps",
    faq: [
      { q: "Cheapest dal price in Pune?", a: "JioMart has the lowest toor dal prices in Pune — ₹142–₹148/kg vs ₹155–₹165 on Blinkit and Zepto." },
    ],
  },
  "chennai-atta": {
    headline: "Chennai's wheat flour consumption is lower than North Indian cities but growing. BigBasket — with its historical South India strength — leads on price and selection.",
    platformVerdict: "BigBasket for atta in Chennai — strong local presence. JioMart also competitive.",
    savingAmount: "₹40–₹55 per 5kg vs convenience apps",
    faq: [
      { q: "Cheapest atta price in Chennai?", a: "BigBasket and JioMart offer the best atta prices in Chennai. Aashirvaad 5kg at ₹189–₹198 on these platforms vs ₹232–₹242 on Blinkit/Zepto." },
    ],
  },
  "chennai-milk": {
    headline: "Chennai's milk market is led by Aavin (Tamil Nadu co-op) — India's oldest dairy co-op — which is significantly cheaper than Amul and widely available.",
    platformVerdict: "BigBasket and Instamart for Aavin milk. Blinkit and Zepto for Amul in areas with strong coverage.",
    savingAmount: "₹8–₹15 per litre by choosing Aavin over Amul",
    faq: [
      { q: "Is Aavin milk available on quick-commerce apps in Chennai?", a: "Yes, Aavin milk is available on BigBasket and Swiggy Instamart in Chennai. It's typically ₹8–₹12 cheaper per litre than Amul Taaza." },
      { q: "Cheapest milk price in Chennai?", a: "Aavin milk on BigBasket is the cheapest milk option in Chennai at ₹50–₹56/litre. Amul Taaza runs ₹62–₹68 across other apps." },
    ],
  },
  "chennai-oil": {
    headline: "Chennai uses more sesame oil and coconut oil than North Indian cities. BigBasket has the widest selection; JioMart wins on sunflower and refined oil prices.",
    platformVerdict: "BigBasket for sesame and coconut oil. JioMart for sunflower oil.",
    savingAmount: "₹30–₹65 on a 5L pack vs quick-commerce",
    faq: [
      { q: "Cheapest gingelly (sesame) oil price in Chennai?", a: "BigBasket has the best sesame oil prices in Chennai — typically ₹215–₹245 for a quality 1L bottle vs ₹250–₹280 on Blinkit/Zepto." },
    ],
  },
  "chennai-rice": {
    headline: "Rice is Chennai's staple — Sona Masoori and Ponni varieties dominate. BigBasket's South India expertise makes it the leader on both variety and price.",
    platformVerdict: "BigBasket is the clear leader on South Indian rice varieties in Chennai. JioMart for budget Basmati.",
    savingAmount: "₹25–₹55 on a 5kg pack vs convenience apps",
    faq: [
      { q: "Cheapest Ponni rice price in Chennai?", a: "BigBasket offers the best Ponni rice prices in Chennai — 5kg at ₹185–₹210. This South Indian variety is not as widely available on Blinkit/Zepto." },
      { q: "Cheapest Sona Masoori price in Chennai?", a: "BigBasket has the best Sona Masoori prices in Chennai — 5kg at ₹190–₹215 vs ₹220–₹250 on Zepto/Blinkit." },
    ],
  },
  "chennai-dal": {
    headline: "Dal prices in Chennai are stable. Masoor and moong dal are more popular than toor dal in Tamil cooking — BigBasket has the best selection and JioMart has the best prices.",
    platformVerdict: "JioMart for toor and moong dal prices. BigBasket for masoor dal and local Tamil varieties.",
    savingAmount: "₹15–₹22 per kg vs Blinkit/Zepto",
    faq: [
      { q: "Cheapest dal price in Chennai?", a: "JioMart has the lowest toor dal prices in Chennai at ₹142–₹148/kg. BigBasket is competitive on masoor dal (₹105–₹118/kg) — typically the cheapest dal variety in Chennai." },
    ],
  },
  "kolkata-atta": {
    headline: "Kolkata's atta consumption has grown with Blinkit and Zepto expanding. JioMart is typically cheapest; platform coverage in outer Kolkata is still expanding.",
    platformVerdict: "JioMart leads on atta price in Kolkata. BigBasket for private label.",
    savingAmount: "₹45–₹55 per 5kg vs convenience apps",
    faq: [
      { q: "Cheapest atta price in Kolkata?", a: "JioMart has the lowest atta prices in Kolkata — Aashirvaad 5kg at ₹189–₹198 vs ₹232–₹242 on Blinkit/Zepto. Coverage is strong in Salt Lake, New Town and central Kolkata." },
    ],
  },
  "kolkata-milk": {
    headline: "Kolkata's milk market includes strong Amul presence and local Bangur/Gopal brands. Prices are competitive with national rates.",
    platformVerdict: "Blinkit and BigBasket for Amul in Kolkata. BigBasket for local dairy brands.",
    savingAmount: "₹6–₹12 per litre depending on brand choice",
    faq: [
      { q: "Cheapest milk price in Kolkata?", a: "Blinkit and BigBasket have competitive milk prices in Kolkata — Amul Taaza at ₹60–₹65/litre. Local dairy brands on BigBasket can be ₹5–₹8 cheaper." },
    ],
  },
  "kolkata-oil": {
    headline: "Kolkata is India's largest consumer of mustard oil — essential for Bengali cooking. JioMart and BigBasket both offer competitive prices on Patanjali and Dhara mustard oil.",
    platformVerdict: "JioMart and BigBasket for mustard oil. Check both — promotions shift weekly.",
    savingAmount: "₹20–₹45 on a 5L mustard oil pack",
    faq: [
      { q: "Cheapest mustard oil price in Kolkata?", a: "Patanjali Mustard Oil 1L is cheapest on JioMart in Kolkata at ₹108–₹118. Dhara mustard oil runs ₹115–₹125. BigBasket is also competitive and offers larger pack sizes." },
    ],
  },
  "kolkata-rice": {
    headline: "Kolkata is a Gobindobhog and Miniket rice market — fragrant local varieties not always available on quick-commerce. BigBasket leads on variety; JioMart on Basmati price.",
    platformVerdict: "BigBasket for Gobindobhog and Miniket rice. JioMart for Basmati.",
    savingAmount: "₹30–₹60 on a 5kg pack",
    faq: [
      { q: "Is Gobindobhog rice available on quick-commerce in Kolkata?", a: "Yes, Gobindobhog rice is available on BigBasket in Kolkata. It's a premium fragrant variety — expect ₹220–₹280 for 1kg. Not widely available on Blinkit/Zepto." },
    ],
  },
  "kolkata-dal": {
    headline: "Dal prices in Kolkata are stable. Bengali cuisine uses heavy amounts of masoor dal (red lentil) — consistently the cheapest dal option across all platforms.",
    platformVerdict: "JioMart for branded toor/moong dal. BigBasket for masoor dal variety.",
    savingAmount: "₹15–₹25 per kg vs convenience apps",
    faq: [
      { q: "Cheapest masoor dal price in Kolkata?", a: "Masoor dal is the cheapest dal variety in Kolkata — ₹105–₹120/kg on JioMart and BigBasket vs ₹128–₹140 on Blinkit/Zepto." },
    ],
  },
  "ahmedabad-atta": {
    headline: "Ahmedabad is a high-atta-consumption city — Gujarati households use atta heavily. JioMart and DMart Ready compete aggressively, often below ₹185 for Aashirvaad 5kg.",
    platformVerdict: "JioMart and DMart Ready trade the lead on atta in Ahmedabad. Check both before ordering.",
    savingAmount: "₹50–₹60 per 5kg vs Zepto/Blinkit",
    faq: [
      { q: "Cheapest atta price in Ahmedabad?", a: "JioMart and DMart Ready offer the lowest atta prices in Ahmedabad. Aashirvaad 5kg at ₹185–₹189 vs ₹232–₹242 on Blinkit and Zepto." },
    ],
  },
  "ahmedabad-milk": {
    headline: "Ahmedabad is served by Amul (headquartered in Anand, Gujarat — very close to Ahmedabad). This proximity means Ahmedabad has some of the lowest Amul milk prices in India.",
    platformVerdict: "Amul milk is cheapest in Ahmedabad due to local proximity. All platforms are competitive — compare for daily promotions.",
    savingAmount: "Amul prices are uniformly low — compare apps for delivery fees instead",
    faq: [
      { q: "Cheapest milk price in Ahmedabad?", a: "Ahmedabad has the lowest Amul milk prices in India due to Amul's headquarters in nearby Anand. Amul Taaza is typically ₹58–₹62/litre — ₹4–₹8 cheaper than in Mumbai or Bangalore." },
    ],
  },
  "ahmedabad-oil": {
    headline: "Ahmedabad's Gujarati households use groundnut (peanut) oil as a primary cooking medium. JioMart and BigBasket both carry strong groundnut oil selections.",
    platformVerdict: "BigBasket for groundnut oil variety. JioMart for sunflower oil price.",
    savingAmount: "₹30–₹60 on a 5L pack vs Zepto/Blinkit",
    faq: [
      { q: "Cheapest groundnut oil price in Ahmedabad?", a: "BigBasket and JioMart have the best groundnut oil prices in Ahmedabad. Gujarat-brand groundnut oil on BigBasket can be 15–20% cheaper than national brands." },
    ],
  },
  "ahmedabad-rice": {
    headline: "Ahmedabad's rice market focuses on Basmati for Gujarati biryanis and rice dishes. JioMart leads on Basmati price; BigBasket on variety.",
    platformVerdict: "JioMart for Basmati. BigBasket for Gujarati rice varieties and private label.",
    savingAmount: "₹35–₹60 on a 5kg Basmati pack",
    faq: [
      { q: "Cheapest basmati rice price in Ahmedabad?", a: "JioMart offers the lowest Basmati rice prices in Ahmedabad. India Gate 5kg at ₹280–₹295 vs ₹315–₹335 on Blinkit and Zepto." },
    ],
  },
  "ahmedabad-dal": {
    headline: "Dal is central to Gujarati cuisine — dal dhokli, dal vada, and kadhi make this a high-consumption category. JioMart and DMart Ready compete hard on toor and moong dal.",
    platformVerdict: "JioMart and DMart Ready for the best dal prices in Ahmedabad.",
    savingAmount: "₹18–₹28 per kg vs Zepto/Blinkit",
    faq: [
      { q: "Cheapest toor dal price in Ahmedabad?", a: "JioMart and DMart Ready have the lowest toor dal prices in Ahmedabad — ₹140–₹146/kg vs ₹155–₹165 on Blinkit and Zepto." },
    ],
  },
};

export const CITY_SLUGS = Object.keys(CITIES);
export const PRODUCT_SLUGS = Object.keys(PRODUCTS);

export function getCityProductInsight(
  citySlug: string,
  productSlug: string,
): CityProductInsight | null {
  return CITY_PRODUCT_INSIGHTS[`${citySlug}-${productSlug}`] ?? null;
}
