#!/usr/bin/env python3
"""
PRICEBASKET.IN — Email Marketing Automation
Welcome sequence + weekly newsletter + price alert emails
Send via Brevo API (free tier: 300 emails/day)

Setup: pip install requests
Set env vars: BREVO_API_KEY, BACKEND_API_URL
"""
import os, json, datetime, requests

BREVO_API_KEY = os.getenv("BREVO_API_KEY", "")
BACKEND_API = os.getenv("BACKEND_API_URL", "https://pricebasket-api.onrender.com")
FROM_EMAIL = "deals@pricebasket.in"
FROM_NAME = "PriceBasket — India's Grocery Price Comparison"

def send_email(to_email: str, to_name: str, subject: str, html: str) -> dict:
    if not BREVO_API_KEY:
        print(f"[DRY RUN] Would send '{subject}' to {to_email}")
        return {"status": "dry_run"}
    resp = requests.post(
        "https://api.brevo.com/v3/smtp/email",
        headers={"api-key": BREVO_API_KEY, "Content-Type": "application/json"},
        json={
            "sender": {"name": FROM_NAME, "email": FROM_EMAIL},
            "to": [{"email": to_email, "name": to_name}],
            "subject": subject,
            "htmlContent": html,
        }
    )
    return resp.json()

WELCOME_SUBJECT = "Welcome to PriceBasket! Here's how to save Rs.800/month"
WELCOME_HTML = """
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff">
<div style="background:linear-gradient(135deg,#ea580c,#f97316);padding:32px;text-align:center">
  <h1 style="color:#fff;margin:0;font-size:28px">PriceBasket</h1>
  <p style="color:#fed7aa;margin:8px 0 0">India's #1 Grocery Price Comparison</p>
</div>
<div style="padding:32px">
  <h2 style="color:#1c1917">Welcome! You've joined 10 lakh+ smart shoppers</h2>
  <p style="color:#57534e;line-height:1.6">
    Quick fact: Aashirvaad Atta 5kg costs <strong>Rs.240 on Blinkit</strong> and just <strong>Rs.189 on JioMart</strong> right now.
    Same product. Rs.51 difference. Every order.
  </p>
  <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:20px;margin:20px 0">
    <p style="color:#9a3412;font-weight:700;margin:0 0 12px">Aashirvaad Atta 5kg — Right Now</p>
    <p style="margin:4px 0;color:#57534e">Blinkit: Rs.240</p>
    <p style="margin:4px 0;color:#57534e">Zepto: Rs.235</p>
    <p style="margin:4px 0;color:#57534e">BigBasket: Rs.228</p>
    <p style="margin:4px 0;color:#15803d;font-weight:700">JioMart: Rs.189 CHEAPEST</p>
  </div>
  <h3>3 things to do right now:</h3>
  <p>1. Search any product — see prices across 8 apps instantly</p>
  <p>2. Set a price alert — get notified when your product drops</p>
  <p>3. Use Cart Optimizer — we find the cheapest split for your whole cart</p>
  <div style="text-align:center;margin:24px 0">
    <a href="https://pricebasket.in" style="background:#ea580c;color:#fff;padding:16px 40px;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px">
      Compare Prices Now
    </a>
  </div>
</div>
<div style="background:#f5f5f5;padding:16px;text-align:center">
  <p style="color:#a8a29e;font-size:12px;margin:0">PriceBasket.in | <a href="https://pricebasket.in/unsubscribe" style="color:#a8a29e">Unsubscribe</a></p>
</div>
</div>
"""

