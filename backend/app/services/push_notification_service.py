"""Push notification service — Firebase Cloud Messaging (FCM HTTP v1).

Sends push notifications to the PriceBasket Flutter app via the
firebase-admin SDK.

Configuration:
  Set FIREBASE_CREDENTIALS_JSON in the environment to either:
    • an absolute path to a Firebase service-account JSON file, OR
    • the raw service-account JSON string itself.
  Generate it in: Firebase Console → Project Settings → Service Accounts →
  "Generate new private key".

If unconfigured, the service runs in stub mode — it logs a warning and
no-ops, so the backend never crashes when Firebase isn't set up yet.
This mirrors the graceful-degradation behaviour of the Flutter FcmService.
"""
import json
import os
from typing import Optional

import structlog

from app.config import settings

log = structlog.get_logger(__name__)

# Must match the AndroidNotificationChannel id created in the Flutter app
# (lib/services/fcm_service.dart → 'pricebasket_alerts').
ANDROID_CHANNEL_ID = "pricebasket_alerts"

_initialized = False
_app = None  # firebase_admin.App | None


def _ensure_initialized() -> bool:
    """Lazily initialise the Firebase Admin SDK. Returns True if usable.

    Only attempts initialisation once; on failure it stays in stub mode.
    """
    global _initialized, _app
    if _initialized:
        return _app is not None

    _initialized = True  # attempt exactly once

    raw = (settings.FIREBASE_CREDENTIALS_JSON or "").strip()
    if not raw:
        log.warning(
            "fcm_not_configured",
            reason="FIREBASE_CREDENTIALS_JSON empty — push notifications disabled",
        )
        return False

    try:
        import firebase_admin
        from firebase_admin import credentials

        # Accept either a path to a JSON file or the raw JSON string.
        if os.path.isfile(raw):
            cred = credentials.Certificate(raw)
        else:
            cred = credentials.Certificate(json.loads(raw))

        # Reuse the default app if it was already initialised elsewhere.
        if firebase_admin._apps:
            _app = firebase_admin.get_app()
        else:
            _app = firebase_admin.initialize_app(cred)

        log.info("fcm_initialized")
        return True
    except Exception as exc:  # noqa: BLE001 — never let push break the caller
        log.error("fcm_init_failed", error=str(exc))
        _app = None
        return False


class PushNotificationService:
    """Thin, crash-safe wrapper over firebase-admin messaging."""

    def send(
        self,
        token: str,
        title: str,
        body: str,
        data: Optional[dict] = None,
    ) -> bool:
        """Send a single push notification. Returns True on success.

        Safe to call without Firebase configured — returns False and logs.
        This is a blocking network call; callers in async code should wrap it
        in ``asyncio.to_thread(...)``.
        """
        if not token:
            return False
        if not _ensure_initialized():
            return False

        try:
            from firebase_admin import messaging

            message = messaging.Message(
                token=token,
                notification=messaging.Notification(title=title, body=body),
                data={k: str(v) for k, v in (data or {}).items()},
                android=messaging.AndroidConfig(
                    priority="high",
                    notification=messaging.AndroidNotification(
                        channel_id=ANDROID_CHANNEL_ID,
                    ),
                ),
                apns=messaging.APNSConfig(
                    payload=messaging.APNSPayload(
                        aps=messaging.Aps(sound="default"),
                    ),
                ),
            )
            message_id = messaging.send(message)
            log.info("fcm_sent", message_id=message_id)
            return True
        except Exception as exc:  # noqa: BLE001
            # e.g. messaging.UnregisteredError → token is stale.
            log.error("fcm_send_failed", error=str(exc))
            return False


# Module-level singleton — import this everywhere.
push_service = PushNotificationService()
