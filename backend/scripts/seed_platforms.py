"""
Seed script: upsert all 10 quick-commerce platforms + sample products + categories.
Run from the backend directory:
    python -m scripts.seed_platforms
"""
import asyncio
import sys
import os

# Allow running from backend/ root
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.models.platform import Platform
from app.models.product import Category, Product

# ---------------------------------------------------------------------------
# Platform seed data
# ---------------------------------------------------------------------------
PLATFORMS = [
    {
        "slug": "blinkit",
        "name": "Blinkit",
        "logo_url": "https://blinkit.com/images/favicons/apple-touch-icon.png",
        "base_url": "https://blinkit.com",
        "color_hex": "#0C831F",
        "avg_delivery_minutes": 10,
        "min_order_amount": 0,
        "delivery_fee": 25,
        "free_delivery_threshold": 199,
        "is_active": True,
        "scraping_enabled": True,
    },
    {
        "slug": "zepto",
        "name": "Zepto",
        "logo_url": "https://cdn.zeptonow.com/production/assets/images/pdp/zepto-logo.svg",
        "base_url": "https://www.zeptonow.com",
        "color_hex": "#8025FB",
        "avg_delivery_minutes": 8,
        "min_order_amount": 0,
        "delivery_fee": 20,
        "free_delivery_threshold": 149,
        "is_active": True,
        "scraping_enabled": True,
    },
    {
        "slug": "instamart",
        "name": "Swiggy Instamart",
        "logo_url": "https://res.cloudinary.com/swiggy/image/upload/fl_lossy,f_auto,q_auto/portal/m/instamart/Instamart_2021.png",
        "base_url": "https://www.swiggy.com/instamart",
        "color_hex": "#FC8019",
        "avg_delivery_minutes": 15,
        "min_order_amount": 0,
        "delivery_fee": 25,
        "free_delivery_threshold": 199,
        "is_active": True,
        "scraping_enabled": True,
    },
    {
        "slug": "bigbasket",
        "name": "BigBasket BB Now",
        "logo_url": "https://www.bigbasket.com/media/uploads/banner_images/bb-logo.png",
        "base_url": "https://www.bigbasket.com",
        "color_hex": "#84C225",
        "avg_delivery_minutes": 30,
        "min_order_amount": 200,
        "delivery_fee": 30,
        "free_delivery_threshold": 500,
        "is_active": True,
        "scraping_enabled": True,
    },
    {
        "slug": "flipkart",
        "name": "Flipkart Minutes",
        "logo_url": "https://static-assets-web.flixcart.com/batman-returns/batman-returns/p/images/fk_logo.png",
        "base_url": "https://www.flipkart.com",
        "color_hex": "#2874F0",
        "avg_delivery_minutes": 10,
        "min_order_amount": 0,
        "delivery_fee": 20,
        "free_delivery_threshold": 199,
        "is_active": True,
        "scraping_enabled": True,
    },
    {
        "slug": "amazon",
        "name": "Amazon Now",
        "logo_url": "https://www.amazon.in/favicon.ico",
        "base_url": "https://www.amazon.in",
        "color_hex": "#FF9900",
        "avg_delivery_minutes": 120,
        "min_order_amount": 0,
        "delivery_fee": 40,
        "free_delivery_threshold": 499,
        "is_active": True,
        "scraping_enabled": True,
    },
    {
        "slug": "jiomart",
        "name": "JioMart Express",
        "logo_url": "https://www.jiomart.com/images/cms/aw_rbslider/slides/1622619800_jm_logo.png",
        "base_url": "https://www.jiomart.com",
        "color_hex": "#0046D5",
        "avg_delivery_minutes": 30,
        "min_order_amount": 0,
        "delivery_fee": 35,
        "free_delivery_threshold": 399,
        "is_active": True,
        "scraping_enabled": True,
    },
    {
        "slug": "dunzo",
        "name": "Dunzo Daily",
        "logo_url": "https://www.dunzo.com/favicon.ico",
        "base_url": "https://www.dunzo.com",
        "color_hex": "#00D290",
        "avg_delivery_minutes": 15,
        "min_order_amount": 0,
        "delivery_fee": 19,
        "free_delivery_threshold": 249,
        # Dunzo is shut down — mark inactive so it's skipped during scraping
        "is_active": False,
        "scraping_enabled": False,
    },
    {
        "slug": "myntra",
        "name": "Myntra M-Now",
        "logo_url": "https://assets.myntassets.com/assets/images/2022/9/8/88d0e99d-9b73-4e0a-97e7-7e36db990c991662616849539-myntra-logo.png",
        "base_url": "https://www.myntra.com",
        "color_hex": "#FF3F6C",
        "avg_delivery_minutes": 30,
        "min_order_amount": 0,
        "delivery_fee": 0,
        "free_delivery_threshold": None,
        "is_active": True,
        "scraping_enabled": True,
    },
    {
        "slug": "nykaa",
        "name": "Nykaa Now",
        "logo_url": "https://adn-static1.nykaa.com/nykdesignstudio-files/pub/media/wysiwyg/brand/nykaa-logo.png",
        "base_url": "https://www.nykaa.com",
        "color_hex": "#FC2779",
        "avg_delivery_minutes": 60,
        "min_order_amount": 500,
        "delivery_fee": 50,
        "free_delivery_threshold": 999,
        "is_active": True,
        "scraping_enabled": True,
    },
]

