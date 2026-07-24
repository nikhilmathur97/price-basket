import type { Category, Platform } from "@/types";

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
  { id: "cat-10", slug: "staples",           name: "Atta, Rice & Dal",  icon: "🌾", image_url: C(31555432), display_order: 7  },  // uncooked rice in bowl
  { id: "cat-11", slug: "oils-spices",       name: "Oils & Spices",     icon: "🫙", image_url: C(2802527),  display_order: 8  },  // colorful spices
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