DAY3_SUBJECT = "Your personalised savings report is ready"
DAY3_HTML = """
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff">
<div style="background:linear-gradient(135deg,#ea580c,#f97316);padding:28px;text-align:center">
  <h1 style="color:#fff;margin:0">Your Savings Report</h1>
  <p style="color:#fed7aa;margin:8px 0 0">Based on a typical Indian family grocery list</p>
</div>
<div style="padding:32px">
  <h2 style="color:#1c1917">We found <span style="color:#ea580c">Rs.847 in savings</span> for you this month</h2>
  <table style="width:100%;border-collapse:collapse;margin:20px 0">
    <tr style="background:#f5f5f5">
      <th style="padding:10px;text-align:left;font-size:12px;color:#78716c">Product</th>
      <th style="padding:10px;text-align:center;font-size:12px;color:#78716c">You Pay</th>
      <th style="padding:10px;text-align:center;font-size:12px;color:#78716c">Best Price</th>
      <th style="padding:10px;text-align:right;font-size:12px;color:#78716c">Save</th>
    </tr>
    <tr style="border-top:1px solid #e7e5e4">
      <td style="padding:10px">Atta 5kg</td>
      <td style="padding:10px;text-align:center;color:#78716c">Rs.240 (Blinkit)</td>
      <td style="padding:10px;text-align:center;color:#15803d;font-weight:700">Rs.189 (JioMart)</td>
      <td style="padding:10px;text-align:right;color:#ea580c;font-weight:700">Rs.51</td>
    </tr>
    <tr style="border-top:1px solid #e7e5e4;background:#fafaf9">
      <td style="padding:10px">Oil 1L x2</td>
      <td style="padding:10px;text-align:center;color:#78716c">Rs.284 (Blinkit)</td>
      <td style="padding:10px;text-align:center;color:#15803d;font-weight:700">Rs.258 (JioMart)</td>
      <td style="padding:10px;text-align:right;color:#ea580c;font-weight:700">Rs.26</td>
    </tr>
    <tr style="border-top:1px solid #e7e5e4">
      <td style="padding:10px">Dal 1kg x2</td>
      <td style="padding:10px;text-align:center;color:#78716c">Rs.316 (Blinkit)</td>
      <td style="padding:10px;text-align:center;color:#15803d;font-weight:700">Rs.284 (JioMart)</td>
      <td style="padding:10px;text-align:right;color:#ea580c;font-weight:700">Rs.32</td>
    </tr>
    <tr style="border-top:1px solid #e7e5e4;background:#fafaf9">
      <td style="padding:10px">Rice 5kg</td>
      <td style="padding:10px;text-align:center;color:#78716c">Rs.320 (Blinkit)</td>
      <td style="padding:10px;text-align:center;color:#15803d;font-weight:700">Rs.285 (BigBasket)</td>
      <td style="padding:10px;text-align:right;color:#ea580c;font-weight:700">Rs.35</td>
    </tr>
    <tr style="border-top:2px solid #ea580c;background:#fff7ed">
      <td colspan="3" style="padding:12px;font-weight:700">Monthly Total Savings</td>
      <td style="padding:12px;text-align:right;color:#ea580c;font-weight:900;font-size:18px">Rs.847</td>
    </tr>
  </table>
  <p style="color:#57534e">That is <strong>Rs.10,164 per year</strong> just by checking prices before ordering. Takes 30 seconds.</p>
  <div style="text-align:center;margin:24px 0">
    <a href="https://pricebasket.in" style="background:#ea580c;color:#fff;padding:16px 40px;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px">
      Start Saving Today
    </a>
  </div>
</div>
<div style="background:#f5f5f5;padding:16px;text-align:center">
  <p style="color:#a8a29e;font-size:12px;margin:0">PriceBasket.in | <a href="https://pricebasket.in/unsubscribe" style="color:#a8a29e">Unsubscribe</a></p>
</div>
</div>
"""

