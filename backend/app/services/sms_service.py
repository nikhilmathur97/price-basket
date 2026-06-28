"""
SMS service abstraction — plug in any provider via environment variables.

Priority order:
  1. Twilio      — TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_FROM_NUMBER
  2. MSG91       — MSG91_AUTH_KEY
  3. AWS SNS     — SMS_PROVIDER=aws_sns + AWS credentials
  4. Dev fallback — logs OTP to console (never sends a real SMS)
"""
import asyncio
import structlog

from app.config import settings

log = structlog.get_logger(__name__)


async def send_otp_sms(mobile_number: str, otp: str) -> None:
    """Send a 6-digit OTP to the given 10-digit Indian mobile number."""
    phone_e164 = _to_e164(mobile_number)

    # ── 1. Twilio ─────────────────────────────────────────────────────────────
    if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and settings.TWILIO_FROM_NUMBER:
        try:
            await _twilio(phone_e164, otp)
            log.info("otp_sms_sent", provider="twilio", mobile_suffix=mobile_number[-4:])
            return
        except Exception as exc:
            log.error("otp_sms_failed", provider="twilio", error=str(exc))

    # ── 2. MSG91 ─────────────────────────────────────────────────────────────
    if settings.MSG91_AUTH_KEY:
        try:
            await _msg91(mobile_number, otp)
            log.info("otp_sms_sent", provider="msg91", mobile_suffix=mobile_number[-4:])
            return
        except Exception as exc:
            log.error("otp_sms_failed", provider="msg91", error=str(exc))

    # ── 3. AWS SNS ────────────────────────────────────────────────────────────
    if settings.SMS_PROVIDER == "aws_sns" and settings.AWS_ACCESS_KEY_ID:
        try:
            await _aws_sns(phone_e164, otp)
            log.info("otp_sms_sent", provider="aws_sns", mobile_suffix=mobile_number[-4:])
            return
        except Exception as exc:
            log.error("otp_sms_failed", provider="aws_sns", error=str(exc))

    # ── 4. Dev fallback ───────────────────────────────────────────────────────
    log.warning(
        "otp_sms_dev_fallback__no_provider_configured",
        mobile_suffix=mobile_number[-4:],
        otp=otp,
        hint="Set TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_FROM_NUMBER or MSG91_AUTH_KEY to send real SMS.",
    )


def _to_e164(mobile_number: str) -> str:
    digits = "".join(c for c in mobile_number if c.isdigit())
    if len(digits) == 10:
        return f"+91{digits}"
    if len(digits) == 12 and digits.startswith("91"):
        return f"+{digits}"
    return f"+{digits}"


async def _twilio(phone_e164: str, otp: str) -> None:
    import base64
    import httpx

    credentials = base64.b64encode(
        f"{settings.TWILIO_ACCOUNT_SID}:{settings.TWILIO_AUTH_TOKEN}".encode()
    ).decode()
    body = (
        f"Hello! Welcome to PriceBasket. "
        f"Your verification code is {otp}. "
        "Valid for 5 minutes. Do not share this with anyone."
    )
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json",
            data={"From": settings.TWILIO_FROM_NUMBER, "To": phone_e164, "Body": body},
            headers={"Authorization": f"Basic {credentials}"},
        )
    if resp.status_code not in (200, 201):
        raise RuntimeError(f"Twilio {resp.status_code}: {resp.text[:200]}")


async def _msg91(mobile_number: str, otp: str) -> None:
    import httpx

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            "https://api.msg91.com/api/v5/otp",
            headers={
                "authkey": settings.MSG91_AUTH_KEY,
                "Content-Type": "application/json",
            },
            json={
                "template_id": settings.MSG91_TEMPLATE_ID,
                "mobile": f"91{mobile_number}",
                "authkey": settings.MSG91_AUTH_KEY,
                "otp": otp,
                "sender": settings.MSG91_SENDER_ID or "PRZBKT",
            },
        )
    if resp.status_code not in (200, 201):
        raise RuntimeError(f"MSG91 {resp.status_code}: {resp.text[:200]}")


async def _aws_sns(phone_e164: str, otp: str) -> None:
    import boto3

    message = f"Your PriceBasket OTP is {otp}. Valid for 5 minutes. Do not share."

    def _send() -> None:
        kwargs: dict = {"region_name": settings.AWS_REGION}
        if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
            kwargs["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID
            kwargs["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY
        client = boto3.client("sns", **kwargs)
        client.publish(
            PhoneNumber=phone_e164,
            Message=message,
            MessageAttributes={
                "AWS.SNS.SMS.SMSType": {
                    "DataType": "String",
                    "StringValue": "Transactional",
                }
            },
        )

    await asyncio.to_thread(_send)
