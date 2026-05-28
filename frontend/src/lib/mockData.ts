import type { Category, ProductWithPrices, Platform } from "@/types";

// ── Real food images (Pexels — verified free CDN photo IDs) ─────────────────
const P = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop`;

const FOOD_IMAGES: Record<string, string> = {
  // Fruits & Vegetables
  onion:       P(4163411),  // whole & sliced onion on wooden surface
  tomato:      P(373019),   // ripe tomatoes on rustic wooden table
  banana:      P(4114115),  // bananas with peeled fruit on wooden board
  spinach:     P(4506881),  // fresh spinach leaves on gray surface
  apple:       P(102104),   // shiny red apple on white background
  potato:      P(7774212),  // fresh raw potatoes on wooden surface
  lemon:       P(1435735),  // fresh lemons
  // Dairy & Breakfast
  milk:        P(1675976),  // glass of milk on outdoor table
  butter:      P(7966386),  // two butter blocks on wooden plate
  yogurt:      P(566564),   // berries on yogurt with granola
  eggs:        P(33653802), // fresh organic eggs in carton
  cheese:      P(9609835),  // paneer makhani in black ceramic bowl
  // Snacks & Drinks
  chips:       P(7033644),  // crispy salted chips inside open bag
  cola:        P(4710978),  // hand reaching for cola bottle
  snacks2:     P(7033643),  // tortilla chips macro shot in bag
  energydrink: P(3550044),  // energy drink can
  // Bakery & Biscuits
  biscuit:     P(890577),   // assorted cookies / biscuits on plate
  bread2:      P(1756061),  // sliced whole-wheat bread on white surface
  // Staples
  flour:       P(6294374),  // flour scattered on wooden table
  rice:        P(8923092),  // cooked white rice in bowl with herbs
  dal:         P(34940646), // vibrant orange lentils textured spread
  // Household
  soap:        P(4239034),  // cleaning product bottle with gloves
  detergent:   P(4154194),  // cosmetic / cleaning pump bottles
  // Personal Care
  soap2:       P(3944844),  // natural soap bar on wooden surface
  shampoo:     P(7440056),  // white shampoo bottle in haircare setting
  toothpaste:  P(3737586),  // toothpaste tube & toothbrush
  // Oils & Spices
  oil:         P(1474932),  // olive oil bottle on wooden surface
  spices2:     P(2802527),  // colorful assorted Indian spices
  // Hot Beverages
  coffee:      P(312418),   // coffee in white ceramic mug
  tea:         P(1638280),  // tea cup on wooden saucer
  // Sweet / Condiments
  honey:       P(33309),    // honey in glass jar golden
  chocolate:   P(918327),   // chocolate bar closeup
  noodles:     P(1279330),  // noodle bowl macro
  // Chicken & Meat / Eggs
  chicken2:    P(6107716),  // raw chicken breast with rosemary on marble
  eggs2:       P(4184073),  // brown eggs piled in white bowl
};

function foodImg(seed: string): string {
  return FOOD_IMAGES[seed] ?? `https://picsum.photos/seed/${seed}/300/300`;
}

// ── Discount profiles ─────────────────────────────────────────────────────
// [Blinkit, Zepto, BigBasket, Instamart, Flipkart, Amazon, JioMart, Myntra, Nykaa]
// 0 = not available on this platform for this category
const D = {
  produce:  [5, 6, 10, 4, 4, 8, 7, 0, 0],
  dairy:    [3, 5,  8, 4, 3, 7, 6, 0, 0],
  staples:  [5, 7, 12, 6, 5, 9, 8, 0, 0],
  oils:     [4, 6, 10, 5, 4, 8, 7, 0, 0],
  spices:   [4, 5,  9, 4, 4, 7, 6, 0, 0],
  bev:      [5, 7, 10, 5, 5, 9, 7, 0, 0],
  snacks:   [0, 0,  5, 0, 2, 5, 4, 0, 0],
  brkfst:   [4, 6, 10, 5, 5, 8, 7, 0, 0],
  noodles:  [2, 3,  6, 2, 3, 6, 5, 0, 0],
  pcare:    [5, 8, 15, 7, 8,12,10,10,18],
  house:    [6, 8, 12, 7, 7,10, 9, 0, 0],
} as const;