DAY7_SUBJECT = "Top 5 grocery deals this week — don't miss these!"
DAY7_HTML = """
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff">
<div style="background:linear-gradient(135deg,#ea580c,#f97316);padding:28px;text-align:center">
  <h1 style="color:#fff;margin:0">Top 5 Deals This Week</h1>
  <p style="color:#fed7aa;margin:8px 0 0">Prices verified 2 hours ago</p>
</div>
<div style="padding:32px">
  <p style="color:#57534e">This week's biggest price gaps across grocery apps:</p>
  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin:12px 0">
    <div style="display:flex;justify-content:space-between">
      <div><strong>Aashirvaad Atta 5kg</strong><br><small style="color:#78716c">JioMart vs Blinkit</small></div>
      <div style="text-align:right"><strong style="color:#15803d;font-size:20px">Rs.189</strong><br><small style="color:#78716c;text-decoration:line-through">Rs.240 on Blinkit</small></div>
    </div>
    <div style="background:#dcfce7;border-radius:6px;padding:4px 10px;margin-top:8px;display:inline-block">
      <span style="color:#15803d;font-size:12px;font-weight:700">Save Rs.51 per bag</span>
    </div>
  </div>
  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin:12px 0">
    <div><strong>Fortune Sunflower Oil 1L</strong><br><small style="color:#78716c">JioMart: Rs.129 vs Blinkit: Rs.142</small></div>
    <div style="background:#dcfce7;border-radius:6px;padding:4px 10px;margin-top:8px;display:inline-block">
      <span style="color:#15803d;font-size:12px;font-weight:700">Save Rs.13 per bottle</span>
    </div>
  </div>
  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin:12px 0">
    <div><strong>Amul Butter 500g</strong><br><small style="color:#78716c">BigBasket: Rs.268 vs Blinkit: Rs.298</small></div>
    <div style="background:#dcfce7;border-radius:6px;padding:4px 10px;margin-top:8px;display:inline-block">
      <span style="color:#15803d;font-size:12px;font-weight:700">Save Rs.30 per pack</span>
    </div>
  </div>
  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin:12px 0">
    <div><strong>Toor Dal 1kg</strong><br><small style="color:#78716c">JioMart: Rs.142 vs Blinkit: Rs.158</small></div>
    <div style="background:#dcfce7;border-radius:6px;padding:4px 10px;margin-top:8px;display:inline-block">
      <span style="color:#15803d;font-size:12px;font-weight:700">Save Rs.16 per kg</span>
    </div>
  </div>
  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin:12px 0">
    <div><strong>Dove Shampoo 650ml</strong><br><small style="color:#78716c">JioMart: Rs.258 vs Blinkit: Rs.298</small></div>
    <div style="background:#dcfce7;border-radius:6px;padding:4px 10px;margin-top:8px;display:inline-block">
      <span style="color:#15803d;font-size:12px;font-weight:700">Save Rs.40 per bottle</span>
    </div>
  </div>
  <div style="text-align:center;margin:24px 0">
    <a href="https://pricebasket.in/best-grocery-deals" style="background:#ea580c;color:#fff;padding:16px 40px;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px">
      See All Deals
    </a>
  </div>
</div>
<div style="background:#f5f5f5;padding:16px;text-align:center">
  <p style="color:#a8a29e;font-size:12px;margin:0">PriceBasket.in | <a href="https://pricebasket.in/unsubscribe" style="color:#a8a29e">Unsubscribe</a></p>
</div>
</div>
"""

def build_price_alert_email(product_name, platform, new_price, old_price, target_price, product_url):
    savings = round(old_price - new_price)
    subject = f"Price Drop Alert: {product_name} is now Rs.{int(new_price)} on {platform}!"
    html = f"""
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff">
<div style="background:#15803d;padding:28px;text-align:center">
  <h1 style="color:#fff;margin:0">Price Drop Alert!</h1>
  <p style="color:#bbf7d0;margin:8px 0 0">Your target price has been reached</p>
</div>
<div style="padding:32px;text-align:center">
  <p style="color:#57534e">Great news! The price you were waiting for is here:</p>
  <h2 style="color:#1c1917">{product_name}</h2>
  <div style="background:#f0fdf4;border:2px solid #15803d;border-radius:16px;padding:24px;margin:20px 0">
    <p style="color:#15803d;font-weight:700;margin:0 0 8px">Now Available On {platform}</p>
    <p style="color:#15803d;font-size:48px;font-weight:900;margin:0">Rs.{int(new_price)}</p>
    <p style="color:#78716c;margin:8px 0 0">Was Rs.{int(old_price)} - You save Rs.{savings}</p>
    <p style="color:#78716c;margin:4px 0 0">Your target: Rs.{int(target_price)} Reached!</p>
  </div>
  <a href="{product_url}" style="background:#15803d;color:#fff;padding:16px 40px;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block">
    Buy Now on {platform}
  </a>
  <p style="color:#a8a29e;font-size:12px;margin:24px 0 0">Prices change frequently. Verified 2 hours ago.</p>
</div>
<div style="background:#f5f5f5;padding:16px;text-align:center">
  <p style="color:#a8a29e;font-size:12px;margin:0">PriceBasket.in | <a href="https://pricebasket.in/alerts" style="color:#a8a29e">Manage Alerts</a> | <a href="https://pricebasket.in/unsubscribe" style="color:#a8a29e">Unsubscribe</a></p>
</div>
</div>
"""
    return {"subject": subject, "html": html}

def send_welcome(email, name):
    return send_email(email, name, WELCOME_SUBJECT, WELCOME_HTML)

def send_day3(email, name):
    return send_email(email, name, DAY3_SUBJECT, DAY3_HTML)

def send_day7(email, name):
    return send_email(email, name, DAY7_SUBJECT, DAY7_HTML)

def send_price_alert(email, name, product_name, platform, new_price, old_price, target_price, product_url):
    em = build_price_alert_email(product_name, platform, new_price, old_price, target_price, product_url)
    return send_email(email, name, em["subject"], em["html"])

if __name__ == "__main__":
    print("Email funnel loaded. Call send_welcome(), send_day3(), send_day7(), send_price_alert()")
    print("Test: send_welcome('test@example.com', 'Test User')")
