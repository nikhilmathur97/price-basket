"""
scripts/seed_data.py
====================
Populates the database with realistic demo data:
  - 4 Platforms  (Blinkit, Zepto, BigBasket, Instamart)
  - 12 Categories
  - 35 Products  (with real-looking Picsum images)
  - Platform prices for every product × every platform
    - 1 admin user (from env: SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD)

Run: bash scripts/run_seed.sh
"""
import asyncio
import os
import sys
import random
import uuid
from datetime import datetime, UTC

# ── Path setup ─────────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.models.product import Category, Product
from app.models.platform import Platform
from app.models.price import PlatformPrice
from app.models.user import User
from app.models.cart import Cart, CartItem, Wishlist, WishlistItem, RefreshToken
from app.models.price import PriceHistory, PriceAlert
from app.database import Base
from app.services.auth_service import hash_password
from app.config import settings

# ── Seeded admin (env-driven; no hardcoded credentials) ──────────────────────
SEED_ADMIN_EMAIL = os.getenv("SEED_ADMIN_EMAIL", "admin@pricebasket.in")
SEED_ADMIN_PASSWORD = os.getenv("SEED_ADMIN_PASSWORD", "Nikhil@321")
SEED_ADMIN_NAME = os.getenv("SEED_ADMIN_NAME", "Nikhil Admin")
SEED_ADMIN_CITY = os.getenv("SEED_ADMIN_CITY", "Delhi")
SEED_ADMIN_PINCODE = os.getenv("SEED_ADMIN_PINCODE", "110001")

# ── Engine ─────────────────────────────────────────────────────────────────────
engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# ── Image helper ───────────────────────────────────────────────────────────────
FOOD_IMAGES = {
    "onion":       "https://images.unsplash.com/photo-1508747703725-719777637510?w=400&h=400&fit=crop&q=80",
    "tomato":      "https://images.unsplash.com/photo-1546470427-e26264be0b0d?w=400&h=400&fit=crop&q=80",
    "banana":      "https://images.unsplash.com/photo-1603833665858-e61d17a86224?w=400&h=400&fit=crop&q=80",
    "spinach":     "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&h=400&fit=crop&q=80",
    "apple":       "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400&h=400&fit=crop&q=80",
    "potato":      "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&h=400&fit=crop&q=80",
    "lemon":       "https://images.unsplash.com/photo-1582087289896-6e73b91f7b44?w=400&h=400&fit=crop&q=80",
    "milk":        "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=400&fit=crop&q=80",
    "butter":      "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400&h=400&fit=crop&q=80",
    "yogurt":      "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=400&fit=crop&q=80",
    "yogurt2":     "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=400&fit=crop&q=80",
    "eggs":        "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&h=400&fit=crop&q=80",
    "eggs2":       "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&h=400&fit=crop&q=80",
    "cheese":      "https://images.unsplash.com/photo-1618164436241-4473940d1f5c?w=400&h=400&fit=crop&q=80",
    "chips":       "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&h=400&fit=crop&q=80",
    "cola":        "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&h=400&fit=crop&q=80",
    "snacks2":     "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=400&h=400&fit=crop&q=80",
    "energydrink": "https://images.unsplash.com/photo-1620985992916-cd8f3fbabd6e?w=400&h=400&fit=crop&q=80",
    "bhujia":      "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=400&h=400&fit=crop&q=80",
    "juice":       "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400&h=400&fit=crop&q=80",
    "biscuit":     "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&h=400&fit=crop&q=80",
    "bread2":      "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop&q=80",
    "oreo":        "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&h=400&fit=crop&q=80",
    "flour":       "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=400&fit=crop&q=80",
    "rice":        "https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=400&h=400&fit=crop&q=80",
    "dal":         "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=400&fit=crop&q=80",
    "soap":        "https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=400&h=400&fit=crop&q=80",
    "detergent":   "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400&h=400&fit=crop&q=80",
    "cleaner":     "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400&h=400&fit=crop&q=80",
    "soap2":       "https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=400&h=400&fit=crop&q=80",
    "shampoo":     "https://images.unsplash.com/photo-1526045612212-70caf35c14df?w=400&h=400&fit=crop&q=80",
    "toothpaste":  "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=400&h=400&fit=crop&q=80",
    "oil":         "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&h=400&fit=crop&q=80",
    "spices2":     "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=400&h=400&fit=crop&q=80",
    "chicken2":    "https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=400&h=400&fit=crop&q=80",
}

