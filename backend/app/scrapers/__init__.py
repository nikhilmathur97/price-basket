"""Scraper registry — maps platform slug → scraper instance (singleton per process)."""
from typing import Optional

from app.scrapers.base_scraper import BaseScraper

_registry: dict[str, BaseScraper] = {}


def _build_registry() -> dict[str, BaseScraper]:
    from app.scrapers.blinkit_scraper import BlinkitScraper
    from app.scrapers.zepto_scraper import ZeptoScraper
    from app.scrapers.bigbasket_scraper import BigBasketScraper
    from app.scrapers.instamart_scraper import InstamartScraper
    from app.scrapers.flipkart_scraper import FlipkartScraper
    from app.scrapers.amazon_scraper import AmazonScraper
    from app.scrapers.jiomart_scraper import JioMartScraper
    from app.scrapers.myntra_scraper import MyntraScraper
    from app.scrapers.nykaa_scraper import NykaaScraper

    return {
        "blinkit": BlinkitScraper(),
        "zepto": ZeptoScraper(),
        "bigbasket": BigBasketScraper(),
        "instamart": InstamartScraper(),
        "flipkart": FlipkartScraper(),
        "amazon": AmazonScraper(),
        "jiomart": JioMartScraper(),
        "myntra": MyntraScraper(),
        "nykaa": NykaaScraper(),
    }


def get_scraper(slug: str) -> Optional[BaseScraper]:
    global _registry
    if not _registry:
        _registry = _build_registry()
    return _registry.get(slug)


__all__ = ["get_scraper"]
