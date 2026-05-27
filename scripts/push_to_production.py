#!/usr/bin/env python3
"""
push_to_production.py — Push scraped data to the production PriceBasket API.

This script:
1. Reads /tmp/scraped_data.json (1,328 products from Blinkit + Zepto)
2. POSTs them in batches to POST /api/v1/setup/import-prices
3. Uses the SEED_SECRET for authentication

Usage:
    python3 scripts/push_to_production.py --seed-key YOUR_SEED_SECRET

Or set env var:
    SEED_SECRET=xxx python3 scripts/push_to_production.py
"""
import argparse
import json
import os
import sys
import time

import httpx

# ── CLI args ──────────────────────────────────────────────────────────────────
parser = argparse.ArgumentParser()
parser.add_argument("--seed-key", default=os.environ.get("SEED_SECRET", ""),
                    help="SEED_SECRET value (or set SEED_SECRET env var)")
parser.add_argument("--api-url", default="https://pricebasket-api.onrender.com",
                    help="Production API base URL")
parser.add_argument("--file", default="/tmp/scraped_data.json",
                    help="Scraped JSON file")
parser.add_argument("--batch-size", type=int, default=100,
                    help="Items per batch POST request")
parser.add_argument("--dry-run", action="store_true",
                    help="Show what would be sent without actually sending")
args = parser.parse_args()

if not args.seed_key:
    print("❌  SEED_SECRET not set. Use --seed-key or set SEED_SECRET env var.")
    print("    Find it in Render dashboard → pricebasket-api → Environment → SEED_SECRET")
    sys.exit(1)

# ── Load data ─────────────────────────────────────────────────────────────────
if not os.path.exists(args.file):
    print(f"❌  File not found: {args.file}")
    print("    Run: backend/.venv_mac/bin/python3 scripts/scrape_real_data.py")
    sys.exit(1)

with open(args.file) as f:
    all_items = json.load(f)

print(f"\n📦 Loaded {len(all_items)} items from {args.file}")
by_platform: dict = {}
for item in all_items:
    p = item.get("platform", "unknown")
    by_platform[p] = by_platform.get(p, 0) + 1
for p, c in sorted(by_platform.items()):
    print(f"   {p}: {c}")

if args.dry_run:
    print("\n✅ Dry run — not sending to API")
    sys.exit(0)

# ── Push in batches ───────────────────────────────────────────────────────────
url = f"{args.api_url}/api/v1/setup/import-prices"
headers = {
    "x-seed-key": args.seed_key,
    "Content-Type": "application/json",
}

print(f"\n🚀 Pushing to {url}")
print(f"   Batch size: {args.batch_size}")

total_saved = 0
total_skipped = 0
batch_num = 0

with httpx.Client(timeout=60.0) as client:
    for i in range(0, len(all_items), args.batch_size):
        batch = all_items[i : i + args.batch_size]
        batch_num += 1

        payload = {"items": batch}

        try:
            resp = client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                result = resp.json()
                saved   = result.get("saved", 0)
                skipped = result.get("skipped", 0)
                total_saved   += saved
                total_skipped += skipped
                print(f"   Batch {batch_num}: ✅ saved={saved} skipped={skipped}")
            elif resp.status_code == 403:
                print(f"   ❌ 403 Forbidden — wrong SEED_SECRET")
                sys.exit(1)
            elif resp.status_code == 422:
                print(f"   ❌ 422 Validation error: {resp.text[:200]}")
                sys.exit(1)
            else:
                print(f"   ⚠️  Batch {batch_num}: HTTP {resp.status_code} — {resp.text[:100]}")
        except Exception as e:
            print(f"   ❌ Batch {batch_num} error: {e}")

        # Small delay to avoid overwhelming Render free tier
        time.sleep(0.5)

print(f"\n✅ Done!")
print(f"   Total saved:   {total_saved}")
print(f"   Total skipped: {total_skipped}")
print(f"\n🌐 Check https://pricebasket.in to see the live data!")