def food_img(seed: str) -> str:
    return FOOD_IMAGES.get(seed, f"https://picsum.photos/seed/{seed}/400/400")

# ── Data definitions ───────────────────────────────────────────────────────────

PLATFORMS = [
    dict(slug="blinkit",   name="Blinkit",          color_hex="#F8C920",
         logo_url="https://upload.wikimedia.org/wikipedia/commons/2/2f/Blinkit-yellow-app-icon.svg",
         avg_delivery_minutes=10,  min_order_amount=0,   delivery_fee=25,  free_delivery_threshold=199),
    dict(slug="zepto",     name="Zepto",             color_hex="#8B5CF6",
         logo_url="https://play-lh.googleusercontent.com/WGRtFg-eaXkSFlHmHiGXP95X4Ixq2_n5OkLFTjBmXvjU2tP7KnMAtE1oeP7tB9c-Xg=w240-h480",
         avg_delivery_minutes=10,  min_order_amount=0,   delivery_fee=20,  free_delivery_threshold=149),
    dict(slug="bigbasket", name="BB Now",            color_hex="#84CC16",
         logo_url="https://play-lh.googleusercontent.com/fPaJ7nEVE0jHMG0qdibOt32RBf51dC5-W6sAj4slVxUqCPAiuC7IhH4yPc5W0Bm0XA=w240-h480",
         avg_delivery_minutes=30,  min_order_amount=200, delivery_fee=40,  free_delivery_threshold=500),
    dict(slug="instamart", name="Swiggy Instamart",  color_hex="#FF6600",
         logo_url="https://play-lh.googleusercontent.com/n0PBTbEAp4FoLnVJzJnlVAL0U1O3R5N4R7IrjTnZIwikGjqX8VzKrDv7cExhSJtd5Q=w240-h480",
         avg_delivery_minutes=15,  min_order_amount=0,   delivery_fee=30,  free_delivery_threshold=299),
]

CATEGORIES = [
    dict(slug="fruits-vegetables", name="Fruits & Vegetables", icon="🥦",  display_order=1,
         image_url=food_img("spinach")),
    dict(slug="dairy-breakfast",   name="Dairy & Breakfast",   icon="🥛",  display_order=2,
         image_url=food_img("milk")),
    dict(slug="snacks-drinks",     name="Snacks & Drinks",     icon="🍿",  display_order=3,
         image_url=food_img("chips")),
    dict(slug="bakery",            name="Bakery & Biscuits",   icon="🍞",  display_order=4,
         image_url=food_img("bread2")),
    dict(slug="household",         name="Household",           icon="🧹",  display_order=5,
         image_url=food_img("detergent")),
    dict(slug="personal-care",     name="Personal Care",       icon="🧴",  display_order=6,
         image_url=food_img("shampoo")),
    dict(slug="chicken-meat",      name="Chicken & Meat",      icon="🍗",  display_order=7,
         image_url=food_img("chicken2")),
    dict(slug="frozen-foods",      name="Frozen Foods",        icon="🧊",  display_order=8,
         image_url=food_img("chips")),
    dict(slug="baby-care",         name="Baby Care",           icon="👶",  display_order=9,
         image_url=food_img("yogurt")),
    dict(slug="pet-care",          name="Pet Care",            icon="🐾",  display_order=10,
         image_url=food_img("chips")),
    dict(slug="staples",           name="Atta, Rice & Dal",    icon="🌾",  display_order=11,
         image_url=food_img("flour")),
    dict(slug="oils-spices",       name="Oils & Spices",       icon="🫙",  display_order=12,
         image_url=food_img("oil")),
]

