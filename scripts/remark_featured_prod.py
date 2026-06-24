#!/usr/bin/env python3
"""
Re-mark featured products in production RDS with balanced category coverage.
Selects top N products per category (by platform price count) so all categories
appear on the home page.
"""
import subprocess
import json
import base64

db_host = "pricebasket-db.cf6ksq4yotjm.ap-south-1.rds.amazonaws.com"
db_user = "pricebasket"
db_pass = "SiXdaVvWiYYlOfpuydxwd5ynutdAub8o"
db_name = "pricebasket_db"

# SQL: unfeature all, then re-feature top 30 per category (balanced)
# Also feature top 200 overall for the generic sections
sql = """
-- Step 1: Unfeature everything
UPDATE products SET is_featured = FALSE;

-- Step 2: Feature top 30 products per category (by platform price count)
-- This ensures all categories appear on home page
WITH ranked AS (
  SELECT
    p.id,
    p.category_id,
    COUNT(pp.id) AS price_count,
    ROW_NUMBER() OVER (
      PARTITION BY p.category_id
      ORDER BY COUNT(pp.id) DESC, p.name ASC
    ) AS rn
  FROM products p
  JOIN platform_prices pp ON pp.product_id = p.id
  WHERE p.is_active = TRUE
    AND (p.image_url IS NOT NULL AND p.image_url != '')
  GROUP BY p.id, p.category_id
)
UPDATE products SET is_featured = TRUE
WHERE id IN (
  SELECT id FROM ranked WHERE rn <= 30
);

-- Step 3: Also feature top 200 overall (for Trending/Best Deals sections)
-- These may already be featured from step 2, ON CONFLICT is fine
WITH top_overall AS (
  SELECT p.id, COUNT(pp.id) AS price_count
  FROM products p
  JOIN platform_prices pp ON pp.product_id = p.id
  WHERE p.is_active = TRUE
    AND (p.image_url IS NOT NULL AND p.image_url != '')
  GROUP BY p.id
  ORDER BY price_count DESC
  LIMIT 200
)
UPDATE products SET is_featured = TRUE
WHERE id IN (SELECT id FROM top_overall);

-- Verify
SELECT c.slug, c.name, COUNT(p.id) as featured_count
FROM categories c
JOIN products p ON p.category_id = c.id
WHERE p.is_featured = TRUE
GROUP BY c.slug, c.name
ORDER BY featured_count DESC;

SELECT COUNT(*) as total_featured FROM products WHERE is_featured = TRUE;
"""

sql_b64 = base64.b64encode(sql.encode()).decode()

commands = [
    "echo '" + sql_b64 + "' | base64 -d > /tmp/remark_featured.sql",
    "PGPASSWORD='" + db_pass + "' psql -h " + db_host + " -U " + db_user + " -d " + db_name + " -f /tmp/remark_featured.sql"
]

params = {"commands": commands}
ssm_cmd = [
    "aws", "ssm", "send-command",
    "--region", "ap-south-1",
    "--instance-ids", "i-0b1590adb069a8816",
    "--document-name", "AWS-RunShellScript",
    "--timeout-seconds", "60",
    "--parameters", json.dumps(params),
    "--query", "Command.CommandId",
    "--output", "text"
]
result = subprocess.run(ssm_cmd, capture_output=True, text=True)
print("SSM Command ID:", result.stdout.strip())
print("Error:", result.stderr.strip())
