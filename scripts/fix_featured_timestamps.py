#!/usr/bin/env python3
"""
Fix featured product timestamps so ORDER BY created_at DESC gives balanced categories.
Assigns evenly-spaced timestamps to featured products, interleaved by category.
"""
import subprocess
import json
import base64

db_host = "pricebasket-db.cf6ksq4yotjm.ap-south-1.rds.amazonaws.com"
db_user = "pricebasket"
db_pass = "SiXdaVvWiYYlOfpuydxwd5ynutdAub8o"
db_name = "pricebasket_db"

# Update featured products' created_at to interleave categories
# We assign timestamps from NOW() backwards, cycling through categories
sql = """
WITH cat_ranked AS (
  SELECT
    p.id,
    c.slug as cat_slug,
    ROW_NUMBER() OVER (PARTITION BY c.slug ORDER BY (
      SELECT COUNT(*) FROM platform_prices pp WHERE pp.product_id = p.id
    ) DESC) as cat_rank,
    ROW_NUMBER() OVER (ORDER BY c.slug, (
      SELECT COUNT(*) FROM platform_prices pp WHERE pp.product_id = p.id
    ) DESC) as global_rank
  FROM products p
  JOIN categories c ON c.id = p.category_id
  WHERE p.is_featured = TRUE AND p.is_active = TRUE
),
interleaved AS (
  SELECT
    id,
    cat_slug,
    cat_rank,
    -- Interleave: assign position based on category cycling
    (cat_rank - 1) * (SELECT COUNT(DISTINCT cat_slug) FROM cat_ranked) +
    DENSE_RANK() OVER (ORDER BY cat_slug) as interleave_pos
  FROM cat_ranked
)
UPDATE products SET
  created_at = NOW() - (interleave_pos || ' minutes')::interval
FROM interleaved
WHERE products.id = interleaved.id;

-- Verify distribution with ORDER BY created_at DESC LIMIT 100
SELECT c.slug, COUNT(*) as count
FROM products p
JOIN categories c ON c.id = p.category_id
WHERE p.is_featured = TRUE AND p.is_active = TRUE
  AND p.created_at > NOW() - INTERVAL '200 minutes'
GROUP BY c.slug
ORDER BY count DESC;
"""

sql_b64 = base64.b64encode(sql.encode()).decode()

commands = [
    "echo '" + sql_b64 + "' | base64 -d > /tmp/fix_timestamps.sql",
    "PGPASSWORD='" + db_pass + "' psql -h " + db_host + " -U " + db_user + " -d " + db_name + " -f /tmp/fix_timestamps.sql"
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
