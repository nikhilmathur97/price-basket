#!/usr/bin/env python3
"""Fix test products in production RDS via SSM."""
import subprocess
import json
import base64

db_host = "pricebasket-db.cf6ksq4yotjm.ap-south-1.rds.amazonaws.com"
db_user = "pricebasket"
db_pass = "SiXdaVvWiYYlOfpuydxwd5ynutdAub8o"
db_name = "pricebasket_db"

sql = """
UPDATE products SET
  name = 'Amul Taaza Toned Milk 500ml',
  slug = 'amul-taaza-toned-milk-500ml',
  image_url = 'https://cdn.grofers.com/da/cms-assets/cms/product/amul-taaza-toned-milk.jpg',
  thumbnail_url = 'https://cdn.grofers.com/da/cms-assets/cms/product/amul-taaza-toned-milk.jpg',
  brand = 'Amul',
  description = 'Amul Taaza Toned Milk 500ml - Fresh toned milk with 3% fat content'
WHERE id = '0d891aee-59c3-43a6-98e8-a2eae239c4ef';

UPDATE platform_prices SET price = 32.0, original_price = 35.0
WHERE product_id = '0d891aee-59c3-43a6-98e8-a2eae239c4ef'
  AND price > 100;

UPDATE products SET
  name = 'Modern Brown Bread 400g',
  slug = 'modern-brown-bread-400g',
  image_url = 'https://cdn.grofers.com/da/cms-assets/cms/product/modern-brown-bread.jpg',
  thumbnail_url = 'https://cdn.grofers.com/da/cms-assets/cms/product/modern-brown-bread.jpg',
  brand = 'Modern',
  description = 'Modern Brown Bread 400g - Soft and nutritious whole wheat brown bread'
WHERE id = '785ba12c-7ba9-45b6-bbeb-6fe82b30537d';

SELECT id, name, image_url FROM products WHERE id IN (
  '0d891aee-59c3-43a6-98e8-a2eae239c4ef',
  '785ba12c-7ba9-45b6-bbeb-6fe82b30537d'
);
"""

sql_b64 = base64.b64encode(sql.encode()).decode()

commands = [
    "echo '" + sql_b64 + "' | base64 -d > /tmp/fix_test_products.sql",
    "PGPASSWORD='" + db_pass + "' psql -h " + db_host + " -U " + db_user + " -d " + db_name + " -f /tmp/fix_test_products.sql"
]

params = {"commands": commands}
ssm_cmd = [
    "aws", "ssm", "send-command",
    "--region", "ap-south-1",
    "--instance-ids", "i-0b1590adb069a8816",
    "--document-name", "AWS-RunShellScript",
    "--timeout-seconds", "30",
    "--parameters", json.dumps(params),
    "--query", "Command.CommandId",
    "--output", "text"
]
result = subprocess.run(ssm_cmd, capture_output=True, text=True)
print("SSM Command ID:", result.stdout.strip())
print("Error:", result.stderr.strip())
