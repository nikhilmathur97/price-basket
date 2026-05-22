"""Notification service — email and push notifications."""
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import TYPE_CHECKING

import structlog

from app.config import settings

if TYPE_CHECKING:
    from app.models.price import PriceAlert

log = structlog.get_logger(__name__)


class NotificationService:
    async def send_price_drop_alert(self, alert: "PriceAlert", current_price: float) -> None:
        product_name = alert.product.name if alert.product else "Product"
        target = float(alert.target_price)
        user_email = alert.user.email if alert.user else None

        log.info(
            "price_alert_triggered",
            product=product_name,
            target_price=target,
            current_price=current_price,
        )

        if user_email and settings.SMTP_USER:
            await self._send_email(
                to=user_email,
                subject=f"Price Drop Alert: {product_name} is now ₹{current_price}",
                body=self._price_drop_email_body(product_name, target, current_price),
            )

    async def _send_email(self, to: str, subject: str, body: str) -> None:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = settings.SMTP_USER
            msg["To"] = to
            msg.attach(MIMEText(body, "html"))

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_USER, to, msg.as_string())
        except Exception as exc:
            log.error("email_send_failed", to=to, error=str(exc))

    @staticmethod
    def _price_drop_email_body(product: str, target: float, current: float) -> str:
        return f"""
        <html><body style="font-family:Arial,sans-serif;padding:20px">
          <h2 style="color:#0C831F">Price Drop Alert 🎉</h2>
          <p><strong>{product}</strong> has dropped to <strong>₹{current}</strong>!</p>
          <p>Your target price was ₹{target}.</p>
          <p><a href="https://pricebasket.app" style="background:#0C831F;color:white;
             padding:10px 20px;text-decoration:none;border-radius:4px">
             Shop Now on Price Basket</a></p>
        </body></html>
        """