# ---------------------------------------------------------------------------
# Category seed data
# ---------------------------------------------------------------------------
CATEGORIES = [
    {"slug": "fruits-vegetables", "name": "Fruits & Vegetables", "icon": "🥦", "display_order": 1},
    {"slug": "dairy-eggs", "name": "Dairy, Bread & Eggs", "icon": "🥛", "display_order": 2},
    {"slug": "snacks-branded-foods", "name": "Snacks & Branded Foods", "icon": "🍿", "display_order": 3},
    {"slug": "beverages", "name": "Beverages", "icon": "☕", "display_order": 4},
    {"slug": "personal-care", "name": "Personal Care", "icon": "🧴", "display_order": 5},
    {"slug": "household", "name": "Household Essentials", "icon": "🧹", "display_order": 6},
    {"slug": "baby-care", "name": "Baby Care", "icon": "👶", "display_order": 7},
    {"slug": "beauty-cosmetics", "name": "Beauty & Cosmetics", "icon": "💄", "display_order": 8},
]

# ---------------------------------------------------------------------------
# Sample product seed data (covers all categories)
# ---------------------------------------------------------------------------
PRODUCTS = [
    # Fruits & Vegetables
    {"slug": "amul-gold-milk-1l", "name": "Amul Gold Full Cream Fresh Milk", "brand": "Amul", "unit": "1 L", "category_slug": "dairy-eggs", "tags": ["milk", "dairy", "amul"], "is_featured": True},
    {"slug": "amul-butter-500g", "name": "Amul Butter", "brand": "Amul", "unit": "500 g", "category_slug": "dairy-eggs", "tags": ["butter", "dairy", "amul"], "is_featured": True},
    {"slug": "britannia-bread-400g", "name": "Britannia Whole Wheat Bread", "brand": "Britannia", "unit": "400 g", "category_slug": "dairy-eggs", "tags": ["bread", "britannia"], "is_featured": False},
    # Snacks
    {"slug": "lays-classic-26g", "name": "Lay's Classic Salted Chips", "brand": "Lay's", "unit": "26 g", "category_slug": "snacks-branded-foods", "tags": ["chips", "lays", "snacks"], "is_featured": True},
    {"slug": "haldirams-aloo-bhujia-200g", "name": "Haldiram's Aloo Bhujia", "brand": "Haldiram's", "unit": "200 g", "category_slug": "snacks-branded-foods", "tags": ["bhujia", "haldirams", "snacks"], "is_featured": True},
    {"slug": "maggi-noodles-70g", "name": "Maggi 2-Minute Noodles Masala", "brand": "Maggi", "unit": "70 g", "category_slug": "snacks-branded-foods", "tags": ["noodles", "maggi", "instant"], "is_featured": True},
    # Beverages
    {"slug": "coca-cola-750ml", "name": "Coca-Cola Soft Drink", "brand": "Coca-Cola", "unit": "750 ml", "category_slug": "beverages", "tags": ["cola", "beverage", "soft-drink"], "is_featured": False},
    {"slug": "tropicana-orange-1l", "name": "Tropicana 100% Orange Juice", "brand": "Tropicana", "unit": "1 L", "category_slug": "beverages", "tags": ["juice", "tropicana", "orange"], "is_featured": True},
    # Personal Care
    {"slug": "dove-soap-100g", "name": "Dove Cream Beauty Bathing Bar", "brand": "Dove", "unit": "100 g", "category_slug": "personal-care", "tags": ["soap", "dove", "bath"], "is_featured": False},
    {"slug": "head-shoulders-shampoo-180ml", "name": "Head & Shoulders Anti-Dandruff Shampoo", "brand": "Head & Shoulders", "unit": "180 ml", "category_slug": "personal-care", "tags": ["shampoo", "anti-dandruff"], "is_featured": False},
    # Household
    {"slug": "vim-dish-wash-bar-200g", "name": "Vim Dishwash Bar", "brand": "Vim", "unit": "200 g", "category_slug": "household", "tags": ["dishwash", "vim", "cleaning"], "is_featured": False},
    {"slug": "harpic-toilet-cleaner-500ml", "name": "Harpic Power Plus Toilet Cleaner", "brand": "Harpic", "unit": "500 ml", "category_slug": "household", "tags": ["toilet-cleaner", "harpic"], "is_featured": False},
    # Beauty
    {"slug": "lakme-foundation-30ml", "name": "Lakme 9 to 5 Primer + Matte Foundation", "brand": "Lakme", "unit": "30 ml", "category_slug": "beauty-cosmetics", "tags": ["foundation", "lakme", "makeup"], "is_featured": True},
    {"slug": "maybelline-mascara-9ml", "name": "Maybelline Lash Sensational Mascara", "brand": "Maybelline", "unit": "9.5 ml", "category_slug": "beauty-cosmetics", "tags": ["mascara", "maybelline", "eye"], "is_featured": True},
]