type DiscProfile = readonly [number,number,number,number,number,number,number,number,number];

/** Build price entries. A discount of 0 means not available on that platform. */
function pp(
  mrp: number,
  disc: DiscProfile,
): Array<{ id: string; price: number; mins: number; available: boolean }> {
  const r = (n: number) => Math.max(1, Math.round(n));
  const entries = [
    { id: "blinkit",   price: r(mrp * (1 - disc[0] / 100)), mins: 10,  available: disc[0] > 0 },
    { id: "zepto",     price: r(mrp * (1 - disc[1] / 100)), mins: 8,   available: disc[1] > 0 },
    { id: "bigbasket", price: r(mrp * (1 - disc[2] / 100)), mins: 30,  available: disc[2] > 0 },
    { id: "instamart", price: r(mrp * (1 - disc[3] / 100)), mins: 15,  available: disc[3] > 0 },
    { id: "flipkart",  price: r(mrp * (1 - disc[4] / 100)), mins: 10,  available: disc[4] > 0 },
    { id: "amazon",    price: r(mrp * (1 - disc[5] / 100)), mins: 120, available: disc[5] > 0 },
    { id: "jiomart",   price: r(mrp * (1 - disc[6] / 100)), mins: 30,  available: disc[6] > 0 },
    { id: "myntra",    price: r(mrp * (1 - disc[7] / 100)), mins: 30,  available: disc[7] > 0 },
    { id: "nykaa",     price: r(mrp * (1 - disc[8] / 100)), mins: 60,  available: disc[8] > 0 },
  ];
  // Return mrp as price when discount is 0 so PriceData still has a value, just unavailable
  return entries;
}

// ── Platforms ──────────────────────────────────────────────────────────────
export const MOCK_PLATFORMS: Platform[] = [
  {
    id: "blinkit",
    slug: "blinkit",
    name: "Blinkit",
    logo_url: "https://logo.clearbit.com/blinkit.com",
    color_hex: "#0C831F",
    avg_delivery_minutes: 10,
    min_order_amount: 0,
    delivery_fee: 25,
    free_delivery_threshold: 199,
    is_active: true,
  },
  {
    id: "zepto",
    slug: "zepto",
    name: "Zepto",
    logo_url: "https://logo.clearbit.com/zeptonow.com",
    color_hex: "#8025FB",
    avg_delivery_minutes: 8,
    min_order_amount: 0,
    delivery_fee: 20,
    free_delivery_threshold: 149,
    is_active: true,
  },
  {
    id: "instamart",
    slug: "instamart",
    name: "Swiggy Instamart",
    logo_url: "https://logo.clearbit.com/swiggy.com",
    color_hex: "#FC8019",
    avg_delivery_minutes: 15,
    min_order_amount: 0,
    delivery_fee: 25,
    free_delivery_threshold: 199,
    is_active: true,
  },
  {
    id: "bigbasket",
    slug: "bigbasket",
    name: "BigBasket",
    logo_url: "https://logo.clearbit.com/bigbasket.com",
    color_hex: "#84C225",
    avg_delivery_minutes: 30,
    min_order_amount: 200,
    delivery_fee: 30,
    free_delivery_threshold: 500,
    is_active: true,
  },
  {
    id: "flipkart",
    slug: "flipkart",
    name: "Flipkart Minutes",
    logo_url: "https://logo.clearbit.com/flipkart.com",
    color_hex: "#2874F0",
    avg_delivery_minutes: 10,
    min_order_amount: 0,
    delivery_fee: 20,
    free_delivery_threshold: 199,
    is_active: true,
  },
  {
    id: "amazon",
    slug: "amazon",
    name: "Amazon Now",
    logo_url: "https://logo.clearbit.com/amazon.com",
    color_hex: "#FF9900",
    avg_delivery_minutes: 120,
    min_order_amount: 0,
    delivery_fee: 40,
    free_delivery_threshold: 499,
    is_active: true,
  },
  {
    id: "jiomart",
    slug: "jiomart",
    name: "JioMart Express",
    logo_url: "https://logo.clearbit.com/jiomart.com",
    color_hex: "#0046D5",
    avg_delivery_minutes: 30,
    min_order_amount: 0,
    delivery_fee: 35,
    free_delivery_threshold: 399,
    is_active: true,
  },
  {
    id: "myntra",
    slug: "myntra",
    name: "Myntra M-Now",
    logo_url: "https://logo.clearbit.com/myntra.com",
    color_hex: "#FF3F6C",
    avg_delivery_minutes: 30,
    min_order_amount: 0,
    delivery_fee: 0,
    free_delivery_threshold: null,
    is_active: true,
  },
  {
    id: "nykaa",
    slug: "nykaa",
    name: "Nykaa Now",
    logo_url: "https://logo.clearbit.com/nykaa.com",
    color_hex: "#FC2779",
    avg_delivery_minutes: 60,
    min_order_amount: 500,
    delivery_fee: 50,
    free_delivery_threshold: 999,
    is_active: true,
  },
];

