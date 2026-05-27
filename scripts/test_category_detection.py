#!/usr/bin/env python3
"""
Quick test of the improved _detect_expected_category logic.
Run from repo root: python3 scripts/test_category_detection.py
"""
from typing import Optional

_CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "dairy-eggs":        ["milk", "curd", "yogurt", "butter", "cheese", "paneer", "cream cheese",
                          "ghee", "lassi", "whey protein", "buttermilk", "skimmed milk"],
    "fruits-vegetables": ["fresh apple", "fresh banana", "fresh mango", "fresh tomato",
                          "fresh potato", "fresh onion", "fresh spinach", "fresh carrot",
                          "fresh orange", "fresh lemon", "fresh grape", "broccoli",
                          "cauliflower", "fresh peas", "fresh beans", "fresh cabbage",
                          "fresh cucumber", "fresh capsicum", "raw vegetable", "raw fruit"],
    "snacks":            ["chips", "biscuit", "cookie", "namkeen", "bhujia", "popcorn",
                          "wafer", "cracker", "snack", "puff", "pretzel", "nachos",
                          "banana chips", "potato chips", "tortilla", "murukku", "chivda",
                          "mixture", "mathri", "sev", "chakli", "fryums"],
    "beverages":         ["juice", "cola", "soda", "mineral water", "packaged water",
                          "tea bags", "coffee powder", "instant coffee", "energy drink",
                          "lemonade", "squash", "syrup", "milkshake", "smoothie",
                          "cold drink", "soft drink", "aerated", "tonic water"],
    "staples":           ["basmati rice", "brown rice", "wheat flour", "atta", "maida",
                          "besan", "dal", "lentil", "toor dal", "moong dal", "chana dal",
                          "urad dal", "masoor dal", "sugar", "salt", "refined oil",
                          "mustard oil", "sunflower oil", "olive oil", "semolina", "sooji",
                          "poha", "oats", "cornflour", "suji", "rawa"],
    "personal-care":     ["shampoo", "conditioner", "face wash", "moisturizer", "body lotion",
                          "deodorant", "toothpaste", "toothbrush", "body wash", "sunscreen",
                          "face serum", "hair oil", "hair gel", "hand wash", "sanitizer gel"],
    "household":         ["detergent", "dishwash", "toilet cleaner", "floor cleaner",
                          "surface cleaner", "scrubber", "bleach", "air freshener",
                          "garbage bag", "tissue paper", "paper towel", "wet wipes",
                          "dish soap", "laundry", "fabric softener"],
    "baby-care":         ["baby", "diaper", "nappy", "infant formula", "toddler",
                          "baby food", "baby wipes", "teether", "baby lotion", "baby shampoo"],
    "beauty":            ["lipstick", "mascara", "foundation", "blush", "kajal", "eyeliner",
                          "nail polish", "makeup", "concealer", "primer", "highlighter",
                          "face mask", "toner", "micellar", "bb cream", "cc cream"],
    "frozen":            ["frozen", "ice cream", "gelato", "sorbet", "popsicle",
                          "frozen peas", "frozen corn", "frozen paratha", "frozen snack"],
    "bakery":            ["bread", "bun", "cake", "muffin", "pastry", "rusk", "toast",
                          "croissant", "bagel", "pav", "dinner roll", "loaf"],
    "meat-seafood":      ["chicken", "mutton", "fish fillet", "prawn", "shrimp",
                          "beef", "pork", "salmon", "tuna", "seafood", "boneless chicken",
                          "chicken breast", "chicken leg", "minced meat"],
    "instant-food":      ["noodles", "pasta", "maggi", "instant noodles", "ready to eat",
                          "instant soup", "cup noodles", "ramen", "upma mix", "poha mix",
                          "oatmeal", "porridge mix", "instant oats"],
}