# product: (slug, name, brand, unit, category_slug, image_seed, featured, tags)
PRODUCTS = [
    # Fruits & Vegetables
    ("onion-1kg",       "Fresh Onion",                "Farm Fresh",        "1 kg",            "fruits-vegetables", "onion",       True,  ["onion","vegetables"]),
    ("tomato-500g",     "Red Tomato",                  "Fresho",            "500 g",           "fruits-vegetables", "tomato",      True,  ["tomato","vegetables"]),
    ("banana-6pcs",     "Banana (Robusta)",             "Fresho",            "6 pcs (~500 g)",  "fruits-vegetables", "banana",      True,  ["banana","fruit"]),
    ("spinach-250g",    "Baby Spinach (Palak)",         "Farm Fresh",        "250 g",           "fruits-vegetables", "spinach",     False, ["spinach","greens"]),
    ("apple-shimla",    "Shimla Apple",                "Fresho",            "4 pcs (~700 g)",  "fruits-vegetables", "apple",       True,  ["apple","fruit"]),
    ("potato-1kg",      "Potato",                      "Farm Fresh",        "1 kg",            "fruits-vegetables", "potato",      False, ["potato","vegetables"]),
    ("lemon-4pcs",      "Lemon",                       "Fresho",            "4 pcs",           "fruits-vegetables", "lemon",       False, ["lemon","citrus"]),

    # Dairy & Breakfast
    ("amul-milk-1l",    "Amul Gold Full Cream Milk",   "Amul",              "1 L Tetra Pack",  "dairy-breakfast",   "milk",        True,  ["milk","dairy"]),
    ("amul-butter-500g","Amul Butter",                 "Amul",              "500 g",           "dairy-breakfast",   "butter",      True,  ["butter","dairy"]),
    ("mother-dahi-400g","Fresh Curd (Dahi)",            "Mother Dairy",      "400 g",           "dairy-breakfast",   "yogurt",      True,  ["curd","dahi","dairy"]),
    ("eggs-12pcs",      "Farm Fresh Eggs",             "Country Delight",   "12 pcs",          "dairy-breakfast",   "eggs",        True,  ["eggs","protein"]),
    ("amul-paneer-200g","Amul Paneer",                  "Amul",              "200 g",           "dairy-breakfast",   "cheese",      True,  ["paneer","dairy"]),
    ("curd-plain-400g", "Epigamia Greek Yogurt",       "Epigamia",          "400 g",           "dairy-breakfast",   "yogurt2",     False, ["yogurt","protein"]),

    # Snacks & Drinks
    ("lays-masala-26g", "Lay's Magic Masala",          "Lay's",             "26 g",            "snacks-drinks",     "chips",       True,  ["chips","snacks"]),
    ("coke-750ml",      "Coca-Cola",                   "Coca-Cola",         "750 ml",          "snacks-drinks",     "cola",        True,  ["cola","drinks"]),
    ("kurkure-90g",     "Kurkure Masala Munch",        "Kurkure",           "90 g",            "snacks-drinks",     "snacks2",     True,  ["kurkure","snacks"]),
    ("redbull-250ml",   "Red Bull Energy Drink",       "Red Bull",          "250 ml",          "snacks-drinks",     "energydrink", True,  ["redbull","energy"]),
    ("haldirams-bhujia","Haldiram's Aloo Bhujia",      "Haldiram's",        "200 g",           "snacks-drinks",     "bhujia",      False, ["bhujia","namkeen"]),
    ("tropicana-1l",    "Tropicana Orange Juice",      "Tropicana",         "1 L",             "snacks-drinks",     "juice",       False, ["juice","drinks"]),

    # Bakery
    ("britannia-5050",  "Britannia 5050 Biscuit",      "Britannia",         "100 g",           "bakery",            "biscuit",     True,  ["biscuit","bakery"]),
    ("bread-harvest",   "Harvest Gold Bread",           "Harvest Gold",      "400 g",           "bakery",            "bread2",      True,  ["bread","bakery"]),
    ("oreo-100g",       "Oreo Chocolate Cream",        "Cadbury",           "100 g",           "bakery",            "oreo",        True,  ["oreo","biscuit"]),

    # Staples
    ("aashirvaad-atta-5kg","Aashirvaad Whole Wheat Atta","Aashirvaad",     "5 kg",            "staples",           "flour",       True,  ["atta","flour","staples"]),
    ("india-gate-rice-1kg","India Gate Basmati Rice",  "India Gate",        "1 kg",            "staples",           "rice",        True,  ["rice","basmati"]),
    ("toor-dal-500g",   "Toor Dal (Arhar)",            "Tata Sampann",      "500 g",           "staples",           "dal",         False, ["dal","protein"]),

    # Household
    ("vim-bar-500g",    "Vim Dishwash Bar",             "Vim",               "500 g × 2",       "household",         "soap",        False, ["dishwash","cleaning"]),
    ("surf-1kg",        "Surf Excel Easy Wash",        "Surf Excel",        "1 kg",            "household",         "detergent",   True,  ["detergent","laundry"]),
    ("harpic-500ml",    "Harpic Power Plus",            "Harpic",            "500 ml",          "household",         "cleaner",     False, ["toilet","cleaning"]),

    # Personal Care
    ("dove-soap-3pk",   "Dove Moisturising Soap",      "Dove",              "100 g × 3",       "personal-care",     "soap2",       True,  ["soap","skincare"]),
    ("hs-shampoo-340ml","Head & Shoulders Shampoo",    "Head & Shoulders",  "340 ml",          "personal-care",     "shampoo",     True,  ["shampoo","haircare"]),
    ("colgate-150g",    "Colgate MaxFresh Toothpaste", "Colgate",           "150 g",           "personal-care",     "toothpaste",  False, ["toothpaste","oral"]),

    # Oils & Spices
    ("fortune-oil-1l",  "Fortune Sunflower Oil",       "Fortune",           "1 L",             "oils-spices",       "oil",         True,  ["oil","cooking"]),
    ("everest-chilli",  "Everest Red Chilli Powder",   "Everest",           "100 g",           "oils-spices",       "spices2",     False, ["spices","masala"]),

    # Chicken & Meat
    ("chicken-breast",  "Fresh Chicken Breast",        "Licious",           "500 g",           "chicken-meat",      "chicken2",    True,  ["chicken","protein"]),
    ("eggs-brown-6pcs", "Brown Eggs",                  "Country Delight",   "6 pcs",           "chicken-meat",      "eggs2",       False, ["eggs","protein"]),
]