// ── Categories ─────────────────────────────────────────────────────────────
const C = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=160&h=160&fit=crop`;

export const MOCK_CATEGORIES: Category[] = [
  { id: "cat-1",  slug: "fruits-vegetables", name: "Fruits & Veggies",  icon: "🥦", image_url: C(4163411),  display_order: 1  },  // onions & fresh produce
  { id: "cat-2",  slug: "dairy-breakfast",   name: "Dairy & Breakfast", icon: "🥛", image_url: C(33653802), display_order: 2  },  // eggs in carton
  { id: "cat-3",  slug: "snacks-drinks",     name: "Snacks & Drinks",   icon: "🍿", image_url: C(7033644),  display_order: 3  },  // chips in bag
  { id: "cat-4",  slug: "bakery",            name: "Bakery & Biscuits", icon: "🍞", image_url: C(3851050),  display_order: 4  },  // sourdough loaf on board
  { id: "cat-5",  slug: "household",         name: "Household",         icon: "🧹", image_url: C(4239034),  display_order: 5  },  // cleaning product bottles
  { id: "cat-6",  slug: "personal-care",     name: "Personal Care",     icon: "🧴", image_url: C(7440056),  display_order: 6  },  // shampoo bottles
  { id: "cat-7",  slug: "chicken-meat",      name: "Chicken & Meat",    icon: "🍗", image_url: C(6107716),  display_order: 7  },  // raw chicken breast
  { id: "cat-8",  slug: "frozen-foods",      name: "Frozen Foods",      icon: "🧊", image_url: C(3869083),  display_order: 8  },  // frozen berries
  { id: "cat-9",  slug: "baby-care",         name: "Baby Care",         icon: "👶", image_url: C(5578497),  display_order: 9  },  // baby care products
  { id: "cat-10", slug: "pet-care",          name: "Pet Care",          icon: "🐾", image_url: C(1108099),  display_order: 10 },  // pet food bowl
  { id: "cat-11", slug: "staples",           name: "Atta, Rice & Dal",  icon: "🌾", image_url: C(31555432), display_order: 11 },  // uncooked rice in bowl
  { id: "cat-12", slug: "oils-spices",       name: "Oils & Spices",     icon: "🫙", image_url: C(2802527),  display_order: 12 },  // colorful spices
  { id: "cat-13", slug: "electronics",       name: "Electronics",       icon: "📱", image_url: C(1092644),  display_order: 13 },  // smartphone on desk
];

// ── Helper ─────────────────────────────────────────────────────────────────
function makePrices(
  base: number,
  mrp: number,
  platforms: Array<{ id: string; price: number; mins: number; available: boolean }>
): ProductWithPrices["platform_prices"] {
  return platforms
    .filter(({ available }) => available)
    .map(({ id, price, mins }) => {
      const pl = MOCK_PLATFORMS.find((p) => p.id === id)!;
      if (!pl) return null;
      return {
        platform: pl,
        price,
        original_price: mrp,
        discount_percent: Math.round(((mrp - price) / mrp) * 100),
        discount_label: null,
        is_available: true as const,
        delivery_time_minutes: mins,
        platform_product_url: null,
        buy_url: null,
        last_updated: new Date().toISOString(),
      };
    })
    .filter(Boolean) as ProductWithPrices["platform_prices"];
}

function makeProduct(
  id: string,
  name: string,
  brand: string,
  unit: string,
  categorySlug: string,
  imageSeed: string,
  prices: Array<{ id: string; price: number; mins: number; available: boolean }>,
  mrp: number
): ProductWithPrices {
  const cat = MOCK_CATEGORIES.find((c) => c.slug === categorySlug)!;
  const platformPrices = makePrices(Math.min(...prices.map((p) => p.price)), mrp, prices);
  const cheapest = platformPrices.reduce((a, b) => (a.price < b.price ? a : b));
  const fastest  = platformPrices.reduce((a, b) =>
    (a.delivery_time_minutes ?? 999) < (b.delivery_time_minutes ?? 999) ? a : b
  );

  const bestPrice    = Math.min(...platformPrices.map((p) => p.price));
  const highestPrice = Math.max(...platformPrices.map((p) => p.price));
  const availableEtas = platformPrices
    .map((p) => p.delivery_time_minutes)
    .filter((m): m is number => m !== null);

  return {
    id,
    slug: id,
    name,
    brand,
    description: null,
    image_url: foodImg(imageSeed),
    thumbnail_url: foodImg(imageSeed),
    unit,
    category: cat,
    tags: null,
    is_featured: true,
    platform_prices: platformPrices,
    cheapest_platform: cheapest.platform,
    fastest_platform: fastest.platform,
    best_value_platform: cheapest.platform,
    intelligence: {
      normalized_name: name.toLowerCase(),
      normalized_brand: brand ? brand.toLowerCase() : null,
      quantity_value: null,
      quantity_unit: null,
      variant_signature: `${name}-${unit}`,
      available_platform_count: platformPrices.length,
      total_platform_count: platformPrices.length,
      best_price: bestPrice,
      highest_price: highestPrice,
      savings_amount: highestPrice - bestPrice,
      price_spread_percent:
        highestPrice > 0
          ? Math.round(((highestPrice - bestPrice) / highestPrice) * 100)
          : 0,
      recommendation_reason: "Lowest price",
    },
    coverage_summary: {
      available_platform_count: platformPrices.length,
      total_platform_count: platformPrices.length,
      best_eta_minutes: availableEtas.length ? Math.min(...availableEtas) : null,
      average_eta_minutes:
        availableEtas.length
          ? Math.round(availableEtas.reduce((a, b) => a + b, 0) / availableEtas.length)
          : null,
      live_offer_count: platformPrices.filter((p) => p.discount_percent > 0).length,
    },
    affiliate_enabled: false,
  };
}

// ── Products ── 62 real Indian FMCG products ──────────────────────────────
export const MOCK_PRODUCTS: ProductWithPrices[] = [

  // ── Fruits & Vegetables ─────────────────────────────────────────────────
  makeProduct("fresh-onion",       "Fresh Onion",             "Farm Fresh",       "1 kg",           "fruits-vegetables", "onion",    pp(45,  D.produce), 45),
  makeProduct("red-tomato",        "Red Tomato",              "Fresho",           "500 g",          "fruits-vegetables", "tomato",   pp(40,  D.produce), 40),
  makeProduct("banana-robusta",    "Banana (Robusta)",        "Fresho",           "6 pcs (~500 g)", "fruits-vegetables", "banana",   pp(55,  D.produce), 55),
  makeProduct("baby-spinach",      "Baby Spinach (Palak)",    "Farm Fresh",       "250 g",          "fruits-vegetables", "spinach",  pp(25,  D.produce), 25),
  makeProduct("shimla-apple",      "Shimla Apple",            "Fresho",           "4 pcs (~700 g)", "fruits-vegetables", "apple",    pp(120, D.produce), 120),
  makeProduct("fresh-potato",      "Fresh Potato",            "Farm Fresh",       "1 kg",           "fruits-vegetables", "potato",   pp(40,  D.produce), 40),
  makeProduct("fresh-lemon",       "Fresh Lemon",             "Fresho",           "6 pcs",          "fruits-vegetables", "lemon",    pp(60,  D.produce), 60),

  // ── Dairy & Breakfast ───────────────────────────────────────────────────
  makeProduct("amul-milk-500ml",          "Amul Taaza Toned Milk",               "Amul",            "500 ml",     "dairy-breakfast", "milk",    pp(32,  D.dairy),  32),
  makeProduct("amul-milk-1l",             "Amul Taaza Toned Milk",               "Amul",            "1 L",        "dairy-breakfast", "milk",    pp(62,  D.dairy),  62),
  makeProduct("amul-gold-milk-1l",        "Amul Gold Full Cream Milk",           "Amul",            "1 L",        "dairy-breakfast", "milk",    pp(70,  D.dairy),  70),
  makeProduct("amul-butter-500g",         "Amul Pasteurised Butter",             "Amul",            "500 g",      "dairy-breakfast", "butter",  pp(270, D.dairy),  270),
  makeProduct("amul-paneer-200g",         "Amul Fresh Paneer",                   "Amul",            "200 g",      "dairy-breakfast", "cheese",  pp(95,  D.dairy),  95),
  makeProduct("nestle-curd-400g",         "Nestle a+ Curd",                      "Nestle",          "400 g",      "dairy-breakfast", "yogurt",  pp(55,  D.dairy),  55),
  makeProduct("eggs-12-pack",             "Fresh White Eggs",                    "Country Delight", "12 pcs",     "dairy-breakfast", "eggs",    pp(96,  D.dairy),  96),
  makeProduct("kelloggs-cornflakes-500g", "Kellogg's Corn Flakes Original",      "Kellogg's",       "500 g",      "dairy-breakfast", "flour",   pp(210, D.brkfst), 210),
  makeProduct("quaker-oats-500g",         "Quaker Oats",                         "Quaker",          "500 g",      "dairy-breakfast", "flour",   pp(145, D.brkfst), 145),
  makeProduct("horlicks-500g",            "Horlicks Classic Malt",               "Horlicks",        "500 g",      "dairy-breakfast", "milk",    pp(290, D.brkfst), 290),
  makeProduct("boost-500g",               "Boost Chocolate Energy Drink",        "Boost",           "500 g",      "dairy-breakfast", "milk",    pp(270, D.brkfst), 270),
  makeProduct("nescafe-classic-50g",      "Nescafe Classic Instant Coffee",      "Nescafe",         "50 g",       "dairy-breakfast", "coffee",  pp(185, D.brkfst), 185),
  makeProduct("tata-tea-gold-500g",       "Tata Tea Gold Blend",                 "Tata Tea",        "500 g",      "dairy-breakfast", "tea",     pp(295, D.brkfst), 295),
  makeProduct("lipton-green-tea-25pk",    "Lipton Honey Lemon Green Tea Bags",   "Lipton",          "25 bags",    "dairy-breakfast", "tea",     pp(175, D.brkfst), 175),
  makeProduct("dabur-honey-500g",         "Dabur 100% Pure Honey",               "Dabur",           "500 g",      "dairy-breakfast", "honey",   pp(255, D.brkfst), 255),
  makeProduct("kissan-jam-200g",          "Kissan Mixed Fruit Jam",              "Kissan",          "200 g",      "dairy-breakfast", "honey",   pp(75,  D.brkfst), 75),
  makeProduct("mtr-poha-500g",            "MTR Ready to Cook Poha",              "MTR",             "500 g",      "dairy-breakfast", "spices2", pp(85,  D.brkfst), 85),

  // ── Snacks & Drinks ─────────────────────────────────────────────────────
  makeProduct("lays-classic-52g",        "Lay's American Style Cream & Onion",  "Lay's",      "52 g",       "snacks-drinks", "chips",       pp(20,  D.snacks),  20),
  makeProduct("kurkure-masala-90g",      "Kurkure Masala Munch",                "Kurkure",    "90 g",       "snacks-drinks", "snacks2",     pp(35,  D.snacks),  35),
  makeProduct("haldirams-namkeen-200g",  "Haldiram's Aloo Bhujia",              "Haldiram's", "200 g",      "snacks-drinks", "snacks2",     pp(70,  D.snacks),  70),
  makeProduct("cadbury-dairy-milk-40g",  "Cadbury Dairy Milk Chocolate Bar",    "Cadbury",    "40 g",       "snacks-drinks", "chocolate",   pp(50,  D.snacks),  50),
  makeProduct("5star-chocolate-40g",     "Cadbury 5 Star Chocolate Bar",        "Cadbury",    "40 g",       "snacks-drinks", "chocolate",   pp(20,  D.snacks),  20),
  makeProduct("maggi-noodles-4pk",       "Maggi 2-Minute Noodles Masala",       "Maggi",      "4 × 70 g",   "snacks-drinks", "noodles",     pp(76,  D.noodles), 76),
  makeProduct("yippee-noodles-4pk",      "Sunfeast YiPPee Magic Masala",        "Sunfeast",   "4 × 70 g",   "snacks-drinks", "noodles",     pp(72,  D.noodles), 72),
  makeProduct("coca-cola-750ml",         "Coca-Cola Original",                  "Coca-Cola",  "750 ml",     "snacks-drinks", "cola",        pp(45,  D.bev),     45),
  makeProduct("sprite-750ml",            "Sprite Lemon Lime Soft Drink",        "Sprite",     "750 ml",     "snacks-drinks", "cola",        pp(40,  D.bev),     40),
  makeProduct("real-juice-orange-1l",    "Real Activ Orange Juice",             "Real",       "1 L",        "snacks-drinks", "energydrink", pp(130, D.bev),     130),
  makeProduct("tropicana-orange-1l",     "Tropicana 100% Orange Juice",         "Tropicana",  "1 L",        "snacks-drinks", "energydrink", pp(140, D.bev),     140),
  makeProduct("paperboat-aamras-200ml",  "Paper Boat Aamras Mango Drink",       "Paper Boat", "200 ml",     "snacks-drinks", "energydrink", pp(30,  D.bev),     30),

  // ── Bakery & Biscuits ────────────────────────────────────────────────────
  makeProduct("britannia-bread-400g",    "Britannia 100% Whole Wheat Bread",    "Britannia",    "400 g", "bakery", "bread2",  pp(48, D.snacks), 48),
  makeProduct("harvest-gold-bread-400g", "Harvest Gold Premium White Bread",    "Harvest Gold", "400 g", "bakery", "bread2",  pp(42, D.snacks), 42),
  makeProduct("parle-g-800g",            "Parle-G Original Glucose Biscuits",   "Parle",        "800 g", "bakery", "biscuit", pp(50, D.snacks), 50),
  makeProduct("britannia-good-day-200g", "Britannia Good Day Butter Cookies",   "Britannia",    "200 g", "bakery", "biscuit", pp(40, D.snacks), 40),

  // ── Atta, Rice & Dal ────────────────────────────────────────────────────
  makeProduct("aashirvaad-atta-5kg",     "Aashirvaad Whole Wheat Atta",         "Aashirvaad",   "5 kg",  "staples", "flour", pp(310, D.staples), 310),
  makeProduct("pillsbury-atta-5kg",      "Pillsbury Chakki Fresh Atta",         "Pillsbury",    "5 kg",  "staples", "flour", pp(295, D.staples), 295),
  makeProduct("nature-fresh-maida-1kg",  "Nature Fresh Refined Flour Maida",    "Nature Fresh", "1 kg",  "staples", "flour", pp(55,  D.staples), 55),
  makeProduct("india-gate-basmati-1kg",  "India Gate Classic Basmati Rice",     "India Gate",   "1 kg",  "staples", "rice",  pp(145, D.staples), 145),
  makeProduct("daawat-basmati-5kg",      "Daawat Super Basmati Rice",           "Daawat",       "5 kg",  "staples", "rice",  pp(680, D.staples), 680),
  makeProduct("tata-toor-dal-1kg",       "Tata Sampann Toor Dal",               "Tata Sampann", "1 kg",  "staples", "dal",   pp(160, D.staples), 160),
  makeProduct("tata-chana-dal-1kg",      "Tata Sampann Chana Dal",              "Tata Sampann", "1 kg",  "staples", "dal",   pp(130, D.staples), 130),
  makeProduct("tata-salt-1kg",           "Tata Salt Lite Low Sodium Salt",      "Tata Salt",    "1 kg",  "staples", "flour", pp(28,  D.staples), 28),
  makeProduct("sugar-1kg",               "Refined Sugar",                       "Uttam Sugar",  "1 kg",  "staples", "flour", pp(52,  D.staples), 52),
  makeProduct("maggi-ketchup-900g",      "Maggi Tomato Ketchup",                "Maggi",        "900 g", "staples", "spices2", pp(175, D.snacks), 175),
  makeProduct("kissan-ketchup-500g",     "Kissan Fresh Tomato Ketchup",         "Kissan",       "500 g", "staples", "spices2", pp(110, D.snacks), 110),

  // ── Oils & Spices ────────────────────────────────────────────────────────
  makeProduct("fortune-sunflower-oil-1l", "Fortune Sunflower Oil",              "Fortune",  "1 L",   "oils-spices", "oil",    pp(145, D.oils),   145),
  makeProduct("saffola-gold-1l",          "Saffola Gold Blended Edible Oil",    "Saffola",  "1 L",   "oils-spices", "oil",    pp(175, D.oils),   175),
  makeProduct("amul-ghee-500ml",          "Amul Pure Ghee",                     "Amul",     "500 ml","oils-spices", "oil",    pp(310, D.oils),   310),
  makeProduct("mtr-haldi-100g",           "MTR Turmeric Powder",                "MTR",      "100 g", "oils-spices", "spices2",pp(55,  D.spices), 55),
  makeProduct("mtr-chilli-100g",          "MTR Red Chilli Powder",              "MTR",      "100 g", "oils-spices", "spices2",pp(60,  D.spices), 60),

  // ── Household ────────────────────────────────────────────────────────────
  makeProduct("surf-excel-1kg",     "Surf Excel Easy Wash Detergent",          "Surf Excel", "1 kg",   "household", "detergent", pp(120, D.house), 120),
  makeProduct("ariel-matic-1kg",    "Ariel Matic Front Load Detergent",        "Ariel",      "1 kg",   "household", "detergent", pp(200, D.house), 200),
  makeProduct("vim-dishwash-750ml", "Vim Dishwash Liquid Gel",                 "Vim",        "750 ml", "household", "soap",      pp(95,  D.house), 95),
  makeProduct("harpic-power-500ml", "Harpic Power Plus Toilet Cleaner",        "Harpic",     "500 ml", "household", "soap",      pp(75,  D.house), 75),
  makeProduct("lizol-surface-500ml","Lizol Surface Cleaner Citrus",            "Lizol",      "500 ml", "household", "soap",      pp(110, D.house), 110),

  // ── Personal Care ────────────────────────────────────────────────────────
  makeProduct("colgate-max-fresh-200g",    "Colgate MaxFresh Toothpaste",           "Colgate",          "200 g",  "personal-care", "toothpaste", pp(120, D.pcare), 120),
  makeProduct("dove-soap-75g",             "Dove Beauty Bathing Bar",               "Dove",             "75 g",   "personal-care", "soap2",      pp(50,  D.pcare), 50),
  makeProduct("head-shoulders-340ml",      "Head & Shoulders Anti-Dandruff Shampoo","Head & Shoulders", "340 ml", "personal-care", "shampoo",    pp(290, D.pcare), 290),
];

// ── Grouped by category ────────────────────────────────────────────────────
export const CATEGORY_SECTIONS = [
  { slug: "fruits-vegetables", label: "🥦 Fruits & Vegetables" },
  { slug: "dairy-breakfast",   label: "🥛 Dairy & Breakfast" },
  { slug: "snacks-drinks",     label: "🍿 Snacks & Drinks" },
  { slug: "bakery",            label: "🍞 Bakery & Biscuits" },
  { slug: "staples",           label: "🌾 Atta, Rice & Dal" },
  { slug: "oils-spices",       label: "🫙 Oils & Spices" },
  { slug: "household",         label: "🧹 Household" },
  { slug: "personal-care",     label: "🧴 Personal Care" },
  { slug: "electronics",       label: "📱 Electronics" },
];

export function getProductsByCategory(slug: string): ProductWithPrices[] {
  return MOCK_PRODUCTS.filter((p) => p.category?.slug === slug);
}