_CATEGORY_OVERRIDES: dict[str, list[str]] = {
    "snacks":            ["chips", "namkeen", "bhujia", "biscuit", "cookie", "wafer",
                          "cracker", "puff", "popcorn", "snack", "murukku", "mixture",
                          "mathri", "sev", "chivda", "fryums", "pretzel", "nachos"],
    "staples":           ["rice", "atta", "flour", "dal", "oil", "sugar", "salt",
                          "oats", "poha", "semolina", "sooji", "rawa", "lentil"],
    "beverages":         ["juice", "drink", "water", "tea", "coffee", "cola", "soda",
                          "shake", "smoothie", "squash", "syrup", "aerated"],
    "dairy-eggs":        ["milk", "curd", "yogurt", "butter", "cheese", "paneer",
                          "ghee", "cream", "lassi", "whey", "egg"],
    "bakery":            ["bread", "bun", "cake", "muffin", "rusk", "toast", "pav",
                          "croissant", "pastry", "loaf"],
    "frozen":            ["frozen", "ice cream", "gelato", "sorbet", "popsicle"],
    "instant-food":      ["noodles", "pasta", "maggi", "instant", "ready to eat",
                          "soup", "ramen", "upma", "porridge"],
    "personal-care":     ["shampoo", "conditioner", "face wash", "moisturizer", "lotion",
                          "deodorant", "toothpaste", "toothbrush", "body wash", "sunscreen",
                          "serum", "hair oil", "hand wash", "sanitizer"],
    "household":         ["detergent", "dishwash", "cleaner", "scrubber", "bleach",
                          "freshener", "tissue", "wipes", "laundry", "fabric"],
    "baby-care":         ["baby", "diaper", "nappy", "infant", "toddler", "teether"],
    "beauty":            ["lipstick", "mascara", "foundation", "kajal", "eyeliner",
                          "nail polish", "makeup", "concealer", "primer", "highlighter"],
    "meat-seafood":      ["chicken", "mutton", "fish", "prawn", "shrimp", "beef",
                          "pork", "salmon", "tuna", "seafood", "meat"],
    "fruits-vegetables": ["fresh", "raw", "vegetable", "fruit", "sabzi"],
}


def _detect_expected_category(name: str, current_slug: str) -> Optional[str]:
    name_lower = name.lower()
    for kw in _CATEGORY_OVERRIDES.get(current_slug, []):
        if kw in name_lower:
            return None
    scores: dict[str, float] = {}
    for cat_slug, keywords in _CATEGORY_KEYWORDS.items():
        score = sum(len(kw.split()) for kw in keywords if kw in name_lower)
        if score > 0:
            scores[cat_slug] = score
    if not scores:
        return None
    best = max(scores, key=lambda k: scores[k])
    current_score = scores.get(current_slug, 0.0)
    best_score = scores[best]
    if best == current_slug:
        return None
    if current_score == 0 and best_score >= 1:
        return best
    if current_score > 0 and best_score > current_score * 2:
        return best
    return None


# ── Test cases ────────────────────────────────────────────────────────────────
tests = [
    # (product_name, current_category, expected_result)
    # Should NOT flag (correctly categorized)
    ("Beyond Snack Desi Masala Nendran Banana Chips - Pack of 2", "snacks", None),
    ("Beyond Snack Kerala-Original style Banana Chips - Pack of 2", "snacks", None),
    ("Too Yumm Bhoot Potato Chips Spicy Chilli Snacks - Pack of 2", "snacks", None),
    ("Too Yumm Classic Salted Banana Chips (No Palm Oil) - Pack of 2", "snacks", None),
    ("Haldiram's Aloo Bhujia 200g", "snacks", None),
    ("Lay's Classic Salted Chips", "snacks", None),
    ("Amul Butter 500g", "dairy-eggs", None),
    ("Amul Milk 1L", "dairy-eggs", None),
    ("Tata Salt 1kg", "staples", None),
    ("Fortune Sunflower Oil 1L", "staples", None),
    ("Maggi 2-Minute Noodles", "instant-food", None),
    ("Britannia Bread 400g", "bakery", None),
    ("Tropicana Orange Juice 1L", "beverages", None),
    ("Head & Shoulders Shampoo 340ml", "personal-care", None),
    ("Surf Excel Detergent 1kg", "household", None),
    ("Pampers Baby Diapers", "baby-care", None),
    ("Lakme Lipstick", "beauty", None),
    ("Kwality Walls Ice Cream", "frozen", None),
    ("Boneless Chicken Breast 500g", "meat-seafood", None),
    # Should flag (genuinely wrong category)
    ("Amul Butter 500g", "snacks", "dairy-eggs"),          # butter in snacks → dairy
    ("Maggi Noodles 70g", "staples", "instant-food"),      # noodles in staples → instant-food
    ("Head Shoulders Shampoo", "household", "personal-care"),  # shampoo in household → personal-care
]

print(f"{'Product':<60} {'Current':<20} {'Expected':<20} {'Got':<20} {'PASS'}")
print("-" * 130)
passed = 0
failed = 0
for name, current, expected in tests:
    got = _detect_expected_category(name, current)
    ok = got == expected
    status = "✅" if ok else "❌"
    if ok:
        passed += 1
    else:
        failed += 1
    print(f"{name[:58]:<60} {current:<20} {str(expected):<20} {str(got):<20} {status}")

print(f"\n{passed}/{len(tests)} passed, {failed} failed")