async def seed():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # ── Platforms ──────────────────────────────────────────────────────
        print("Seeding platforms...")
        for p in PLATFORMS:
            result = await session.execute(select(Platform).where(Platform.slug == p["slug"]))
            existing = result.scalar_one_or_none()
            if existing:
                for k, v in p.items():
                    setattr(existing, k, v)
                print(f"  updated: {p['slug']}")
            else:
                session.add(Platform(**p))
                print(f"  created: {p['slug']}")
        await session.commit()

        # ── Categories ─────────────────────────────────────────────────────
        print("Seeding categories...")
        cat_map: dict[str, Category] = {}
        for c in CATEGORIES:
            result = await session.execute(select(Category).where(Category.slug == c["slug"]))
            existing = result.scalar_one_or_none()
            if existing:
                cat_map[c["slug"]] = existing
                print(f"  exists: {c['slug']}")
            else:
                cat = Category(**c)
                session.add(cat)
                await session.flush()
                cat_map[c["slug"]] = cat
                print(f"  created: {c['slug']}")
        await session.commit()

        # ── Products ───────────────────────────────────────────────────────
        print("Seeding products...")
        for p in PRODUCTS:
            cat_slug = p.pop("category_slug", None)
            cat = cat_map.get(cat_slug) if cat_slug else None
            p["category_id"] = cat.id if cat else None

            result = await session.execute(select(Product).where(Product.slug == p["slug"]))
            existing = result.scalar_one_or_none()
            if existing:
                for k, v in p.items():
                    setattr(existing, k, v)
                print(f"  updated product: {p['slug']}")
            else:
                session.add(Product(**p))
                print(f"  created product: {p['slug']}")
        await session.commit()

    await engine.dispose()
    print("\nSeed complete.")


if __name__ == "__main__":
    asyncio.run(seed())