# Price table: (blinkit, zepto, bigbasket, instamart, mrp)
PRICES: dict[str, tuple] = {
    "onion-1kg":          (29, 31, 27, 30, 45),
    "tomato-500g":        (25, 22, 20, 24, 40),
    "banana-6pcs":        (39, 37, 35, 41, 55),
    "spinach-250g":       (15, 14, 12, 16, 25),
    "apple-shimla":       (89, 85, 79, 92, 120),
    "potato-1kg":         (22, 20, 18, 23, 35),
    "lemon-4pcs":         (19, 18, 16, 20, 28),
    "amul-milk-1l":       (68, 68, 66, 69, 72),
    "amul-butter-500g":   (268, 265, 260, 270, 290),
    "mother-dahi-400g":   (44, 42, 40, 45, 52),
    "eggs-12pcs":         (89, 85, 82, 90, 100),
    "amul-paneer-200g":   (79, 75, 72, 80, 95),
    "curd-plain-400g":    (99, 95, 90, 100, 120),
    "lays-masala-26g":    (20, 20, 18, 20, 20),
    "coke-750ml":         (40, 38, 36, 40, 45),
    "kurkure-90g":        (30, 28, 27, 30, 35),
    "redbull-250ml":      (115, 110, 109, 115, 125),
    "haldirams-bhujia":   (79, 75, 72, 80, 90),
    "tropicana-1l":       (99, 95, 90, 100, 120),
    "britannia-5050":     (30, 28, 28, 30, 35),
    "bread-harvest":      (40, 38, 36, 42, 50),
    "oreo-100g":          (35, 33, 32, 36, 40),
    "aashirvaad-atta-5kg":(272, 268, 260, 275, 310),
    "india-gate-rice-1kg":(95, 92, 89, 97, 115),
    "toor-dal-500g":      (89, 85, 82, 90, 105),
    "vim-bar-500g":       (59, 55, 52, 58, 70),
    "surf-1kg":           (149, 145, 140, 150, 175),
    "harpic-500ml":       (99, 95, 90, 100, 120),
    "dove-soap-3pk":      (149, 145, 139, 149, 165),
    "hs-shampoo-340ml":   (299, 285, 279, 299, 349),
    "colgate-150g":       (99, 95, 92, 99, 115),
    "fortune-oil-1l":     (149, 145, 140, 152, 180),
    "everest-chilli":     (69, 65, 62, 70, 85),
    "chicken-breast":     (249, 245, 235, 255, 299),
    "eggs-brown-6pcs":    (49, 47, 45, 50, 60),
}

# Delivery times (blinkit, zepto, bigbasket, instamart) in minutes
DELIVERY = {
    "blinkit": 10, "zepto": 10, "bigbasket": 30, "instamart": 15,
}


