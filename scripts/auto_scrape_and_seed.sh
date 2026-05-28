#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# PriceBasket — Automated Full Scrape + DB Seed
# Waits for any running scrape to finish, then runs the full
# 7-platform scraper (Blinkit, Zepto, Instamart, BigBasket,
# JioMart, Amazon Fresh, Flipkart Minutes) and reports DB counts.
# ═══════════════════════════════════════════════════════════════

set -e
PYTHON="backend/.venv_mac/bin/python3"
SCRIPT="scripts/scrape_real_data.py"
LOG="/tmp/scrape_full_run.log"
DB_CHECK_SCRIPT="/tmp/check_db_counts.py"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  PriceBasket — Automated Full Scrape & Seed"
echo "═══════════════════════════════════════════════════════════════"
echo "  Started: $(date)"
echo ""

# ── Step 1: Wait for any existing scrape_real_data.py to finish ──
EXISTING_PID=$(pgrep -f "scrape_real_data.py" 2>/dev/null | head -1)
if [ -n "$EXISTING_PID" ]; then
    echo "⏳ Waiting for existing scrape process (PID: $EXISTING_PID) to finish..."
    echo "   This may take up to 3 more hours. Check progress with:"
    echo "   tail -f $LOG"
    echo ""
    while kill -0 "$EXISTING_PID" 2>/dev/null; do
        sleep 30
        echo -n "."
    done
    echo ""
    echo "✅ Previous scrape finished at $(date)"
    echo ""
else
    echo "ℹ️  No existing scrape process found. Starting fresh."
    echo ""
fi

# ── Step 2: Run the full 7-platform scraper ──────────────────────
echo "🚀 Starting full 7-platform scrape (109 queries × 7 platforms)..."
echo "   Platforms: Blinkit, Zepto, Instamart, BigBasket, JioMart, Amazon Fresh, Flipkart Minutes"
echo "   Log: $LOG"
echo ""

$PYTHON $SCRIPT 2>&1 | tee "$LOG"

echo ""
echo "✅ Scrape completed at $(date)"
echo ""

# ── Step 3: Check DB counts ──────────────────────────────────────
echo "📊 Checking database counts..."
cat > "$DB_CHECK_SCRIPT" << 'PYEOF'
import asyncio, os, sys
sys.path.insert(0, 'backend')
from dotenv import load_dotenv
load_dotenv('backend/.env')

async def check():
    db_url = os.environ.get('DATABASE_URL', '')
    if not db_url:
        print('❌ No DATABASE_URL found in backend/.env')
        return
    if db_url.startswith('postgres://'):
        db_url = db_url.replace('postgres://', 'postgresql+asyncpg://', 1)
    elif db_url.startswith('postgresql://') and '+asyncpg' not in db_url:
        db_url = db_url.replace('postgresql://', 'postgresql+asyncpg://', 1)

    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlalchemy import text
    engine = create_async_engine(db_url, echo=False)
    async with engine.connect() as conn:
        r = await conn.execute(text('SELECT COUNT(*) FROM products'))
        total_products = r.scalar()
        r = await conn.execute(text('SELECT COUNT(*) FROM categories'))
        total_cats = r.scalar()
        r = await conn.execute(text('SELECT COUNT(*) FROM platform_prices'))
        total_prices = r.scalar()
        r = await conn.execute(text('SELECT COUNT(*) FROM platforms'))
        total_platforms = r.scalar()

        print('')
        print('═' * 50)
        print('  DATABASE SUMMARY')
        print('═' * 50)
        print(f'  Products  : {total_products}')
        print(f'  Categories: {total_cats}')
        print(f'  Price rows: {total_prices}')
        print(f'  Platforms : {total_platforms}')
        print('')

        r = await conn.execute(text("""
            SELECT c.name, COUNT(p.id) as cnt
            FROM categories c
            LEFT JOIN products p ON p.category_id = c.id
            GROUP BY c.name
            ORDER BY cnt DESC
        """))
        print('  Products per category:')
        for row in r:
            bar = '█' * min(int(row[1] / 10), 30)
            print(f'  {row[0]:<25} {row[1]:>4}  {bar}')

        print('')
        r = await conn.execute(text("""
            SELECT pl.name, COUNT(pp.id) as cnt
            FROM platforms pl
            LEFT JOIN platform_prices pp ON pp.platform_id = pl.id
            GROUP BY pl.name
            ORDER BY cnt DESC
        """))
        print('  Price rows per platform:')
        for row in r:
            print(f'  {row[0]:<25} {row[1]:>4}')
        print('═' * 50)
        print('')

    await engine.dispose()

asyncio.run(check())
PYEOF

$PYTHON "$DB_CHECK_SCRIPT"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  ✅ All done! Completed at $(date)"
echo "═══════════════════════════════════════════════════════════════"
echo ""
