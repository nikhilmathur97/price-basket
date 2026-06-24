#!/usr/bin/env python3
"""
export_prices_for_rds.py
Exports platform_prices + platforms as INSERT ... ON CONFLICT DO UPDATE
statements safe for RDS (no superuser needed, no COPY, no disable-triggers).
"""
import os
import asyncio
import asyncpg
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

DSN = os.environ.get("DATABASE_URL", "")
for prefix in ["postgresql+asyncpg://", "postgresql+psycopg2://"]:
    if DSN.startswith(prefix):
        DSN = "postgresql://" + DSN[len(prefix):]

OUTPUT = "/tmp/prices_insert.sql"


def esc(v):
    if v is None:
        return "NULL"
    return "'" + str(v).replace("'", "''") + "'"


def num(v, default="NULL"):
    if v is None:
        return default
    return str(v)


async def main():
    conn = await asyncpg.connect(DSN)
    lines = []
    # No BEGIN/COMMIT — run each INSERT independently (autocommit)
    # so a single failure doesn't roll back everything

    # ── platforms ──────────────────────────────────────────────────────────
    print("Exporting platforms...")
    rows = await conn.fetch(
        "SELECT id, name, slug, logo_url, base_url, is_active FROM platforms ORDER BY name"
    )
    lines.append("-- platforms")
    for r in rows:
        lines.append(
            "INSERT INTO platforms (id, name, slug, logo_url, base_url, is_active) VALUES ("
            + ", ".join([
                esc(str(r["id"])),
                esc(r["name"]),
                esc(r["slug"]),
                esc(r["logo_url"]),
                esc(r["base_url"]),
                str(r["is_active"]).upper(),
            ])
            + ") ON CONFLICT (id) DO NOTHING;"
        )
    lines.append("")

    # ── platform_prices ────────────────────────────────────────────────────
    print("Exporting platform_prices...")
    rows = await conn.fetch(
        """
        SELECT id, product_id, platform_id, price, original_price, discount_percent,
               discount_label, is_available, stock_count, platform_product_id,
               platform_product_url, platform_image_url, delivery_time_minutes,
               last_updated, source
        FROM platform_prices
        ORDER BY product_id, platform_id
        """
    )
    print(f"  {len(rows)} price rows to export")
    lines.append("-- platform_prices")

    for r in rows:
        src = esc(r["source"]) if r["source"] else "'scrape'"
        lu = esc(str(r["last_updated"])) if r["last_updated"] else "NOW()"
        vals = ", ".join([
            esc(str(r["id"])),
            esc(str(r["product_id"])),
            esc(str(r["platform_id"])),
            num(r["price"]),
            num(r["original_price"]),
            num(r["discount_percent"], "0.0"),
            esc(r["discount_label"]),
            str(r["is_available"]).upper(),
            num(r["stock_count"]),
            esc(r["platform_product_id"]),
            esc(r["platform_product_url"]),
            esc(r["platform_image_url"]),
            num(r["delivery_time_minutes"]),
            lu,
            src,
        ])
        lines.append(
            "INSERT INTO platform_prices "
            "(id, product_id, platform_id, price, original_price, discount_percent, "
            "discount_label, is_available, stock_count, platform_product_id, "
            "platform_product_url, platform_image_url, delivery_time_minutes, last_updated, source) "
            "VALUES (" + vals + ") "
            "ON CONFLICT (product_id, platform_id) DO UPDATE SET "
            "price=EXCLUDED.price, original_price=EXCLUDED.original_price, "
            "discount_percent=EXCLUDED.discount_percent, discount_label=EXCLUDED.discount_label, "
            "is_available=EXCLUDED.is_available, stock_count=EXCLUDED.stock_count, "
            "platform_product_url=EXCLUDED.platform_product_url, "
            "platform_image_url=EXCLUDED.platform_image_url, "
            "delivery_time_minutes=EXCLUDED.delivery_time_minutes, "
            "last_updated=EXCLUDED.last_updated, source=EXCLUDED.source;"
        )

    with open(OUTPUT, "w") as f:
        f.write("\n".join(lines))

    await conn.close()
    print(f"Written {len(lines)} lines to {OUTPUT}")
    print(f"File size: {os.path.getsize(OUTPUT):,} bytes")


asyncio.run(main())