# ── Seeding logic ──────────────────────────────────────────────────────────────

async def clear_data(db: AsyncSession):
    """Wipe existing seed data (keeps schema intact)."""
    print("  Clearing existing data...")
    for model in [PriceHistory, PriceAlert, PlatformPrice, CartItem, Cart,
                  WishlistItem, Wishlist, RefreshToken, Product, Category, Platform]:
        await db.execute(delete(model))
    # Remove the user this script is about to seed plus legacy demo account.
    await db.execute(delete(User).where(User.email.in_(["test@pricebasket.in", SEED_ADMIN_EMAIL])))
    await db.commit()


async def seed_platforms(db: AsyncSession) -> dict[str, Platform]:
    print("  Seeding platforms...")
    platforms = {}
    for p in PLATFORMS:
        obj = Platform(**p)
        db.add(obj)
        platforms[p["slug"]] = obj
    await db.flush()
    return platforms


async def seed_categories(db: AsyncSession) -> dict[str, Category]:
    print("  Seeding categories...")
    cats = {}
    for c in CATEGORIES:
        obj = Category(**c)
        db.add(obj)
        cats[c["slug"]] = obj
    await db.flush()
    return cats


async def seed_products(
    db: AsyncSession,
    platforms: dict[str, Platform],
    cats: dict[str, Category],
):
    print("  Seeding products + prices...")
    platform_order = ["blinkit", "zepto", "bigbasket", "instamart"]

    for row in PRODUCTS:
        slug, name, brand, unit, cat_slug, image_seed, featured, tags = row
        prices = PRICES.get(slug)
        if not prices:
            print(f"    WARNING: no prices for {slug}, skipping")
            continue

        p_bl, p_ze, p_bb, p_im, mrp = prices

        product = Product(
            slug=slug,
            name=name,
            brand=brand,
            unit=unit,
            description=f"{name} — {unit}. Compare prices across Blinkit, Zepto, BigBasket and Instamart.",
            category_id=cats[cat_slug].id,
            image_url=food_img(image_seed),
            thumbnail_url=food_img(image_seed),
            tags=tags,
            is_featured=featured,
            is_active=True,
        )
        db.add(product)
        await db.flush()

        price_list = [p_bl, p_ze, p_bb, p_im]
        for i, plat_slug in enumerate(platform_order):
            price = price_list[i]
            discount_pct = round(((mrp - price) / mrp) * 100, 1) if mrp > price else 0
            pp = PlatformPrice(
                product_id=product.id,
                platform_id=platforms[plat_slug].id,
                price=price,
                original_price=mrp,
                discount_percent=discount_pct,
                discount_label=f"{int(discount_pct)}% OFF" if discount_pct > 0 else None,
                is_available=True,
                delivery_time_minutes=DELIVERY[plat_slug],
                platform_product_url=f"https://{plat_slug}.com/product/{slug}",
                platform_image_url=food_img(image_seed),
                source="manual",
            )
            db.add(pp)


async def seed_user(db: AsyncSession):
    print("  Seeding admin user...")
    user = User(
        email=SEED_ADMIN_EMAIL,
        hashed_password=hash_password(SEED_ADMIN_PASSWORD),
        full_name=SEED_ADMIN_NAME,
        is_active=True,
        is_verified=True,
        is_admin=True,
        city=SEED_ADMIN_CITY,
        pincode=SEED_ADMIN_PINCODE,
    )
    db.add(user)
    await db.flush()
    return user


async def main():
    print("\n🌱  PriceBasket Seed Script")
    print("=" * 40)

    async with AsyncSessionLocal() as db:
        await clear_data(db)
        platforms = await seed_platforms(db)
        cats = await seed_categories(db)
        await seed_products(db, platforms, cats)
        await seed_user(db)
        await db.commit()

    print("\n✅  Seeding complete!")
    print(f"   Platforms : {len(PLATFORMS)}")
    print(f"   Categories: {len(CATEGORIES)}")
    print(f"   Products  : {len(PRODUCTS)}")
    print(f"   Prices    : {len(PRODUCTS) * 4} (4 platforms × {len(PRODUCTS)} products)")
    print(f"\n   Admin login :  {SEED_ADMIN_EMAIL}  /  {SEED_ADMIN_PASSWORD}")
    print()


if __name__ == "__main__":
    asyncio.run(main())
